import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { FRESH_PRINTS_WHATNOT_PROFILE_URL } from '@fresh-prints/shared/constants/portal/portalExternalLinks.constants'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

describe('PortalHelpFaqList Whatnot CTA', () => {
  it('renders typed externalCta as a safe React link (no HTML injection)', () => {
    const source = readFileSync(path.join(__dirname, 'PortalHelpFaqList.tsx'), 'utf8')
    assert.match(source, /faq\.externalCta/)
    assert.match(source, /rel="noopener noreferrer"/)
    assert.match(source, /target="_blank"/)
    assert.doesNotMatch(source, /dangerouslySetInnerHTML/)
  })
})

describe('usePortalHelpContent required FAQ merge', () => {
  it('always merges required Whatnot FAQ for Firestore and bundled paths', () => {
    const source = readFileSync(
      path.join(__dirname, '../hooks/usePortalHelpContent.ts'),
      'utf8',
    )
    assert.match(source, /mergePortalHelpFaqsWithRequired/)
    assert.equal(
      (source.match(/mergePortalHelpFaqsWithRequired/g) ?? []).length >= 3,
      true,
    )
  })
})

describe('PortalSidebar Whatnot link', () => {
  it('places Follow on Whatnot below Help as a safe external link', () => {
    const source = readFileSync(
      path.join(__dirname, '../../navigation/components/PortalSidebar.tsx'),
      'utf8',
    )
    const helpIndex = source.indexOf('portal-sidebar-help-link')
    const whatnotIndex = source.indexOf('portal-sidebar-whatnot-link')
    assert.ok(helpIndex >= 0 && whatnotIndex > helpIndex)
    assert.match(source, /FRESH_PRINTS_WHATNOT_PROFILE_URL/)
    assert.match(source, /href=\{FRESH_PRINTS_WHATNOT_PROFILE_URL\}/)
    assert.equal(FRESH_PRINTS_WHATNOT_PROFILE_URL, 'https://www.whatnot.com/user/funkyfreshprints')
    assert.match(source, /rel="noopener noreferrer"/)
    assert.match(source, /target="_blank"/)
    assert.match(source, /Follow on Whatnot/)
    const whatnotAnchor = source.slice(
      source.lastIndexOf('<a', whatnotIndex),
      source.indexOf('</a>', whatnotIndex) + 4,
    )
    assert.doesNotMatch(whatnotAnchor, /aria-current/)
    assert.match(whatnotAnchor, /portal-sidebar-whatnot-link/)
  })
})
