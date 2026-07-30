import { doc, getDoc, onSnapshot, type Unsubscribe } from 'firebase/firestore';

import {
  DEFAULT_PRINT_REQUEST_LIMIT_SETTINGS,
  PRINT_REQUEST_LIMIT_SETTINGS_DOC_ID,
  printRequestLimitL,
  resolvePrintRequestLimitSettings,
} from '@fresh-prints/shared/constants/printRequest/printRequestLimitSettings.constants';
import {
  traceFirestoreListenerAttach,
  traceFirestoreListenerEmission,
  traceFirestoreOneShotComplete,
  traceFirestoreOneShotStart,
  traceWrappedUnsubscribe,
} from '@fresh-prints/shared/utils/firestoreUsageTrace';

import { getPortalDb } from '../../../lib/firebase/client';

const LIMIT_SETTINGS_TRACE = {
  app: 'portal' as const,
  collection: 'settings',
  documentPathPattern: `settings/${PRINT_REQUEST_LIMIT_SETTINGS_DOC_ID}`,
  source: 'portalPrintRequestLimitService',
  triggerReason: 'authentication' as const,
};

function resolveLimitFromSnapshotData(data: unknown): number {
  return printRequestLimitL(resolvePrintRequestLimitSettings(data));
}

export const portalPrintRequestLimitService = {
  subscribe(onLimit: (limit: number) => void): Unsubscribe {
    const fallback = printRequestLimitL(DEFAULT_PRINT_REQUEST_LIMIT_SETTINGS);

    const traceMetadata = { ...LIMIT_SETTINGS_TRACE, source: 'portalPrintRequestLimitService.subscribe' };
    traceFirestoreListenerAttach(traceMetadata);
    const unsubscribe = onSnapshot(
      doc(getPortalDb(), 'settings', PRINT_REQUEST_LIMIT_SETTINGS_DOC_ID),
      (snapshot) => {
        traceFirestoreListenerEmission(traceMetadata, snapshot.exists() ? 1 : 0);
        onLimit(resolveLimitFromSnapshotData(snapshot.data()));
      },
      () => {
        onLimit(fallback);
      },
    );
    return traceWrappedUnsubscribe(traceMetadata, unsubscribe);
  },

  async readLimit(): Promise<number> {
    const traceMetadata = { ...LIMIT_SETTINGS_TRACE, source: 'portalPrintRequestLimitService.readLimit' };
    traceFirestoreOneShotStart('getDoc', traceMetadata);
    try {
      const snapshot = await getDoc(
        doc(getPortalDb(), 'settings', PRINT_REQUEST_LIMIT_SETTINGS_DOC_ID),
      );
      traceFirestoreOneShotComplete('getDoc', traceMetadata, snapshot.exists() ? 1 : 0);
      if (!snapshot.exists()) {
        return printRequestLimitL(DEFAULT_PRINT_REQUEST_LIMIT_SETTINGS);
      }
      return resolveLimitFromSnapshotData(snapshot.data());
    } catch {
      return printRequestLimitL(DEFAULT_PRINT_REQUEST_LIMIT_SETTINGS);
    }
  },
};
