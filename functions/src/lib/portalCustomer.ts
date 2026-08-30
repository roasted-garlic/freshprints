import { adminDb } from "./admin";
import { invalidArgument, permissionDenied } from "./errors";

export interface PortalCustomerContext {
  customerId: string;
  userId: string;
  username: string;
  displayName: string;
}

export async function findCustomerByUserId(userId: string) {
  const snapshot = await adminDb.collection("customers").where("userId", "==", userId).limit(1).get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  return { id: doc.id, data: doc.data() };
}

export async function requirePortalCustomer(userId: string): Promise<PortalCustomerContext> {
  const userSnapshot = await adminDb.collection("users").doc(userId).get();
  const userData = userSnapshot.data();
  const role = userData?.role;

  if (!userSnapshot.exists || role !== "customer") {
    throw permissionDenied("Only portal customers can use this action.");
  }

  if (userData?.isActive === false || userData?.isDeleted === true) {
    throw permissionDenied("This customer account has been deleted and can no longer sign in or create activity.");
  }

  const customer = await findCustomerByUserId(userId);

  if (!customer) {
    throw permissionDenied("No customer profile is linked to this account.");
  }

  if (customer.data.isDeleted === true) {
    throw permissionDenied("This customer account has been deleted and can no longer sign in or create activity.");
  }

  if (customer.data.isDisabled === true) {
    throw permissionDenied("This customer account is disabled and cannot sign in or create activity.");
  }

  const username = typeof customer.data.username === "string" ? customer.data.username.trim() : "";
  const displayName =
    typeof customer.data.displayName === "string" ? customer.data.displayName : "Customer";

  if (!username) {
    throw invalidArgument("Customer profile is missing a username.");
  }

  return {
    customerId: customer.id,
    userId,
    username,
    displayName,
  };
}
