import { NgOptimizedImage } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, signal } from '@angular/core';

import {
  SellerProductAttributeDataType,
  SellerProductCategoryAttribute,
  SellerProductCategoryFormDefinition,
  SellerProductCategoryNode,
} from '../../_core/model/seller-product-category.response';
import { SellerProductCategoryApi } from '../../_core/service/seller-product-category-api';
import { CpHeader } from '../../shared/private/cp-header/cp-header';
import { CpMenuList } from '../../shared/private/cp-menu-list/cp-menu-list';
import { SellerProductApi } from '../../_core/service/seller-product-api';
import {
  SellerProductAttributeValueRequest,
  SellerProductEditorAttributeValue,
  SellerProductEditorImage,
  SellerProductEditorVariant,
  SellerProductVariantDisplayType,
  SellerProductVariantNodeRequest,
  SellerProductVariantResponse,
  SellerProductVariantSelectorResponse,
  SellerSaveProductVariantConfigurationRequest,
  SellerSaveProductVariantConfigurationResponse,
} from '../../_core/model/seller-product.response';
import { finalize, map, of, switchMap } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';

type SellerProductCategoryChoice = {
  categoryId: string;
  label: string;
};

type SellerProductAttributeTextField = 'valueText' | 'valueInteger' | 'valueDecimal';

type SellerProductAttributeDraft = {
  valueText: string;
  valueInteger: string;
  valueDecimal: string;
  valueBoolean: boolean | null;
  attributeOptionIds: string[];
};

/**
 * Поля цены и остатка конечного варианта,
 * которые можно изменять из HTML-шаблона.
 */
type SellerProductVariantOfferField = 'priceAmount' | 'stockQuantity';

/**
 * Редактируемое описание одного уровня вариантов.
 */
type SellerProductVariantSelectorDraft = {
  selectorName: string;
  displayType: SellerProductVariantDisplayType;
};

/**
 * Редактируемый узел дерева вариантов.
 *
 * draftKey существует только в Angular и обеспечивает
 * стабильное отслеживание строки до сохранения на сервере.
 */
type SellerProductVariantDraft = {
  draftKey: number;
  productVariantId: string | null;
  variantValue: string;
  priceAmount: string;
  stockQuantity: string;
  images: SellerProductEditorImage[];
  children: SellerProductVariantDraft[];
};

/**
 * Общая форма варианта, которую можно восстановить
 * как из редактора, так и из ответа сохранения.
 */
type SellerProductRestorableVariant = SellerProductEditorVariant | SellerProductVariantResponse;

@Component({
  selector: 'app-pw-add-product',
  imports: [CpHeader, CpMenuList, NgOptimizedImage],
  templateUrl: './pw-add-product.html',
  styleUrl: './pw-add-product.css',
})
export class PwAddProduct {
  protected readonly categories = signal<SellerProductCategoryNode[]>([]);

  protected readonly selectableCategories = computed<SellerProductCategoryChoice[]>(() =>
    this.flattenSelectableCategories(this.categories()),
  );

  protected readonly selectedCategoryId = signal('');

  protected readonly productName = signal('');

  protected readonly brandName = signal('');

  /**
   * Цена и доступное количество одиночного товара.
   *
   * До проверки значения хранятся строками,
   * чтобы не потерять введённый пользователем текст.
   */
  protected readonly priceAmount = signal('');

  protected readonly stockQuantity = signal('');

  /**
   * Значения пяти видимых полей преимуществ товара.
   *
   * Сервер допускает до десяти необязательных преимуществ,
   * каждое длиной от 3 до 300 символов.
   */
  protected readonly productBullets = signal<string[]>(['', '', '', '', '']);

  protected readonly categoryFormDefinition = signal<SellerProductCategoryFormDefinition | null>(
    null,
  );

  protected readonly categoryAttributes = computed<SellerProductCategoryAttribute[]>(
    () => this.categoryFormDefinition()?.items ?? [],
  );

  protected readonly selectedCategoryPath = computed(
    () =>
      this.categoryFormDefinition()
        ?.categoryPath.map((category) => category.categoryName)
        .join(' → ') ?? '',
  );

  protected readonly attributeDrafts = signal<Record<string, SellerProductAttributeDraft>>({});

  protected readonly isLoadingCategories = signal(true);

  protected readonly categoryLoadError = signal('');

  protected readonly isLoadingCategoryDefinition = signal(false);

  protected readonly categoryDefinitionError = signal('');

  protected readonly productCardId = signal<string | null>(null);

  protected readonly isSavingProduct = signal(false);

  protected readonly productSaveError = signal('');

  protected readonly productSaveMessage = signal('');

  /**
   * Один или два уровня выбора вариантов товара.
   */
  protected readonly variantSelectors = signal<SellerProductVariantSelectorDraft[]>([]);

  /**
   * Корневые значения первого уровня вариантов.
   *
   * При двух уровнях каждый корень содержит
   * продаваемые конечные значения в children.
   */
  protected readonly variantDrafts = signal<SellerProductVariantDraft[]>([]);

  /**
   * Признак двухуровневой конфигурации вариантов.
   */
  protected readonly hasSecondVariantSelector = computed(
    () => this.variantSelectors().length === 2,
  );

  /**
   * Количество конечных продаваемых вариантов,
   * для которых сохраняются цена и остаток.
   */
  protected readonly concreteVariantCount = computed(() => {
    if (!this.hasSecondVariantSelector()) {
      return this.variantDrafts().length;
    }

    return this.variantDrafts().reduce((total, root) => total + root.children.length, 0);
  });

  /**
   * Показывает, что существующий черновик
   * сейчас восстанавливается с сервера.
   */
  protected readonly isLoadingProductEditor = signal(false);

  /**
   * Значения характеристик, полученные
   * при восстановлении существующего черновика.
   *
   * Они хранятся до завершения загрузки
   * определения выбранной категории.
   */
  private readonly restoredAttributeValues = signal<SellerProductEditorAttributeValue[]>([]);

