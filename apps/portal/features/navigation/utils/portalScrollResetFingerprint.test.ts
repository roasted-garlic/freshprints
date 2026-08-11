import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  isDesignIdOnlySearchChange,
  portalSearchFingerprintIgnoringDesignId,
} from './portalScrollResetFingerprint';

describe('portalScrollResetFingerprint', () => {
  it('strips designId from the fingerprint while preserving other params', () => {
    assert.equal(
      portalSearchFingerprintIgnoringDesignId('q=Kill&designId=abc&category=cats'),
      'q=Kill&category=cats',
    );
    assert.equal(portalSearchFingerprintIgnoringDesignId('designId=abc'), '');
    assert.equal(portalSearchFingerprintIgnoringDesignId('?q=Kill&designId=abc'), 'q=Kill');
  });

  it('treats designId open/close/swap as designId-only when pathname is stable', () => {
    assert.equal(
      isDesignIdOnlySearchChange('/catalog', 'q=Kill', '/catalog', 'q=Kill&designId=d1'),
      true,
    );
    assert.equal(
      isDesignIdOnlySearchChange('/catalog', 'q=Kill&designId=d1', '/catalog', 'q=Kill'),
      true,
    );
    assert.equal(
      isDesignIdOnlySearchChange('/catalog', 'designId=d1', '/catalog', 'designId=d2'),
      true,
    );
  });

  it('does not treat filter/search/path changes as designId-only', () => {
    assert.equal(
      isDesignIdOnlySearchChange('/catalog', 'q=Kill', '/catalog', 'q=Will'),
      false,
    );
    assert.equal(
      isDesignIdOnlySearchChange('/catalog', 'q=Kill&designId=d1', '/catalog', 'q=Kill&category=x'),
      false,
    );
    assert.equal(
      isDesignIdOnlySearchChange('/catalog', 'designId=d1', '/favorites', 'designId=d1'),
      false,
    );
  });
});
