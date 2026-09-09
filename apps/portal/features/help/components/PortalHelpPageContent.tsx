'use client'

import {
  PORTAL_HELP_INTRO,
  PORTAL_HELP_INTRO_FAQ_ONLY,
  PORTAL_HELP_PAGE_TITLE,
  PORTAL_HELP_PAGE_TITLE_FAQ_ONLY,
} from '../portalHelpContent'
import { usePortalHelpContent } from '../hooks/usePortalHelpContent'
import { PortalHelpAboutPanel } from './PortalHelpAboutPanel'
import { PortalHelpFaqList } from './PortalHelpFaqList'
import { PortalHelpVideoSection } from './PortalHelpVideoSection'
import {
  PortalShowSizeTiersIcon,
  PortalShowSizeTiersTrigger,
} from '../../print-requests/components/PortalShowSizeTiersTrigger'

export function PortalHelpPageContent() {
  const { faqs, videos, isLoading, error } = usePortalHelpContent()
  const hasHowToVideos = videos.length > 0
  const pageTitle = hasHowToVideos ? PORTAL_HELP_PAGE_TITLE : PORTAL_HELP_PAGE_TITLE_FAQ_ONLY
  const pageLead = hasHowToVideos ? PORTAL_HELP_INTRO : PORTAL_HELP_INTRO_FAQ_ONLY

  return (
    <main className="portal-page portal-help-page">
      <PortalHelpAboutPanel />

      <section aria-labelledby="portal-help-pricing-heading" className="portal-help-section">
        <header className="portal-help-section-header">
          <h2 id="portal-help-pricing-heading" className="portal-help-section-title">
            Show size tiers
          </h2>
          <p className="portal-muted portal-help-section-lead">
            Personal-bin pricing on Whatnot shows is by print width. Open the tier table for Pocket
            through Extra Oversized rates.
          </p>
        </header>
        <PortalShowSizeTiersTrigger className="portal-button portal-button-secondary portal-button-sm portal-button-leading-icon portal-help-pricing-trigger">
          <PortalShowSizeTiersIcon size={16} />
          View size tier pricing
        </PortalShowSizeTiersTrigger>
      </section>

      <section aria-labelledby="portal-help-faqs-heading" className="portal-help-section">
        <header className="portal-page-header portal-help-page-header">
          <h1 id="portal-help-faqs-heading">{pageTitle}</h1>
          <p className="portal-muted portal-help-page-lead">{pageLead}</p>
        </header>

        {isLoading ? (
          <p aria-live="polite" className="portal-muted portal-help-status">
            Loading FAQ…
          </p>
        ) : null}

        {error ? (
          <p aria-live="polite" className="portal-muted portal-help-status" role="status">
            Could not load the latest help content. Showing defaults.
          </p>
        ) : null}

        <PortalHelpFaqList faqs={faqs} />
      </section>

      {hasHowToVideos ? (
        <section
          aria-labelledby="portal-help-video-faqs-heading"
          className="portal-help-section portal-help-section-videos"
        >
          <header className="portal-help-section-header">
            <h2 id="portal-help-video-faqs-heading" className="portal-help-section-title">
              How To videos
            </h2>
            <p className="portal-muted portal-help-section-lead">
              Short walkthroughs. Embeds load only from YouTube or Vimeo.
            </p>
          </header>
          <PortalHelpVideoSection videos={videos} />
        </section>
      ) : null}
    </main>
  )
}
