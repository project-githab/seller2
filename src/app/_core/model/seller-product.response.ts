/**
 * Значение одной характеристики нового товара.
 *
 * Конкретное поле значения выбирается
 * в соответствии с типом характеристики категории.
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
 * Цена и доступный остаток
 * одного продаваемого варианта.
 */
export interface SellerCreateProductOfferRequest {
  stockQuantity: number;
  priceAmount: string;
  oldPriceAmount: string | null;
}

/**
 * Способ отображения значений
 * селектора вариантов товара.
 */
export type SellerProductVariantDisplayType = 'image' | 'text';

/**
 * Один уровень выбора вариантов товара.
 */
export interface SellerProductVariantSelectorRequest {
  attributeId: string;
  displayType: SellerProductVariantDisplayType;
}

/**
 * Характеристики нового товара внутри
 * единого запроса создания.
 */
export interface SellerCreateProductAttributesRequest {
  items: SellerProductAttributeValueRequest[];
}

/**
 * Один узел дерева вариантов нового товара.
 *
 * clientVariantKey существует только в Angular
 * и связывает выбранные файлы с создаваемым вариантом.
 */
export interface SellerCreateProductVariantNodeRequest {
  clientVariantKey: number;
  attributeOptionId: string;
  children: SellerCreateProductVariantNodeRequest[];
  offer: SellerCreateProductOfferRequest | null;
}

/**
 * Полная конфигурация вариантного товара.
 */
export interface SellerCreateProductVariantConfigurationRequest {
  selectors: SellerProductVariantSelectorRequest[];
  variants: SellerCreateProductVariantNodeRequest[];
}

/**
 * Расположение одного файла изображения
 * в форме нового товара.
 *
 * Порядок элементов массива совпадает
 * с порядком файлов images в FormData.
 */
export interface SellerCreateProductImageRequest {
  clientVariantKey: number | null;
  slotIndex: number;
  isSelectorPreview: boolean;
}

/**
 * Полное JSON-описание нового товара.
 *
 * Файлы изображений передаются отдельными
 * частями того же multipart-запроса.
 */
export interface SellerCreateProductRequest {
  categoryId: string;
  productType: 'simple' | 'variant';
  productName: string;
  brandName: string;
  bullets: string[];
  attributes: SellerCreateProductAttributesRequest;
  simpleOffer: SellerCreateProductOfferRequest | null;
  variantConfiguration: SellerCreateProductVariantConfigurationRequest | null;
  images: SellerCreateProductImageRequest[];
}

/**
 * Результат атомарного создания товара.
 */
export interface SellerCreateProductResponse {
  productCardId: string;
  moderationStatus: 'pending' | 'approved';
}
