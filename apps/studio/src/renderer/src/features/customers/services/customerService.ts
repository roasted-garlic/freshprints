import {
  doc,
  getDoc,
  getDocs,
  runTransaction,
  serverTimestamp,
  type DocumentData,
  type Transaction,
  type Timestamp,
} from "firebase/firestore";

import { assertNoUndefinedFirestoreFields, withoutUndefinedFields } from "../../firebase/utils/firestoreDocument";
import { mapFirestoreTimestamp } from "../../firebase/utils/firestoreTimestamp";
import { firestoreCollectionService } from "../../firebase/services/firestoreCollectionService";
import { permissionService } from "../../permissions/services/permissionService";
import { userService } from "../../users/services/userService";
import type { User } from "../../users/types/user.types";
import type { Customer } from "@fresh-prints/shared/types/customer/customer.types";
import { parseCustomerSignupSource } from "@fresh-prints/shared/utils/customerSignupSource";
import { requireValidCustomerUsername } from "@fresh-prints/shared/utils/customerUsername";

export interface CreateCustomerRecordInput {
  displayName: string;
  username: string;
  email?: string;
  notes?: string;
}

export interface UpdateCustomerRecordInput {
  displayName: string;
  username: string;
  email?: string;
  notes?: string;
}

interface CustomerDocumentData extends DocumentData {
  id?: unknown;
  userId?: unknown;
  displayName?: unknown;
  username?: unknown;
  email?: unknown;
  notes?: unknown;
  isGuest?: unknown;
  signupSource?: unknown;
  totalPrintRequests?: unknown;
  nextPrintRequestSequence?: unknown;
  totalRequests?: unknown;
  totalApprovedRequests?: unknown;
  usernameUpdatedAt?: unknown;
  isDeleted?: unknown;
  deletedAt?: unknown;
  deletedBy?: unknown;
  deletionSource?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
}

function resolveRequiredTimestamp(value: unknown): Timestamp | undefined {
  return mapFirestoreTimestamp(value);
}

function mapCustomerData(customerId: string, data: CustomerDocumentData): Customer {
  const createdAt = resolveRequiredTimestamp(data.createdAt);
  const updatedAt = resolveRequiredTimestamp(data.updatedAt);

  if (
    typeof data.displayName !== "string" ||
    typeof data.isGuest !== "boolean" ||
    typeof data.totalPrintRequests !== "number" ||
    createdAt === undefined ||
    updatedAt === undefined
  ) {
    throw new Error("A customer is incomplete.");
  }

  return {
    id: customerId,
    userId: typeof data.userId === "string" ? data.userId : undefined,
    displayName: data.displayName,
    username: typeof data.username === "string" ? data.username : undefined,
    email: typeof data.email === "string" ? data.email : undefined,
    notes: typeof data.notes === "string" ? data.notes : undefined,
    isGuest: data.isGuest,
    signupSource: parseCustomerSignupSource(data.signupSource),
    totalPrintRequests: data.totalPrintRequests,
    nextPrintRequestSequence:
      typeof data.nextPrintRequestSequence === "number" ? data.nextPrintRequestSequence : undefined,
    totalRequests: typeof data.totalRequests === "number" ? data.totalRequests : undefined,
    totalApprovedRequests:
      typeof data.totalApprovedRequests === "number" ? data.totalApprovedRequests : undefined,
    usernameUpdatedAt: resolveRequiredTimestamp(data.usernameUpdatedAt),
    isDeleted: data.isDeleted === true ? true : undefined,
    deletedAt: resolveRequiredTimestamp(data.deletedAt),
    deletedBy: typeof data.deletedBy === "string" ? data.deletedBy : undefined,
    deletionSource:
      data.deletionSource === "studio_owner" || data.deletionSource === "portal_request"
        ? data.deletionSource
        : undefined,
    createdAt,
    updatedAt,
  };
}

function normalizeOptionalEmail(value: string | undefined): string | undefined {
  const email = value?.trim().toLowerCase();

  if (!email) {
    return undefined;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Enter a valid customer email address.");
  }

  return email;
}

