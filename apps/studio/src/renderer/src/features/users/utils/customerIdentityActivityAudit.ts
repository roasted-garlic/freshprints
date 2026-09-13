import type {
  CustomerActivityEventMetadata,
  CustomerActivityEventType,
} from "@fresh-prints/shared/types/customer/customerActivityEvent.types";

import type { AuditTrailEntry } from "../types/auditTrail.types";

const CUSTOMER_IDENTITY_ACTIVITY_EVENT_TYPES = new Set<CustomerActivityEventType>([
  "account.username_changed",
  "account.username_transferred",
  "account.duplicate_resolution_previewed",
  "account.disabled",
  "account.restored",
  "account.hard_delete_previewed",
  "account.hard_delete_applied",
  "account.merge_previewed",
  "account.merge_started",
  "account.merge_completed",
  "account.merge_failed",
  "account.quota_override_set",
  "account.quota_override_cleared",
]);

export function isCustomerIdentityActivityEventType(
  eventType: string,
): eventType is CustomerActivityEventType {
  return CUSTOMER_IDENTITY_ACTIVITY_EVENT_TYPES.has(eventType as CustomerActivityEventType);
}

function formatMetadataUsername(value: string | undefined): string | null {
  if (!value || typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function buildMergeDetail(metadata: CustomerActivityEventMetadata | undefined): string | undefined {
  if (!metadata) {
    return undefined;
  }

  const sourceCustomerId =
    typeof metadata.sourceCustomerId === "string" ? metadata.sourceCustomerId : null;
  const survivorCustomerId =
    typeof metadata.survivorCustomerId === "string" ? metadata.survivorCustomerId : null;
  const plannedUsername =
    formatMetadataUsername(
      typeof metadata.plannedSurvivorUsername === "string"
        ? metadata.plannedSurvivorUsername
        : undefined,
    ) ??
    formatMetadataUsername(
      typeof metadata.transferredUsername === "string" ? metadata.transferredUsername : undefined,
    );
  const mergeJobId = typeof metadata.mergeJobId === "string" ? metadata.mergeJobId : null;

  const parts: string[] = [];
  if (sourceCustomerId && survivorCustomerId) {
    parts.push(`Source ${sourceCustomerId} → survivor ${survivorCustomerId}`);
  } else if (sourceCustomerId) {
    parts.push(`Source ${sourceCustomerId}`);
  } else if (survivorCustomerId) {
    parts.push(`Survivor ${survivorCustomerId}`);
  }
  if (plannedUsername) {
    parts.push(`Username ${plannedUsername}`);
  }
  if (mergeJobId) {
    parts.push(`Job ${mergeJobId}`);
  }

  return parts.length > 0 ? parts.join(" · ") : undefined;
}

export function buildCustomerIdentityActivityAuditEntry(input: {
  id: string;
  eventType: CustomerActivityEventType;
  occurredAtMillis: number;
  actorUid: string;
  metadata?: CustomerActivityEventMetadata;
  result?: string;
}): AuditTrailEntry {
  const metadata = input.metadata;
  let label = "Account activity";
  let detail: string | undefined;

  switch (input.eventType) {
    case "account.username_changed":
      label = "Username changed";
      detail = [
        formatMetadataUsername(metadata?.previousUsername),
        formatMetadataUsername(metadata?.newUsername),
      ]
        .filter(Boolean)
        .join(" → ");
      break;
    case "account.username_transferred":
      label = "Username transferred";
      detail = [
        formatMetadataUsername(metadata?.transferredUsername),
        metadata?.sourceCustomerId ? `From ${metadata.sourceCustomerId}` : null,
        metadata?.survivorCustomerId ? `To ${metadata.survivorCustomerId}` : null,
      ]
        .filter(Boolean)
        .join(" · ");
      break;
    case "account.duplicate_resolution_previewed":
      label = "Duplicate resolution previewed";
      detail = buildMergeDetail(metadata);
      break;
    case "account.disabled":
      label = "Account disabled";
      detail =
        typeof metadata?.disabledReason === "string" ? metadata.disabledReason : undefined;
      break;
    case "account.restored":
      label = "Account restored";
      break;
    case "account.hard_delete_previewed":
      label = "Hard delete previewed";
      break;
    case "account.hard_delete_applied":
      label = "Account permanently deleted";
      break;
    case "account.merge_previewed":
      label = "Merge previewed";
      detail = buildMergeDetail(metadata);
      break;
    case "account.merge_started":
      label = "Account merge started";
      detail = buildMergeDetail(metadata);
      break;
    case "account.merge_completed":
      label = "Account merge completed";
      detail = buildMergeDetail(metadata);
      break;
    case "account.merge_failed":
      label = "Account merge failed";
      detail = buildMergeDetail(metadata);
      break;
    case "account.quota_override_set":
      label = "Quota override set";
      detail = [
        metadata?.maxQuantityPerPrintRequest != null
          ? `PR ${String(metadata.maxQuantityPerPrintRequest)}`
          : null,
        metadata?.maxQuantityPerShowPerCustomer != null
          ? `Show ${String(metadata.maxQuantityPerShowPerCustomer)}`
          : null,
        metadata?.hasExpiration === true ? "Expires set" : "No expiration",
      ]
        .filter(Boolean)
        .join(" · ");
      break;
    case "account.quota_override_cleared":
      label = "Quota override cleared";
      break;
    default:
      break;
  }

  if (input.result === "blocked" || input.result === "failed") {
    detail = [detail, `Result ${input.result}`].filter(Boolean).join(" · ");
  }

  return {
    id: `customer-activity:${input.id}`,
    label,
    detail: detail || undefined,
    occurredAtMillis: input.occurredAtMillis,
    actorUserId: input.actorUid,
  };
}
