/**
 * Stand-alone About panel for `/help` — explains what the portal is for
 * without using the FAQ accordion pattern.
 */
import {
  PORTAL_HELP_ABOUT_EYEBROW,
  PORTAL_HELP_ABOUT_FOOTNOTE,
  PORTAL_HELP_ABOUT_HIGHLIGHT,
  PORTAL_HELP_ABOUT_PARAGRAPHS,
  PORTAL_HELP_ABOUT_TITLE,
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

        <p className="portal-help-about-footnote">{PORTAL_HELP_ABOUT_FOOTNOTE}</p>
      </div>
    </section>
  )
}
