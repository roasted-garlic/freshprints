import { doc, getDoc, onSnapshot, type Unsubscribe } from 'firebase/firestore';

import {
  DEFAULT_PRINT_REQUEST_LIMIT_SETTINGS,
  PRINT_REQUEST_LIMIT_SETTINGS_DOC_ID,
  printRequestLimitL,
  printRequestLimitPerCustomerPerShow,
  printRequestLimitPerRequest,
  resolvePrintRequestLimitSettings,
  type PrintRequestLimitSettings,
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

export interface PortalPrintRequestLimits {
  requestLimit: number;
  customerShowLimit: number;
}

function resolveLimitsFromSnapshotData(data: unknown): PortalPrintRequestLimits {
  const settings = resolvePrintRequestLimitSettings(data);
  return {
    requestLimit: printRequestLimitPerRequest(settings),
    customerShowLimit: printRequestLimitPerCustomerPerShow(settings),
  };
}

function resolveSettingsFromSnapshotData(data: unknown): PrintRequestLimitSettings {
  return resolvePrintRequestLimitSettings(data);
}

export const portalPrintRequestLimitService = {
  subscribe(onLimits: (limits: PortalPrintRequestLimits) => void): Unsubscribe {
    const fallback = {
      requestLimit: printRequestLimitPerRequest(DEFAULT_PRINT_REQUEST_LIMIT_SETTINGS),
      customerShowLimit: printRequestLimitPerCustomerPerShow(DEFAULT_PRINT_REQUEST_LIMIT_SETTINGS),
    };

    const traceMetadata = { ...LIMIT_SETTINGS_TRACE, source: 'portalPrintRequestLimitService.subscribe' };
    traceFirestoreListenerAttach(traceMetadata);
    const unsubscribe = onSnapshot(
      doc(getPortalDb(), 'settings', PRINT_REQUEST_LIMIT_SETTINGS_DOC_ID),
      (snapshot) => {
        traceFirestoreListenerEmission(traceMetadata, snapshot.exists() ? 1 : 0);
        onLimits(resolveLimitsFromSnapshotData(snapshot.data()));
      },
      () => {
        onLimits(fallback);
      },
    );
    return traceWrappedUnsubscribe(traceMetadata, unsubscribe);
  },

  subscribeSettings(onSettings: (settings: PrintRequestLimitSettings) => void): Unsubscribe {
    const fallback = DEFAULT_PRINT_REQUEST_LIMIT_SETTINGS;
    const traceMetadata = {
      ...LIMIT_SETTINGS_TRACE,
      source: 'portalPrintRequestLimitService.subscribeSettings',
    };
    traceFirestoreListenerAttach(traceMetadata);
    const unsubscribe = onSnapshot(
      doc(getPortalDb(), 'settings', PRINT_REQUEST_LIMIT_SETTINGS_DOC_ID),
      (snapshot) => {
        traceFirestoreListenerEmission(traceMetadata, snapshot.exists() ? 1 : 0);
        onSettings(resolveSettingsFromSnapshotData(snapshot.data()));
      },
      () => {
        onSettings(fallback);
      },
    );
    return traceWrappedUnsubscribe(traceMetadata, unsubscribe);
  },

  async readLimits(): Promise<PortalPrintRequestLimits> {
    const traceMetadata = { ...LIMIT_SETTINGS_TRACE, source: 'portalPrintRequestLimitService.readLimits' };
    traceFirestoreOneShotStart('getDoc', traceMetadata);
    try {
      const snapshot = await getDoc(
        doc(getPortalDb(), 'settings', PRINT_REQUEST_LIMIT_SETTINGS_DOC_ID),
      );
      traceFirestoreOneShotComplete('getDoc', traceMetadata, snapshot.exists() ? 1 : 0);
      if (!snapshot.exists()) {
        return {
          requestLimit: printRequestLimitPerRequest(DEFAULT_PRINT_REQUEST_LIMIT_SETTINGS),
          customerShowLimit: printRequestLimitPerCustomerPerShow(DEFAULT_PRINT_REQUEST_LIMIT_SETTINGS),
        };
      }
      return resolveLimitsFromSnapshotData(snapshot.data());
    } catch {
      return {
        requestLimit: printRequestLimitPerRequest(DEFAULT_PRINT_REQUEST_LIMIT_SETTINGS),
        customerShowLimit: printRequestLimitPerCustomerPerShow(DEFAULT_PRINT_REQUEST_LIMIT_SETTINGS),
      };
    }
  },

  /** @deprecated Prefer `readLimits().customerShowLimit` or `subscribe`. */
  async readLimit(): Promise<number> {
    const limits = await this.readLimits();
    return limits.customerShowLimit;
  },
};

/** @deprecated Prefer `PortalPrintRequestLimits.customerShowLimit`. Sole-L compat alias. */
export function portalPrintRequestLimitLFromSettings(settings: PrintRequestLimitSettings): number {
  return printRequestLimitL(settings);
}
