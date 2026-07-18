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

  async setAssistedBrowserPushOptIn(customerId: string, optedIn: boolean): Promise<void> {
    await updateDoc(doc(getPortalDb(), 'customers', customerId), {
      assistedBrowserPushOptIn: optedIn,
      assistedBrowserPushOptInUpdatedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  },

  async setNotificationPreferences(
    customerId: string,
    input: { emailOptIn: boolean; browserPushOptIn: boolean },
  ): Promise<void> {
    await updateDoc(doc(getPortalDb(), 'customers', customerId), {
      assistedProofEmailOptIn: input.emailOptIn,
      assistedProofEmailOptInUpdatedAt: serverTimestamp(),
      assistedBrowserPushOptIn: input.browserPushOptIn,
      assistedBrowserPushOptInUpdatedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  },
};
