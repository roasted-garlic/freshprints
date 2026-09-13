import { getDocs, query, where } from "firebase/firestore";

import type { CustomerActivityEventType } from "@fresh-prints/shared/types/customer/customerActivityEvent.types";
import type { Customer } from "@fresh-prints/shared/types/customer/customer.types";

import { firestoreCollectionService } from "../../firebase/services/firestoreCollectionService";
import { mapFirestoreTimestamp } from "../../firebase/utils/firestoreTimestamp";
import { userService } from "./userService";
import type { User } from "../types/user.types";
import type { AuditTrailEntry } from "../types/auditTrail.types";
import type { CustomerAccountActivityPage } from "../types/customerPrintRequestHistory.types";
import {
  ACCOUNT_ACTIVITY_COUNT_CAP,
  ACCOUNT_ACTIVITY_PAGE_SIZE,
} from "../types/customerPrintRequestHistory.types";
import {
  buildCustomerIdentityActivityAuditEntry,
  isCustomerIdentityActivityEventType,
} from "../utils/customerIdentityActivityAudit";
import { resolveLogicalCustomerIds } from "../utils/resolveLogicalCustomerIds";

async function listIdentityActivityEntriesForCustomerId(
  customerId: string,
): Promise<AuditTrailEntry[]> {
  const snapshot = await getDocs(
    query(
      firestoreCollectionService.getCustomerActivityEventsCollection(),
      where("customerId", "==", customerId),
    ),
  );

  return snapshot.docs
    .map((eventDoc) => {
      const data = eventDoc.data();
      const eventType = typeof data.eventType === "string" ? data.eventType : "";
      if (!isCustomerIdentityActivityEventType(eventType)) {
        return null;
      }

      const occurredAt = mapFirestoreTimestamp(data.occurredAt);
      const actorUid = typeof data.actorUid === "string" ? data.actorUid : "";
      if (!occurredAt || !actorUid) {
        return null;
      }

      return buildCustomerIdentityActivityAuditEntry({
        id: eventDoc.id,
        eventType: eventType as CustomerActivityEventType,
        occurredAtMillis: occurredAt.toMillis(),
        actorUid,
        metadata:
          data.metadata && typeof data.metadata === "object"
            ? (data.metadata as Record<string, string | string[] | number | boolean | undefined>)
            : undefined,
        result: typeof data.result === "string" ? data.result : undefined,
      });
    })
    .filter((entry): entry is AuditTrailEntry => entry !== null);
}

function dedupeAccountActivityEntries(entries: readonly AuditTrailEntry[]): AuditTrailEntry[] {
  const byId = new Map<string, AuditTrailEntry>();

  for (const entry of entries) {
    byId.set(entry.id, entry);
  }

  return [...byId.values()].sort((left, right) => right.occurredAtMillis - left.occurredAtMillis);
}

async function resolveActorLabels(entries: AuditTrailEntry[]): Promise<AuditTrailEntry[]> {
  const actorIds = [...new Set(entries.map((entry) => entry.actorUserId).filter(Boolean))] as string[];
  const actorLabelById = new Map<string, string>();

  await Promise.all(
    actorIds.map(async (actorId) => {
      try {
        const actor = await userService.getUserById(actorId);
        actorLabelById.set(actorId, actor.displayName);
      } catch {
        actorLabelById.set(actorId, actorId);
      }
    }),
  );

  return entries.map((entry) => ({
    ...entry,
    actorLabel: entry.actorUserId ? actorLabelById.get(entry.actorUserId) ?? entry.actorUserId : undefined,
  }));
}

export const customerAccountActivityService = {
  async loadAccountActivityPage(
    _caller: User,
    customer: Customer,
    visibleCount = ACCOUNT_ACTIVITY_PAGE_SIZE,
  ): Promise<CustomerAccountActivityPage> {
    const logicalCustomerIds = resolveLogicalCustomerIds(customer);
    const batches = await Promise.all(
      logicalCustomerIds.map((customerId) => listIdentityActivityEntriesForCustomerId(customerId)),
    );
    const merged = dedupeAccountActivityEntries(batches.flat());
    const withActors = await resolveActorLabels(merged);
    const boundedTotalCount = Math.min(withActors.length, ACCOUNT_ACTIVITY_COUNT_CAP);
    const boundedVisibleCount = Math.max(ACCOUNT_ACTIVITY_PAGE_SIZE, visibleCount);

    return {
      entries: withActors.slice(0, boundedVisibleCount),
      totalLoaded: Math.min(boundedVisibleCount, withActors.length),
      hasMore: withActors.length > boundedVisibleCount,
      boundedTotalCount,
      countIsBounded: withActors.length > ACCOUNT_ACTIVITY_COUNT_CAP,
    };
  },

  async loadAccountActivityCount(caller: User, customer: Customer): Promise<number> {
    const page = await this.loadAccountActivityPage(caller, customer, ACCOUNT_ACTIVITY_COUNT_CAP);
    return page.boundedTotalCount;
  },
};
