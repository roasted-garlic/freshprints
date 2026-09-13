import { doc, onSnapshot, type Unsubscribe } from 'firebase/firestore';

import {
  DEFAULT_STANDARD_PRINT_SIZES_SETTINGS,
  STANDARD_PRINT_SIZES_SETTINGS_DOC_ID,
  resolveStandardPrintSizesSettings,
  type StandardPrintSizesSettings,
} from '@fresh-prints/shared/constants/printSize/standardPrintSizesSettings.constants';
import {
  traceFirestoreListenerAttach,
  traceFirestoreListenerEmission,
  traceWrappedUnsubscribe,
} from '@fresh-prints/shared/utils/firestoreUsageTrace';

import { getPortalDb } from '../../../lib/firebase/client';

const TRACE = {
  app: 'portal' as const,
  collection: 'settings',
  documentPathPattern: `settings/${STANDARD_PRINT_SIZES_SETTINGS_DOC_ID}`,
  source: 'portalStandardPrintSizesService',
  triggerReason: 'authentication' as const,
};

export const portalStandardPrintSizesService = {
  subscribe(onSettings: (settings: StandardPrintSizesSettings) => void): Unsubscribe {
    const fallback = DEFAULT_STANDARD_PRINT_SIZES_SETTINGS;
    const traceMetadata = { ...TRACE, source: 'portalStandardPrintSizesService.subscribe' };
    traceFirestoreListenerAttach(traceMetadata);
    const unsubscribe = onSnapshot(
      doc(getPortalDb(), 'settings', STANDARD_PRINT_SIZES_SETTINGS_DOC_ID),
      (snapshot) => {
        traceFirestoreListenerEmission(traceMetadata, snapshot.exists() ? 1 : 0);
        onSettings(resolveStandardPrintSizesSettings(snapshot.data() ?? fallback));
      },
      () => {
        onSettings(fallback);
      },
    );
    return traceWrappedUnsubscribe(traceMetadata, unsubscribe);
  },
};
