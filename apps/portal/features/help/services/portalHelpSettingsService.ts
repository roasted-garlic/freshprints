import { doc, onSnapshot, type Unsubscribe } from 'firebase/firestore'

import {
  PORTAL_HELP_SETTINGS_DOC_ID,
  resolvePortalHelpSettings,
  type PortalHelpSettings,
} from '@fresh-prints/shared/constants/portal/portalHelpSettings.constants'
import {
  traceFirestoreListenerAttach,
  traceFirestoreListenerEmission,
  traceWrappedUnsubscribe,
} from '@fresh-prints/shared/utils/firestoreUsageTrace'

import { getPortalDb } from '../../../lib/firebase/client'

const HELP_SETTINGS_TRACE = {
  app: 'portal' as const,
  collection: 'settings',
  documentPathPattern: `settings/${PORTAL_HELP_SETTINGS_DOC_ID}`,
  source: 'portalHelpSettingsService.subscribe',
  triggerReason: 'route' as const,
}

export type PortalHelpSettingsLoad =
  | { status: 'missing'; settings: PortalHelpSettings }
  | { status: 'loaded'; settings: PortalHelpSettings }

export const portalHelpSettingsService = {
  subscribe(
    onData: (load: PortalHelpSettingsLoad) => void,
    onError: (message: string) => void,
  ): Unsubscribe {
    traceFirestoreListenerAttach(HELP_SETTINGS_TRACE)
    const unsubscribe = onSnapshot(
      doc(getPortalDb(), 'settings', PORTAL_HELP_SETTINGS_DOC_ID),
      (snapshot) => {
        traceFirestoreListenerEmission(HELP_SETTINGS_TRACE, snapshot.exists() ? 1 : 0)
        if (!snapshot.exists()) {
          onData({
            status: 'missing',
            settings: resolvePortalHelpSettings(undefined),
          })
          return
        }
        onData({
          status: 'loaded',
          settings: resolvePortalHelpSettings(snapshot.data()),
        })
      },
      (error) => onError(error.message),
    )
    return traceWrappedUnsubscribe(HELP_SETTINGS_TRACE, unsubscribe)
  },
}
