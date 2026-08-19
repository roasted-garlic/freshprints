'use client'

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { approvePublicCatalogDesignId } from '../services/approvePublicCatalogDesignId'
import { approvePublicCatalogDesignTitle } from '../services/approvePublicCatalogDesignTitle'
import type { PortalShareAnalyticsReadiness } from '../types/portalAnalytics.types'

const IDLE: PortalShareAnalyticsReadiness = { kind: 'idle' }

const PortalAnalyticsShareTitleContext = createContext<{
  readiness: PortalShareAnalyticsReadiness
  setReadiness: (next: PortalShareAnalyticsReadiness) => void
  streamReady: boolean
  markStreamReady: () => void
}>({
  readiness: IDLE,
  setReadiness: () => {},
  streamReady: false,
  markStreamReady: () => {},
})

export function PortalAnalyticsShareTitleProvider({ children }: { children: ReactNode }) {
  const [readiness, setReadiness] = useState<PortalShareAnalyticsReadiness>(IDLE)
  const [streamReady, setStreamReady] = useState(false)
  const markStreamReady = useCallback(() => setStreamReady(true), [])
  const value = useMemo(
    () => ({ readiness, setReadiness, streamReady, markStreamReady }),
    [readiness, streamReady, markStreamReady],
  )
  return (
    <PortalAnalyticsShareTitleContext.Provider value={value}>
      {children}
    </PortalAnalyticsShareTitleContext.Provider>
  )
}

export function usePortalShareAnalyticsReadiness(): PortalShareAnalyticsReadiness {
  return useContext(PortalAnalyticsShareTitleContext).readiness
}

/** True only after the root controller successfully initialized the GA4 stream. */
export function usePortalAnalyticsStreamReady(): boolean {
  return useContext(PortalAnalyticsShareTitleContext).streamReady
}

export function useMarkPortalAnalyticsStreamReady(): () => void {
  return useContext(PortalAnalyticsShareTitleContext).markStreamReady
}

export function useRegisterShareAnalyticsDesign(input: {
  title: unknown
  designId: unknown
}): void {
  const { setReadiness } = useContext(PortalAnalyticsShareTitleContext)

  useLayoutEffect(() => {
    const title = approvePublicCatalogDesignTitle(input.title)
    const designId = approvePublicCatalogDesignId(input.designId)
    setReadiness(
      title && designId ? { kind: 'ready', title, designId } : { kind: 'unresolved' },
    )
    return () => setReadiness(IDLE)
  }, [input.title, input.designId, setReadiness])
}
