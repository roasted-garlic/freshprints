import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { resolvePortalVideoEmbedUrl } from './portalVideoEmbedUrl.ts'

describe('resolvePortalVideoEmbedUrl', () => {
  it('resolves YouTube watch, short, and embed URLs to nocookie embed', () => {
    const watch = resolvePortalVideoEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    assert.deepEqual(watch, {
      provider: 'youtube',
      mediaId: 'dQw4w9WgXcQ',
      embedSrc: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    })

    const short = resolvePortalVideoEmbedUrl('https://youtu.be/dQw4w9WgXcQ')
    assert.equal(short?.embedSrc, 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')

    const embed = resolvePortalVideoEmbedUrl('https://www.youtube.com/embed/dQw4w9WgXcQ')
    assert.equal(embed?.embedSrc, 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')
  })

  it('resolves Vimeo page and player URLs', () => {
    const page = resolvePortalVideoEmbedUrl('https://vimeo.com/123456789')
    assert.deepEqual(page, {
      provider: 'vimeo',
      mediaId: '123456789',
      embedSrc: 'https://player.vimeo.com/video/123456789',
    })

    const player = resolvePortalVideoEmbedUrl('https://player.vimeo.com/video/987654321')
    assert.equal(player?.embedSrc, 'https://player.vimeo.com/video/987654321')
  })

  it('rejects empty, malformed, non-HTTPS, and non-allowlisted hosts', () => {
    assert.equal(resolvePortalVideoEmbedUrl(''), null)
    assert.equal(resolvePortalVideoEmbedUrl(null), null)
    assert.equal(resolvePortalVideoEmbedUrl('not a url'), null)
    assert.equal(resolvePortalVideoEmbedUrl('https://example.com/watch?v=abc'), null)
    assert.equal(resolvePortalVideoEmbedUrl('javascript:alert(1)'), null)
    assert.equal(resolvePortalVideoEmbedUrl('https://www.youtube.com/watch'), null)
    assert.equal(
      resolvePortalVideoEmbedUrl('http://www.youtube.com/watch?v=dQw4w9WgXcQ'),
      null,
    )
  })
})
