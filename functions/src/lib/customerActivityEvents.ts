import { FieldValue } from "firebase-admin/firestore";

import type {
  CustomerActivityEventMetadata,
  CustomerActivityEventResult,
  CustomerActivityEventType,
} from "../../../packages/shared/src/types/customer/customerActivityEvent.types";
import { adminDb } from "./admin";

export interface AppendCustomerActivityEventInput {
  customerId: string;
  eventType: CustomerActivityEventType;
  actorUid: string;
  actorRole: "owner" | "admin" | "system";
  result?: CustomerActivityEventResult;
  metadata?: CustomerActivityEventMetadata;
}

export async function appendCustomerActivityEvent(
  input: AppendCustomerActivityEventInput,
): Promise<string> {
  const ref = adminDb.collection("customerActivityEvents").doc();
  await ref.set({
    customerId: input.customerId,
    eventType: input.eventType,
    occurredAt: FieldValue.serverTimestamp(),
    actorUid: input.actorUid,
    actorRole: input.actorRole,
    derivation: "live",
    ...(input.result ? { result: input.result } : {}),
    ...(input.metadata ? { metadata: input.metadata } : {}),
  });
  return ref.id;
}
