import type {
  MergeInventoryCounts,
  MergeStorageMigrationInventory,
} from "../../../packages/shared/src/types/customer/customerAccountMerge.types";
import {
  countCollectionWhereEquals,
  countStorageObjectsWithPrefix,
  hasSubcollectionDocuments,
} from "./customerAccountIdentityBootstrapDeletion";

export async function collectMergeInventoryCounts(input: {
  sourceCustomerId: string;
  survivorCustomerId: string;
  sourceAuthUid: string | null;
  survivorAuthUid: string | null;
}): Promise<{
  source: MergeInventoryCounts;
  survivor: MergeInventoryCounts;
  storageMigration: MergeStorageMigrationInventory;
}> {
  const [source, survivor] = await Promise.all([
    collectCustomerMergeInventory(input.sourceCustomerId, input.sourceAuthUid),
    collectCustomerMergeInventory(input.survivorCustomerId, input.survivorAuthUid),
  ]);

  const requiresUidMigration =
    Boolean(input.sourceAuthUid) &&
    Boolean(input.survivorAuthUid) &&
    input.sourceAuthUid !== input.survivorAuthUid;

  return {
    source,
    survivor,
    storageMigration: {
      requiresUidMigration,
      sourceAuthUid: input.sourceAuthUid,
      survivorAuthUid: input.survivorAuthUid,
      customerUploadStoragePrefix: input.sourceAuthUid
        ? `customer-uploads/${input.sourceAuthUid}/`
        : null,
      assistedCreationStoragePrefix: input.sourceAuthUid
        ? `assisted-creation/${input.sourceAuthUid}/`
        : null,
    },
  };
}

async function collectCustomerMergeInventory(
  customerId: string,
  authUid: string | null,
): Promise<MergeInventoryCounts> {
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
    countCollectionWhereEquals("printRequests", "customerId", customerId),
    countCollectionWhereEquals("showAllocations", "customerId", customerId),
    countCollectionWhereEquals("customerUploads", "customerId", customerId),
    countCollectionWhereEquals("customerUploadBatches", "customerId", customerId),
    countCollectionWhereEquals("assistedCreationRequests", "customerId", customerId),
    countCollectionWhereEquals("customerNotifications", "customerId", customerId),
    countCollectionWhereEquals("emailDeliveryJobs", "customerId", customerId),
    countCollectionWhereEquals("etsyRecommendationRequests", "customerId", customerId),
    countCollectionWhereEquals("etsySuggestionRequests", "customerId", customerId),
    countCollectionWhereEquals("designIssueReports", "customerId", customerId),
    countCollectionWhereEquals("customRequests", "customerId", customerId),
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
      countCollectionWhereEquals("customerUploads", "customerUid", authUid),
      countCollectionWhereEquals("customerUploadBatches", "customerUid", authUid),
      countCollectionWhereEquals("assistedCreationRequests", "customerUid", authUid),
      countCollectionWhereEquals("customerNotifications", "customerUid", authUid),
      countCollectionWhereEquals("emailDeliveryJobs", "customerUid", authUid),
      countCollectionWhereEquals("etsyRecommendationRequests", "customerUid", authUid),
      countCollectionWhereEquals("etsySuggestionRequests", "customerUid", authUid),
      countCollectionWhereEquals("customRequests", "customerUid", authUid),
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
    hasSubcollectionDocuments(`customers/${customerId}`, "favorites"),
    hasSubcollectionDocuments(`customers/${customerId}`, "webPushSubscriptions"),
  ]);

  let customerUploadStorageObjects = 0;
  let assistedCreationStorageObjects = 0;

  if (authUid) {
    [customerUploadStorageObjects, assistedCreationStorageObjects] = await Promise.all([
      countStorageObjectsWithPrefix(`customer-uploads/${authUid}/`),
      countStorageObjectsWithPrefix(`assisted-creation/${authUid}/`),
    ]);
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
    customerUploadStorageObjects,
    assistedCreationStorageObjects,
  };
}
