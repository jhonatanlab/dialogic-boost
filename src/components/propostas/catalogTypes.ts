export type CatalogFieldType = "text" | "textarea" | "number" | "switch" | "select";

export interface CatalogField {
  key: string;
  label: string;
  type: CatalogFieldType;
  placeholder?: string;
  options?: { value: string; label: string }[];
  colSpan?: 1 | 2;
  readOnly?: boolean;
  step?: string;
}

export interface CatalogColumn {
  key: string;
  label: string;
  format?: (row: any) => string;
}
