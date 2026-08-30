import { createHash } from "node:crypto";

import type { DeletionBlocker } from "../../../packages/shared/src/types/deletion/deletion.types";

export const CUSTOMER_HISTORY_BLOCKER_CODES = {
  PRINT_REQUESTS: "print_requests",
  SHOW_ALLOCATIONS: "show_allocations",
  CUSTOMER_UPLOADS: "customer_uploads",
  CUSTOMER_UPLOAD_BATCHES: "customer_upload_batches",
  ASSISTED_CREATION: "assisted_creation_requests",
  CUSTOMER_NOTIFICATIONS: "customer_notifications",
  EMAIL_DELIVERY_JOBS: "email_delivery_jobs",
  ETSY_RECOMMENDATIONS: "etsy_recommendation_requests",
  ETSY_SUGGESTIONS: "etsy_suggestion_requests",
  DESIGN_ISSUE_REPORTS: "design_issue_reports",
  FAVORITES: "favorites",
  WEB_PUSH_SUBSCRIPTIONS: "web_push_subscriptions",
  CUSTOM_REQUESTS: "custom_requests",
  STORAGE_OBJECTS: "storage_objects",
  TOMBSTONED: "tombstoned_customer",
  MERGED: "merged_customer",
  IDENTITY_OPERATION_LOCK: "identity_operation_lock",
} as const;

export type CustomerHistoryBlockerCode =
  (typeof CUSTOMER_HISTORY_BLOCKER_CODES)[keyof typeof CUSTOMER_HISTORY_BLOCKER_CODES];

export interface CustomerHistoryBlockerCounts {
  printRequests: number;
  showAllocations: number;
  customerUploads: number;
  customerUploadBatches: number;
  assistedCreationRequests: number;
  customerNotifications: number;
  emailDeliveryJobs: number;
  etsyRecommendationRequests: number;
  etsySuggestionRequests: number;
  designIssueReports: number;
  favorites: number;
  webPushSubscriptions: number;
  customRequests: number;
  storageObjects: number;
}

export interface CustomerEligibilitySnapshot {
  customerId: string;
  authUid: string | null;
  username: string | null;
  displayName: string;
  isDeleted: boolean;
  isDisabled: boolean;
  isMerged: boolean;
  hasIdentityOperationLock: boolean;
  blockerCounts: CustomerHistoryBlockerCounts;
  blockers: DeletionBlocker[];
  eligibleForHardDelete: boolean;
  updatedAtMillis: number | null;
}

