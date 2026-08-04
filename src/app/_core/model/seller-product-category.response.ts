export interface SellerProductCategoryNode {
  categoryId: string;
  parentCategoryId: string | null;
  categoryName: string;
  slug: string;
  sortOrder: number;
  depth: number;
  isLeaf: boolean;
  children: SellerProductCategoryNode[];
}

export interface SellerProductCategoryTreeResponse {
  items: SellerProductCategoryNode[];
}

export type SellerProductAttributeDataType =
  | 'text'
  | 'integer'
  | 'decimal'
  | 'boolean'
  | 'select'
  | 'multiselect';

export interface SellerProductCategoryBreadcrumb {
  categoryId: string;
  categoryName: string;
  slug: string;
  depth: number;
}

export interface SellerProductAttributeOption {
  attributeOptionId: string;
  optionValue: string;
  sortOrder: number;
}

export interface SellerProductCategoryAttribute {
  attributeId: string;
  attributeName: string;
  slug: string;
  dataType: SellerProductAttributeDataType;
  unitName: string | null;
  isRequired: boolean;
  isFilterable: boolean;
  isVariant: boolean;
  sortOrder: number;
  options: SellerProductAttributeOption[];
}

export interface SellerProductCategoryFormDefinition {
  categoryId: string;
  categoryPath: SellerProductCategoryBreadcrumb[];
  items: SellerProductCategoryAttribute[];
}
