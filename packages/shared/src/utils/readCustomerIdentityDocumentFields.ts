import type { CustomerAccountDeletionSource } from "../types/deletion/deletion.types";
import type {
  CustomerIdentityOperationLock,
  CustomerIdentitySnapshotPropagationState,
  CustomerUsernameHistoryEntry,
} from "../types/customer/customerIdentity.types";

export interface CustomerIdentityDocumentFields {
  isDeleted?: boolean;
  deletedAt?: unknown;
  deletedBy?: string;
  deletionSource?: CustomerAccountDeletionSource;
  isDisabled?: boolean;
  disabledAt?: unknown;
  disabledBy?: string;
  disabledReason?: string;
  isMerged?: boolean;
  mergedIntoCustomerId?: string;
  identityOperationLock?: CustomerIdentityOperationLock;
  identitySnapshotPropagation?: CustomerIdentitySnapshotPropagationState;
  usernameHistory?: CustomerUsernameHistoryEntry[];
}

type IdentityDocumentData = Record<string, unknown>;

function readDeletionSource(value: unknown): CustomerAccountDeletionSource | undefined {
  return value === "studio_owner" || value === "portal_request" ? value : undefined;
}

/**
 * Reads WS1 customer identity fields from a Firestore customer document payload.
 * Timestamp fields are returned as-is for caller-specific mapping.
 */
export function readCustomerIdentityDocumentFields(
  data: IdentityDocumentData,
): CustomerIdentityDocumentFields {
  return {
    isDeleted: data.isDeleted === true ? true : undefined,
    deletedAt: data.deletedAt,
    deletedBy: typeof data.deletedBy === "string" ? data.deletedBy : undefined,
    deletionSource: readDeletionSource(data.deletionSource),
    isDisabled: data.isDisabled === true ? true : undefined,
    disabledAt: data.disabledAt,
    disabledBy: typeof data.disabledBy === "string" ? data.disabledBy : undefined,
    disabledReason: typeof data.disabledReason === "string" ? data.disabledReason : undefined,
    isMerged: data.isMerged === true ? true : undefined,
    mergedIntoCustomerId:
      typeof data.mergedIntoCustomerId === "string" ? data.mergedIntoCustomerId : undefined,
    identityOperationLock:
      data.identityOperationLock && typeof data.identityOperationLock === "object"
        ? (data.identityOperationLock as CustomerIdentityOperationLock)
        : undefined,
    identitySnapshotPropagation:
      data.identitySnapshotPropagation && typeof data.identitySnapshotPropagation === "object"
        ? (data.identitySnapshotPropagation as CustomerIdentitySnapshotPropagationState)
        : undefined,
    usernameHistory: Array.isArray(data.usernameHistory)
      ? (data.usernameHistory as CustomerUsernameHistoryEntry[])
      : undefined,
  };
}
