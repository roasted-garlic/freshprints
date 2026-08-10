import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  getPortalAlgoliaCatalogConfig,
  isPortalAlgoliaCatalogConfigured,
  portalAlgoliaCatalogSearchEnabled,
} from './portalAlgoliaCatalogFlags';

const FLAG = 'NEXT_PUBLIC_USE_ALGOLIA_CATALOG_SEARCH';
const APP_ID = 'NEXT_PUBLIC_ALGOLIA_APP_ID';
const SEARCH_KEY = 'NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY';
const INDEX = 'NEXT_PUBLIC_ALGOLIA_INDEX_NAME';

const original = {
  flag: process.env[FLAG],
  appId: process.env[APP_ID],
  searchKey: process.env[SEARCH_KEY],
  index: process.env[INDEX],
};

afterEach(() => {
  restore(FLAG, original.flag);
  restore(APP_ID, original.appId);
  restore(SEARCH_KEY, original.searchKey);
  restore(INDEX, original.index);
});

function restore(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}

function setCredentials() {
  process.env[APP_ID] = 'TESTAPPID1';
  process.env[SEARCH_KEY] = 'test-search-only-key-xxxxxxxx';
  process.env[INDEX] = 'portal_catalog_ready_dev';
}

describe('portalAlgoliaCatalogFlags — default ON', () => {
  it('enables search when the flag is unset (default feature)', () => {
    delete process.env[FLAG];
    assert.equal(portalAlgoliaCatalogSearchEnabled(), true);
  });

  it('enables search when the flag is true', () => {
    process.env[FLAG] = 'true';
    assert.equal(portalAlgoliaCatalogSearchEnabled(), true);
  });

  it('disables search only for the explicit false kill-switch', () => {
    process.env[FLAG] = 'false';
    assert.equal(portalAlgoliaCatalogSearchEnabled(), false);
  });

  it('is configured when enabled and search-only credentials exist', () => {
    delete process.env[FLAG];
    setCredentials();
    assert.ok(getPortalAlgoliaCatalogConfig());
    assert.equal(isPortalAlgoliaCatalogConfigured(), true);
  });

  it('is not configured when kill-switched off even with credentials', () => {
    process.env[FLAG] = 'false';
    setCredentials();
    assert.equal(isPortalAlgoliaCatalogConfigured(), false);
  });

  it('is not configured when credentials are missing', () => {
    delete process.env[FLAG];
    delete process.env[APP_ID];
    delete process.env[SEARCH_KEY];
    delete process.env[INDEX];
    assert.equal(getPortalAlgoliaCatalogConfig(), null);
    assert.equal(isPortalAlgoliaCatalogConfigured(), false);
  });
});
