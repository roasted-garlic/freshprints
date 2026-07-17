'use client';

import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';

import { getPortalDb } from '../../../lib/firebase/client';

export const customerNotificationPreferencesService = {
  async setAssistedProofEmailOptIn(customerId: string, optedIn: boolean): Promise<void> {
    await updateDoc(doc(getPortalDb(), 'customers', customerId), {
      assistedProofEmailOptIn: optedIn,
      assistedProofEmailOptInUpdatedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  },
};
