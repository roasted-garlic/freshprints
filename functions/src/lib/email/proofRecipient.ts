import { adminDb } from "../admin";
import { EmailDeliveryError } from "./email.types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ProofRecipient {
  email: string;
  displayName: string;
}

interface RecipientDocument {
  id?: unknown;
  userId?: unknown;
  email?: unknown;
  displayName?: unknown;
  role?: unknown;
  isActive?: unknown;
}

function normalizedEmail(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const email = value.trim().toLowerCase();
  return EMAIL_PATTERN.test(email) ? email : null;
}

export function resolveProofRecipientFromDocuments(input: {
  customerId: string;
  customerUid: string;
  customer: RecipientDocument | undefined;
  user: RecipientDocument | undefined;
}): ProofRecipient {
  const customerData = input.customer;
  if (!customerData || customerData.id !== input.customerId || customerData.userId !== input.customerUid) {
    throw new EmailDeliveryError("recipient_link_mismatch", false);
  }

  const customerEmail = normalizedEmail(customerData.email);
  const displayName =
    typeof customerData.displayName === "string" && customerData.displayName.trim()
      ? customerData.displayName.trim()
      : "there";
  if (customerEmail) {
    return { email: customerEmail, displayName };
  }

  const userData = input.user;
  if (
    !userData ||
    userData?.id !== input.customerUid ||
    userData?.role !== "customer" ||
    userData?.isActive !== true
  ) {
    throw new EmailDeliveryError("recipient_link_mismatch", false);
  }

  const userEmail = normalizedEmail(userData.email);
  if (!userEmail) {
    throw new EmailDeliveryError("invalid_recipient", false);
  }
  return { email: userEmail, displayName };
}

export async function resolveProofRecipient(input: {
  customerId: string;
  customerUid: string;
}): Promise<ProofRecipient> {
  const [customer, user] = await Promise.all([
    adminDb.collection("customers").doc(input.customerId).get(),
    adminDb.collection("users").doc(input.customerUid).get(),
  ]);
  return resolveProofRecipientFromDocuments({
    ...input,
    customer: customer.exists ? customer.data() : undefined,
    user: user.exists ? user.data() : undefined,
  });
}
