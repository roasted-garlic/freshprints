import { doc, getDoc, onSnapshot, type Unsubscribe } from 'firebase/firestore';

import {
  DEFAULT_PRINT_REQUEST_LIMIT_SETTINGS,
  PRINT_REQUEST_LIMIT_SETTINGS_DOC_ID,
  printRequestLimitL,
  resolvePrintRequestLimitSettings,
} from '@fresh-prints/shared/constants/printRequest/printRequestLimitSettings.constants';

import { getPortalDb } from '../../../lib/firebase/client';

function resolveLimitFromSnapshotData(data: unknown): number {
  return printRequestLimitL(resolvePrintRequestLimitSettings(data));
}

export const portalPrintRequestLimitService = {
  subscribe(onLimit: (limit: number) => void): Unsubscribe {
    const fallback = printRequestLimitL(DEFAULT_PRINT_REQUEST_LIMIT_SETTINGS);

    return onSnapshot(
      doc(getPortalDb(), 'settings', PRINT_REQUEST_LIMIT_SETTINGS_DOC_ID),
      (snapshot) => {
        onLimit(resolveLimitFromSnapshotData(snapshot.data()));
      },
      () => {
        onLimit(fallback);
      },
    );
  },

  async readLimit(): Promise<number> {
    try {
      const snapshot = await getDoc(
        doc(getPortalDb(), 'settings', PRINT_REQUEST_LIMIT_SETTINGS_DOC_ID),
      );
      if (!snapshot.exists()) {
        return printRequestLimitL(DEFAULT_PRINT_REQUEST_LIMIT_SETTINGS);
      }
      return resolveLimitFromSnapshotData(snapshot.data());
    } catch {
      return printRequestLimitL(DEFAULT_PRINT_REQUEST_LIMIT_SETTINGS);
    }
  },
};
