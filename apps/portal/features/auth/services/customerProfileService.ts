import { collection, getDocs, limit, query, where, type DocumentData } from 'firebase/firestore';

import type { Customer } from '@fresh-prints/shared/types/customer/customer.types';
import { parseCustomerSignupSource } from '@fresh-prints/shared/utils/customerSignupSource';

import { getPortalDb } from '../../../lib/firebase/client';
import { mapFirestoreTimestamp } from '../../firebase/utils/mapFirestoreTimestamp';

interface CustomerDocumentData extends DocumentData {
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
  createdAt?: unknown;
  updatedAt?: unknown;
}

function mapCustomer(customerId: string, data: CustomerDocumentData): Customer {
  const createdAt = mapFirestoreTimestamp(data.createdAt);
  const updatedAt = mapFirestoreTimestamp(data.updatedAt);

  if (
    typeof data.displayName !== 'string' ||
    typeof data.isGuest !== 'boolean' ||
    typeof data.totalPrintRequests !== 'number' ||
    createdAt === undefined ||
    updatedAt === undefined
  ) {
    throw new Error('Your customer profile is incomplete.');
  }

  return {
    id: customerId,
    userId: typeof data.userId === 'string' ? data.userId : undefined,
    displayName: data.displayName,
    username: typeof data.username === 'string' ? data.username : undefined,
    email: typeof data.email === 'string' ? data.email : undefined,
    notes: typeof data.notes === 'string' ? data.notes : undefined,
    isGuest: data.isGuest,
    signupSource: parseCustomerSignupSource(data.signupSource),
    totalPrintRequests: data.totalPrintRequests,
    nextPrintRequestSequence:
      typeof data.nextPrintRequestSequence === 'number' ? data.nextPrintRequestSequence : undefined,
    totalRequests: typeof data.totalRequests === 'number' ? data.totalRequests : undefined,
    totalApprovedRequests:
      typeof data.totalApprovedRequests === 'number' ? data.totalApprovedRequests : undefined,
    usernameUpdatedAt: mapFirestoreTimestamp(data.usernameUpdatedAt),
    createdAt,
    updatedAt,
  };
}

export const customerProfileService = {
  async getCustomerByUserId(userId: string): Promise<Customer | null> {
    const snapshot = await getDocs(
      query(collection(getPortalDb(), 'customers'), where('userId', '==', userId), limit(1)),
    );

    if (snapshot.empty) {
      return null;
    }

    const customerDoc = snapshot.docs[0];
    return mapCustomer(customerDoc.id, customerDoc.data() as CustomerDocumentData);
  },
};