const BLOCKER_MESSAGES: Record<CustomerHistoryBlockerCode, string> = {
  [CUSTOMER_HISTORY_BLOCKER_CODES.PRINT_REQUESTS]:
    "This customer has print request history that must be preserved.",
  [CUSTOMER_HISTORY_BLOCKER_CODES.SHOW_ALLOCATIONS]:
    "This customer has show allocation history that must be preserved.",
  [CUSTOMER_HISTORY_BLOCKER_CODES.CUSTOMER_UPLOADS]:
    "This customer has upload history that must be preserved.",
  [CUSTOMER_HISTORY_BLOCKER_CODES.CUSTOMER_UPLOAD_BATCHES]:
    "This customer has upload batch history that must be preserved.",
  [CUSTOMER_HISTORY_BLOCKER_CODES.ASSISTED_CREATION]:
    "This customer has Assisted Creation history that must be preserved.",
  [CUSTOMER_HISTORY_BLOCKER_CODES.CUSTOMER_NOTIFICATIONS]:
    "This customer has notification history that must be preserved.",
  [CUSTOMER_HISTORY_BLOCKER_CODES.EMAIL_DELIVERY_JOBS]:
    "This customer has email delivery history that must be preserved.",
  [CUSTOMER_HISTORY_BLOCKER_CODES.ETSY_RECOMMENDATIONS]:
    "This customer has Etsy recommendation history that must be preserved.",
  [CUSTOMER_HISTORY_BLOCKER_CODES.ETSY_SUGGESTIONS]:
    "This customer has Etsy suggestion history that must be preserved.",
  [CUSTOMER_HISTORY_BLOCKER_CODES.DESIGN_ISSUE_REPORTS]:
    "This customer has design issue report history that must be preserved.",
  [CUSTOMER_HISTORY_BLOCKER_CODES.FAVORITES]:
    "This customer has saved favorites that must be preserved.",
  [CUSTOMER_HISTORY_BLOCKER_CODES.WEB_PUSH_SUBSCRIPTIONS]:
    "This customer has web push subscriptions that must be preserved.",
  [CUSTOMER_HISTORY_BLOCKER_CODES.CUSTOM_REQUESTS]:
    "This customer has custom request history that must be preserved.",
  [CUSTOMER_HISTORY_BLOCKER_CODES.STORAGE_OBJECTS]:
    "This customer has stored upload files that must be preserved.",
  [CUSTOMER_HISTORY_BLOCKER_CODES.TOMBSTONED]:
    "Tombstoned customer accounts cannot be permanently deleted through this workflow.",
  [CUSTOMER_HISTORY_BLOCKER_CODES.MERGED]:
    "Merged customer accounts cannot be permanently deleted through this workflow.",
  [CUSTOMER_HISTORY_BLOCKER_CODES.IDENTITY_OPERATION_LOCK]:
    "Another identity operation is in progress for this customer.",
};

export interface CountQueryAdapter {
  countWhereEquals(collection: string, field: string, value: string): Promise<number>;
  hasSubcollectionDocs(parentPath: string, subcollection: string): Promise<boolean>;
  countStoragePrefix(prefix: string): Promise<number>;
}

export function buildBlockersFromCounts(
  counts: CustomerHistoryBlockerCounts,
  options: {
    isDeleted: boolean;
    isMerged: boolean;
    hasIdentityOperationLock: boolean;
  },
): DeletionBlocker[] {
  const blockers: DeletionBlocker[] = [];

  const push = (code: CustomerHistoryBlockerCode, count?: number) => {
    blockers.push({
      code,
      message: BLOCKER_MESSAGES[code],
      count,
    });
  };

  if (options.isDeleted) {
    push(CUSTOMER_HISTORY_BLOCKER_CODES.TOMBSTONED);
  }
  if (options.isMerged) {
    push(CUSTOMER_HISTORY_BLOCKER_CODES.MERGED);
  }
  if (options.hasIdentityOperationLock) {
    push(CUSTOMER_HISTORY_BLOCKER_CODES.IDENTITY_OPERATION_LOCK);
  }
  if (counts.printRequests > 0) {
    push(CUSTOMER_HISTORY_BLOCKER_CODES.PRINT_REQUESTS, counts.printRequests);
  }
  if (counts.showAllocations > 0) {
    push(CUSTOMER_HISTORY_BLOCKER_CODES.SHOW_ALLOCATIONS, counts.showAllocations);
  }
  if (counts.customerUploads > 0) {
    push(CUSTOMER_HISTORY_BLOCKER_CODES.CUSTOMER_UPLOADS, counts.customerUploads);
  }
  if (counts.customerUploadBatches > 0) {
    push(CUSTOMER_HISTORY_BLOCKER_CODES.CUSTOMER_UPLOAD_BATCHES, counts.customerUploadBatches);
  }
  if (counts.assistedCreationRequests > 0) {
    push(CUSTOMER_HISTORY_BLOCKER_CODES.ASSISTED_CREATION, counts.assistedCreationRequests);
  }
  if (counts.customerNotifications > 0) {
    push(CUSTOMER_HISTORY_BLOCKER_CODES.CUSTOMER_NOTIFICATIONS, counts.customerNotifications);
  }
  if (counts.emailDeliveryJobs > 0) {
    push(CUSTOMER_HISTORY_BLOCKER_CODES.EMAIL_DELIVERY_JOBS, counts.emailDeliveryJobs);
  }
  if (counts.etsyRecommendationRequests > 0) {
    push(CUSTOMER_HISTORY_BLOCKER_CODES.ETSY_RECOMMENDATIONS, counts.etsyRecommendationRequests);
  }
  if (counts.etsySuggestionRequests > 0) {
    push(CUSTOMER_HISTORY_BLOCKER_CODES.ETSY_SUGGESTIONS, counts.etsySuggestionRequests);
  }
  if (counts.designIssueReports > 0) {
    push(CUSTOMER_HISTORY_BLOCKER_CODES.DESIGN_ISSUE_REPORTS, counts.designIssueReports);
  }
  if (counts.favorites > 0) {
    push(CUSTOMER_HISTORY_BLOCKER_CODES.FAVORITES, counts.favorites);
  }
  if (counts.webPushSubscriptions > 0) {
    push(CUSTOMER_HISTORY_BLOCKER_CODES.WEB_PUSH_SUBSCRIPTIONS, counts.webPushSubscriptions);
  }
  if (counts.customRequests > 0) {
    push(CUSTOMER_HISTORY_BLOCKER_CODES.CUSTOM_REQUESTS, counts.customRequests);
  }
  if (counts.storageObjects > 0) {
    push(CUSTOMER_HISTORY_BLOCKER_CODES.STORAGE_OBJECTS, counts.storageObjects);
  }

  return blockers;
}

