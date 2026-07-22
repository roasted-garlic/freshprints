import { doc, onSnapshot, type Unsubscribe } from 'firebase/firestore'

import {
  BRAND_LOGO_SETTINGS_DOC_ID,
  resolveBrandLogoSettings,
  type BrandLogoSettings,
} from '@fresh-prints/shared/constants/brand/brandLogoSettings.constants'

import { getPortalDb } from '../../../lib/firebase/client'

export const portalBrandLogoSettingsService = {
  subscribe(
    onData: (settings: BrandLogoSettings) => void,
    onError: (message: string) => void,
  ): Unsubscribe {
    return onSnapshot(
      doc(getPortalDb(), 'settings', BRAND_LOGO_SETTINGS_DOC_ID),
      (snapshot) => onData(resolveBrandLogoSettings(snapshot.data())),
      (error) => onError(error.message),
    )
  },
}
