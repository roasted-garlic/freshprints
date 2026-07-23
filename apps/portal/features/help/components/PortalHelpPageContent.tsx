'use client'

import {
  PORTAL_HELP_INTRO,
  PORTAL_HELP_PAGE_TITLE,
} from '../portalHelpContent'
import { usePortalHelpContent } from '../hooks/usePortalHelpContent'
import { PortalHelpFaqList } from './PortalHelpFaqList'
import { PortalHelpVideoSection } from './PortalHelpVideoSection'

export function PortalHelpPageContent() {
  const { faqs, videos, isLoading, error } = usePortalHelpContent()

  return (
    <main className="portal-page portal-help-page">
      <header className="portal-page-header portal-help-page-header">
        <h1>{PORTAL_HELP_PAGE_TITLE}</h1>
        <p className="portal-muted portal-help-page-lead">{PORTAL_HELP_INTRO}</p>
      </header>

      {isLoading ? (
        <p aria-live="polite" className="portal-muted portal-help-status">
          Loading FAQ and How To…
        </p>
      ) : null}

      {error ? (
        <p aria-live="polite" className="portal-muted portal-help-status" role="status">
          Could not load the latest help content. Showing defaults.
        </p>
      ) : null}

      <section aria-labelledby="portal-help-text-faqs-heading" className="portal-help-section">
        <header className="portal-help-section-header">
          <h2 id="portal-help-text-faqs-heading" className="portal-help-section-title">
            Frequently asked questions
          </h2>
          <p className="portal-muted portal-help-section-lead">
            Expand a question to read the answer.
          </p>
        </header>
        <PortalHelpFaqList faqs={faqs} />
      </section>

      <section
        aria-labelledby="portal-help-video-faqs-heading"
        className="portal-help-section portal-help-section-videos"
      >
        <header className="portal-help-section-header">
          <h2 id="portal-help-video-faqs-heading" className="portal-help-section-title">
            How To videos
          </h2>
          <p className="portal-muted portal-help-section-lead">
            {videos.length === 0
              ? 'Walkthrough videos will appear here when they are ready.'
              : 'Short walkthroughs. Embeds load only from YouTube or Vimeo.'}
          </p>
        </header>
        <PortalHelpVideoSection videos={videos} />
      </section>
    </main>
  )
}