  /**
   * Последовательность создаёт уникальные локальные ключи
   * для ещё не сохранённых строк вариантов.
   */
  private nextVariantDraftKey = 1;

  productType: 'simple' | 'variant' = 'simple';

  /**
   * Загружает категории и получает средства Angular
   * для сохранения ID черновика в адресе страницы.
   */
  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly productCategoryApi: SellerProductCategoryApi,
    private readonly productApi: SellerProductApi,
  ) {
    this.loadCategories();

    /**
     * Если ID присутствует в адресе страницы,
     * продолжаем редактирование этого черновика.
     */
    const draftId = this.route.snapshot.queryParamMap.get('draftId');

    if (draftId !== null) {
      this.loadProductEditor(draftId);
    }
  }

  protected updateProductName(value: string): void {
    this.productName.set(value);
  }

  protected updateBrandName(value: string): void {
    this.brandName.set(value);
  }

  /**
   * Обновляет введённую цену одиночного товара.
   */
  protected updatePriceAmount(value: string): void {
    this.priceAmount.set(value);
  }

  /**
   * Обновляет введённый доступный остаток
   * одиночного товара.
   */
  protected updateStockQuantity(value: string): void {
    this.stockQuantity.set(value);
  }

  /**
   * Обновляет название указанного уровня вариантов.
   */
  protected updateVariantSelectorName(index: number, value: string): void {
    this.variantSelectors.update((currentSelectors) =>
      currentSelectors.map((selector, selectorIndex) =>
        selectorIndex === index
          ? {
              ...selector,
              selectorName: value,
            }
          : selector,
      ),
    );
  }

  /**
   * Обновляет способ отображения указанного
   * уровня вариантов.
   */
  protected updateVariantSelectorDisplayType(index: number, value: string): void {
    if (value !== 'image' && value !== 'text') {
      return;
    }

    this.variantSelectors.update((currentSelectors) =>
      currentSelectors.map((selector, selectorIndex) =>
        selectorIndex === index
          ? {
              ...selector,
              displayType: value,
            }
          : selector,
      ),
    );
  }

  /**
   * Добавляет первый либо второй уровень вариантов.
   *
   * При появлении второго уровня цена и остаток
   * каждого корня переносятся в его первого потомка,
   * поэтому уже введённые данные не теряются.
   */
  protected addVariantSelector(): void {
    const currentSelectors = this.variantSelectors();

    if (currentSelectors.length >= 2) {
      this.productSaveError.set('Для товара можно настроить не более двух уровней вариантов.');

      return;
    }

    this.productSaveError.set('');

    this.variantSelectors.set([
      ...currentSelectors,
      {
        selectorName: '',
        displayType: 'text',
      },
    ]);

    if (currentSelectors.length === 0) {
      if (this.variantDrafts().length === 0) {
        this.variantDrafts.set([this.createEmptyVariantDraft()]);
      }

      return;
    }

    this.variantDrafts.update((currentRoots) =>
      currentRoots.map((root) => {
        if (root.children.length > 0) {
          return root;
        }

        const firstChild = this.createEmptyVariantDraft({
          priceAmount: root.priceAmount,
          stockQuantity: root.stockQuantity,
        });

        return {
          ...root,
          priceAmount: '',
          stockQuantity: '',
          children: [firstChild],
        };
      }),
    );
  }

  /**
   * Удаляет только второй уровень вариантов.
   *
   * Сворачивание разрешено, когда у каждого корня
   * не более одного потомка и у удаляемых потомков
   * отсутствуют изображения.
   */
  protected removeSecondVariantSelector(): void {
    if (this.variantSelectors().length !== 2) {
      return;
    }

    const roots = this.variantDrafts();

    if (roots.some((root) => root.children.length > 1)) {
      this.productSaveError.set(
        'Чтобы удалить второй уровень, оставьте у каждого значения первого уровня только один вариант.',
      );

      return;
    }

    if (roots.some((root) => root.children.some((child) => child.images.length > 0))) {
      this.productSaveError.set(
        'Сначала удалите изображения вариантов второго уровня, затем удалите сам уровень.',
      );

      return;
    }

    this.productSaveError.set('');

    this.variantSelectors.update((currentSelectors) => currentSelectors.slice(0, 1));

    this.variantDrafts.set(
      roots.map((root) => {
        const firstChild = root.children[0];

        return {
          ...root,
          priceAmount: firstChild?.priceAmount ?? '',
          stockQuantity: firstChild?.stockQuantity ?? '',
          children: [],
        };
      }),
    );
  }

  /**
   * Добавляет значение первого уровня вариантов.
   */
  protected addRootVariant(): void {
    const currentRoots = this.variantDrafts();

    if (currentRoots.length >= 50) {
      this.productSaveError.set('Можно добавить не более 50 значений первого уровня.');

      return;
    }

    const newRoot = this.createEmptyVariantDraft();

    if (this.hasSecondVariantSelector()) {
      newRoot.children = [this.createEmptyVariantDraft()];
    }

    this.productSaveError.set('');
    this.variantDrafts.set([...currentRoots, newRoot]);
  }

  /**
   * Удаляет значение первого уровня без изображений.
   */
  protected removeRootVariant(rootDraftKey: number): void {
    const currentRoots = this.variantDrafts();

    if (currentRoots.length <= 1) {
      this.productSaveError.set('У товара с вариантами должно остаться хотя бы одно значение.');

      return;
    }

    const removedRoot = currentRoots.find((root) => root.draftKey === rootDraftKey);

    if (removedRoot && this.variantDraftContainsImages(removedRoot)) {
      this.productSaveError.set('Сначала удалите изображения исключаемого варианта.');

      return;
    }

    this.productSaveError.set('');
    this.variantDrafts.set(currentRoots.filter((root) => root.draftKey !== rootDraftKey));
  }

  /**
   * Добавляет конечный вариант второго уровня
   * к указанному значению первого уровня.
   */
  protected addChildVariant(rootDraftKey: number): void {
    if (!this.hasSecondVariantSelector()) {
      return;
    }

    const root = this.variantDrafts().find((item) => item.draftKey === rootDraftKey);

    if (!root) {
      return;
    }

    if (root.children.length >= 100) {
      this.productSaveError.set(
        'Для одного значения первого уровня можно добавить не более 100 вариантов.',
      );

      return;
    }

    if (this.concreteVariantCount() >= 500) {
      this.productSaveError.set('В одной карточке допускается не более 500 конечных вариантов.');

      return;
    }

    this.productSaveError.set('');

    this.updateRootVariant(rootDraftKey, (currentRoot) => ({
      ...currentRoot,
      children: [...currentRoot.children, this.createEmptyVariantDraft()],
    }));
  }

  /**
   * Удаляет конечный вариант второго уровня,
   * если у него отсутствуют изображения.
   */
  protected removeChildVariant(rootDraftKey: number, childDraftKey: number): void {
    const root = this.variantDrafts().find((item) => item.draftKey === rootDraftKey);

    if (!root) {
      return;
    }

    if (root.children.length <= 1) {
      this.productSaveError.set(
        'У каждого значения первого уровня должен остаться хотя бы один конечный вариант.',
      );

      return;
    }

    const removedChild = root.children.find((child) => child.draftKey === childDraftKey);

    if (removedChild && removedChild.images.length > 0) {
      this.productSaveError.set('Сначала удалите изображения исключаемого варианта.');

      return;
    }

    this.productSaveError.set('');

    this.updateRootVariant(rootDraftKey, (currentRoot) => ({
      ...currentRoot,
      children: currentRoot.children.filter((child) => child.draftKey !== childDraftKey),
    }));
  }

  /**
   * Обновляет текстовое значение корневого
   * либо дочернего варианта.
   */
  protected updateVariantValue(
    rootDraftKey: number,
    childDraftKey: number | null,
    value: string,
  ): void {
    this.updateVariantDraft(rootDraftKey, childDraftKey, (currentDraft) => ({
      ...currentDraft,
      variantValue: value,
    }));
  }

  /**
   * Обновляет цену либо остаток конечного варианта.
   */
  protected updateVariantOffer(
    rootDraftKey: number,
    childDraftKey: number | null,
    field: SellerProductVariantOfferField,
    value: string,
  ): void {
    this.updateVariantDraft(rootDraftKey, childDraftKey, (currentDraft) => ({
      ...currentDraft,
      [field]: value,
    }));
  }

  /**
   * Возвращает текущее значение конкретного
   * поля преимущества для HTML-шаблона.
   */
  protected productBullet(index: number): string {
    return this.productBullets()[index] ?? '';
  }

  /**
   * Обновляет одно преимущество товара,
   * не изменяя остальные заполненные поля.
   */
  protected updateProductBullet(index: number, value: string): void {
    this.productBullets.update((currentBullets) => {
      const updatedBullets = [...currentBullets];

      updatedBullets[index] = value;

      return updatedBullets;
    });
  }

  /**
   * Создаёт серверный черновик товара
   * и сохраняет заполненные характеристики.
   *
   * Если черновик уже был создан во время
   * предыдущей попытки, повторно он не создаётся.
   */
  protected saveProductDraft(): void {
    /**
     * Не отправляем форму повторно и не разрешаем
     * сохранение до завершения восстановления черновика.
     */
    if (this.isSavingProduct() || this.isLoadingProductEditor()) {
      return;
    }

    this.productSaveError.set('');
    this.productSaveMessage.set('');

    const validationError = this.validateProductForm();

    if (validationError) {
      this.productSaveError.set(validationError);

      return;
    }

    const categoryId = this.selectedCategoryId();

    const productName = this.productName().trim();

    const brandName = this.brandName().trim();

    /**
     * Используем уже очищенный и проверенный
     * список преимуществ товара.
     */
    const productBullets = this.buildProductBullets();

    /**
     * Для одиночного товара подготавливаем
     * общую цену и доступный остаток.
     *
     * Десятичная запятая заменяется точкой,
     * поскольку именно такой формат хранит сервер.
     */
    const simpleOffer =
      this.productType === 'simple'
        ? {
            stockQuantity: Number(this.stockQuantity().trim()),
            priceAmount: this.priceAmount().trim().replace(',', '.'),
            oldPriceAmount: null,
          }
        : null;

    /**
     * Для товара с вариантами подготавливаем
     * селекторы, дерево значений, цены и остатки.
     */
    const variantConfiguration =
      this.productType === 'variant' ? this.buildVariantConfiguration() : null;

    const attributeValues = this.buildProductAttributeValues();

    const existingProductCardId = this.productCardId();

    this.isSavingProduct.set(true);

    /**
     * После частично успешного запроса ID сохраняется
     * в состоянии компонента. Это предотвращает создание
     * нескольких одинаковых черновиков при повторе.
     */
    const productCardIdRequest =
      existingProductCardId === null
        ? this.productApi
            .createProductDraft({
              categoryId,
              productName,
              brandName,
            })
            .pipe(
              map((response) => {
                this.productCardId.set(response.productCardId);

                /**
                 * Сохраняем ID черновика в адресе страницы.
                 * replaceUrl не создаёт лишнюю запись
                 * в истории переходов браузера.
                 */
                void this.router.navigate([], {
                  relativeTo: this.route,
                  queryParams: {
                    draftId: response.productCardId,
                  },
                  queryParamsHandling: 'merge',
                  replaceUrl: true,
                });

                /**
                 * Сохраняем нормализованные сервером
                 * значения обратно в состояние формы.
                 */
                this.productName.set(response.productName);

                this.brandName.set(response.brandName);

                return response.productCardId;
              }),
            )
        : of(existingProductCardId);

    productCardIdRequest
      .pipe(
        /**
         * Название, бренд и заполненные преимущества
         * обновляются и для нового, и для ранее
         * созданного черновика.
         */
        switchMap((productCardId) =>
          this.productApi
            .saveProductDetails(productCardId, {
              productName,
              brandName,
              bullets: productBullets,
            })
            .pipe(map(() => productCardId)),
        ),

        /**
         * Характеристики сохраняются только после
         * успешного обновления текстовых данных.
         */
        switchMap((productCardId) =>
          this.productApi
            .saveProductAttributes(productCardId, {
              items: attributeValues,
            })
            .pipe(map(() => productCardId)),
        ),

        /**
         * В зависимости от выбранного продавцом типа
         * сохраняем одно общее предложение либо полную
         * конфигурацию вариантов товара.
         */
        switchMap((productCardId) => {
          if (simpleOffer !== null) {
            return this.productApi
              .saveProductOffer(productCardId, simpleOffer)
              .pipe(map(() => productCardId));
          }

          if (variantConfiguration !== null) {
            return this.productApi
              .saveProductVariantConfiguration(productCardId, variantConfiguration)
              .pipe(
                map((response) => {
                  this.applySavedVariantConfiguration(response);

                  return productCardId;
                }),
              );
          }

          return of(productCardId);
        }),

        /**
         * Состояние загрузки сбрасывается как после
         * успешного ответа, так и после ошибки.
         */
        finalize(() => {
          this.isSavingProduct.set(false);
        }),
      )
      .subscribe({
        next: (productCardId) => {
          this.productSaveMessage.set(`Черновик товара №${productCardId} и его данные сохранены.`);
        },

        error: (error: unknown) => {
          this.productSaveError.set(
            this.readRequestError(error, 'Не удалось сохранить черновик товара.'),
          );
        },
      });
  }

  protected retryCategories(): void {
    this.loadCategories();
  }

  protected selectCategory(categoryId: string): void {
    this.selectedCategoryId.set(categoryId);
    this.categoryFormDefinition.set(null);
    this.attributeDrafts.set({});
    this.categoryDefinitionError.set('');
    this.productType = 'simple';
    this.variantSelectors.set([]);
    this.variantDrafts.set([]);

    if (!categoryId) {
      this.isLoadingCategoryDefinition.set(false);
      return;
    }

    this.loadCategoryFormDefinition(categoryId);
  }

  protected retryCategoryDefinition(): void {
    const categoryId = this.selectedCategoryId();

    if (!categoryId) {
      return;
    }

    this.loadCategoryFormDefinition(categoryId);
  }

  protected productAttributeDataTypeLabel(dataType: SellerProductAttributeDataType): string {
    const labels: Record<SellerProductAttributeDataType, string> = {
      text: 'Текст',
      integer: 'Целое число',
      decimal: 'Десятичное число',
      boolean: 'Да или нет',
      select: 'Одиночный выбор',
      multiselect: 'Множественный выбор',
    };

    return labels[dataType];
  }

  protected attributeDraft(attributeId: string): SellerProductAttributeDraft {
    return this.attributeDrafts()[attributeId] ?? this.createEmptyAttributeDraft();
  }

  protected updateAttributeText(
    attributeId: string,
    field: SellerProductAttributeTextField,
    value: string,
  ): void {
    this.updateAttributeDraft(attributeId, (currentDraft) => ({
      ...currentDraft,
      [field]: value,
    }));
  }

  protected updateAttributeBoolean(attributeId: string, value: string): void {
    let valueBoolean: boolean | null = null;

    if (value === 'true') {
      valueBoolean = true;
    }

    if (value === 'false') {
      valueBoolean = false;
    }

    this.updateAttributeDraft(attributeId, (currentDraft) => ({
      ...currentDraft,
      valueBoolean,
    }));
  }

  protected updateSingleAttributeOption(attributeId: string, optionId: string): void {
    this.updateAttributeDraft(attributeId, (currentDraft) => ({
      ...currentDraft,
      attributeOptionIds: optionId ? [optionId] : [],
    }));
  }

  protected toggleMultipleAttributeOption(
    attributeId: string,
    optionId: string,
    selected: boolean,
  ): void {
    this.updateAttributeDraft(attributeId, (currentDraft) => {
      const selectedOptionIds = new Set(currentDraft.attributeOptionIds);

      if (selected) {
        selectedOptionIds.add(optionId);
      } else {
        selectedOptionIds.delete(optionId);
      }

      return {
        ...currentDraft,
        attributeOptionIds: [...selectedOptionIds],
      };
    });
  }

  protected isAttributeOptionSelected(attributeId: string, optionId: string): boolean {
    return this.attributeDraft(attributeId).attributeOptionIds.includes(optionId);
  }

  /**
   * Переключает форму между одиночным товаром
   * и товаром с вариантами.
   *
   * При первом включении вариантов создаются
   * один пустой селектор и одна пустая строка.
   */
  protected setProductType(type: 'simple' | 'variant'): void {
    this.productType = type;

    if (type === 'variant') {
      if (this.variantSelectors().length === 0) {
        this.addVariantSelector();
      }

      setTimeout(() => {
        document.getElementById('variant-block')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 0);
    }
  }

  /**
   * Загружает существующий черновик и восстанавливает
   * его основные поля и выбранную категорию.
   *
   * Значения характеристик будут применены после
   * загрузки определения этой категории.
   */
  private loadProductEditor(productCardId: string): void {
    if (!/^[1-9]\d*$/.test(productCardId)) {
      this.productSaveError.set('Некорректный идентификатор черновика.');

      return;
    }

    this.isLoadingProductEditor.set(true);
    this.productSaveError.set('');
    this.productSaveMessage.set('');

    this.productApi.getProductEditor(productCardId).subscribe({
      next: (response) => {
        this.productCardId.set(response.productCardId);

        this.productName.set(response.productName);

        this.brandName.set(response.brandName);

        /**
         * Восстанавливаем сохранённые преимущества.
         * Если их меньше пяти, добавляем пустые поля
         * для существующей пяти строчной формы.
         */
        const restoredBullets = [...response.bullets];

        while (restoredBullets.length < 5) {
          restoredBullets.push('');
        }

        this.productBullets.set(restoredBullets);

        /**
         * Наличие серверных селекторов однозначно
         * определяет товар с вариантами.
         */
        if (response.variantSelectors.length > 0) {
          this.productType = 'variant';
          this.priceAmount.set('');
          this.stockQuantity.set('');

          this.restoreVariantConfiguration(
            response.variantSelectors,
            response.variants,
            this.collectEditorVariantImages(response.variants),
          );
        } else {
          /**
           * Одиночный товар хранится как одна корневая
           * вариация с одним предложением продавца.
           */
          const simpleVariant = response.variants.length === 1 ? response.variants[0] : undefined;

          const simpleOffer = simpleVariant?.parentVariantId === null ? simpleVariant.offer : null;

          this.productType = 'simple';
          this.variantSelectors.set([]);
          this.variantDrafts.set([]);
          this.priceAmount.set(simpleOffer?.priceAmount ?? '');
          this.stockQuantity.set(simpleOffer === null ? '' : String(simpleOffer.stockQuantity));
        }

        this.selectedCategoryId.set(response.categoryId);

        this.restoredAttributeValues.set(response.attributeValues);

        this.isLoadingProductEditor.set(false);

        this.loadCategoryFormDefinition(response.categoryId);

        this.productSaveMessage.set(`Черновик товара №${response.productCardId} загружен.`);
      },

      error: (error: unknown) => {
        this.isLoadingProductEditor.set(false);

        this.productSaveError.set(
          this.readRequestError(error, 'Не удалось загрузить черновик товара.'),
        );
      },
    });
  }

  private loadCategories(): void {
    this.isLoadingCategories.set(true);
    this.categoryLoadError.set('');

    this.productCategoryApi.getCategories().subscribe({
      next: (response) => {
        this.categories.set(response.items);

        this.isLoadingCategories.set(false);
      },

      error: (error: unknown) => {
        this.categories.set([]);
        this.isLoadingCategories.set(false);

        this.categoryLoadError.set(
          this.readRequestError(error, 'Не удалось загрузить категории товаров.'),
        );
      },
    });
  }

  private loadCategoryFormDefinition(categoryId: string): void {
    this.isLoadingCategoryDefinition.set(true);

    this.categoryDefinitionError.set('');

    this.productCategoryApi.getCategoryFormDefinition(categoryId).subscribe({
      next: (response) => {
        if (this.selectedCategoryId() !== categoryId) {
          return;
        }

        this.categoryFormDefinition.set(response);

        this.attributeDrafts.set(this.createAttributeDrafts(response.items));

        this.isLoadingCategoryDefinition.set(false);
      },

      error: (error: unknown) => {
        if (this.selectedCategoryId() !== categoryId) {
          return;
        }

        this.categoryFormDefinition.set(null);

        this.attributeDrafts.set({});

        this.isLoadingCategoryDefinition.set(false);

        this.categoryDefinitionError.set(
          this.readRequestError(error, 'Не удалось загрузить характеристики выбранной категории.'),
        );
      },
    });
  }

  /**
   * Подготавливает заполненные преимущества
   * для проверки и отправки в Go API.
   *
   * Пробелы по краям удаляются, а полностью
   * пустые поля не включаются в запрос.
   */
  private buildProductBullets(): string[] {
    return this.productBullets()
      .map((bullet) => bullet.trim())
      .filter((bullet) => bullet.length > 0);
  }

  /**
   * Проверяет основные поля товара и характеристики
   * перед созданием серверного черновика.
   *
   * Метод возвращает пустую строку, если форма
   * заполнена корректно, либо текст первой ошибки.
   */
  private validateProductForm(): string {
    const productName = this.productName().trim();

    const productNameLength = [...productName].length;

    if (productNameLength < 3 || productNameLength > 200) {
      return 'Введите название товара длиной от 3 до 200 символов.';
    }

    const brandName = this.brandName().trim();

    const brandNameLength = [...brandName].length;

    if (brandNameLength < 1 || brandNameLength > 120) {
      return 'Введите название бренда длиной не более 120 символов.';
    }

    /**
     * Преимущества товара необязательны.
     * Если они заполнены, Go API принимает
     * не более десяти, не повторяющихся значений.
     */
    const productBullets = this.buildProductBullets();

    if (productBullets.length > 10) {
      return 'Можно добавить не более десяти основных тезисов.';
    }

    const usedBullets = new Set<string>();

    for (const bullet of productBullets) {
      const bulletLength = [...bullet].length;

      if (bulletLength < 3 || bulletLength > 300) {
        return 'Каждый основной тезис должен содержать от 3 до 300 символов.';
      }

      const duplicateKey = bullet.toLowerCase();

      if (usedBullets.has(duplicateKey)) {
        return 'Основные тезисы товара не должны повторяться.';
      }

      usedBullets.add(duplicateKey);
    }

    /**
     * Для одиночного товара цена и остаток
     * задаются в общем верхнем блоке формы.
     *
     * У товара с вариантами эти значения позднее
     * будут проверяться отдельно для каждого варианта.
     */
    if (this.productType === 'simple') {
      const offerError = this.validateOfferValues(
        this.priceAmount(),
        this.stockQuantity(),
        'товара',
      );

      if (offerError) {
        return offerError;
      }
    } else {
      const variantError = this.validateVariantConfiguration();

      if (variantError) {
        return variantError;
      }
    }

    const categoryId = this.selectedCategoryId();

    if (!categoryId) {
      return 'Выберите конечную категорию товара.';
    }

    if (this.isLoadingCategoryDefinition()) {
      return 'Дождитесь загрузки характеристик выбранной категории.';
    }

    const definition = this.categoryFormDefinition();

    if (definition === null || definition.categoryId !== categoryId) {
      return 'Не удалось получить характеристики выбранной категории.';
    }

    for (const attribute of this.categoryAttributes()) {
      const validationError = this.validateProductAttribute(attribute);

      if (validationError) {
        return validationError;
      }
    }

    return '';
  }

  /**
   * Проверяет значение одной характеристики
   * в соответствии с её типом данных.
   *
   * Пустое значение разрешено только тогда,
   * когда характеристика не является обязательной.
   */
  private validateProductAttribute(attribute: SellerProductCategoryAttribute): string {
    const draft = this.attributeDraft(attribute.attributeId);

    const requiredMessage = `Заполните обязательную характеристику «${attribute.attributeName}».`;

    switch (attribute.dataType) {
      case 'text': {
        if (attribute.isRequired && !draft.valueText.trim()) {
          return requiredMessage;
        }

        return '';
      }

      case 'integer': {
        const valueInteger = draft.valueInteger.trim();

        if (!valueInteger) {
          return attribute.isRequired ? requiredMessage : '';
        }

        if (!/^-?\d+$/.test(valueInteger)) {
          return `Характеристика «${attribute.attributeName}» должна содержать целое число.`;
        }

        return '';
      }

      case 'decimal': {
        const valueDecimal = draft.valueDecimal.trim();

        if (!valueDecimal) {
          return attribute.isRequired ? requiredMessage : '';
        }

        if (!/^-?\d{1,14}([.,]\d{1,6})?$/.test(valueDecimal)) {
          return `Проверьте числовое значение характеристики «${attribute.attributeName}».`;
        }

        return '';
      }

      case 'boolean':
        if (attribute.isRequired && draft.valueBoolean === null) {
          return requiredMessage;
        }

        return '';

      case 'select':
        if (attribute.isRequired && draft.attributeOptionIds.length !== 1) {
          return requiredMessage;
        }

        return '';

      case 'multiselect':
        if (attribute.isRequired && draft.attributeOptionIds.length === 0) {
          return requiredMessage;
        }

        return '';
    }
  }

  /**
   * Проверяет селекторы и полное дерево вариантов
   * по тем же ограничениям, которые применяет Go API.
   */
  private validateVariantConfiguration(): string {
    const selectors = this.variantSelectors();

    if (selectors.length < 1 || selectors.length > 2) {
      return 'Добавьте один или два уровня вариантов товара.';
    }

    const usedSelectorNames = new Set<string>();

    for (let index = 0; index < selectors.length; index += 1) {
      const selector = selectors[index];
      const selectorName = selector.selectorName.trim();
      const selectorNameLength = [...selectorName].length;

      if (selectorNameLength < 1 || selectorNameLength > 100) {
        return `Введите название уровня вариантов №${index + 1} длиной до 100 символов.`;
      }

      if (selector.displayType !== 'image' && selector.displayType !== 'text') {
        return `Выберите способ отображения уровня «${selectorName}».`;
      }

      const selectorKey = selectorName.toLowerCase();

      if (usedSelectorNames.has(selectorKey)) {
        return 'Названия уровней вариантов не должны повторяться.';
      }

      usedSelectorNames.add(selectorKey);
    }

    const roots = this.variantDrafts();

    if (roots.length < 1 || roots.length > 50) {
      return 'Добавьте от 1 до 50 значений первого уровня вариантов.';
    }

    const usedRootValues = new Set<string>();
    let concreteVariantCount = 0;

    for (let rootIndex = 0; rootIndex < roots.length; rootIndex += 1) {
      const root = roots[rootIndex];
      const rootValue = root.variantValue.trim();
      const rootValueLength = [...rootValue].length;

      if (rootValueLength < 1 || rootValueLength > 120) {
        return `Заполните значение первого уровня №${rootIndex + 1} длиной до 120 символов.`;
      }

      const rootKey = rootValue.toLowerCase();

      if (usedRootValues.has(rootKey)) {
        return `Значение первого уровня «${rootValue}» повторяется.`;
      }

      usedRootValues.add(rootKey);

      if (selectors.length === 1) {
        const offerError = this.validateOfferValues(
          root.priceAmount,
          root.stockQuantity,
          `варианта «${rootValue}»`,
        );

        if (offerError) {
          return offerError;
        }

        concreteVariantCount += 1;

        continue;
      }

      if (root.children.length < 1 || root.children.length > 100) {
        return `Добавьте от 1 до 100 значений второго уровня для «${rootValue}».`;
      }

      const usedChildValues = new Set<string>();

      for (let childIndex = 0; childIndex < root.children.length; childIndex += 1) {
        const child = root.children[childIndex];
        const childValue = child.variantValue.trim();
        const childValueLength = [...childValue].length;

        if (childValueLength < 1 || childValueLength > 120) {
          return `Заполните значение второго уровня №${childIndex + 1} для «${rootValue}» длиной до 120 символов.`;
        }

        const childKey = childValue.toLowerCase();

        if (usedChildValues.has(childKey)) {
          return `Вариант «${rootValue} → ${childValue}» повторяется.`;
        }

        usedChildValues.add(childKey);

        const offerError = this.validateOfferValues(
          child.priceAmount,
          child.stockQuantity,
          `варианта «${rootValue} → ${childValue}»`,
        );

        if (offerError) {
          return offerError;
        }

        concreteVariantCount += 1;
      }
    }

    if (concreteVariantCount > 500) {
      return 'В одной карточке допускается не более 500 конечных вариантов.';
    }

    return '';
  }

  /**
   * Проверяет цену и остаток одиночного товара
   * либо одного конечного варианта.
   */
  private validateOfferValues(priceInput: string, stockInput: string, subject: string): string {
    const priceAmount = priceInput.trim();

    if (!/^\d{1,10}([.,]\d{1,2})?$/.test(priceAmount)) {
      return `Введите цену ${subject} в формате 1234,56.`;
    }

    const normalizedPriceAmount = Number(priceAmount.replace(',', '.'));

    if (!Number.isFinite(normalizedPriceAmount) || normalizedPriceAmount <= 0) {
      return `Цена ${subject} должна быть больше нуля.`;
    }

    const stockQuantity = stockInput.trim();

    if (!/^\d+$/.test(stockQuantity)) {
      return `Введите целое количество ${subject} от 0 до 2147483647.`;
    }

    const parsedStockQuantity = Number(stockQuantity);

    if (
      !Number.isSafeInteger(parsedStockQuantity) ||
      parsedStockQuantity < 0 ||
      parsedStockQuantity > 2147483647
    ) {
      return `Введите целое количество ${subject} от 0 до 2147483647.`;
    }

    return '';
  }

  /**
   * Создаёт полную структуру запроса вариантов
   * из текущего состояния Angular-формы.
   */
  private buildVariantConfiguration(): SellerSaveProductVariantConfigurationRequest {
    const hasSecondSelector = this.hasSecondVariantSelector();

    return {
      selectors: this.variantSelectors().map((selector) => ({
        selectorName: selector.selectorName.trim(),
        displayType: selector.displayType,
      })),
      variants: this.variantDrafts().map((root) =>
        this.buildVariantNodeRequest(root, hasSecondSelector),
      ),
    };
  }

  /**
   * Преобразует один корень и его потомков
   * в рекурсивную модель HTTP-запроса.
   */
  private buildVariantNodeRequest(
    draft: SellerProductVariantDraft,
    hasSecondSelector: boolean,
  ): SellerProductVariantNodeRequest {
    const request: SellerProductVariantNodeRequest = {
      variantValue: draft.variantValue.trim(),
      children: [],
      offer: null,
    };

    if (draft.productVariantId !== null) {
      request.productVariantId = draft.productVariantId;
    }

    if (hasSecondSelector) {
      request.children = draft.children.map((child) => this.buildVariantNodeRequest(child, false));

      return request;
    }

    request.offer = {
      stockQuantity: Number(draft.stockQuantity.trim()),
      priceAmount: draft.priceAmount.trim().replace(',', '.'),
      oldPriceAmount: null,
    };

    return request;
  }

  /**
   * Применяет нормализованный ответ сохранения,
   * не теряя уже загруженные изображения вариантов.
   */
  private applySavedVariantConfiguration(
    response: SellerSaveProductVariantConfigurationResponse,
  ): void {
    this.restoreVariantConfiguration(
      response.selectors,
      response.variants,
      this.collectDraftVariantImages(),
    );
  }

  /**
   * Восстанавливает селекторы и иерархию вариантов
   * из плоского серверного списка по parentVariantId.
   */
  private restoreVariantConfiguration(
    selectors: SellerProductVariantSelectorResponse[],
    variants: SellerProductRestorableVariant[],
    imagesByVariantId: ReadonlyMap<string, SellerProductEditorImage[]>,
  ): void {
    const orderedSelectors = [...selectors].sort(
      (left, right) => left.selectorLevel - right.selectorLevel,
    );

    this.variantSelectors.set(
      orderedSelectors.map((selector) => ({
        selectorName: selector.selectorName,
        displayType: selector.displayType,
      })),
    );

    const childrenByParentId = new Map<string, SellerProductRestorableVariant[]>();

    for (const variant of variants) {
      if (variant.parentVariantId === null) {
        continue;
      }

      const currentChildren = childrenByParentId.get(variant.parentVariantId) ?? [];

      currentChildren.push(variant);
      childrenByParentId.set(variant.parentVariantId, currentChildren);
    }

    for (const children of childrenByParentId.values()) {
      children.sort((left, right) => left.sortOrder - right.sortOrder);
    }

    const roots = variants
      .filter((variant) => variant.parentVariantId === null)
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((root) => {
        const rootDraft = this.createVariantDraftFromResponse(root, imagesByVariantId);

        if (orderedSelectors.length === 2) {
          rootDraft.children = (childrenByParentId.get(root.productVariantId) ?? []).map((child) =>
            this.createVariantDraftFromResponse(child, imagesByVariantId),
          );
        }

        return rootDraft;
      });

    this.variantDrafts.set(roots);
  }

  /**
   * Создаёт редактируемый вариант из одной строки
   * ответа Go API.
   */
  private createVariantDraftFromResponse(
    variant: SellerProductRestorableVariant,
    imagesByVariantId: ReadonlyMap<string, SellerProductEditorImage[]>,
  ): SellerProductVariantDraft {
    return this.createEmptyVariantDraft({
      productVariantId: variant.productVariantId,
      variantValue: variant.variantValue,
      priceAmount: variant.offer?.priceAmount ?? '',
      stockQuantity: variant.offer === null ? '' : String(variant.offer.stockQuantity),
      images: [...(imagesByVariantId.get(variant.productVariantId) ?? [])],
    });
  }

  /**
   * Собирает изображения из ответа редактора
   * по идентификаторам вариантов.
   */
  private collectEditorVariantImages(
    variants: SellerProductEditorVariant[],
  ): Map<string, SellerProductEditorImage[]> {
    const imagesByVariantId = new Map<string, SellerProductEditorImage[]>();

    for (const variant of variants) {
      imagesByVariantId.set(variant.productVariantId, [...variant.images]);
    }

    return imagesByVariantId;
  }

  /**
   * Собирает изображения из текущего дерева перед
   * применением ответа сохранения без поля images.
   */
  private collectDraftVariantImages(): Map<string, SellerProductEditorImage[]> {
    const imagesByVariantId = new Map<string, SellerProductEditorImage[]>();

    const collectDraft = (draft: SellerProductVariantDraft): void => {
      if (draft.productVariantId !== null) {
        imagesByVariantId.set(draft.productVariantId, [...draft.images]);
      }

      for (const child of draft.children) {
        collectDraft(child);
      }
    };

    for (const root of this.variantDrafts()) {
      collectDraft(root);
    }

    return imagesByVariantId;
  }

  /**
   * Создаёт пустой или частично заполненный
   * локальный вариант с уникальным ключом.
   */
  private createEmptyVariantDraft(
    input: Partial<Omit<SellerProductVariantDraft, 'draftKey'>> = {},
  ): SellerProductVariantDraft {
    const draft: SellerProductVariantDraft = {
      draftKey: this.nextVariantDraftKey,
      productVariantId: input.productVariantId ?? null,
      variantValue: input.variantValue ?? '',
      priceAmount: input.priceAmount ?? '',
      stockQuantity: input.stockQuantity ?? '',
      images: [...(input.images ?? [])],
      children: [...(input.children ?? [])],
    };

    this.nextVariantDraftKey += 1;

    return draft;
  }

  /**
   * Неизменяемо обновляет корневой либо дочерний
   * вариант по локальному ключу.
   */
  private updateVariantDraft(
    rootDraftKey: number,
    childDraftKey: number | null,
    update: (currentDraft: SellerProductVariantDraft) => SellerProductVariantDraft,
  ): void {
    this.updateRootVariant(rootDraftKey, (currentRoot) => {
      if (childDraftKey === null) {
        return update(currentRoot);
      }

      return {
        ...currentRoot,
        children: currentRoot.children.map((child) =>
          child.draftKey === childDraftKey ? update(child) : child,
        ),
      };
    });
  }

  /**
   * Неизменяемо обновляет один корневой вариант.
   */
  private updateRootVariant(
    rootDraftKey: number,
    update: (currentRoot: SellerProductVariantDraft) => SellerProductVariantDraft,
  ): void {
    this.variantDrafts.update((currentRoots) =>
      currentRoots.map((root) => (root.draftKey === rootDraftKey ? update(root) : root)),
    );
  }

  /**
   * Проверяет изображения корня и всех его потомков.
   */
  private variantDraftContainsImages(draft: SellerProductVariantDraft): boolean {
    return (
      draft.images.length > 0 ||
      draft.children.some((child) => this.variantDraftContainsImages(child))
    );
  }

  /**
   * Преобразует заполненные поля характеристик
   * в структуру запроса, которую принимает Go API.
   *
   * Для каждой характеристики передаётся только
   * поле, соответствующее её типу данных.
   * Пустые необязательные значения не отправляются.
   */
  private buildProductAttributeValues(): SellerProductAttributeValueRequest[] {
    const items: SellerProductAttributeValueRequest[] = [];

    for (const attribute of this.categoryAttributes()) {
      const draft = this.attributeDraft(attribute.attributeId);

      switch (attribute.dataType) {
        case 'text': {
          const valueText = draft.valueText.trim();

          if (valueText) {
            items.push({
              attributeId: attribute.attributeId,
              valueText,
            });
          }

          break;
        }

        case 'integer': {
          const valueInteger = draft.valueInteger.trim();

          if (valueInteger) {
            items.push({
              attributeId: attribute.attributeId,
              valueInteger,
            });
          }

          break;
        }

        case 'decimal': {
          const valueDecimal = draft.valueDecimal.trim();

          if (valueDecimal) {
            items.push({
              attributeId: attribute.attributeId,
              valueDecimal,
            });
          }

          break;
        }

        case 'boolean':
          if (draft.valueBoolean !== null) {
            items.push({
              attributeId: attribute.attributeId,
              valueBoolean: draft.valueBoolean,
            });
          }

          break;

        case 'select':
        case 'multiselect':
          if (draft.attributeOptionIds.length > 0) {
            items.push({
              attributeId: attribute.attributeId,
              attributeOptionIds: [...draft.attributeOptionIds],
            });
          }

          break;
      }
    }

    return items;
  }

  /**
   * Создаёт состояние полей для всех характеристик
   * выбранной категории.
   *
   * При открытии существующего черновика начальные
   * значения заменяются данными, полученными с сервера.
   */
  private createAttributeDrafts(
    attributes: SellerProductCategoryAttribute[],
  ): Record<string, SellerProductAttributeDraft> {
    const drafts: Record<string, SellerProductAttributeDraft> = {};

    /**
     * Сначала создаём пустое значение для каждой
     * характеристики текущей категории.
     */
    for (const attribute of attributes) {
      drafts[attribute.attributeId] = this.createEmptyAttributeDraft();
    }

    /**
     * Затем переносим сохранённые серверные значения
     * только в существующие поля текущей категории.
     */
    for (const savedValue of this.restoredAttributeValues()) {
      if (!drafts[savedValue.attributeId]) {
        continue;
      }

      drafts[savedValue.attributeId] = {
        valueText: savedValue.valueText ?? '',
        valueInteger: savedValue.valueInteger ?? '',
        valueDecimal: savedValue.valueDecimal ?? '',
        valueBoolean: savedValue.valueBoolean,
        attributeOptionIds: [...savedValue.attributeOptionIds],
      };
    }

    /**
     * Значения уже применены и больше не должны
     * переноситься при выборе другой категории.
     */
    this.restoredAttributeValues.set([]);

    return drafts;
  }

  private createEmptyAttributeDraft(): SellerProductAttributeDraft {
    return {
      valueText: '',
      valueInteger: '',
      valueDecimal: '',
      valueBoolean: null,
      attributeOptionIds: [],
    };
  }

  private updateAttributeDraft(
    attributeId: string,
    update: (currentDraft: SellerProductAttributeDraft) => SellerProductAttributeDraft,
  ): void {
    this.attributeDrafts.update((currentDrafts) => ({
      ...currentDrafts,
      [attributeId]: update(currentDrafts[attributeId] ?? this.createEmptyAttributeDraft()),
    }));
  }

  private flattenSelectableCategories(
    categories: SellerProductCategoryNode[],
    parentNames: string[] = [],
  ): SellerProductCategoryChoice[] {
    const choices: SellerProductCategoryChoice[] = [];

    for (const category of categories) {
      const categoryNames = [...parentNames, category.categoryName];

      if (category.isLeaf) {
        choices.push({
          categoryId: category.categoryId,
          label: categoryNames.join(' → '),
        });
      }

      choices.push(...this.flattenSelectableCategories(category.children, categoryNames));
    }

    return choices;
  }

  private readRequestError(error: unknown, fallbackMessage: string): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return 'Сервер недоступен. Проверьте подключение и повторите попытку.';
      }

      const serverMessage = error.error?.error;

      if (typeof serverMessage === 'string' && serverMessage.trim()) {
        return serverMessage;
      }
    }

    return fallbackMessage;
  }
}
