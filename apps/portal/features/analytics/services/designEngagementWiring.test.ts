import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const modalHookSource = readFileSync(
  join(here, '../hooks/useCatalogDesignViewAnalytics.ts'),
  'utf8',
)
const modalSource = readFileSync(
  join(here, '../../catalog/components/CatalogDesignDetailsModal.tsx'),
  'utf8',
)
const shareSource = readFileSync(
  join(here, '../../catalog/pages/ShareDesignPortalPageContent.tsx'),
  'utf8',
)
const stubSource = readFileSync(join(here, '../components/PortalAnalyticsScript.tsx'), 'utf8')

describe('design engagement analytics wiring', () => {
  it('modal tracks design_view from canonical design.title, not displayTitle', () => {
    assert.match(
      modalSource,
      /useCatalogDesignViewAnalytics\(\{[\s\S]*?title: design\?\.title/,
    )
  })

  it('design_view waits for the root stream handshake and does not advance modal dedupe on a failed send', () => {
    assert.match(modalHookSource, /usePortalAnalyticsStreamReady/)
    assert.match(modalHookSource, /trackCatalogDesignModalView/)
    assert.match(modalHookSource, /designId: input.designId/)
    assert.match(modalHookSource, /if \(sent\)/)
    assert.equal(/trackPageView\(/.test(modalHookSource), false)
  })

  it('share page registers resolved initialMeta title+id and tracks share_page with contentId', () => {
    assert.match(shareSource, /useRegisterShareAnalyticsDesign\(\{/)
    assert.match(shareSource, /designId: initialMeta\?\.designId/)
    assert.match(shareSource, /usePortalAnalyticsStreamReady/)
    assert.match(shareSource, /surface: 'share_page'/)
    assert.match(shareSource, /contentId/)
    assert.equal(/useRegisterShareAnalyticsTitle\(/.test(shareSource), false)
  })

  it('preserves the gtag js bootstrap', () => {
    assert.match(stubSource, /gtag\('js', new Date\(\)\)/)
  })
})
