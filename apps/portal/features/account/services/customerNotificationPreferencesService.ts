'use client';

import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { runTracedWrite } from '@fresh-prints/shared/utils/firestoreUsageTrace';

import { getPortalDb } from '../../../lib/firebase/client';

export const customerNotificationPreferencesService = {
  async updatePreferences(
    customerId: string,
    source: string,
    fields: Record<string, unknown>,
  ): Promise<void> {
    await runTracedWrite(
      'updateDoc',
      () => updateDoc(doc(getPortalDb(), 'customers', customerId), fields),
      {
        app: 'portal',
        collection: 'customers',
        documentPathPattern: 'customers/{currentCustomer}',
        source,
        triggerReason: 'explicit-refresh',
      },
    );
  },
  async setAssistedProofEmailOptIn(customerId: string, optedIn: boolean): Promise<void> {
    await this.updatePreferences(customerId, 'customerNotificationPreferencesService.setAssistedProofEmailOptIn', {
      assistedProofEmailOptIn: optedIn,
      assistedProofEmailOptInUpdatedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  },

  async setAssistedBrowserPushOptIn(customerId: string, optedIn: boolean): Promise<void> {
    await this.updatePreferences(customerId, 'customerNotificationPreferencesService.setAssistedBrowserPushOptIn', {
      assistedBrowserPushOptIn: optedIn,
      assistedBrowserPushOptInUpdatedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  },

  async setNotificationPreferences(
    customerId: string,
    input: { emailOptIn: boolean; browserPushOptIn: boolean },
  ): Promise<void> {
    await this.updatePreferences(customerId, 'customerNotificationPreferencesService.setNotificationPreferences', {
      assistedProofEmailOptIn: input.emailOptIn,
      assistedProofEmailOptInUpdatedAt: serverTimestamp(),
      assistedBrowserPushOptIn: input.browserPushOptIn,
      assistedBrowserPushOptInUpdatedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  },
};
