'use client'

import { resolvePortalCensoredDisplayText } from '@fresh-prints/shared/utils/maskCensoredDesignText'

import { useExplicitContentPreference } from '../hooks/useExplicitContentPreference'
import type { CatalogDesign } from '../types/catalog.types'

type CensorableDesignText = Pick<
  CatalogDesign,
  'title' | 'description' | 'isExplicitContent' | 'censoredTerms'
>

/**
 * Canonical Portal display titles/descriptions for Explicit Content designs.
 * Uses the same Censored/Uncensored preference as image blur. Optional `sessionRevealed`
 * mirrors Design Details / Share Click-to-reveal (image + text for that open session).
 * Does not mutate stored fields.
 */
export function usePortalCensoredDesignText(
  design: CensorableDesignText,
  options?: { sessionRevealed?: boolean },
): {
  title: string
  description: string
} {
  const { showExplicitContent } = useExplicitContentPreference()
  const sessionRevealed = options?.sessionRevealed === true

  return {
    title: resolvePortalCensoredDisplayText({
      text: design.title,
      isExplicitContent: design.isExplicitContent,
      censoredTerms: design.censoredTerms,
      showExplicitContent,
      sessionRevealed,
    }),
    description: resolvePortalCensoredDisplayText({
      text: design.description ?? '',
      isExplicitContent: design.isExplicitContent,
      censoredTerms: design.censoredTerms,
      showExplicitContent,
      sessionRevealed,
    }),
  }
}

/** Non-hook helper when preference is already in scope (e.g. share payloads). */
export function resolvePortalDesignDisplayFields(
  design: CensorableDesignText,
  showExplicitContent: boolean,
  options?: { sessionRevealed?: boolean },
): { title: string; description: string } {
  const sessionRevealed = options?.sessionRevealed === true
  return {
    title: resolvePortalCensoredDisplayText({
      text: design.title,
      isExplicitContent: design.isExplicitContent,
      censoredTerms: design.censoredTerms,
      showExplicitContent,
      sessionRevealed,
    }),
    description: resolvePortalCensoredDisplayText({
      text: design.description ?? '',
      isExplicitContent: design.isExplicitContent,
      censoredTerms: design.censoredTerms,
      showExplicitContent,
      sessionRevealed,
    }),
  }
}
