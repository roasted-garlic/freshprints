'use client'

import { useLayoutEffect, useState } from 'react'

import {
  readBrandLogoSettingsCache,
  writeBrandLogoSettingsCache,
} from '@fresh-prints/shared/constants/brand/brandLogoSettingsCache'
import {
  resolveBrandLogoSettings,
  type BrandLogoSettings,
} from '@fresh-prints/shared/constants/brand/brandLogoSettings.constants'

import { portalBrandLogoSettingsService } from '../services/portalBrandLogoSettingsService'

let cachedSettings: BrandLogoSettings | null = null
let settingsReady = false
let subscriberCount = 0
let unsubscribeShared: (() => void) | null = null
const listeners = new Set<(settings: BrandLogoSettings) => void>()
const readyListeners = new Set<(ready: boolean) => void>()

function publishReady(ready: boolean): void {
  settingsReady = ready
  for (const listener of readyListeners) {
    listener(ready)
  }
}

function publishSettings(settings: BrandLogoSettings): void {
  cachedSettings = settings
  writeBrandLogoSettingsCache(settings)
  publishReady(true)
  for (const listener of listeners) {
    listener(settings)
  }
}

function ensureSharedSubscription(): void {
  if (unsubscribeShared) {
    return
  }
  unsubscribeShared = portalBrandLogoSettingsService.subscribe(
    (settings) => {
      publishSettings(settings)
    },
    () => {
      // Keep last good cache; logos fall back to public/brand + default sizes once ready.
      publishReady(true)
    },
  )
}

function releaseSharedSubscription(): void {
  if (subscriberCount > 0 || !unsubscribeShared) {
    return
  }
  unsubscribeShared()
  unsubscribeShared = null
}

/** True after localStorage hydrate and/or first Firestore snapshot (avoids default-logo flash). */
export function usePortalBrandLogoSettingsReady(): boolean {
  const [ready, setReady] = useState(() => settingsReady || cachedSettings !== null)

  useLayoutEffect(() => {
    const listener = (next: boolean) => {
      setReady(next)
    }
    readyListeners.add(listener)
    setReady(settingsReady || cachedSettings !== null)
    return () => {
      readyListeners.delete(listener)
    }
  }, [])

  return ready
}

/** Shared Portal subscription for brand logo settings (URLs + display sizes). */
export function usePortalBrandLogoSettings(): BrandLogoSettings {
  const [settings, setSettings] = useState<BrandLogoSettings>(() =>
    resolveBrandLogoSettings(null),
  )

  useLayoutEffect(() => {
    subscriberCount += 1

    const fromCache = cachedSettings ?? readBrandLogoSettingsCache()
    if (fromCache) {
      cachedSettings = fromCache
      setSettings(fromCache)
      publishReady(true)
    }

    ensureSharedSubscription()
    const listener = (next: BrandLogoSettings) => {
      setSettings(next)
    }
    listeners.add(listener)
    if (cachedSettings) {
      setSettings(cachedSettings)
    }

    return () => {
      listeners.delete(listener)
      subscriberCount -= 1
      releaseSharedSubscription()
    }
  }, [])

  return settings
}
