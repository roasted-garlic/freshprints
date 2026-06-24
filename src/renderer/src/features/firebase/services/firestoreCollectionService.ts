import { collection, type CollectionReference, type DocumentData } from "firebase/firestore";

import { db } from "../../../config/firebase";
import { FIRESTORE_COLLECTIONS, type FirestoreCollectionKey } from "../constants/firestoreCollections";

export const firestoreCollectionService = {
  getCollectionReference(collectionKey: FirestoreCollectionKey): CollectionReference<DocumentData> {
    return collection(db, FIRESTORE_COLLECTIONS[collectionKey]);
  },

  getUsersCollection() {
    return this.getCollectionReference("users");
  },

  getDesignsCollection() {
    return this.getCollectionReference("designs");
  },

  getCategoriesCollection() {
    return this.getCollectionReference("categories");
  },

  getCustomersCollection() {
    return this.getCollectionReference("customers");
  },

  getCustomerRequestsCollection() {
    return this.getCollectionReference("customerRequests");
  },

  getShowQueuesCollection() {
    return this.getCollectionReference("showQueues");
  },

  getShowQueueItemsCollection() {
    return this.getCollectionReference("showQueueItems");
  },

  getSettingsCollection() {
    return this.getCollectionReference("settings");
  },

  getAuditLogsCollection() {
    return this.getCollectionReference("auditLogs");
  },
};
