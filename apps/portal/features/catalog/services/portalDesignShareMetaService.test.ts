import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { buildPortalDesignShareMetadata } from './portalDesignShareMetaService.ts'
import type { PortalDesignShareMeta } from './portalDesignShareMetaService.ts'

const sampleMeta: PortalDesignShareMeta = {
  designId: 'design1',
  title: 'Sample Print',
  description: 'A sample description for SEO.',
  imageUrl:
    'https://us-central1-fresh-prints-dev.cloudfunctions.net/getPortalOgShareImage?designId=design1&fit=contain&bg=e5e7eb',
  categoryName: 'Halloween',
  tags: ['funny', 'skeleton'],
  imageAlt: 'Sample Print design preview',
}

describe('buildPortalDesignShareMetadata', () => {
  it('sets canonical and noindex on non-production hosts', () => {
    const meta = buildPortalDesignShareMetadata('design1', sampleMeta, {
      NEXT_PUBLIC_PORTAL_ORIGIN: 'https://myprintrequest.dev',
    })
    assert.equal(
      meta.alternates?.canonical,
      'https://myprintrequest.dev/share/design/design1',
    )
    assert.deepEqual(meta.robots, { index: false, follow: true })
    const images =
      meta.openGraph && 'images' in meta.openGraph ? meta.openGraph.images : undefined
    const first = Array.isArray(images) ? images[0] : images
    const url =
      first && typeof first === 'object' && 'url' in first
        ? String(first.url)
        : String(first ?? '')
    assert.match(url, /getPortalOgShareImage/)
    assert.doesNotMatch(url, /GoogleAccessId|Signature=/)
  })

  it('indexes ready designs on production host', () => {
    const meta = buildPortalDesignShareMetadata('design1', sampleMeta, {
      NEXT_PUBLIC_PORTAL_ORIGIN: 'https://myprintrequest.com',
    })
    assert.deepEqual(meta.robots, { index: true, follow: true })
  })

  it('noindexes missing designs even on production', () => {
    const meta = buildPortalDesignShareMetadata('missing', null, {
      NEXT_PUBLIC_PORTAL_ORIGIN: 'https://myprintrequest.com',
    })
    assert.deepEqual(meta.robots, { index: false, follow: false })
  })
})

describe('sitemap entry shape helper', () => {
  it('builds share paths for ready ids', async () => {
    const { buildPortalDesignSharePath } = await import('../utils/portalDesignShareUrls.ts')
    assert.equal(buildPortalDesignSharePath('abc'), '/share/design/abc')
    assert.equal(
      `https://myprintrequest.com${buildPortalDesignSharePath('abc')}`,
      'https://myprintrequest.com/share/design/abc',
    )
  })
})
