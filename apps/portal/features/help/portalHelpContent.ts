import type { PortalHelpTextFaq, PortalHelpVideoItem } from '@fresh-prints/shared/constants/portal/portalHelpSettings.constants'
import {
  PORTAL_HELP_INTRO,
  PORTAL_HELP_PAGE_DESCRIPTION,
  PORTAL_HELP_PAGE_TITLE,
  PORTAL_HELP_PATH,
} from '@fresh-prints/shared/constants/portal/portalHelpSettings.constants'

/**
 * Bundled fallback FAQ content when Firestore `settings/portalHelp` is missing
 * or the saved `faqs` list is empty.
 * Live edits live in Studio Settings (ADR-FP-118).
 * Empty `videos` do **not** fall back here — Portal shows a Coming soon state instead.
 */

export type PortalTextFaq = PortalHelpTextFaq

/** Portal UI shape — maps shared `videoUrl` for embeds. */
export type PortalVideoFaq = {
  id: string
  title: string
  description?: string
  /** YouTube or Vimeo HTTPS URL. Empty = no iframe. */
  embedUrl: string
  order: number
}

export {
  PORTAL_HELP_INTRO,
  PORTAL_HELP_PAGE_DESCRIPTION,
  PORTAL_HELP_PAGE_TITLE,
  PORTAL_HELP_PATH,
}

export const PORTAL_TEXT_FAQS: PortalTextFaq[] = [
  {
    id: 'browse-without-login',
    question: 'Can I browse designs without signing in?',
    answer:
      'Yes. You can browse the design library as a guest. Sign in when you are ready to add designs to a print request, upload artwork, use Custom Designs, Donate Designs, or manage your account.',
    order: 0,
  },
  {
    id: 'what-is-print-request',
    question: 'What is a print request?',
    answer:
      'A print request is your list of designs and quantities you want printed for yourself. Print requests are for purchases fulfilled through Fresh Prints Whatnot shows (live shopping). Browsing the catalog does not buy anything by itself. You add designs to a request, then assign that request to an upcoming show when you are ready. Only add designs and quantities you expect to buy on the show.',
    order: 1,
  },
  {
    id: 'request-what-you-will-buy',
    question: 'Should I request designs other people might like?',
    answer:
      'No. Print requests are for you, not suggestions for other shoppers. Request only designs and quantities you expect to buy yourself on the Fresh Prints Whatnot show. Do not submit requests just because you think someone else might want them.',
    order: 2,
  },
  {
    id: 'start-print-request',
    question: 'How do I add designs and submit a print request?',
    answer:
      'Sign in, open a design you like, and use Add to request (or Upload Designs to add your own artwork to Current Request). Adjust quantities in Current Request for what you plan to buy, then queue the request to an upcoming Fresh Prints Whatnot show when you are ready. You can keep browsing and editing until you assign the request to a show.',
    order: 3,
  },
  {
    id: 'request-and-show-limits',
    question: 'What are request and show limits?',
    answer:
      'Each print request and each Whatnot show has a print limit so shows stay manageable. On Current Request, open the help icon next to the prints-left banner to see Request and Show Limits with the live numbers for your account. Limits can change over time, so always use that modal for the current values. Because space is limited, only request what you expect to buy.',
    order: 4,
  },
  {
    id: 'donate-designs',
    question: 'What does Donate Designs do?',
    answer:
      'Donate Designs lets signed-in customers send artwork for Fresh Prints to review for the Design Library. Donations are not added to your Current Request and are not a purchase for a Whatnot show. Listing for other customers only happens after staff approval.',
    order: 5,
  },
  {
    id: 'custom-designs',
    question: 'How do Custom Designs work?',
    answer:
      'Use Custom Designs in the sidebar when you want help finding or creating artwork. Help Me Find a Design searches for designs that may match what you describe. Fresh Prints Assisted Creation lets you send details for a design you would like staff to help create. Create My Design with AI may still show as coming soon. Sign in is required.',
    order: 6,
  },
  {
    id: 'account-sign-in',
    question: 'Do I need an account?',
    answer:
      'You can browse without an account. Sign in (or create an account) to manage print requests, upload artwork, use Custom Designs, Donate Designs, and keep your favorites and request history. Use Account in the sidebar when you are signed in.',
    order: 7,
  },
]

/** @deprecated No longer used as empty-list fallback — kept empty for type stability. */
export const PORTAL_VIDEO_FAQS: PortalVideoFaq[] = []

export function mapHelpVideosToPortalFaqs(videos: PortalHelpVideoItem[]): PortalVideoFaq[] {
  return videos.map((video) => ({
    id: video.id,
    title: video.title,
    description: video.description,
    embedUrl: video.videoUrl,
    order: video.order,
  }))
}
