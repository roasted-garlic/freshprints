'use client'

import { useEffect, useState } from 'react'

import {
  PORTAL_TEXT_FAQS,
  mapHelpVideosToPortalFaqs,
  type PortalTextFaq,
  type PortalVideoFaq,
} from '../portalHelpContent'
import { portalHelpSettingsService } from '../services/portalHelpSettingsService'
import { mergePortalHelpFaqsWithRequired } from '../utils/mergePortalHelpFaqsWithRequired'

export type PortalHelpContentSource = 'firestore' | 'bundled-fallback'

export type PortalHelpLiveContent = {
  faqs: PortalTextFaq[]
  videos: PortalVideoFaq[]
  source: PortalHelpContentSource
  isLoading: boolean
  error: string | null
}

/**
 * Live FAQ / How To from `settings/portalHelp`.
 * Missing doc or empty FAQs → bundled FAQ defaults.
 * Empty / missing videos → empty list (Coming soon UI) — never dummy video slots.
 * Partial Studio content: non-empty list stays from Firestore.
 * Product-required Whatnot FAQ is always merged at the presentation layer.
 */
export function usePortalHelpContent(): PortalHelpLiveContent {
  const [faqs, setFaqs] = useState<PortalTextFaq[]>(() =>
    mergePortalHelpFaqsWithRequired(PORTAL_TEXT_FAQS),
  )
  const [videos, setVideos] = useState<PortalVideoFaq[]>([])
  const [source, setSource] = useState<PortalHelpContentSource>('bundled-fallback')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(
    () =>
      portalHelpSettingsService.subscribe(
        (load) => {
          if (load.status === 'missing') {
            setFaqs(mergePortalHelpFaqsWithRequired(PORTAL_TEXT_FAQS))
            setVideos([])
            setSource('bundled-fallback')
          } else {
            const loadedFaqs = load.settings.faqs
            const loadedVideos = load.settings.videos
            const baseFaqs = loadedFaqs.length > 0 ? loadedFaqs : PORTAL_TEXT_FAQS
            const resolvedVideos =
              loadedVideos.length > 0 ? mapHelpVideosToPortalFaqs(loadedVideos) : []
            setFaqs(mergePortalHelpFaqsWithRequired(baseFaqs))
            setVideos(resolvedVideos)
            setSource(
              loadedFaqs.length === 0 && loadedVideos.length === 0
                ? 'bundled-fallback'
                : 'firestore',
            )
          }
          setError(null)
          setIsLoading(false)
        },
        (message) => {
          setError(message)
          setFaqs(mergePortalHelpFaqsWithRequired(PORTAL_TEXT_FAQS))
          setVideos([])
          setSource('bundled-fallback')
          setIsLoading(false)
        },
      ),
    [],
  )

  return { faqs, videos, source, isLoading, error }
}
