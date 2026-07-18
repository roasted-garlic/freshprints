import type { OperationalWipeTarget } from "@fresh-prints/shared/types/admin/wipeOperationalTestData.types";

export interface OperationalWipeTargetOption {
  id: OperationalWipeTarget;
  label: string;
  /** Short line under the checkbox; details expand for full delete list. */
  summary: string;
  description: string;
}

export const OPERATIONAL_WIPE_TARGET_OPTIONS: OperationalWipeTargetOption[] = [
  {
    id: "printRequests",
    label: "Print Requests",
    summary: "Requests, items, queue attachments, inbox acks; keeps shows.",
    description:
      "Deletes print requests and line items, show-queue attachments, Firestore gang sheets, and staff inbox Done history (staffInboxAcks / alert deliveries). Zeros each upcoming show’s allocatedQuantity, removes counters/printRequests plus customer sequences so names restart at …-CR001 / …-IR001, and clears this computer’s local gang sheet PNG cache. Does not delete upcoming shows. Required before wiping Designs.",
  },
  {
    id: "showQueueAttachments",
    label: "Queue Attachments",
    summary: "Allocations and gang sheets only; keeps print requests and shows.",
    description:
      "Deletes allocations, Firestore gang sheets, and staff inbox Done history, zeros each upcoming show’s allocatedQuantity, and clears this computer’s local gang sheet PNG cache. Keeps print requests and upcoming show schedule entries.",
  },
  {
    id: "upcomingShows",
    label: "Upcoming Shows",
    summary: "Show schedule plus remaining attachments; keeps print requests.",
    description:
      "Deletes upcoming shows, remaining allocations/Firestore gang sheets, and staff inbox Done history, and clears this computer’s local gang sheet PNG cache. Keeps print requests.",
  },
  {
    id: "sequences",
    label: "Sequences",
    summary: "Request name counters restart at 001.",
    description:
      "Deletes counters/printRequests and resets each customer’s nextPrintRequestSequence to 1 / totalPrintRequests to 0. Always included when Print Requests is selected.",
  },
  {
    id: "designRequestStats",
    label: "Design Stats",
    summary: "Zeros catalog requestCount / lastRequestedAt.",
    description:
      "Zeros design requestCount and clears lastRequestedAt on catalog designs. Skipped automatically if Designs is also selected.",
  },
  {
    id: "designs",
    label: "Designs",
    summary: "Catalog docs + Storage originals/thumbnails/previews.",
    description:
      "Deletes all design documents and Storage originals/thumbnails/previews. Automatically includes Print Requests. Categories, tags, accounts, and settings are kept. Requires an extra confirmation modal. Catalog designs may keep sourceCustomerUploadId even if Customer Uploads are wiped — select Customer Uploads to clear upload docs/Storage.",
  },
  {
    id: "customerUploads",
    label: "Customer Uploads",
    summary: "Upload docs, ops collections, and customer-uploads/ Storage.",
    description:
      "Deletes customer upload docs, batches, rate-limit/lease/idempotency collections, and Storage under customer-uploads/. Does not delete print requests or catalog designs. Select this to clear Portal artwork fixtures; promoted designs may retain sourceCustomerUploadId pointing at deleted uploads.",
  },
  {
    id: "etsySearches",
    label: "Etsy",
    summary: "Searches, rate limits, overlays, suggestion requests, inert leftovers.",
    description:
      "Deletes Portal Find a design docs (etsyRecommendationRequests), Open API rate limits, admin suggestion overlays (etsyRecommendationSuggestions), pending suggestion requests (etsySuggestionRequests), and inert leftovers (etsyRecommendationConfig, etsyWebsiteSearchCache, customRequestEtsySearchRateLimits).",
  },
  {
    id: "assistedCreationRequests",
    label: "Custom Requests",
    summary: "Assisted requests, acks, notifications, email jobs, legacy customRequests.",
    description:
      "Deletes Assisted Creation docs (assistedCreationRequests) and Storage under assisted-creation/, plus staff update acks, customerNotifications, emailDeliveryJobs, and legacy customRequests. Does not affect Etsy searches.",
  },
];
