import type { CustomerUploadUploaderType } from "../../../packages/shared/src/constants/customerUpload/customerUploadGuest.constants";

import { permissionDenied, unauthenticated } from "./errors";
import { requirePortalCustomer, type PortalCustomerContext } from "./portalCustomer";

export interface CatalogDonationUploaderContext {
  customerUid: string;
  customerId: string;
  createdBy: string;
  uploaderType: CustomerUploadUploaderType;
  /** Present only for registered portal customers. */
  portalCustomer?: PortalCustomerContext;
}

type AuthTokenLike = { firebase?: { sign_in_provider?: string } } | undefined;

export function isAnonymousAuthToken(token: AuthTokenLike): boolean {
  return token?.firebase?.sign_in_provider === "anonymous";
}

/**
 * Donation callables: registered portal customer only (anonymous guest donations retired).
 * Print-request upload callables must continue to use `requirePortalCustomer` only.
 */
export async function requireCatalogDonationUploader(input: {
  uid: string | undefined;
  token?: AuthTokenLike;
}): Promise<CatalogDonationUploaderContext> {
  if (!input.uid) {
    throw unauthenticated();
  }

  if (isAnonymousAuthToken(input.token)) {
    throw permissionDenied("Sign in to donate artwork.");
  }

  const portalCustomer = await requirePortalCustomer(input.uid);
  return {
    customerUid: input.uid,
    customerId: portalCustomer.customerId,
    createdBy: input.uid,
    uploaderType: "customer",
    portalCustomer,
  };
}

/**
 * Upload callables that may run for guests only when `allowAnonymousGuest` is true
 * (donation quota / finalize / halftone on guest-owned docs).
 */
export async function requireCustomerUploadCaller(input: {
  uid: string | undefined;
  token?: AuthTokenLike;
  allowAnonymousGuest: boolean;
}): Promise<{ customerUid: string; uploaderType: CustomerUploadUploaderType }> {
  if (!input.uid) {
    throw unauthenticated();
  }

  if (isAnonymousAuthToken(input.token)) {
    if (!input.allowAnonymousGuest) {
      throw permissionDenied("Sign in to use this action.");
    }
    return { customerUid: input.uid, uploaderType: "guest" };
  }

  await requirePortalCustomer(input.uid);
  return { customerUid: input.uid, uploaderType: "customer" };
}
