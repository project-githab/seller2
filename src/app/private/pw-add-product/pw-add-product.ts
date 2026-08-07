import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, OnDestroy, signal } from '@angular/core';

import {
  SellerProductAttributeDataType,
  SellerProductCategoryAttribute,
  SellerProductCategoryFormDefinition,
  SellerProductCategoryNode,
  SellerProductCategorySearchItem,
} from '../../_core/model/seller-product-category.response';
import { SellerProductCategoryApi } from '../../_core/service/seller-product-category-api';
import { CpHeader } from '../../shared/private/cp-header/cp-header';
import { CpMenuList } from '../../shared/private/cp-menu-list/cp-menu-list';
import { SellerProductApi } from '../../_core/service/seller-product-api';
import {
  SellerCreateProductImageRequest,
  SellerCreateProductVariantConfigurationRequest,
  SellerCreateProductVariantNodeRequest,
  SellerProductAttributeValueRequest,
  SellerProductVariantDisplayType,
} from '../../_core/model/seller-product.response';
import { finalize } from 'rxjs';
import { Router } from '@angular/router';

type SellerProductCategoryChoice = {
  categoryId: string;
  label: string;
};

type SellerProductAttributeTextField = 'valueText' | 'valueInteger' | 'valueDecimal';

type SellerProductAttributeState = {
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
type SellerProductVariantSelectorState = {
  attributeId: string;
  displayType: SellerProductVariantDisplayType;
};

/**
 * Изображение, выбранное в текущей форме.
 *
 * До нажатия «Добавить товар» файл находится
 * только в памяти браузера, а previewUrl используется
 * для локального показа миниатюры.
 */
type SellerProductVariantImage = {
  clientImageKey: number;
  isMain: boolean;
  isSelectorPreview: boolean;
  file: File;
  previewUrl: string;
  slotIndex: number;
};

/**
 * Редактируемый узел дерева вариантов.
 *
 * clientKey существует только в Angular и обеспечивает
 * связь варианта с выбранными для него файлами.
 */
type SellerProductVariantState = {
  clientKey: number;
  attributeOptionId: string;
  variantValue: string;
  priceAmount: string;
  stockQuantity: string;
  images: SellerProductVariantImage[];
  children: SellerProductVariantState[];
};

@Component({
  selector: 'app-pw-add-product',
  imports: [CpHeader, CpMenuList],
  templateUrl: './pw-add-product.html',
  styleUrl: './pw-add-product.css',
})
export class PwAddProduct implements OnDestroy {
  protected readonly categories = signal<SellerProductCategoryNode[]>([]);

  // Управляет отдельным окном выбора категории.
  protected readonly categoryPickerOpen = signal(false);

  // Хранит пройденный путь от корня
  // до текущего уровня выбора.
  protected readonly categoryNavigationPath = signal<SellerProductCategoryNode[]>([]);

  // Показывает текущий путь внутри окна выбора.
  protected readonly categoryNavigationPathLabel = computed(() => {
    const categoryNames = this.categoryNavigationPath().map((category) => category.categoryName);

    return categoryNames.length > 0 ? categoryNames.join(' → ') : 'Все категории';
  });

  // Хранит текст глобального поиска конечной категории.
  protected readonly categorySearch = signal('');

  // Содержит найденные сервером конечные категории.
  protected readonly categorySearchResults = signal<SellerProductCategorySearchItem[]>([]);

  // Показывает выполнение поискового запроса.
  protected readonly isSearchingCategories = signal(false);

  // Содержит понятное сообщение при ошибке поиска.
  protected readonly categorySearchError = signal('');

  // Переключает окно с навигации по дереву
  // на результаты глобального поиска.
  protected readonly categorySearchActive = computed(
    () => Array.from(this.normalizeCategorySearch(this.categorySearch())).length >= 2,
  );

  // Хранит отложенный запуск поиска,
  // чтобы запрос не выполнялся после каждой введённой буквы.
  private categorySearchTimer: ReturnType<typeof setTimeout> | null = null;

  // Не позволяет запоздавшему поисковому ответу
  // заменить результаты более нового запроса.
  private categorySearchRequestNumber = 0;

  // Не позволяет запоздавшему ответу старого уровня
  // заменить более новый список категорий.
  private categoryLevelRequestNumber = 0;

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
   * Локальное состояние одиночного товара:
   * цена, остаток и выбранные изображения.
   */
  protected readonly simpleProductVariant = signal<SellerProductVariantState | null>(null);

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

  /**
   * Характеристики категории, разрешённые
   * для построения вариантов товара.
   *
   * Вариант должен выбирать ровно одно значение,
   * поэтому здесь используются только характеристики select.
   */
  protected readonly variantCategoryAttributes = computed<SellerProductCategoryAttribute[]>(() =>
    this.categoryAttributes().filter(
      (attribute) =>
        attribute.isVariant && attribute.dataType === 'select' && attribute.options.length > 0,
    ),
  );

  protected readonly selectedCategoryPath = computed(
    () =>
      this.categoryFormDefinition()
        ?.categoryPath.map((category) => category.categoryName)
        .join(' → ') ?? '',
  );

  protected readonly attributeStates = signal<Record<string, SellerProductAttributeState>>({});

  protected readonly isLoadingCategories = signal(true);

  protected readonly categoryLoadError = signal('');

  protected readonly isLoadingCategoryDefinition = signal(false);

  protected readonly categoryDefinitionError = signal('');

  protected readonly createdProductCardId = signal<string | null>(null);

  protected readonly isSavingProduct = signal(false);

  /**
   * Семь постоянных мест для изображений:
   * первое главное и шесть дополнительных.
   */
  protected readonly variantImageSlotIndexes = [0, 1, 2, 3, 4, 5, 6] as const;

  protected readonly productSaveError = signal('');

  protected readonly productSaveMessage = signal('');

  /**
   * Один или два уровня выбора вариантов товара.
   */
  protected readonly variantSelectors = signal<SellerProductVariantSelectorState[]>([]);

  /**
   * Корневые значения первого уровня вариантов.
   *
   * При двух уровнях каждый корень содержит
   * продаваемые конечные значения в children.
   */
  protected readonly variantStates = signal<SellerProductVariantState[]>([]);

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
      return this.variantStates().length;
    }

    return this.variantStates().reduce((total, root) => total + root.children.length, 0);
  });

  /**
   * Последовательность создаёт уникальные локальные ключи
   * для ещё не сохранённых строк вариантов.
   */
  private nextVariantClientKey = 1;

  /**
   * Создаёт уникальные локальные идентификаторы
   * выбранных в браузере изображений.
   */
  private nextLocalImageKey = 1;

  productType: 'simple' | 'variant' = 'simple';

  public ngOnDestroy(): void {
    this.releaseAllVariantImagePreviews();
  }

  /**
   * Подготавливает пустую форму
   * и загружает категории товаров.
   */
  constructor(
    private readonly productCategoryApi: SellerProductCategoryApi,
    private readonly productApi: SellerProductApi,
    private readonly router: Router,
  ) {
    this.resetProductFormForNewProduct();
    this.loadCategories();
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
   * Возвращает название характеристики,
   * выбранной для указанного уровня вариантов.
   */
  protected variantSelectorName(index: number): string {
    const attributeId = this.variantSelectors()[index]?.attributeId;

    return (
      this.variantCategoryAttributes().find((attribute) => attribute.attributeId === attributeId)
        ?.attributeName ?? ''
    );
  }

  /**
   * Возвращает допустимые значения характеристики,
   * выбранной для указанного уровня.
   */
  protected variantSelectorOptions(index: number) {
    const attributeId = this.variantSelectors()[index]?.attributeId;

    return (
      this.variantCategoryAttributes().find((attribute) => attribute.attributeId === attributeId)
        ?.options ?? []
    );
  }

  /**
   * Проверяет, выбрано ли значение характеристики
   * в другом варианте того же уровня.
   *
   * Значения первого уровня не должны повторяться
   * среди всех корневых вариантов.
   *
   * Значения второго уровня могут повторяться
   * у разных корней, но не внутри одного корня.
   */
  protected isVariantOptionUsedByOtherState(
    selectorIndex: number,
    attributeOptionId: string,
    rootClientKey: number,
    childClientKey: number | null,
  ): boolean {
    if (!attributeOptionId) {
      return false;
    }

    if (selectorIndex === 0) {
      return this.variantStates().some(
        (root) => root.clientKey !== rootClientKey && root.attributeOptionId === attributeOptionId,
      );
    }

    const root = this.variantStates().find((item) => item.clientKey === rootClientKey);

    if (!root) {
      return false;
    }

    return root.children.some(
      (child) =>
        child.clientKey !== childClientKey && child.attributeOptionId === attributeOptionId,
    );
  }

  /**
   * Показывает, что характеристика уже используется
   * другим уровнем вариантов этого товара.
   */
  protected isVariantAttributeUsedByOtherSelector(
    attributeId: string,
    selectorIndex: number,
  ): boolean {
    return this.variantSelectors().some(
      (selector, index) => index !== selectorIndex && selector.attributeId === attributeId,
    );
  }

  /**
   * Выбирает глобальную характеристику
   * для указанного уровня вариантов.
   */
  protected updateVariantSelectorAttribute(index: number, attributeId: string): void {
    const attribute = this.variantCategoryAttributes().find(
      (item) => item.attributeId === attributeId,
    );

    if (!attribute) {
      this.productSaveError.set('Выберите доступную характеристику вариантов.');

      return;
    }

    if (this.isVariantAttributeUsedByOtherSelector(attributeId, index)) {
      this.productSaveError.set(
        'Одна характеристика не может использоваться на двух уровнях вариантов.',
      );

      return;
    }

    const currentSelectors = this.variantSelectors();

    if (currentSelectors[index]?.attributeId === attributeId) {
      return;
    }

    this.productSaveError.set('');

    this.variantSelectors.update((selectors) =>
      selectors.map((selector, selectorIndex) =>
        selectorIndex === index
          ? {
              ...selector,
              attributeId,
            }
          : selector,
      ),
    );

    /**
     * Новая характеристика селектора больше
     * не должна иметь общего значения карточки.
     */
    this.updateAttributeState(attributeId, () => this.createEmptyAttributeState());

    // После смены характеристики прежние значения
    // больше не принадлежат выбранному справочнику.
    if (index === 0) {
      this.variantStates.update((roots) =>
        roots.map((root) => ({
          ...root,
          attributeOptionId: '',
          variantValue: '',
        })),
      );

      return;
    }

    this.variantStates.update((roots) =>
      roots.map((root) => ({
        ...root,
        children: root.children.map((child) => ({
          ...child,
          attributeOptionId: '',
          variantValue: '',
        })),
      })),
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
   * Добавляет первый либо второй уровень вариантов
   * из характеристик выбранной категории.
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

    const availableAttribute = this.variantCategoryAttributes().find(
      (attribute) =>
        !currentSelectors.some((selector) => selector.attributeId === attribute.attributeId),
    );

    if (!availableAttribute) {
      this.productSaveError.set(
        currentSelectors.length === 0
          ? 'Для выбранной категории не настроены характеристики вариантов.'
          : 'Для выбранной категории отсутствует вторая характеристика вариантов.',
      );

      return;
    }

    this.productSaveError.set('');

    this.variantSelectors.set([
      ...currentSelectors,
      {
        attributeId: availableAttribute.attributeId,
        displayType: availableAttribute.slug === 'primary-color' ? 'image' : 'text',
      },
    ]);

    if (currentSelectors.length === 0) {
      if (this.variantStates().length === 0) {
        this.variantStates.set([this.createEmptyVariantState()]);
      }

      return;
    }

    this.variantStates.update((currentRoots) =>
      currentRoots.map((root) => {
        if (root.children.length > 0) {
          return root;
        }

        const firstChild = this.createEmptyVariantState({
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

    const roots = this.variantStates();

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

    this.variantStates.set(
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
    const currentRoots = this.variantStates();

    if (currentRoots.length >= 50) {
      this.productSaveError.set('Можно добавить не более 50 значений первого уровня.');

      return;
    }

    const newRoot = this.createEmptyVariantState();

    if (this.hasSecondVariantSelector()) {
      newRoot.children = [this.createEmptyVariantState()];
    }

    this.productSaveError.set('');
    this.variantStates.set([...currentRoots, newRoot]);
  }

  /**
   * Удаляет значение первого уровня без изображений.
   */
  /**
   * Удаляет значение первого уровня,
   * если в форме останется хотя бы один вариант.
   */
  protected removeRootVariant(rootClientKey: number): void {
    const currentRoots = this.variantStates();

    if (currentRoots.length <= 1) {
      return;
    }

    const removedRoot = currentRoots.find((root) => root.clientKey === rootClientKey);

    if (removedRoot) {
      const releaseImages = (variant: SellerProductVariantState): void => {
        for (const image of variant.images) {
          URL.revokeObjectURL(image.previewUrl);
        }

        for (const child of variant.children) {
          releaseImages(child);
        }
      };

      releaseImages(removedRoot);
    }

    this.productSaveError.set('');
    this.variantStates.set(currentRoots.filter((root) => root.clientKey !== rootClientKey));
  }

  /**
   * Добавляет конечный вариант второго уровня
   * к указанному значению первого уровня.
   */
  protected addChildVariant(rootClientKey: number): void {
    if (!this.hasSecondVariantSelector()) {
      return;
    }

    const root = this.variantStates().find((item) => item.clientKey === rootClientKey);

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

    this.updateRootVariant(rootClientKey, (currentRoot) => ({
      ...currentRoot,
      children: [...currentRoot.children, this.createEmptyVariantState()],
    }));
  }

  /**
   * Удаляет конечный вариант второго уровня,
   * если у него отсутствуют изображения.
   */
  protected removeChildVariant(rootClientKey: number, childClientKey: number): void {
    const root = this.variantStates().find((item) => item.clientKey === rootClientKey);

    if (!root) {
      return;
    }

    const removedChild = root.children.find((child) => child.clientKey === childClientKey);

    if (removedChild && removedChild.images.length > 0) {
      this.productSaveError.set('Сначала удалите изображения исключаемого варианта.');

      return;
    }

    this.productSaveError.set('');

    this.updateRootVariant(rootClientKey, (currentRoot) => ({
      ...currentRoot,
      children: currentRoot.children.filter((child) => child.clientKey !== childClientKey),
    }));
  }

  /**
   * Выбирает справочное значение характеристики
   * для корневого либо дочернего варианта.
   */
  protected updateVariantOption(
    rootClientKey: number,
    childClientKey: number | null,
    attributeOptionId: string,
  ): void {
    if (!attributeOptionId) {
      this.updateVariantState(rootClientKey, childClientKey, (currentState) => ({
        ...currentState,
        attributeOptionId: '',
        variantValue: '',
      }));

      return;
    }

    const selectorIndex = childClientKey === null ? 0 : 1;

    const option = this.variantSelectorOptions(selectorIndex).find(
      (item) => item.attributeOptionId === attributeOptionId,
    );

    if (!option) {
      this.productSaveError.set('Выбранное значение отсутствует в характеристике варианта.');

      return;
    }

    this.productSaveError.set('');

    this.updateVariantState(rootClientKey, childClientKey, (currentState) => ({
      ...currentState,
      attributeOptionId: option.attributeOptionId,
      variantValue: option.optionValue,
    }));
  }

  /**
   * Обновляет цену либо остаток конечного варианта.
   */
  protected updateVariantOffer(
    rootClientKey: number,
    childClientKey: number | null,
    field: SellerProductVariantOfferField,
    value: string,
  ): void {
    this.updateVariantState(rootClientKey, childClientKey, (currentState) => ({
      ...currentState,
      [field]: value,
    }));
  }

  /**
   * Сохраняет выбранное изображение только
   * в локальном состоянии Angular.
   *
   * На сервер файл будет отправлен вместе
   * со всей формой после нажатия «Добавить товар».
   */
  protected uploadVariantImage(
    rootClientKey: number,
    childClientKey: number | null,
    slotIndex: number,
    source: Event | File,
  ): void {
    let file: File | undefined;

    if (source instanceof File) {
      file = source;
    } else {
      const input = source.target as HTMLInputElement;

      file = input.files?.[0];

      /**
       * Позволяет повторно выбрать тот же файл,
       * если продавец сначала удалил его из формы.
       */
      input.value = '';
    }

    if (!file) {
      return;
    }

    if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
      this.productSaveError.set('Можно выбирать только изображения JPEG или PNG.');

      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      this.productSaveError.set('Размер изображения не должен превышать 15 МБ.');

      return;
    }

    const simpleVariant = this.simpleProductVariant();

    const root =
      this.variantStates().find((item) => item.clientKey === rootClientKey) ??
      (simpleVariant?.clientKey === rootClientKey ? simpleVariant : null);

    if (!root) {
      this.productSaveError.set('Не удалось найти вариант для выбранного изображения.');

      return;
    }

    const concreteVariant =
      childClientKey === null
        ? root
        : (root.children.find((child) => child.clientKey === childClientKey) ?? null);

    if (!concreteVariant) {
      this.productSaveError.set('Не удалось найти конечный вариант товара.');

      return;
    }

    if (this.hasSecondVariantSelector() && childClientKey === null) {
      this.productSaveError.set(
        'Изображение необходимо выбрать для конечного варианта второго уровня.',
      );

      return;
    }

    if (this.variantImageForSlot(concreteVariant, slotIndex) !== null) {
      this.productSaveError.set('Выбранное место изображения уже заполнено.');

      return;
    }

    if (concreteVariant.images.length >= 7) {
      this.productSaveError.set('Для одного варианта можно выбрать не более семи изображений.');

      return;
    }

    const isMain = slotIndex === 0;

    if (isMain && concreteVariant.images.some((image) => image.isMain)) {
      this.productSaveError.set('Главное изображение уже выбрано.');

      return;
    }

    const firstSelectorUsesImages = this.variantSelectors()[0]?.displayType === 'image';

    /**
     * Для визуального первого селектора одно главное
     * изображение внутри каждого корневого значения
     * становится его превью.
     */
    const selectorPreviewAlreadyExists = this.hasSecondVariantSelector()
      ? root.children.some((child) => child.images.some((image) => image.isSelectorPreview))
      : concreteVariant.images.some((image) => image.isSelectorPreview);

    const isSelectorPreview = isMain && firstSelectorUsesImages && !selectorPreviewAlreadyExists;

    const previewUrl = URL.createObjectURL(file);

    const localImage: SellerProductVariantImage = {
      clientImageKey: this.nextLocalImageKey,
      isMain,
      isSelectorPreview,
      file,
      previewUrl,
      slotIndex,
    };

    this.nextLocalImageKey += 1;

    this.updateVariantState(rootClientKey, childClientKey, (currentState) => ({
      ...currentState,
      images: [...currentState.images, localImage].sort(
        (left, right) => left.slotIndex - right.slotIndex,
      ),
    }));

    this.productSaveError.set('');
    this.productSaveMessage.set(
      'Изображение выбрано. Оно будет загружено после нажатия «Добавить товар».',
    );
  }

  /**
   * Возвращает изображение, занимающее указанное
   * место в галерее варианта.
   *
   * Нулевое место всегда предназначено для главного.
   */
  protected variantImageForSlot(
    state: SellerProductVariantState,
    slotIndex: number,
  ): SellerProductVariantImage | null {
    return state.images.find((image) => image.slotIndex === slotIndex) ?? null;
  }

  /**
   * Удаляет выбранное изображение
   * только из локального состояния формы.
   */
  protected deleteVariantImage(
    rootClientKey: number,
    childClientKey: number | null,
    image: SellerProductVariantImage,
  ): void {
    const concreteVariant = this.findConcreteVariantState(rootClientKey, childClientKey);

    if (!concreteVariant) {
      this.productSaveError.set('Не удалось найти вариант удаляемого изображения.');

      return;
    }

    if (image.isMain && concreteVariant.images.length > 1) {
      this.productSaveError.set('Сначала выберите другое главное изображение.');

      return;
    }

    URL.revokeObjectURL(image.previewUrl);

    this.updateVariantState(rootClientKey, childClientKey, (currentState) => ({
      ...currentState,
      images: currentState.images.filter(
        (currentImage) => currentImage.clientImageKey !== image.clientImageKey,
      ),
    }));

    this.productSaveError.set('');
    this.productSaveMessage.set('Изображение удалено из формы.');
  }

  /**
   * Назначает выбранное локальное изображение
   * главным для конкретного варианта.
   *
   * Предыдущее главное изображение занимает
   * освободившееся дополнительное место.
   */
  protected makeVariantImageMain(
    rootClientKey: number,
    childClientKey: number | null,
    image: SellerProductVariantImage,
  ): void {
    if (image.isMain) {
      return;
    }

    const concreteVariant = this.findConcreteVariantState(rootClientKey, childClientKey);

    if (!concreteVariant) {
      this.productSaveError.set('Не удалось найти вариант выбранного изображения.');

      return;
    }

    const selectedSlotIndex = image.slotIndex;

    const previousMainImage =
      concreteVariant.images.find((currentImage) => currentImage.isMain) ?? null;

    const selectedBecomesSelectorPreview =
      previousMainImage?.isSelectorPreview ?? image.isSelectorPreview;

    this.updateVariantState(rootClientKey, childClientKey, (currentState) => ({
      ...currentState,
      images: currentState.images
        .map((currentImage) => {
          if (currentImage.clientImageKey === image.clientImageKey) {
            return {
              ...currentImage,
              isMain: true,
              isSelectorPreview: selectedBecomesSelectorPreview,
              slotIndex: 0,
            };
          }

          if (
            previousMainImage !== null &&
            currentImage.clientImageKey === previousMainImage.clientImageKey
          ) {
            return {
              ...currentImage,
              isMain: false,
              isSelectorPreview: false,
              slotIndex: selectedSlotIndex,
            };
          }

          return currentImage;
        })
        .sort((left, right) => left.slotIndex - right.slotIndex),
    }));

    this.productSaveError.set('');
    this.productSaveMessage.set('Главное изображение изменено.');
  }

  /**
   * Заменяет выбранный локальный файл,
   * сохраняя его место и назначение.
   */
  protected replaceVariantImage(
    rootClientKey: number,
    childClientKey: number | null,
    currentImage: SellerProductVariantImage,
    event: Event,
  ): void {
    const input = event.target as HTMLInputElement;
    const newFile = input.files?.[0];

    input.value = '';

    if (!newFile) {
      return;
    }

    if (newFile.type !== 'image/jpeg' && newFile.type !== 'image/png') {
      this.productSaveError.set('Можно выбирать только изображения JPEG или PNG.');

      return;
    }

    if (newFile.size > 15 * 1024 * 1024) {
      this.productSaveError.set('Размер изображения не должен превышать 15 МБ.');

      return;
    }

    const concreteVariant = this.findConcreteVariantState(rootClientKey, childClientKey);

    if (!concreteVariant) {
      this.productSaveError.set('Не удалось найти вариант заменяемого изображения.');

      return;
    }

    const previewUrl = URL.createObjectURL(newFile);

    URL.revokeObjectURL(currentImage.previewUrl);

    this.updateVariantState(rootClientKey, childClientKey, (currentState) => ({
      ...currentState,
      images: currentState.images.map((image) =>
        image.clientImageKey === currentImage.clientImageKey
          ? {
              ...image,
              file: newFile,
              previewUrl,
            }
          : image,
      ),
    }));

    this.productSaveError.set('');
    this.productSaveMessage.set(
      'Изображение заменено. Новый файл будет загружен после добавления товара.',
    );
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
   * Проверяет форму и отправляет товар,
   * варианты, предложения и изображения
   * одним multipart-запросом.
   */
  protected addProduct(): void {
    if (this.isSavingProduct()) {
      return;
    }

    if (this.createdProductCardId() !== null) {
      this.productSaveError.set(
        `Товар №${this.createdProductCardId()} уже добавлен. Откройте новую форму для следующего товара.`,
      );

      return;
    }

    this.productSaveError.set('');
    this.productSaveMessage.set('');

    const validationError = this.validateProductForm();

    if (validationError) {
      this.productSaveError.set(validationError);

      return;
    }

    const simpleOffer =
      this.productType === 'simple'
        ? {
            stockQuantity: Number(this.stockQuantity().trim()),
            priceAmount: this.priceAmount().trim().replace(',', '.'),
            oldPriceAmount: null,
          }
        : null;

    const variantConfiguration =
      this.productType === 'variant' ? this.buildVariantConfiguration() : null;

    const productImages = this.buildCreateProductImages();

    this.isSavingProduct.set(true);

    this.productApi
      .createProduct(
        {
          categoryId: this.selectedCategoryId(),
          productType: this.productType,
          productName: this.productName().trim(),
          brandName: this.brandName().trim(),
          bullets: this.buildProductBullets(),

          attributes: {
            items: this.buildProductAttributeValues(),
          },

          simpleOffer,
          variantConfiguration,
          images: productImages.metadata,
        },
        productImages.files,
      )
      .pipe(
        finalize(() => {
          this.isSavingProduct.set(false);
        }),
      )
      .subscribe({
        next: (response) => {
          this.createdProductCardId.set(response.productCardId);

          void this.router.navigate(['/inventory']);

          if (response.moderationStatus === 'pending') {
            this.productSaveMessage.set(
              `Товар №${response.productCardId} создан и отправлен на модерацию.`,
            );

            return;
          }

          this.productSaveMessage.set(`Товар №${response.productCardId} создан и опубликован.`);
        },

        error: (error: unknown) => {
          this.productSaveError.set(
            this.readRequestError(
              error,
              'Не удалось добавить товар. Проверьте данные и попробуйте ещё раз.',
            ),
          );
        },
      });
  }

  // Открывает выбор категории с корневого уровня.
  protected openCategoryPicker(): void {
    if (this.isSavingProduct()) {
      return;
    }

    this.resetCategorySearch();
    this.categoryPickerOpen.set(true);
    this.loadCategories();
  }

  // Закрывает окно без изменения выбранной категории.
  protected closeCategoryPicker(): void {
    this.categoryPickerOpen.set(false);
    this.resetCategorySearch();
  }

  // Обновляет поисковую строку и запускает
  // отложенный серверный поиск.
  protected updateCategorySearch(value: string): void {
    this.categorySearch.set(value);
    this.scheduleCategorySearch(value);
  }

  // Повторяет завершившийся ошибкой поисковый запрос.
  protected retryCategorySearch(): void {
    this.scheduleCategorySearch(this.categorySearch(), true);
  }

  // Выбирает конечную категорию из результатов поиска.
  protected selectCategorySearchResult(category: SellerProductCategorySearchItem): void {
    this.selectCategory(category.categoryId);
    this.closeCategoryPicker();
  }

  // Переходит к дочернему уровню либо выбирает
  // конечную категорию для создаваемого товара.
  protected openCategoryPickerItem(category: SellerProductCategoryNode): void {
    if (category.isLeaf) {
      this.selectCategory(category.categoryId);
      this.closeCategoryPicker();
      return;
    }

    this.categoryNavigationPath.update((currentPath) => [...currentPath, category]);

    this.loadCategoryLevel(category.categoryId);
  }

  // Возвращает выбор на один уровень назад.
  protected returnToPreviousCategoryLevel(): void {
    const nextPath = this.categoryNavigationPath().slice(0, -1);

    this.categoryNavigationPath.set(nextPath);

    const parentCategoryId = nextPath.length > 0 ? nextPath[nextPath.length - 1].categoryId : null;

    this.loadCategoryLevel(parentCategoryId);
  }

  // Повторяет загрузку текущего уровня.
  protected retryCategories(): void {
    const currentPath = this.categoryNavigationPath();

    const parentCategoryId =
      currentPath.length > 0 ? currentPath[currentPath.length - 1].categoryId : null;

    this.loadCategoryLevel(parentCategoryId);
  }

  /**
   * Освобождает локальные адреса всех изображений,
   * выбранных в обоих режимах формы.
   */
  private releaseAllVariantImagePreviews(): void {
    const previewUrls = new Set<string>();

    const collectVariantImages = (variant: SellerProductVariantState): void => {
      for (const image of variant.images) {
        previewUrls.add(image.previewUrl);
      }

      for (const child of variant.children) {
        collectVariantImages(child);
      }
    };

    const simpleVariant = this.simpleProductVariant();

    if (simpleVariant !== null) {
      collectVariantImages(simpleVariant);
    }

    for (const root of this.variantStates()) {
      collectVariantImages(root);
    }

    for (const previewUrl of previewUrls) {
      URL.revokeObjectURL(previewUrl);
    }
  }

  protected selectCategory(categoryId: string): void {
    this.releaseAllVariantImagePreviews();

    this.selectedCategoryId.set(categoryId);
    this.categoryFormDefinition.set(null);
    this.attributeStates.set({});
    this.categoryDefinitionError.set('');

    this.productType = 'simple';
    this.variantSelectors.set([]);
    this.variantStates.set([]);
    this.simpleProductVariant.set(this.createEmptyVariantState());

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

  protected attributeState(attributeId: string): SellerProductAttributeState {
    return this.attributeStates()[attributeId] ?? this.createEmptyAttributeState();
  }

  protected updateAttributeText(
    attributeId: string,
    field: SellerProductAttributeTextField,
    value: string,
  ): void {
    this.updateAttributeState(attributeId, (currentState) => ({
      ...currentState,
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

    this.updateAttributeState(attributeId, (currentState) => ({
      ...currentState,
      valueBoolean,
    }));
  }

  protected updateSingleAttributeOption(attributeId: string, optionId: string): void {
    this.updateAttributeState(attributeId, (currentState) => ({
      ...currentState,
      attributeOptionIds: optionId ? [optionId] : [],
    }));
  }

  protected toggleMultipleAttributeOption(
    attributeId: string,
    optionId: string,
    selected: boolean,
  ): void {
    this.updateAttributeState(attributeId, (currentState) => {
      const selectedOptionIds = new Set(currentState.attributeOptionIds);

      if (selected) {
        selectedOptionIds.add(optionId);
      } else {
        selectedOptionIds.delete(optionId);
      }

      return {
        ...currentState,
        attributeOptionIds: [...selectedOptionIds],
      };
    });
  }

  protected isAttributeOptionSelected(attributeId: string, optionId: string): boolean {
    return this.attributeState(attributeId).attributeOptionIds.includes(optionId);
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

    if (type === 'simple' && this.simpleProductVariant() === null) {
      this.simpleProductVariant.set(this.createEmptyVariantState());
    }

    if (type === 'variant') {
      if (this.variantSelectors().length === 0) {
        this.addVariantSelector();
      }

      if (this.variantStates().length === 0) {
        this.variantStates.set([this.createEmptyVariantState()]);
      }

      /**
       * Характеристика, используемая вариантами,
       * больше не должна хранить общее значение
       * для всей карточки товара.
       */
      for (const selector of this.variantSelectors()) {
        if (!selector.attributeId) {
          continue;
        }

        this.updateAttributeState(selector.attributeId, () => this.createEmptyAttributeState());
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
   * Подготавливает чистую форму
   * для добавления нового товара.
   */
  private resetProductFormForNewProduct(): void {
    this.releaseAllVariantImagePreviews();
    this.createdProductCardId.set(null);
    this.selectedCategoryId.set('');
    this.categoryFormDefinition.set(null);
    this.attributeStates.set({});

    this.productName.set('');
    this.brandName.set('');
    this.priceAmount.set('');
    this.stockQuantity.set('');
    this.productBullets.set(['', '', '', '', '']);

    this.productType = 'simple';
    this.variantSelectors.set([]);
    this.variantStates.set([]);

    this.categoryPickerOpen.set(false);
    this.categoryNavigationPath.set([]);
    this.resetCategorySearch();

    this.isLoadingCategoryDefinition.set(false);
    this.categoryDefinitionError.set('');
    this.productSaveError.set('');
    this.productSaveMessage.set('');

    this.nextVariantClientKey = 1;
    this.nextLocalImageKey = 1;
    this.simpleProductVariant.set(this.createEmptyVariantState());
  }

  // Нормализует поисковую строку перед отправкой серверу.
  private normalizeCategorySearch(value: string): string {
    return value.trim().replace(/\s+/g, ' ');
  }

  // Очищает поиск и отменяет ожидающий запуск запроса.
  private resetCategorySearch(): void {
    if (this.categorySearchTimer !== null) {
      clearTimeout(this.categorySearchTimer);
      this.categorySearchTimer = null;
    }

    this.categorySearchRequestNumber += 1;
    this.categorySearch.set('');
    this.categorySearchResults.set([]);
    this.isSearchingCategories.set(false);
    this.categorySearchError.set('');
  }

  // Планирует поиск с небольшой задержкой,
  // чтобы не отправлять запрос после каждой буквы.
  private scheduleCategorySearch(value: string, immediately = false): void {
    if (this.categorySearchTimer !== null) {
      clearTimeout(this.categorySearchTimer);
      this.categorySearchTimer = null;
    }

    const search = this.normalizeCategorySearch(value);
    const requestNumber = ++this.categorySearchRequestNumber;

    this.categorySearchResults.set([]);
    this.categorySearchError.set('');

    if (Array.from(search).length < 2) {
      this.isSearchingCategories.set(false);
      return;
    }

    this.isSearchingCategories.set(true);

    const executeSearch = (): void => {
      this.categorySearchTimer = null;
      this.loadCategorySearch(search, requestNumber);
    };

    if (immediately) {
      executeSearch();
      return;
    }

    this.categorySearchTimer = setTimeout(executeSearch, 350);
  }

  // Выполняет серверный поиск конечных категорий.
  private loadCategorySearch(search: string, requestNumber: number): void {
    this.productCategoryApi.searchCategories(search).subscribe({
      next: (response) => {
        if (requestNumber !== this.categorySearchRequestNumber) {
          return;
        }

        this.categorySearchResults.set(response.items);
        this.isSearchingCategories.set(false);
      },

      error: (error: unknown) => {
        if (requestNumber !== this.categorySearchRequestNumber) {
          return;
        }

        this.categorySearchResults.set([]);
        this.isSearchingCategories.set(false);
        this.categorySearchError.set(
          this.readRequestError(error, 'Не удалось выполнить поиск категорий.'),
        );
      },
    });
  }

  // Начинает выбор с корневого уровня.
  private loadCategories(): void {
    this.categoryNavigationPath.set([]);
    this.loadCategoryLevel(null);
  }

  // Загружает только один уровень дерева категорий.
  private loadCategoryLevel(parentCategoryId: string | null): void {
    const requestNumber = ++this.categoryLevelRequestNumber;

    this.isLoadingCategories.set(true);
    this.categoryLoadError.set('');

    this.productCategoryApi.getCategoryLevel(parentCategoryId).subscribe({
      next: (response) => {
        if (requestNumber !== this.categoryLevelRequestNumber) {
          return;
        }

        this.categories.set(response.items);
        this.isLoadingCategories.set(false);
      },

      error: () => {
        if (requestNumber !== this.categoryLevelRequestNumber) {
          return;
        }

        this.categories.set([]);
        this.isLoadingCategories.set(false);
        this.categoryLoadError.set('Не удалось загрузить категории товаров.');
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

        const currentAttributeStates = this.attributeStates();

        this.attributeStates.set({
          ...this.createAttributeStates(response.items),
          ...currentAttributeStates,
        });

        this.isLoadingCategoryDefinition.set(false);
      },

      error: (error: unknown) => {
        if (this.selectedCategoryId() !== categoryId) {
          return;
        }

        this.categoryFormDefinition.set(null);

        this.attributeStates.set({});

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
   * * перед отправкой товара на сервер.
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
      if (this.isAttributeUsedAsVariantSelector(attribute.attributeId)) {
        continue;
      }

      const validationError = this.validateProductAttribute(attribute);

      if (validationError) {
        return validationError;
      }
    }

    const imageValidationError = this.validateProductImages();

    if (imageValidationError) {
      return imageValidationError;
    }

    return '';
  }

  /**
   * Проверяет локальные изображения
   * перед единым созданием товара.
   */
  private validateProductImages(): string {
    const validateConcreteVariantImages = (
      state: SellerProductVariantState,
      subject: string,
    ): string => {
      if (state.images.length < 1) {
        return `Выберите главное изображение ${subject}.`;
      }

      if (state.images.length > 7) {
        return `Для ${subject} можно выбрать не более семи изображений.`;
      }

      const usedSlots = new Set<number>();

      for (const image of state.images) {
        const slotIndex = image.slotIndex;

        if (slotIndex < 0 || slotIndex > 6 || usedSlots.has(slotIndex)) {
          return `Проверьте расположение изображений ${subject}.`;
        }

        if (image.isMain !== (slotIndex === 0)) {
          return `Проверьте главное изображение ${subject}.`;
        }

        usedSlots.add(slotIndex);
      }

      if (!usedSlots.has(0)) {
        return `Выберите главное изображение ${subject}.`;
      }

      return '';
    };

    if (this.productType === 'simple') {
      const simpleVariant = this.simpleProductVariant();

      if (simpleVariant === null) {
        return 'Выберите главное изображение товара.';
      }

      return validateConcreteVariantImages(simpleVariant, 'товара');
    }

    const roots = this.variantStates();
    const hasSecondSelector = this.hasSecondVariantSelector();
    const firstSelectorUsesImages = this.variantSelectors()[0]?.displayType === 'image';

    for (let rootIndex = 0; rootIndex < roots.length; rootIndex += 1) {
      const root = roots[rootIndex];
      const rootName = root.variantValue.trim() || `№${rootIndex + 1}`;

      const concreteVariants = hasSecondSelector ? root.children : [root];

      for (let concreteIndex = 0; concreteIndex < concreteVariants.length; concreteIndex += 1) {
        const concreteVariant = concreteVariants[concreteIndex];

        const concreteName = hasSecondSelector
          ? `${rootName} → ${concreteVariant.variantValue.trim() || `№${concreteIndex + 1}`}`
          : rootName;

        const validationError = validateConcreteVariantImages(
          concreteVariant,
          `варианта «${concreteName}»`,
        );

        if (validationError) {
          return validationError;
        }
      }

      const selectorPreviewCount = concreteVariants.reduce(
        (count, concreteVariant) =>
          count + concreteVariant.images.filter((image) => image.isSelectorPreview).length,
        0,
      );

      if (firstSelectorUsesImages && selectorPreviewCount !== 1) {
        return `Выберите одно изображение-превью для варианта «${rootName}».`;
      }

      if (!firstSelectorUsesImages && selectorPreviewCount !== 0) {
        return `Проверьте изображения варианта «${rootName}».`;
      }
    }

    return '';
  }

  /**
   * Проверяет, используется ли характеристика
   * как один из уровней вариантов товара.
   */
  protected isAttributeUsedAsVariantSelector(attributeId: string): boolean {
    return (
      this.productType === 'variant' &&
      this.variantSelectors().some((selector) => selector.attributeId === attributeId)
    );
  }

  /**
   * Проверяет значение одной характеристики
   * в соответствии с её типом данных.
   *
   * Пустое значение разрешено только тогда,
   * когда характеристика не является обязательной.
   */
  private validateProductAttribute(attribute: SellerProductCategoryAttribute): string {
    const state = this.attributeState(attribute.attributeId);

    const requiredMessage = `Заполните обязательную характеристику «${attribute.attributeName}».`;

    switch (attribute.dataType) {
      case 'text': {
        if (attribute.isRequired && !state.valueText.trim()) {
          return requiredMessage;
        }

        return '';
      }

      case 'integer': {
        const valueInteger = state.valueInteger.trim();

        if (!valueInteger) {
          return attribute.isRequired ? requiredMessage : '';
        }

        if (!/^-?\d+$/.test(valueInteger)) {
          return `Характеристика «${attribute.attributeName}» должна содержать целое число.`;
        }

        return '';
      }

      case 'decimal': {
        const valueDecimal = state.valueDecimal.trim();

        if (!valueDecimal) {
          return attribute.isRequired ? requiredMessage : '';
        }

        if (!/^-?\d{1,14}([.,]\d{1,6})?$/.test(valueDecimal)) {
          return `Проверьте числовое значение характеристики «${attribute.attributeName}».`;
        }

        return '';
      }

      case 'boolean':
        if (attribute.isRequired && state.valueBoolean === null) {
          return requiredMessage;
        }

        return '';

      case 'select':
        if (attribute.isRequired && state.attributeOptionIds.length !== 1) {
          return requiredMessage;
        }

        return '';

      case 'multiselect':
        if (attribute.isRequired && state.attributeOptionIds.length === 0) {
          return requiredMessage;
        }

        return '';
    }
  }

  /**
   * Проверяет селекторы и дерево вариантов
   * по идентификаторам справочных характеристик.
   */
  private validateVariantConfiguration(): string {
    const selectors = this.variantSelectors();

    if (selectors.length < 1 || selectors.length > 2) {
      return 'Добавьте один или два уровня вариантов товара.';
    }

    const usedAttributeIds = new Set<string>();

    for (let index = 0; index < selectors.length; index += 1) {
      const selector = selectors[index];

      const attribute = this.variantCategoryAttributes().find(
        (item) => item.attributeId === selector.attributeId,
      );

      if (!attribute) {
        return `Выберите характеристику для уровня вариантов №${index + 1}.`;
      }

      if (usedAttributeIds.has(selector.attributeId)) {
        return 'Одна характеристика не может использоваться на двух уровнях вариантов.';
      }

      usedAttributeIds.add(selector.attributeId);

      if (selector.displayType !== 'image' && selector.displayType !== 'text') {
        return `Выберите способ отображения характеристики «${attribute.attributeName}».`;
      }
    }

    const roots = this.variantStates();

    if (roots.length < 1 || roots.length > 50) {
      return 'Добавьте от 1 до 50 значений первого уровня вариантов.';
    }

    const rootOptions = this.variantSelectorOptions(0);

    const usedRootOptionIds = new Set<string>();

    let concreteVariantCount = 0;

    for (let rootIndex = 0; rootIndex < roots.length; rootIndex += 1) {
      const root = roots[rootIndex];

      const rootOption = rootOptions.find(
        (option) => option.attributeOptionId === root.attributeOptionId,
      );

      if (!rootOption) {
        return `Выберите значение характеристики «${this.variantSelectorName(0)}» для варианта №${rootIndex + 1}.`;
      }

      if (usedRootOptionIds.has(root.attributeOptionId)) {
        return `Значение «${rootOption.optionValue}» первого уровня повторяется.`;
      }

      usedRootOptionIds.add(root.attributeOptionId);

      if (selectors.length === 1) {
        const offerError = this.validateOfferValues(
          root.priceAmount,
          root.stockQuantity,
          `варианта «${rootOption.optionValue}»`,
        );

        if (offerError) {
          return offerError;
        }

        concreteVariantCount += 1;

        continue;
      }

      if (root.children.length < 1 || root.children.length > 100) {
        return `Добавьте от 1 до 100 значений второго уровня для «${rootOption.optionValue}».`;
      }

      const childOptions = this.variantSelectorOptions(1);

      const usedChildOptionIds = new Set<string>();

      for (let childIndex = 0; childIndex < root.children.length; childIndex += 1) {
        const child = root.children[childIndex];

        const childOption = childOptions.find(
          (option) => option.attributeOptionId === child.attributeOptionId,
        );

        if (!childOption) {
          return `Выберите значение характеристики «${this.variantSelectorName(1)}» для варианта «${rootOption.optionValue}» №${childIndex + 1}.`;
        }

        if (usedChildOptionIds.has(child.attributeOptionId)) {
          return `Вариант «${rootOption.optionValue} → ${childOption.optionValue}» повторяется.`;
        }

        usedChildOptionIds.add(child.attributeOptionId);

        const offerError = this.validateOfferValues(
          child.priceAmount,
          child.stockQuantity,
          `варианта «${rootOption.optionValue} → ${childOption.optionValue}»`,
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
   * Создаёт конфигурацию нового вариантного товара
   * для единого multipart-запроса.
   */
  private buildVariantConfiguration(): SellerCreateProductVariantConfigurationRequest {
    const hasSecondSelector = this.hasSecondVariantSelector();

    return {
      selectors: this.variantSelectors().map((selector) => ({
        attributeId: selector.attributeId,
        displayType: selector.displayType,
      })),

      variants: this.variantStates().map((root) =>
        this.buildCreateProductVariantNode(root, hasSecondSelector),
      ),
    };
  }

  /**
   * Преобразует один локальный узел вариантов.
   *
   * clientKey передаётся как clientVariantKey
   * только для связи файлов с создаваемым вариантом.
   */
  private buildCreateProductVariantNode(
    state: SellerProductVariantState,
    hasSecondSelector: boolean,
  ): SellerCreateProductVariantNodeRequest {
    if (hasSecondSelector) {
      return {
        clientVariantKey: state.clientKey,
        attributeOptionId: state.attributeOptionId,
        children: state.children.map((child) => this.buildCreateProductVariantNode(child, false)),
        offer: null,
      };
    }

    return {
      clientVariantKey: state.clientKey,
      attributeOptionId: state.attributeOptionId,
      children: [],
      offer: {
        stockQuantity: Number(state.stockQuantity.trim()),
        priceAmount: state.priceAmount.trim().replace(',', '.'),
        oldPriceAmount: null,
      },
    };
  }

  /**
   * Собирает метаданные и файлы изображений
   * в одинаковом стабильном порядке.
   */
  private buildCreateProductImages(): {
    metadata: SellerCreateProductImageRequest[];
    files: File[];
  } {
    const metadata: SellerCreateProductImageRequest[] = [];
    const files: File[] = [];

    const appendVariantImages = (
      state: SellerProductVariantState,
      clientVariantKey: number | null,
    ): void => {
      const orderedImages = [...state.images].sort(
        (left, right) => left.slotIndex - right.slotIndex,
      );

      for (const image of orderedImages) {
        const slotIndex = image.slotIndex;

        metadata.push({
          clientVariantKey,
          slotIndex,
          isSelectorPreview: image.isSelectorPreview,
        });

        files.push(image.file);
      }
    };

    if (this.productType === 'simple') {
      const simpleVariant = this.simpleProductVariant();

      if (simpleVariant !== null) {
        appendVariantImages(simpleVariant, null);
      }

      return {
        metadata,
        files,
      };
    }

    const hasSecondSelector = this.hasSecondVariantSelector();

    for (const root of this.variantStates()) {
      if (!hasSecondSelector) {
        appendVariantImages(root, root.clientKey);

        continue;
      }

      for (const child of root.children) {
        appendVariantImages(child, child.clientKey);
      }
    }

    return {
      metadata,
      files,
    };
  }

  /**
   * Создаёт пустой или частично заполненный
   * локальный вариант с уникальным ключом.
   */
  private createEmptyVariantState(
    input: Partial<Omit<SellerProductVariantState, 'clientKey'>> = {},
  ): SellerProductVariantState {
    const state: SellerProductVariantState = {
      clientKey: this.nextVariantClientKey,
      attributeOptionId: input.attributeOptionId ?? '',
      variantValue: input.variantValue ?? '',
      priceAmount: input.priceAmount ?? '',
      stockQuantity: input.stockQuantity ?? '',
      images: [...(input.images ?? [])],
      children: [...(input.children ?? [])],
    };

    this.nextVariantClientKey += 1;

    return state;
  }

  /**
   * Находит корневой или дочерний вариант
   * по его локальным ключам.
   */
  private findConcreteVariantState(
    rootClientKey: number,
    childClientKey: number | null,
  ): SellerProductVariantState | null {
    const simpleVariant = this.simpleProductVariant();

    const root =
      this.variantStates().find((item) => item.clientKey === rootClientKey) ??
      (simpleVariant?.clientKey === rootClientKey ? simpleVariant : null);

    if (!root) {
      return null;
    }

    if (childClientKey === null) {
      return root;
    }

    return root.children.find((child) => child.clientKey === childClientKey) ?? null;
  }

  /**
   * Неизменяемо обновляет корневой либо дочерний
   * вариант по локальному ключу.
   */
  private updateVariantState(
    rootClientKey: number,
    childClientKey: number | null,
    update: (currentState: SellerProductVariantState) => SellerProductVariantState,
  ): void {
    const simpleVariant = this.simpleProductVariant();

    if (childClientKey === null && simpleVariant?.clientKey === rootClientKey) {
      this.simpleProductVariant.set(update(simpleVariant));

      return;
    }

    this.updateRootVariant(rootClientKey, (currentRoot) => {
      if (childClientKey === null) {
        return update(currentRoot);
      }

      return {
        ...currentRoot,
        children: currentRoot.children.map((child) =>
          child.clientKey === childClientKey ? update(child) : child,
        ),
      };
    });
  }

  /**
   * Неизменяемо обновляет один корневой вариант.
   */
  private updateRootVariant(
    rootClientKey: number,
    update: (currentRoot: SellerProductVariantState) => SellerProductVariantState,
  ): void {
    this.variantStates.update((currentRoots) =>
      currentRoots.map((root) => (root.clientKey === rootClientKey ? update(root) : root)),
    );
  }

  /**
   * Проверяет изображения корня и всех его потомков.
   */
  private variantStateContainsImages(state: SellerProductVariantState): boolean {
    return (
      state.images.length > 0 ||
      state.children.some((child) => this.variantStateContainsImages(child))
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
      if (this.isAttributeUsedAsVariantSelector(attribute.attributeId)) {
        continue;
      }

      const state = this.attributeState(attribute.attributeId);

      switch (attribute.dataType) {
        case 'text': {
          const valueText = state.valueText.trim();

          if (valueText) {
            items.push({
              attributeId: attribute.attributeId,
              valueText,
            });
          }

          break;
        }

        case 'integer': {
          const valueInteger = state.valueInteger.trim();

          if (valueInteger) {
            items.push({
              attributeId: attribute.attributeId,
              valueInteger,
            });
          }

          break;
        }

        case 'decimal': {
          const valueDecimal = state.valueDecimal.trim();

          if (valueDecimal) {
            items.push({
              attributeId: attribute.attributeId,
              valueDecimal,
            });
          }

          break;
        }

        case 'boolean':
          if (state.valueBoolean !== null) {
            items.push({
              attributeId: attribute.attributeId,
              valueBoolean: state.valueBoolean,
            });
          }

          break;

        case 'select':
        case 'multiselect':
          if (state.attributeOptionIds.length > 0) {
            items.push({
              attributeId: attribute.attributeId,
              attributeOptionIds: [...state.attributeOptionIds],
            });
          }

          break;
      }
    }

    return items;
  }

  /**
   * Создаёт пустое состояние полей
   * для всех характеристик выбранной категории.
   */
  private createAttributeStates(
    attributes: SellerProductCategoryAttribute[],
  ): Record<string, SellerProductAttributeState> {
    const states: Record<string, SellerProductAttributeState> = {};

    for (const attribute of attributes) {
      states[attribute.attributeId] = this.createEmptyAttributeState();
    }

    return states;
  }

  private createEmptyAttributeState(): SellerProductAttributeState {
    return {
      valueText: '',
      valueInteger: '',
      valueDecimal: '',
      valueBoolean: null,
      attributeOptionIds: [],
    };
  }

  private updateAttributeState(
    attributeId: string,
    update: (currentState: SellerProductAttributeState) => SellerProductAttributeState,
  ): void {
    this.attributeStates.update((currentStates) => ({
      ...currentStates,
      [attributeId]: update(currentStates[attributeId] ?? this.createEmptyAttributeState()),
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
