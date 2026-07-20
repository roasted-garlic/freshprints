export interface AddPortalCatalogDesignToPrintRequestRequest {
  printRequestId: string;
  designId: string;
  /** Defaults to 1. Applied as create quantity or increment delta. */
  quantityDelta?: number;
  /**
   * When true, always create a new line (and charge Cap A) even if the design
   * already exists on the request (e.g. additional size variant).
   */
  forceNewLine?: boolean;
  printWidthInches?: number;
  printHeightInches?: number;
  sortOrder?: number;
}

export interface AddPortalCatalogDesignToPrintRequestResponse {
  kind: "created" | "incremented";
  itemId: string;
  printRequestId: string;
  designId: string;
  quantity: number;
}
