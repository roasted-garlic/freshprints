'use client'

import { useEffect, useRef } from 'react'

import { usePortalAnalyticsStreamReady } from '../context/PortalAnalyticsShareTitleContext'
import { nextCatalogDesignViewDedupeState } from '../services/catalogDesignViewDedupe'
import { trackCatalogDesignModalView } from '../services/portalAnalyticsService'

export function useCatalogDesignViewAnalytics(input: {
  isOpen: boolean
  designId: string | null
  title: unknown
}): void {
  const streamReady = usePortalAnalyticsStreamReady()
  const lastTrackedDesignIdRef = useRef<string | null>(null)

  useEffect(() => {
    const next = nextCatalogDesignViewDedupeState({
      isOpen: input.isOpen,
      designId: input.designId,
      lastTrackedDesignId: lastTrackedDesignIdRef.current,
    })
    if (!next.shouldTrack) {
      lastTrackedDesignIdRef.current = next.nextLastTrackedDesignId
      return
    }
    if (!streamReady || typeof window === 'undefined') {
      return
    }
    const sent = trackCatalogDesignModalView({
      title: input.title,
      designId: input.designId,
      origin: window.location.origin,
      parentPathname: window.location.pathname,
      parentSearchParams: new URLSearchParams(window.location.search),
    })
    if (sent) {
      lastTrackedDesignIdRef.current = next.nextLastTrackedDesignId
    }
  }, [input.designId, input.isOpen, input.title, streamReady])
}
