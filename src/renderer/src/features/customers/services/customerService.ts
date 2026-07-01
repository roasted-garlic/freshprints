import {
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  type DocumentData,
  type Timestamp,
} from "firebase/firestore";

import { assertNoUndefinedFirestoreFields, withoutUndefinedFields } from "../../firebase/utils/firestoreDocument";
import { mapFirestoreTimestamp } from "../../firebase/utils/firestoreTimestamp";
import { firestoreCollectionService } from "../../firebase/services/firestoreCollectionService";
import { permissionService } from "../../permissions/services/permissionService";
import { userService } from "../../users/services/userService";
import type { User } from "../../users/types/user.types";
import type { Customer } from "../../../../../../shared/types/customer/customer.types";

export interface CreateCustomerRecordInput {
  displayName: string;
  email?: string;
  notes?: string;
}

export interface UpdateCustomerRecordInput {
  displayName: string;
  email?: string;
  notes?: string;
}

interface CustomerDocumentData extends DocumentData {
  id?: unknown;
  userId?: unknown;
  displayName?: unknown;
  email?: unknown;
  notes?: unknown;
  isGuest?: unknown;
  totalPrintRequests?: unknown;
  totalRequests?: unknown;
  totalApprovedRequests?: unknown;
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
    email: typeof data.email === "string" ? data.email : undefined,
    notes: typeof data.notes === "string" ? data.notes : undefined,
    isGuest: data.isGuest,
    totalPrintRequests: data.totalPrintRequests,
    totalRequests: typeof data.totalRequests === "number" ? data.totalRequests : undefined,
    totalApprovedRequests:
      typeof data.totalApprovedRequests === "number" ? data.totalApprovedRequests : undefined,
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

    if (!displayName) {
      throw new Error("Customer name is required.");
    }

    await assertEmailIsUniqueForDirectory(caller, input.email);

    const customerRef = doc(firestoreCollectionService.getCustomersCollection());
    const payload = withoutUndefinedFields({
      id: customerRef.id,
      displayName,
      email: normalizeOptionalEmail(input.email),
      notes: input.notes?.trim() || undefined,
      isGuest: false,
      totalPrintRequests: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    assertNoUndefinedFirestoreFields(payload, "Customer payload");
    await setDoc(customerRef, payload);

    const createdSnapshot = await getDoc(customerRef);
    return mapCustomerData(customerRef.id, createdSnapshot.data() as CustomerDocumentData);
  },

  async updateCustomerRecord(
    caller: User,
    customerId: string,
    input: UpdateCustomerRecordInput,
  ): Promise<Customer> {
    if (!permissionService.canManageCustomers(caller)) {
      throw new Error("You do not have permission to edit customers.");
    }

    const current = await this.getCustomerById(caller, customerId);
    const displayName = input.displayName.trim();

    if (!displayName) {
      throw new Error("Customer name is required.");
    }

    await assertEmailIsUniqueForDirectory(caller, input.email, { excludeCustomerId: customerId });

    const customerRef = doc(firestoreCollectionService.getCustomersCollection(), customerId);
    const payload = withoutUndefinedFields({
      displayName,
      email: normalizeOptionalEmail(input.email),
      notes: input.notes?.trim() || undefined,
      isGuest: current.isGuest,
      totalPrintRequests: current.totalPrintRequests,
      totalRequests: current.totalRequests,
      totalApprovedRequests: current.totalApprovedRequests,
      createdAt: current.createdAt,
      updatedAt: serverTimestamp(),
      userId: current.userId,
    });

    assertNoUndefinedFirestoreFields(payload, "Customer update payload");
    await updateDoc(customerRef, payload);

    const updatedSnapshot = await getDoc(customerRef);
    return mapCustomerData(updatedSnapshot.id, updatedSnapshot.data() as CustomerDocumentData);
  },
};
