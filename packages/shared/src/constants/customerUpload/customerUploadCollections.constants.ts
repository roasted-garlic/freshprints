export const CUSTOMER_UPLOAD_COLLECTIONS = {
  customerUploads: "customerUploads",
  customerUploadBatches: "customerUploadBatches",
} as const;

export type CustomerUploadCollectionName =
  (typeof CUSTOMER_UPLOAD_COLLECTIONS)[keyof typeof CUSTOMER_UPLOAD_COLLECTIONS];
