import { doc, onSnapshot, type Unsubscribe } from 'firebase/firestore'

import {
  PORTAL_HELP_SETTINGS_DOC_ID,
  resolvePortalHelpSettings,
  type PortalHelpSettings,
} from '@fresh-prints/shared/constants/portal/portalHelpSettings.constants'

import { getPortalDb } from '../../../lib/firebase/client'

export type PortalHelpSettingsLoad =
  | { status: 'missing'; settings: PortalHelpSettings }
  | { status: 'loaded'; settings: PortalHelpSettings }

export const portalHelpSettingsService = {
  subscribe(
    onData: (load: PortalHelpSettingsLoad) => void,
    onError: (message: string) => void,
  ): Unsubscribe {
    return onSnapshot(
      doc(getPortalDb(), 'settings', PORTAL_HELP_SETTINGS_DOC_ID),
      (snapshot) => {
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
  },
}
