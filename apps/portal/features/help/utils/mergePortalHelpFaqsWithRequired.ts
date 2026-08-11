import type { PortalHelpTextFaq } from '@fresh-prints/shared/constants/portal/portalHelpSettings.constants'
import {
  FRESH_PRINTS_WHATNOT_HANDLE,
  FRESH_PRINTS_WHATNOT_PROFILE_URL,
} from '@fresh-prints/shared/constants/portal/portalExternalLinks.constants'

/** Stable id for the product-required Whatnot follow FAQ (Portal presentation layer). */
export const PORTAL_REQUIRED_WHATNOT_FAQ_ID = 'follow-fresh-prints-on-whatnot'

export type PortalFaqExternalCta = {
  href: string
  label: string
}

/** Portal FAQ row — may include a typed external CTA (never HTML in `answer`). */
export type PortalTextFaq = PortalHelpTextFaq & {
  externalCta?: PortalFaqExternalCta
}

export const PORTAL_REQUIRED_WHATNOT_FAQ: PortalTextFaq = {
  id: PORTAL_REQUIRED_WHATNOT_FAQ_ID,
  question: 'Where can I follow Fresh Prints on Whatnot?',
  answer:
    'Follow @funkyfreshprints on Whatnot to see our upcoming live shows and shop with us. Print requests created here are fulfilled through Fresh Prints Whatnot shows.',
  order: 1.5,
  externalCta: {
    href: FRESH_PRINTS_WHATNOT_PROFILE_URL,
    label: `Follow ${FRESH_PRINTS_WHATNOT_HANDLE} on Whatnot`,
  },
}

function normalizeFaqQuestion(question: string): string {
  return question.trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * Ensures the canonical Whatnot follow FAQ is visible even when Studio-managed
 * Firestore FAQs are non-empty. Dedupes by id and by exact question text.
 * Does not mutate Firestore — presentation merge only.
 */
export function mergePortalHelpFaqsWithRequired(
  faqs: readonly PortalHelpTextFaq[],
): PortalTextFaq[] {
  const required = PORTAL_REQUIRED_WHATNOT_FAQ
  const requiredQuestion = normalizeFaqQuestion(required.question)

  const withoutDupes: PortalTextFaq[] = []
  for (const faq of faqs) {
    if (faq.id === required.id) {
      continue
    }
    if (normalizeFaqQuestion(faq.question) === requiredQuestion) {
      continue
    }
    withoutDupes.push({ ...faq })
  }

  const merged = [...withoutDupes, { ...required }]
  merged.sort((left, right) => {
    if (left.order !== right.order) {
      return left.order - right.order
    }
    return left.id.localeCompare(right.id)
  })
  return merged
}
