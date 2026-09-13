import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";

import type {
  UpdateCustomerPrintRequestQuotaOverrideRequest,
  UpdateCustomerPrintRequestQuotaOverrideResponse,
} from "../../packages/shared/src/types/customer/updateCustomerPrintRequestQuotaOverride.types";
import {
  parsePrintRequestQuotaOverrideInput,
  resolveEffectivePrintRequestLimits,
} from "../../packages/shared/src/utils/printRequestQuotaOverride";
import { adminDb } from "./lib/admin";
import { loadCallerProfile } from "./lib/caller";
import { appendCustomerActivityEvent } from "./lib/customerActivityEvents";
import { invalidArgument, permissionDenied, unauthenticated } from "./lib/errors";
import { loadPrintRequestLimitSettings } from "./lib/loadPrintRequestLimitSettings";

function assertOwner(caller: { isActive: boolean; role: string }): void {
  if (!caller.isActive || caller.role !== "owner") {
    throw permissionDenied("Only active owners can update customer print request quota overrides.");
  }
}

export const updateCustomerPrintRequestQuotaOverride = onCall(
  async (request): Promise<UpdateCustomerPrintRequestQuotaOverrideResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }
    const caller = await loadCallerProfile(request.auth.uid);
    assertOwner(caller);

    const raw = request.data as UpdateCustomerPrintRequestQuotaOverrideRequest | null;
    if (!raw || typeof raw !== "object" || typeof raw.customerId !== "string" || !raw.customerId.trim()) {
      throw invalidArgument("customerId is required.");
    }
    const customerId = raw.customerId.trim();
    const nowMs = Date.now();
    const parsed = parsePrintRequestQuotaOverrideInput(raw, nowMs);
    if (!parsed) {
      throw invalidArgument(
        "Quota override must include valid maxQuantityPerPrintRequest and maxQuantityPerShowPerCustomer values (or clearAll), within allowed bounds, and a future expiresAt when set.",
      );
    }

    const customerRef = adminDb.collection("customers").doc(customerId);
    const customerSnap = await customerRef.get();
    if (!customerSnap.exists) {
      throw invalidArgument("Customer not found.");
    }

    const previous = customerSnap.data()?.printRequestQuotaOverride;
    const settings = await loadPrintRequestLimitSettings();

    if (parsed.clearAll || (parsed.maxQuantityPerPrintRequest == null && parsed.maxQuantityPerShowPerCustomer == null)) {
      await customerRef.update({
        printRequestQuotaOverride: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      await appendCustomerActivityEvent({
        customerId,
        eventType: "account.quota_override_cleared",
        actorUid: caller.id,
        actorRole: "owner",
        result: "success",
        metadata: {
          clearedAll: true,
          previousHadPrintRequestOverride:
            typeof previous?.maxQuantityPerPrintRequest === "number",
          previousHadShowOverride: typeof previous?.maxQuantityPerShowPerCustomer === "number",
        },
      });
      const effective = resolveEffectivePrintRequestLimits({
        settings,
        override: undefined,
        nowMs,
      });
      return { customerId, effective };
    }

    const nextOverride: Record<string, unknown> = {
      maxQuantityPerPrintRequest: parsed.maxQuantityPerPrintRequest,
      maxQuantityPerShowPerCustomer: parsed.maxQuantityPerShowPerCustomer,
      expiresAt:
        parsed.expiresAtMs == null ? null : Timestamp.fromMillis(parsed.expiresAtMs),
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: caller.id,
    };

    await customerRef.update({
      printRequestQuotaOverride: nextOverride,
      updatedAt: FieldValue.serverTimestamp(),
    });

    await appendCustomerActivityEvent({
      customerId,
      eventType: "account.quota_override_set",
      actorUid: caller.id,
      actorRole: "owner",
      result: "success",
      metadata: {
        maxQuantityPerPrintRequest: parsed.maxQuantityPerPrintRequest ?? "global",
        maxQuantityPerShowPerCustomer: parsed.maxQuantityPerShowPerCustomer ?? "global",
        hasExpiration: parsed.expiresAtMs != null,
        // Omit expiresAtMs when unset — Firestore rejects `undefined` document values.
        ...(parsed.expiresAtMs != null ? { expiresAtMs: parsed.expiresAtMs } : {}),
      },
    });

    const effective = resolveEffectivePrintRequestLimits({
      settings,
      override: {
        maxQuantityPerPrintRequest: parsed.maxQuantityPerPrintRequest,
        maxQuantityPerShowPerCustomer: parsed.maxQuantityPerShowPerCustomer,
        expiresAt: parsed.expiresAtMs,
        updatedBy: caller.id,
      },
      nowMs,
    });

    return { customerId, effective };
  },
);
