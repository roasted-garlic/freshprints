import { onCall } from "firebase-functions/v2/https";

import type { PortalDevCustomerAccessCheckResult } from "../../packages/shared/src/constants/portal/portalDevCustomerAccess.constants";
import { adminDb } from "./lib/admin";
import { unauthenticated } from "./lib/errors";
import { checkPortalDevCustomerAccessForCaller } from "./lib/portalDevCustomerAccess";

/**
 * Portal AuthProvider bootstrap check.
 * Production short-circuits to allowed. Staff roles bypass the customer allowlist.
 * Unapproved customers receive `{ allowed: false }` with no membership enumeration.
 */
export const checkPortalDevCustomerAccess = onCall(
  async (request): Promise<PortalDevCustomerAccessCheckResult> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    const uid = request.auth.uid;
    const tokenEmail =
      typeof request.auth.token.email === "string" ? request.auth.token.email : undefined;

    let role: string | undefined;
    try {
      const userSnapshot = await adminDb.collection("users").doc(uid).get();
      const data = userSnapshot.data();
      if (typeof data?.role === "string") {
        role = data.role;
      }
    } catch {
      // Fail closed for customers if the profile read fails on DEV — treated as no staff role.
      role = undefined;
    }

    return checkPortalDevCustomerAccessForCaller({
      uid,
      email: tokenEmail,
      role,
    });
  },
);
