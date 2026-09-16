import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const here = path.dirname(fileURLToPath(import.meta.url))
const robotsSource = readFileSync(path.join(here, '../../app/robots.ts'), 'utf8')
const sitemapSource = readFileSync(path.join(here, '../../app/sitemap.ts'), 'utf8')
const middlewareSource = readFileSync(path.join(here, '../../middleware.ts'), 'utf8')
const layoutSource = readFileSync(path.join(here, '../../app/layout.tsx'), 'utf8')

describe('DEV robots / sitemap / middleware contracts', () => {
  it('does not use Disallow:/ as the primary DEV indexing strategy', () => {
    assert.doesNotMatch(robotsSource, /disallow:\s*['"]\/['"]/)
    assert.match(robotsSource, /allow:\s*['"]\/['"]/)
    assert.match(robotsSource, /observe noindex/)
  })

  it('returns empty sitemap when indexing is disabled', () => {
    assert.match(sitemapSource, /isPortalSearchIndexingEnabled/)
    assert.match(sitemapSource, /return \[\]/)
  })

  it('sets X-Robots-Tag when indexing is disabled', () => {
    assert.match(middlewareSource, /X-Robots-Tag/)
    assert.match(middlewareSource, /PORTAL_DISABLED_INDEXING_X_ROBOTS_TAG/)
    assert.match(middlewareSource, /isPortalSearchIndexingEnabled/)
  })

  it('mounts the development banner from root layout', () => {
    assert.match(layoutSource, /PortalDevelopmentServerBanner/)
    assert.match(layoutSource, /shouldShowPortalDevelopmentServerBanner/)
  })
})
