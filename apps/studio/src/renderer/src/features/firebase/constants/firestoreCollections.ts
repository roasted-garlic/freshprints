export const FIRESTORE_COLLECTIONS = {
  users: "users",
  designs: "designs",
  categories: "categories",
  tags: "tags",
  customers: "customers",
  customerUsernames: "customerUsernames",
  printRequests: "printRequests",
  printRequestItems: "printRequestItems",
  customerUploads: "customerUploads",
  customerUploadBatches: "customerUploadBatches",
  counters: "counters",
  customerRequests: "customerRequests",
  showQueues: "showQueues",
  showQueueItems: "showQueueItems",
  upcomingShows: "upcomingShows",
  showAllocations: "showAllocations",
  gangSheets: "gangSheets",
  gangSheetItems: "gangSheetItems",
  staffInboxAcks: "staffInboxAcks",
  staffInboxAlertDeliveries: "staffInboxAlertDeliveries",
  designIssueReports: "designIssueReports",
  assistedCreationUpdateAcks: "assistedCreationUpdateAcks",
  settings: "settings",
  auditLogs: "auditLogs",
} as const;

export type FirestoreCollectionKey = keyof typeof FIRESTORE_COLLECTIONS;
export type FirestoreCollectionName = (typeof FIRESTORE_COLLECTIONS)[FirestoreCollectionKey];

export const requiredFirestoreCollectionNames = Object.values(FIRESTORE_COLLECTIONS);
