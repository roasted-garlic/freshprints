export const PRODUCTION_SHAPED_PRINT_REQUEST_ID = "production-shaped-request";
export const PRODUCTION_SHAPED_SHOW_ID = "production-shaped-show";

type SourceType = "catalog_design" | "customer_upload";

export interface ProductionShapedPrintRequestItem {
  id: string;
  printRequestId: string;
  sourceType: SourceType;
  designId?: string;
  customerUploadId?: string;
  quantity: number;
}

export function buildProductionShapedPrintRequestItems(): ProductionShapedPrintRequestItem[] {
  const catalog = Array.from({ length: 5 }, (_, index) => ({
    id: `catalog-item-${index}`,
    printRequestId: PRODUCTION_SHAPED_PRINT_REQUEST_ID,
    sourceType: "catalog_design" as const,
    designId: `catalog-design-${index}`,
    quantity: 1,
  }));
  const uploads = Array.from({ length: 13 }, (_, index) => ({
    id: `upload-item-${index}`,
    printRequestId: PRODUCTION_SHAPED_PRINT_REQUEST_ID,
    sourceType: "customer_upload" as const,
    customerUploadId: `customer-upload-${index}`,
    quantity: index === 0 ? 4 : 1,
  }));

  return [
    ...catalog,
    ...uploads,
    {
      id: "upload-duplicate-a",
      printRequestId: PRODUCTION_SHAPED_PRINT_REQUEST_ID,
      sourceType: "customer_upload",
      customerUploadId: "customer-upload-duplicate",
      quantity: 3,
    },
    {
      id: "upload-duplicate-b",
      printRequestId: PRODUCTION_SHAPED_PRINT_REQUEST_ID,
      sourceType: "customer_upload",
      customerUploadId: "customer-upload-duplicate",
      quantity: 1,
    },
  ];
}

export interface ProductionShapedShowAllocation {
  allocationId: string;
  upcomingShowId: string;
  printRequestId: string;
  printRequestItemId: string;
  sourceType: SourceType;
  designId?: string;
  customerUploadId?: string;
  status: "done" | "canceled";
  allocatedQuantity: number;
  printWidthInches: number;
  printHeightInches: number;
}

export function buildProductionShapedShowAllocations(): ProductionShapedShowAllocation[] {
  const items = buildProductionShapedPrintRequestItems();
  const active = items.map((item, index) => ({
    allocationId: `active-allocation-${index}`,
    upcomingShowId: PRODUCTION_SHAPED_SHOW_ID,
    printRequestId: PRODUCTION_SHAPED_PRINT_REQUEST_ID,
    printRequestItemId: item.id,
    sourceType: item.sourceType,
    ...(item.designId ? { designId: item.designId } : {}),
    ...(item.customerUploadId ? { customerUploadId: item.customerUploadId } : {}),
    status: "done" as const,
    allocatedQuantity: index === items.length - 1 ? 6 : 1,
    printWidthInches: index === items.length - 1 ? 13 : 10,
    printHeightInches: 14,
  }));
  const canceled = Array.from({ length: 14 }, (_, index) => ({
    allocationId: `canceled-allocation-${index}`,
    upcomingShowId: PRODUCTION_SHAPED_SHOW_ID,
    printRequestId: PRODUCTION_SHAPED_PRINT_REQUEST_ID,
    printRequestItemId: `historical-item-${index}`,
    sourceType: "catalog_design" as const,
    designId: `historical-design-${index}`,
    status: "canceled" as const,
    allocatedQuantity: index < 7 ? 2 : 1,
    printWidthInches: 10,
    printHeightInches: 14,
  }));

  return [...active, ...canceled];
}
