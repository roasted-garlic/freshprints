import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  getPortalSiteOrigin,
  buildPortalRootMetadata,
  buildPortalPageMetadata,
  PORTAL_OG_IMAGE_PATH,
} from './portalSiteMeta';

describe('getPortalSiteOrigin', () => {
  it('prefers NEXT_PUBLIC_PORTAL_ORIGIN and strips trailing slashes', () => {
    assert.equal(
      getPortalSiteOrigin({
        NEXT_PUBLIC_PORTAL_ORIGIN: 'https://example.test///',
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'fresh-prints-dev',
      }),
      'https://example.test',
    );
  });

  it('maps fresh-prints-dev to myprintrequest.dev', () => {
    assert.equal(
      getPortalSiteOrigin({
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'fresh-prints-dev',
      }),
      'https://myprintrequest.dev',
    );
  });

  it('uses production customer host for unknown non-dev project in production', () => {
    assert.equal(
      getPortalSiteOrigin({
        NODE_ENV: 'production',
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'fresh-prints-prod-example',
      }),
      'https://myprintrequest.com',
    );
  });

  it('falls back to localhost for local/unknown', () => {
    assert.equal(getPortalSiteOrigin({ NODE_ENV: 'development' }), 'http://localhost:3100');
  });
});

describe('buildPortalRootMetadata', () => {
  it('sets metadataBase, favicons/manifest, and OG/Twitter image paths', () => {
    const meta = buildPortalRootMetadata({
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'fresh-prints-dev',
    });

    assert.equal(meta.metadataBase?.toString(), 'https://myprintrequest.dev/');
    assert.equal(meta.manifest, '/site.webmanifest');
    assert.ok(meta.icons);
    const icons = meta.icons && typeof meta.icons === 'object' && 'icon' in meta.icons ? meta.icons.icon : undefined;
    assert.ok(Array.isArray(icons));
    assert.ok(icons.some((entry) => typeof entry === 'object' && entry !== null && 'url' in entry && entry.url === '/favicon.svg'));
    assert.ok(meta.openGraph);
    assert.ok(meta.twitter);
    const ogImages = meta.openGraph && 'images' in meta.openGraph ? meta.openGraph.images : undefined;
    assert.ok(Array.isArray(ogImages));
    assert.equal(
      (ogImages[0] as { url: string }).url,
      PORTAL_OG_IMAGE_PATH,
    );
  });

  it('applies Studio social overrides for title, description, and image', () => {
    const meta = buildPortalRootMetadata(
      { NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'fresh-prints-dev' },
      {
        ogTitle: 'Custom OG Title',
        ogDescription: 'Custom OG description for link previews.',
        ogImageUrl: 'https://cdn.example/design.png',
      },
    );

    assert.equal(meta.description, 'Custom OG description for link previews.');
    assert.equal(
      meta.openGraph && 'title' in meta.openGraph ? meta.openGraph.title : undefined,
      'Custom OG Title',
    );
    const ogImages = meta.openGraph && 'images' in meta.openGraph ? meta.openGraph.images : undefined;
    assert.ok(Array.isArray(ogImages));
    assert.equal((ogImages[0] as { url: string }).url, 'https://cdn.example/design.png');
  });
});

describe('buildPortalPageMetadata', () => {
  it('builds page title template fields and absolute page url', () => {
    const meta = buildPortalPageMetadata({
      title: 'Sign in',
      description: 'Sign in to continue.',
      path: '/login',
      env: { NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'fresh-prints-dev' },
    });

    assert.equal(meta.title, 'Sign in');
    assert.equal(
      meta.openGraph && 'url' in meta.openGraph ? meta.openGraph.url : undefined,
      'https://myprintrequest.dev/login',
    );
  });

  it('prefers global social overrides for OG title and description', () => {
    const meta = buildPortalPageMetadata({
      title: 'Sign in',
      description: 'Sign in to continue.',
      path: '/login',
      env: { NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'fresh-prints-dev' },
      social: {
        ogTitle: 'Portal share title',
        ogDescription: 'Portal share description',
        ogImageUrl: 'https://cdn.example/rotating.png',
      },
    });

    assert.equal(meta.title, 'Sign in');
    assert.equal(
      meta.openGraph && 'title' in meta.openGraph ? meta.openGraph.title : undefined,
      'Portal share title',
    );
    assert.equal(meta.description, 'Portal share description');
  });
});
