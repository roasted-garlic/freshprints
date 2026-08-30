export function isCustomerUploadShowAllocation(data: {
  sourceType?: string;
  customerUploadId?: string;
}): boolean {
  const sourceType = typeof data.sourceType === "string" ? data.sourceType : "catalog_design";
  if (sourceType === "customer_upload") {
    return true;
  }
  return typeof data.customerUploadId === "string" && data.customerUploadId.trim().length > 0;
}

export function isCatalogDesignShowAllocation(data: {
  sourceType?: string;
  customerUploadId?: string;
  designId?: string;
}): boolean {
  if (isCustomerUploadShowAllocation(data)) {
    return false;
  }
  return typeof data.designId === "string" && data.designId.trim().length > 0;
}
