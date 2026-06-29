export const FIRESTORE_COLLECTIONS = {
  users: "users",
  designs: "designs",
  categories: "categories",
  customers: "customers",
  printRequests: "printRequests",
  printRequestItems: "printRequestItems",
  customerRequests: "customerRequests",
  showQueues: "showQueues",
  showQueueItems: "showQueueItems",
  settings: "settings",
  auditLogs: "auditLogs",
} as const;

export type FirestoreCollectionKey = keyof typeof FIRESTORE_COLLECTIONS;
export type FirestoreCollectionName = (typeof FIRESTORE_COLLECTIONS)[FirestoreCollectionKey];

export const requiredFirestoreCollectionNames = Object.values(FIRESTORE_COLLECTIONS);
