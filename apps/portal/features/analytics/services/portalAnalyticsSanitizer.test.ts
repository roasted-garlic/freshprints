import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  buildCatalogDesignModalPageDescriptor,
  buildNavigationIdentity,
  buildResolvedShareDesignPageOverride,
  buildSanitizedAnalyticsPageDescriptor,
  isPortalShareDesignPathname,
  navigationIdentityKey,
} from './portalAnalyticsSanitizer.ts'

const ORIGIN = 'https://myprintrequest.com'

function descriptor(pathname: string, query = '') {
  return buildSanitizedAnalyticsPageDescriptor({
    pathname,
    searchParams: new URLSearchParams(query),
    previousSanitizedPath: null,
    origin: ORIGIN,
  })
}

describe('buildSanitizedAnalyticsPageDescriptor — route templating', () => {
  const cases: Array<[string, string]> = [
    ['/', '/'],
    ['/catalog', '/catalog'],
    ['/catalog/library', '/catalog/library'],
    ['/favorites', '/favorites'],
    ['/custom-designs', '/custom-designs'],
    ['/custom-designs/anything/here', '/custom-designs'],
    ['/requests', '/requests'],
    ['/requests/abc123', '/requests/:id'],
    ['/requests/artwork', '/requests/artwork'],
    ['/donate', '/donate'],
    ['/dashboard', '/dashboard'],
    ['/help', '/help'],
    ['/share/design/abc123', '/share/design/:id'],
    ['/complete-profile', '/complete-profile'],
    ['/register', '/register'],
    ['/login', '/login'],
    ['/login-required', '/login-required'],
  ]

  for (const [pathname, expectedTemplate] of cases) {
    it(`templates ${pathname} to ${expectedTemplate}`, () => {
      assert.equal(descriptor(pathname).path, expectedTemplate)
    })
  }

  it('never sends a real request ID', () => {
    const d1 = descriptor('/requests/real-firestore-doc-id-1')
    const d2 = descriptor('/requests/another-real-id-2')
    assert.equal(d1.path, '/requests/:id')
    assert.equal(d2.path, '/requests/:id')
    assert.ok(!d1.location.includes('real-firestore-doc-id-1'))
    assert.ok(!d2.location.includes('another-real-id-2'))
  })

  it('never sends a real design ID from the default sanitizer (override is separate)', () => {
    const d1 = descriptor('/share/design/design-real-id-alpha')
    const d2 = descriptor('/share/design/design-real-id-beta')
    assert.equal(d1.path, '/share/design/:id')
    assert.equal(d2.path, '/share/design/:id')
    assert.ok(!d1.location.includes('design-real-id-alpha'))
    assert.ok(!d2.location.includes('design-real-id-beta'))
  })

  it('fails closed on an unknown route without leaking the raw pathname', () => {
    const d = descriptor('/some/future/unmapped/route')
    assert.equal(d.path, '/other')
    assert.equal(d.title, 'Page')
    assert.ok(!d.location.includes('future'))
  })

  it('drops all query parameters on the /other fallback, even allowlisted names', () => {
    const d = descriptor('/unknown-route', 'tab=working')
    assert.equal(d.path, '/other')
    assert.ok(!d.location.includes('tab='))
  })
})

describe('buildSanitizedAnalyticsPageDescriptor — page title policy', () => {
  it('never uses a dynamic title for /share/design/:id', () => {
    assert.equal(descriptor('/share/design/some-real-design').title, 'Shared Design')
  })

  it('uses fixed titles for every known route', () => {
    assert.equal(descriptor('/').title, 'Discover')
    assert.equal(descriptor('/catalog').title, 'Catalog')
    assert.equal(descriptor('/requests/abc').title, 'Print Request Detail')
  })
})