async function assertEmailIsUniqueForDirectory(
  caller: User,
  email: string | undefined,
  options: { excludeCustomerId?: string } = {},
) {
  const normalizedEmail = normalizeOptionalEmail(email);

  if (!normalizedEmail) {
    return;
  }

  const [teamUsers, customers] = await Promise.all([
    userService.listTeamUsers(caller),
    customerService.listCustomers(caller),
  ]);

  const emailUsedByTeamUser = teamUsers.some(
    (teamUser) => teamUser.email.trim().toLowerCase() === normalizedEmail,
  );
  const emailUsedByCustomer = customers.some(
    (customer) =>
      customer.id !== options.excludeCustomerId &&
      typeof customer.email === "string" &&
      customer.email.trim().toLowerCase() === normalizedEmail,
  );

  if (emailUsedByTeamUser || emailUsedByCustomer) {
    throw new Error("That email is already used by another user or customer.");
  }
}

function getCustomerUsernameReservationRef(username: string) {
  return doc(firestoreCollectionService.getCustomerUsernamesCollection(), username);
}

async function assertUsernameReservationAvailable(
  username: string,
  customerId: string,
  transaction: Transaction,
) {
  const reservationRef = getCustomerUsernameReservationRef(username);
  const reservationSnapshot = await transaction.get(reservationRef);

  if (
    reservationSnapshot.exists() &&
    reservationSnapshot.data().customerId !== customerId
  ) {
    throw new Error("That customer username is already used by another customer.");
  }

  return reservationRef;
}

export const customerService = {
  async listCustomers(caller: User): Promise<Customer[]> {
    if (!permissionService.canManageCustomers(caller)) {
      return [];
    }

    const snapshot = await getDocs(firestoreCollectionService.getCustomersCollection());
    const customers = snapshot.docs.map((customerDoc: { id: string; data: () => DocumentData }) =>
      mapCustomerData(customerDoc.id, customerDoc.data() as CustomerDocumentData),
    );

    return [...customers].sort((left, right) => left.displayName.localeCompare(right.displayName));
  },

  async getCustomerById(caller: User, customerId: string): Promise<Customer> {
    if (!permissionService.canManageCustomers(caller)) {
      throw new Error("You do not have permission to view customers.");
    }

    const customerSnapshot = await getDoc(doc(firestoreCollectionService.getCustomersCollection(), customerId));

    if (!customerSnapshot.exists()) {
      throw new Error("Customer not found.");
    }

    return mapCustomerData(customerSnapshot.id, customerSnapshot.data() as CustomerDocumentData);
  },

  async assertEmailIsUniqueForDirectory(
    caller: User,
    email: string | undefined,
    options: { excludeCustomerId?: string } = {},
  ): Promise<void> {
    await assertEmailIsUniqueForDirectory(caller, email, options);
  },

  async createCustomerRecord(caller: User, input: CreateCustomerRecordInput): Promise<Customer> {
    if (!permissionService.canManageCustomers(caller)) {
      throw new Error("You do not have permission to create customers.");
    }

    const displayName = input.displayName.trim();
    const username = requireValidCustomerUsername(input.username);

    if (!displayName) {
      throw new Error("Customer name is required.");
    }

    await assertEmailIsUniqueForDirectory(caller, input.email);

    const customerRef = doc(firestoreCollectionService.getCustomersCollection());
    const normalizedEmail = normalizeOptionalEmail(input.email);

    await runTransaction(firestoreCollectionService.getCustomersCollection().firestore, async (transaction) => {
      const reservationRef = await assertUsernameReservationAvailable(username, customerRef.id, transaction);
      const payload = withoutUndefinedFields({
        id: customerRef.id,
        displayName,
        username,
        email: normalizedEmail,
        notes: input.notes?.trim() || undefined,
        isGuest: false,
        signupSource: "studio",
        totalPrintRequests: 0,
        nextPrintRequestSequence: 1,
        usernameUpdatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const reservationPayload = {
        customerId: customerRef.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      assertNoUndefinedFirestoreFields(payload, "Customer payload");
      transaction.set(customerRef, payload);
      transaction.set(reservationRef, reservationPayload);
    });

    const createdSnapshot = await getDoc(customerRef);
    return mapCustomerData(customerRef.id, createdSnapshot.data() as CustomerDocumentData);
  },
};
