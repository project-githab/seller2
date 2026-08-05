/**
 * Возможные состояния модерации карточки товара.
 */
export type SellerProductModerationStatus = 'draft' | 'pending' | 'approved' | 'rejected';

/**
 * Основные данные, необходимые серверу
 * для первоначального создания черновика товара.
 */
export interface SellerCreateProductDraftRequest {
  categoryId: string;
  productName: string;
  brandName: string;
}

/**
 * Созданный сервером черновик товара.
 *
 * Все идентификаторы передаются строками,
 * чтобы не потерять точность числовых ID JavaScript.
 */
export interface SellerCreateProductDraftResponse {
  productCardId: string;
  categoryId: string;
  productName: string;
  brandName: string;
  moderationStatus: SellerProductModerationStatus;
}

/**
 * Результат завершения добавления товара.
 *
 * Статус approved означает немедленную публикацию,
 * а pending — передачу товара на модерацию.
 */
export interface SellerAddProductResponse {
  productCardId: string;
  moderationStatus: SellerProductModerationStatus;
}

/**
 * Значение одной характеристики товара.
 *
 * Конкретное поле значения выбирается по типу
 * характеристики, полученному для категории.
 */
export interface SellerProductAttributeValueRequest {
  attributeId: string;
  attributeOptionIds?: string[];
  valueText?: string;
  valueInteger?: string;
  valueDecimal?: string;
  valueBoolean?: boolean;
}

/**
 * Полный набор заполненных характеристик,
 * сохраняемый для одной карточки товара.
 */
export interface SellerSaveProductAttributesRequest {
  items: SellerProductAttributeValueRequest[];
}

/**
 * Текстовые данные существующей карточки товара.
 *
 * Массив bullets позднее будет заполняться
 * из полей преимуществ товара в форме продавца.
 */
export interface SellerSaveProductDetailsRequest {
  productName: string;
  brandName: string;
  bullets: string[];
}

/**
 * Цена и доступный остаток одиночного товара.
 *
 * Старая цена необязательна и передаётся как null,
 * если продавец её не указал.
 */
export interface SellerSaveProductOfferRequest {
  stockQuantity: number;
  priceAmount: string;
  oldPriceAmount: string | null;
}

/**
 * Способ отображения значений селектора вариантов.
 *
 * Значение image используется, например, для цвета
 * с визуальным переключением по изображениям товара.
 */
export type SellerProductVariantDisplayType = 'image' | 'text';

/**
 * Описание одного уровня вариантов,
 * отправляемое на Go-сервер.
 */
export interface SellerProductVariantSelectorRequest {
  attributeId: string;
  displayType: SellerProductVariantDisplayType;
}

/**
 * Один узел дерева вариантов товара.
 *
 * Идентификатор отсутствует у нового варианта
 * и передаётся при изменении существующего.
 *
 * Для конечного варианта заполняется offer.
 * Для родительского варианта заполняется children.
 */
export interface SellerProductVariantNodeRequest {
  productVariantId?: string;
  attributeOptionId: string;
  children: SellerProductVariantNodeRequest[];
  offer: SellerSaveProductOfferRequest | null;
}

/**
 * Полная конфигурация вариантов товара,
 * сохраняемая одним запросом.
 */
export interface SellerSaveProductVariantConfigurationRequest {
  selectors: SellerProductVariantSelectorRequest[];
  variants: SellerProductVariantNodeRequest[];
}

/**
 * Сохранённый сервером селектор вариантов.
 */
export interface SellerProductVariantSelectorResponse {
  productVariationSelectorId: string;
  attributeId: string;
  selectorLevel: number;
  selectorName: string;
  displayType: SellerProductVariantDisplayType;
}

/**
 * Сохранённый сервером вариант товара.
 *
 * Ответ является плоским списком, а связь
 * с родительским вариантом задаёт parentVariantId.
 */
export interface SellerProductVariantResponse {
  productVariantId: string;
  parentVariantId: string | null;
  attributeId: string;
  attributeOptionId: string;
  variantValue: string;
  sortOrder: number;
  offer: SellerProductOfferResponse | null;
}

/**
 * Результат сохранения полной конфигурации вариантов.
 */
export interface SellerSaveProductVariantConfigurationResponse {
  selectors: SellerProductVariantSelectorResponse[];
  variants: SellerProductVariantResponse[];
}

/**
 * Сохранённое предложение продавца
 * для одной вариации товара.
 */
export interface SellerProductOfferResponse {
  productVariantId: string;
  productOfferId: string;
  stockQuantity: number;
  priceAmount: string;
  oldPriceAmount: string | null;
}

/**
 * Сохранённое значение одной характеристики,
 * возвращаемое редактором черновика.
 */
export interface SellerProductEditorAttributeValue {
  attributeId: string;
  attributeOptionIds: string[];
  valueText: string | null;
  valueInteger: string | null;
  valueDecimal: string | null;
  valueBoolean: boolean | null;
}

/**
 * Изображение товара, ранее сохранённое
 * на сервере для конкретной вариации.
 */
export interface SellerProductEditorImage {
  imageId: string;
  sortOrder: number;
  isMain: boolean;
  isSelectorPreview: boolean;
  productPageUrl: string;
  catalogUrl: string;
  thumbnailUrl: string;
}

/**
 * Вариация товара вместе с предложением
 * продавца и загруженными изображениями.
 */
export interface SellerProductEditorVariant {
  productVariantId: string;
  parentVariantId: string | null;
  attributeId: string | null;
  attributeOptionId: string | null;
  variantValue: string;
  sortOrder: number;
  offer: SellerProductOfferResponse | null;
  images: SellerProductEditorImage[];
}

/**
 * Полное состояние существующего черновика,
 * возвращаемое Go API для продолжения редактирования.
 */
export interface SellerProductEditorResponse {
  productCardId: string;
  categoryId: string;
  productName: string;
  brandName: string;
  moderationStatus: SellerProductModerationStatus;
  updatedAt: string;
  bullets: string[];
  attributeValues: SellerProductEditorAttributeValue[];

  /**
   * Уровни вариантов товара, например:
   * «Цвет» или «Цвет → Размер».
   */
  variantSelectors: SellerProductVariantSelectorResponse[];

  /**
   * Плоский список родительских и конечных
   * вариантов существующего товара.
   */
  variants: SellerProductEditorVariant[];
}
