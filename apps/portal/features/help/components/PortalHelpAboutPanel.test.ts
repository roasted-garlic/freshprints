import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  PORTAL_HELP_ABOUT_FOOTNOTE,
  PORTAL_HELP_ABOUT_HIGHLIGHT,
  PORTAL_HELP_ABOUT_PARAGRAPHS,
  PORTAL_HELP_ABOUT_TITLE,
  PORTAL_TEXT_FAQS,
} from '../portalHelpContent'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

describe('Portal help About panel wiring', () => {
  it('includes purpose copy without quota/limit numbers', () => {
    const blob = [
      PORTAL_HELP_ABOUT_TITLE,
      ...PORTAL_HELP_ABOUT_PARAGRAPHS,
      PORTAL_HELP_ABOUT_HIGHLIGHT,
      PORTAL_HELP_ABOUT_FOOTNOTE,
    ].join('\n')

    assert.match(blob, /myprintrequest\.com/i)
    assert.match(blob, /Whatnot/i)
    assert.match(blob, /does not place an order or charge you/i)
    assert.match(blob, /personally intend to purchase/i)
    assert.doesNotMatch(blob, /Browsing the catalog does not buy anything by itself/)
    assert.match(blob, /FAQ below/i)
    assert.equal(/\d{2,}/.test(blob), false, 'About blurb should not hard-code limit counts')
  })

  it('bundled what-is-print-request FAQ drops browsing-only purchase wording', () => {
    const faq = PORTAL_TEXT_FAQS.find((item) => item.id === 'what-is-print-request')
    assert.ok(faq)
    assert.doesNotMatch(faq!.answer, /Browsing the catalog does not buy anything by itself/)
    assert.match(faq!.answer, /does not place an order or charge you/i)
  })

  it('About panel embeds canonical Whatnot follow CTA from shared constants', () => {
    const panelSource = readFileSync(path.join(__dirname, 'PortalHelpAboutPanel.tsx'), 'utf8')
    assert.match(panelSource, /FRESH_PRINTS_WHATNOT_PROFILE_URL/)
    assert.match(panelSource, /PORTAL_HELP_ABOUT_WHATNOT_CTA_LABEL/)
    assert.match(panelSource, /rel="noopener noreferrer"/)
    assert.match(panelSource, /target="_blank"/)
    assert.doesNotMatch(panelSource, /dangerouslySetInnerHTML/)
  })

  it('first-visit modal still consumes PortalHelpAboutPanel', () => {
    const modalSource = readFileSync(
      path.join(__dirname, 'PortalAboutFirstVisitModal.tsx'),
      'utf8',
    )
    assert.match(modalSource, /PortalHelpAboutPanel/)
  })

  it('renders the About panel above the FAQ page header', () => {
    const pageSource = readFileSync(
      path.join(__dirname, 'PortalHelpPageContent.tsx'),
      'utf8',
    )
    assert.match(pageSource, /PortalHelpAboutPanel/)
    const aboutIndex = pageSource.indexOf('<PortalHelpAboutPanel')
    const headerIndex = pageSource.indexOf('portal-help-page-header')
    assert.ok(aboutIndex >= 0 && headerIndex > aboutIndex)
  })

  it('hides the How To videos section until videos exist', () => {
    const pageSource = readFileSync(
      path.join(__dirname, 'PortalHelpPageContent.tsx'),
      'utf8',
    )
    assert.match(pageSource, /hasHowToVideos/)
    assert.match(pageSource, /PORTAL_HELP_PAGE_TITLE_FAQ_ONLY/)
    assert.match(pageSource, /\{hasHowToVideos \? \(/)
  })
})
