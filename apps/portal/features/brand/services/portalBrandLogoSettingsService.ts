import { doc, onSnapshot, type Unsubscribe } from 'firebase/firestore'

import {
  BRAND_LOGO_SETTINGS_DOC_ID,
  resolveBrandLogoSettings,
  type BrandLogoSettings,
} from '@fresh-prints/shared/constants/brand/brandLogoSettings.constants'
import {
  traceFirestoreListenerAttach,
  traceFirestoreListenerEmission,
  traceWrappedUnsubscribe,
} from '@fresh-prints/shared/utils/firestoreUsageTrace'

import { getPortalDb } from '../../../lib/firebase/client'

const BRAND_LOGO_TRACE = {
  app: 'portal' as const,
  collection: 'settings',
  documentPathPattern: `settings/${BRAND_LOGO_SETTINGS_DOC_ID}`,
  source: 'portalBrandLogoSettingsService.subscribe',
  triggerReason: 'route' as const,
}

export const portalBrandLogoSettingsService = {
  subscribe(
    onData: (settings: BrandLogoSettings) => void,
    onError: (message: string) => void,
  ): Unsubscribe {
    traceFirestoreListenerAttach(BRAND_LOGO_TRACE)
    const unsubscribe = onSnapshot(
      doc(getPortalDb(), 'settings', BRAND_LOGO_SETTINGS_DOC_ID),
      (snapshot) => {
        traceFirestoreListenerEmission(BRAND_LOGO_TRACE, snapshot.exists() ? 1 : 0)
        onData(resolveBrandLogoSettings(snapshot.data()))
      },
      (error) => onError(error.message),
    )
    return traceWrappedUnsubscribe(BRAND_LOGO_TRACE, unsubscribe)
  },
}
