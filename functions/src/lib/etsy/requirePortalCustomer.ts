import { adminDb } from "../admin";
import { permissionDenied } from "../errors";

export async function requirePortalCustomer(userId: string): Promise<{
  customerId: string;
  customerUid: string;
}> {
  const userSnapshot = await adminDb.collection("users").doc(userId).get();
  const role = userSnapshot.data()?.role;

  if (!userSnapshot.exists || role !== "customer") {
    throw permissionDenied("Only portal customers can use Etsy recommendations.");
  }

  const snapshot = await adminDb.collection("customers").where("userId", "==", userId).limit(1).get();
  if (snapshot.empty) {
    throw permissionDenied("No customer profile is linked to this account.");
  }

  return {
    customerId: snapshot.docs[0].id,
    customerUid: userId,
  };
}