export function isEligibleForHardDelete(blockers: DeletionBlocker[]): boolean {
  return blockers.length === 0;
}

export function buildCustomerEligibilityChecksum(input: {
  customerId: string;
  updatedAtMillis: number | null;
  blockerCounts: CustomerHistoryBlockerCounts;
  isDeleted: boolean;
  isDisabled: boolean;
  isMerged: boolean;
  hasIdentityOperationLock: boolean;
}): string {
  const payload = JSON.stringify(input);
  return createHash("sha256").update(payload).digest("hex");
}

export async function collectCustomerHistoryBlockerCounts(
  adapter: CountQueryAdapter,
  options: { customerId: string; authUid: string | null },
): Promise<CustomerHistoryBlockerCounts> {
  const { customerId, authUid } = options;

  const [
    printRequests,
    showAllocations,
    customerUploadsByCustomerId,
    customerUploadBatchesByCustomerId,
    assistedByCustomerId,
    customerNotificationsByCustomerId,
    emailDeliveryJobsByCustomerId,
    etsyRecommendationByCustomerId,
    etsySuggestionByCustomerId,
    designIssueReports,
    customRequestsByCustomerId,
  ] = await Promise.all([
    adapter.countWhereEquals("printRequests", "customerId", customerId),
    adapter.countWhereEquals("showAllocations", "customerId", customerId),
    adapter.countWhereEquals("customerUploads", "customerId", customerId),
    adapter.countWhereEquals("customerUploadBatches", "customerId", customerId),
    adapter.countWhereEquals("assistedCreationRequests", "customerId", customerId),
    adapter.countWhereEquals("customerNotifications", "customerId", customerId),
    adapter.countWhereEquals("emailDeliveryJobs", "customerId", customerId),
    adapter.countWhereEquals("etsyRecommendationRequests", "customerId", customerId),
    adapter.countWhereEquals("etsySuggestionRequests", "customerId", customerId),
    adapter.countWhereEquals("designIssueReports", "customerId", customerId),
    adapter.countWhereEquals("customRequests", "customerId", customerId),
  ]);

  let customerUploads = customerUploadsByCustomerId;
  let customerUploadBatches = customerUploadBatchesByCustomerId;
  let assistedCreationRequests = assistedByCustomerId;
  let customerNotifications = customerNotificationsByCustomerId;
  let emailDeliveryJobs = emailDeliveryJobsByCustomerId;
  let etsyRecommendationRequests = etsyRecommendationByCustomerId;
  let etsySuggestionRequests = etsySuggestionByCustomerId;
  let customRequests = customRequestsByCustomerId;

  if (authUid) {
    const [
      uploadsByUid,
      batchesByUid,
      assistedByUid,
      notificationsByUid,
      emailJobsByUid,
      etsyRecByUid,
      etsySugByUid,
      customByUid,
    ] = await Promise.all([
      adapter.countWhereEquals("customerUploads", "customerUid", authUid),
      adapter.countWhereEquals("customerUploadBatches", "customerUid", authUid),
      adapter.countWhereEquals("assistedCreationRequests", "customerUid", authUid),
      adapter.countWhereEquals("customerNotifications", "customerUid", authUid),
      adapter.countWhereEquals("emailDeliveryJobs", "customerUid", authUid),
      adapter.countWhereEquals("etsyRecommendationRequests", "customerUid", authUid),
      adapter.countWhereEquals("etsySuggestionRequests", "customerUid", authUid),
      adapter.countWhereEquals("customRequests", "customerUid", authUid),
    ]);

    customerUploads = Math.max(customerUploads, uploadsByUid);
    customerUploadBatches = Math.max(customerUploadBatches, batchesByUid);
    assistedCreationRequests = Math.max(assistedCreationRequests, assistedByUid);
    customerNotifications = Math.max(customerNotifications, notificationsByUid);
    emailDeliveryJobs = Math.max(emailDeliveryJobs, emailJobsByUid);
    etsyRecommendationRequests = Math.max(etsyRecommendationRequests, etsyRecByUid);
    etsySuggestionRequests = Math.max(etsySuggestionRequests, etsySugByUid);
    customRequests = Math.max(customRequests, customByUid);
  }

  const [hasFavorites, hasWebPush] = await Promise.all([
    adapter.hasSubcollectionDocs(`customers/${customerId}`, "favorites"),
    adapter.hasSubcollectionDocs(`customers/${customerId}`, "webPushSubscriptions"),
  ]);

  let storageObjects = 0;
  if (authUid) {
    const uploadStorage = await adapter.countStoragePrefix(`customer-uploads/${authUid}/`);
    const assistedStorage = await adapter.countStoragePrefix(`assisted-creation/${authUid}/`);
    storageObjects = uploadStorage + assistedStorage;
  }

  return {
    printRequests,
    showAllocations,
    customerUploads,
    customerUploadBatches,
    assistedCreationRequests,
    customerNotifications,
    emailDeliveryJobs,
    etsyRecommendationRequests,
    etsySuggestionRequests,
    designIssueReports,
    favorites: hasFavorites ? 1 : 0,
    webPushSubscriptions: hasWebPush ? 1 : 0,
    customRequests,
    storageObjects,
  };
}

export function assertCustomerEligibleForIdentityMutation(
  snapshot: Pick<
    CustomerEligibilitySnapshot,
    "isDeleted" | "isMerged" | "hasIdentityOperationLock"
  >,
  action: "hard_delete" | "disable" | "restore" | "merge" | "username_transfer",
): void {
  if (snapshot.hasIdentityOperationLock) {
    throw new Error("Another identity operation is in progress for this customer.");
  }

  if (action === "hard_delete" || action === "merge" || action === "username_transfer") {
    if (snapshot.isDeleted) {
      throw new Error("Tombstoned customer accounts cannot use this identity workflow.");
    }
    if (snapshot.isMerged) {
      throw new Error("Merged customer accounts cannot use this identity workflow.");
    }
  }

  if (action === "restore") {
    if (snapshot.isDeleted) {
      throw new Error("Tombstoned customer accounts cannot be restored.");
    }
    if (snapshot.isMerged) {
      throw new Error("Merged customer accounts cannot be restored.");
    }
  }
}
