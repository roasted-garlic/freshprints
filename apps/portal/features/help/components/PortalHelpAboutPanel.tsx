/**
 * Stand-alone About panel for `/help` — explains what the portal is for
 * without using the FAQ accordion pattern.
 */
import {
  FRESH_PRINTS_WHATNOT_PROFILE_URL,
  PORTAL_HELP_ABOUT_EYEBROW,
  PORTAL_HELP_ABOUT_FOOTNOTE,
  PORTAL_HELP_ABOUT_HIGHLIGHT,
  PORTAL_HELP_ABOUT_PARAGRAPHS,
  PORTAL_HELP_ABOUT_TITLE,
  PORTAL_HELP_ABOUT_WHATNOT_BODY,
  PORTAL_HELP_ABOUT_WHATNOT_CTA_LABEL,
  PORTAL_HELP_ABOUT_WHATNOT_HEADING,
} from '../portalHelpContent'

export function PortalHelpAboutPanel() {
  return (
    <section
      aria-labelledby="portal-help-about-heading"
      className="portal-help-about"
    >
      <div className="portal-help-about-inner">
        <p className="portal-help-about-eyebrow">{PORTAL_HELP_ABOUT_EYEBROW}</p>
        <h2 id="portal-help-about-heading" className="portal-help-about-title">
          {PORTAL_HELP_ABOUT_TITLE}
        </h2>

        <div className="portal-help-about-body">
          {PORTAL_HELP_ABOUT_PARAGRAPHS.map((paragraph, index) => (
            <p key={`about-p-${index}`}>{paragraph}</p>
          ))}
        </div>

        <aside className="portal-help-about-highlight" aria-label="Important">
          <p>{PORTAL_HELP_ABOUT_HIGHLIGHT}</p>
        </aside>

        <aside
          aria-labelledby="portal-help-about-whatnot-heading"
          className="portal-help-about-whatnot"
        >
          <h3 id="portal-help-about-whatnot-heading" className="portal-help-about-whatnot-heading">
            {PORTAL_HELP_ABOUT_WHATNOT_HEADING}
          </h3>
          <p className="portal-help-about-whatnot-body">{PORTAL_HELP_ABOUT_WHATNOT_BODY}</p>
          <a
            className="portal-help-about-whatnot-cta portal-help-external-link"
            href={FRESH_PRINTS_WHATNOT_PROFILE_URL}
            rel="noopener noreferrer"
            target="_blank"
          >
            {PORTAL_HELP_ABOUT_WHATNOT_CTA_LABEL}
          </a>
        </aside>

        <p className="portal-help-about-footnote">{PORTAL_HELP_ABOUT_FOOTNOTE}</p>
      </div>
    </section>
  )
}