describe('buildSanitizedAnalyticsPageDescriptor — query parameter policy', () => {
  it('drops free-text search (q) entirely', () => {
    const d1 = descriptor('/catalog', 'q=shirt')
    const d2 = descriptor('/catalog', 'q=some+very+specific+search+text')
    assert.ok(!d1.location.includes('shirt'))
    assert.ok(!d2.location.includes('specific'))
  })

  it('drops returnTo entirely, including a nested request-shaped value', () => {
    const d = descriptor('/login', 'returnTo=%2Frequests%2Fabc123%3Ftab%3Dworking')
    assert.ok(!d.location.includes('returnTo'))
    assert.ok(!d.location.includes('abc123'))
  })

  it('drops requestId, seedDesignId, designId, etsyRecommendationId entirely', () => {
    const d = descriptor(
      '/catalog',
      'requestId=req1&seedDesignId=design1&designId=design2&etsyRecommendationId=etsy1',
    )
    for (const forbidden of ['req1', 'design1', 'design2', 'etsy1']) {
      assert.ok(!d.location.includes(forbidden), `expected ${forbidden} to be dropped`)
    }
  })

  it('allows fixed enum/flag parameters unchanged', () => {
    assert.ok(descriptor('/requests', 'tab=working').location.includes('tab=working'))
    assert.ok(descriptor('/requests/abc', 'upload=1').location.includes('upload=1'))
    assert.ok(descriptor('/catalog', 'from=discover').location.includes('from=discover'))
    assert.ok(descriptor('/catalog', 'mode=request-selection').location.includes('mode=request-selection'))
    assert.ok(descriptor('/catalog', 'discover=popular').location.includes('discover=popular'))
    assert.ok(descriptor('/custom-designs', 'detailTab=proofs').location.includes('detailTab=proofs'))
    assert.ok(descriptor('/custom-designs', 'flow=assisted').location.includes('flow=assisted'))
    assert.ok(descriptor('/custom-designs', 'step=review').location.includes('step=review'))
  })

  it('converts category to a fixed presence marker, never the raw ID', () => {
    const d = descriptor('/catalog', 'category=some-real-category-doc-id')
    assert.ok(d.location.includes('category=present'))
    assert.ok(!d.location.includes('some-real-category-doc-id'))
  })

  it('drops unknown/unlisted query parameters', () => {
    const d = descriptor('/catalog', 'totallyUnknownParam=value')
    assert.ok(!d.location.includes('totallyUnknownParam'))
  })

  it('two raw URLs that sanitize to the same route produce byte-identical descriptors', () => {
    const d1 = descriptor('/catalog', 'q=shirt')
    const d2 = descriptor('/catalog', 'q=shirts')
    assert.deepEqual(d1, d2)
  })
})

describe('buildSanitizedAnalyticsPageDescriptor — referrer policy', () => {
  it('omits referrer on the first call', () => {
    const d = buildSanitizedAnalyticsPageDescriptor({
      pathname: '/catalog',
      searchParams: new URLSearchParams(),
      previousSanitizedPath: null,
      origin: ORIGIN,
    })
    assert.equal(d.referrer, undefined)
  })

  it('uses the previous sanitized path as referrer, never document.referrer', () => {
    const d = buildSanitizedAnalyticsPageDescriptor({
      pathname: '/requests/abc123',
      searchParams: new URLSearchParams(),
      previousSanitizedPath: '/catalog',
      origin: ORIGIN,
    })
    assert.equal(d.referrer, '/catalog')
  })
})

