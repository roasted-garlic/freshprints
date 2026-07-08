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

  getTagsCollection() {
    return this.getCollectionReference("tags");
  },

  getCustomersCollection() {
    return this.getCollectionReference("customers");
  },

  getCustomerUsernamesCollection() {
    return this.getCollectionReference("customerUsernames");
  },

  getPrintRequestsCollection() {
    return this.getCollectionReference("printRequests");
  },

  getPrintRequestItemsCollection() {
    return this.getCollectionReference("printRequestItems");
  },

  getCountersCollection() {
    return this.getCollectionReference("counters");
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

  getUpcomingShowsCollection() {
    return this.getCollectionReference("upcomingShows");
  },

  getShowAllocationsCollection() {
    return this.getCollectionReference("showAllocations");
  },

  getGangSheetsCollection() {
    return this.getCollectionReference("gangSheets");
  },

  getGangSheetItemsCollection() {
    return this.getCollectionReference("gangSheetItems");
  },

  getSettingsCollection() {
    return this.getCollectionReference("settings");
  },

  getAuditLogsCollection() {
    return this.getCollectionReference("auditLogs");
  },
};