describe('buildNavigationIdentity / navigationIdentityKey', () => {
  it('produces the same key for a dropped-parameter-only change', () => {
    const k1 = navigationIdentityKey(buildNavigationIdentity('/catalog', new URLSearchParams('q=shirt')))
    const k2 = navigationIdentityKey(buildNavigationIdentity('/catalog', new URLSearchParams('q=shirts')))
    assert.equal(k1, k2)
  })

  it('produces a different key for a different allowlisted categorical value', () => {
    const k1 = navigationIdentityKey(
      buildNavigationIdentity('/catalog', new URLSearchParams('discover=new')),
    )
    const k2 = navigationIdentityKey(
      buildNavigationIdentity('/catalog', new URLSearchParams('discover=popular')),
    )
    assert.notEqual(k1, k2)
  })

  it('produces a different key for two different dynamic request IDs', () => {
    const k1 = navigationIdentityKey(buildNavigationIdentity('/requests/abc123', new URLSearchParams()))
    const k2 = navigationIdentityKey(buildNavigationIdentity('/requests/xyz789', new URLSearchParams()))
    assert.notEqual(k1, k2)
  })

  it('produces a different key for two different dynamic design IDs', () => {
    const k1 = navigationIdentityKey(
      buildNavigationIdentity('/share/design/abc123', new URLSearchParams()),
    )
    const k2 = navigationIdentityKey(
      buildNavigationIdentity('/share/design/xyz789', new URLSearchParams()),
    )
    assert.notEqual(k1, k2)
  })

  it('is independent of query parameter ordering', () => {
    const k1 = navigationIdentityKey(
      buildNavigationIdentity('/requests', new URLSearchParams('tab=working&from=discover')),
    )
    const k2 = navigationIdentityKey(
      buildNavigationIdentity('/requests', new URLSearchParams('from=discover&tab=working')),
    )
    assert.equal(k1, k2)
  })

  it('reduces category to the same presence marker regardless of which category ID', () => {
    const k1 = navigationIdentityKey(
      buildNavigationIdentity('/catalog', new URLSearchParams('category=idA')),
    )
    const k2 = navigationIdentityKey(
      buildNavigationIdentity('/catalog', new URLSearchParams('category=idB')),
    )
    assert.equal(k1, k2)
  })
})

describe('isPortalShareDesignPathname', () => {
  it('matches share design routes only', () => {
    assert.equal(isPortalShareDesignPathname('/share/design/abc123'), true)
    assert.equal(isPortalShareDesignPathname('/catalog'), false)
    assert.equal(isPortalShareDesignPathname('/share/design'), false)
  })
})

describe('buildCatalogDesignModalPageDescriptor', () => {
  it('uses the approved public catalog id in the virtual path and prefixed title', () => {
    const approvedId = 'abc123xyz'
    const parentRouteId = 'notTheCatalogId'
    const built = buildCatalogDesignModalPageDescriptor({
      title: 'Modal: School Is Important But Fishing Is Importanter',
      designId: approvedId,
      origin: ORIGIN,
      parentPathname: `/share/design/${parentRouteId}`,
      parentSearchParams: new URLSearchParams(
        `q=secret&returnTo=/requests/reqId99`,
      ),
    })
    assert.equal(built.path, `/catalog/design/${approvedId}`)
    assert.equal(built.title, 'Modal: School Is Important But Fishing Is Importanter')
    assert.equal(built.location, `${ORIGIN}/catalog/design/${approvedId}`)
    assert.equal(built.referrer, '/share/design/:id')
    assert.equal(built.location.includes(parentRouteId), false)
    assert.equal(JSON.stringify(built).includes('q='), false)
    assert.equal(JSON.stringify(built).includes('returnTo'), false)
    assert.equal(JSON.stringify(built).includes('reqId99'), false)
  })

  it('does not treat /catalog/design/:id as a physical Portal route', () => {
    const physical = descriptor('/catalog/design/firestoreDesignIdAbc123')
    assert.equal(physical.path, '/other')
    assert.equal(physical.title, 'Page')
  })
})

describe('buildResolvedShareDesignPageOverride', () => {
  it('uses the approved public catalog id, not an arbitrary route parameter', () => {
    const built = buildResolvedShareDesignPageOverride({
      title: 'Share: Alpha Male',
      designId: 'def456xyz',
      origin: ORIGIN,
      referrer: '/catalog',
    })
    assert.equal(built.path, '/share/design/def456xyz')
    assert.equal(built.location, `${ORIGIN}/share/design/def456xyz`)
    assert.equal(built.title, 'Share: Alpha Male')
    assert.equal(built.referrer, '/catalog')
  })
})
