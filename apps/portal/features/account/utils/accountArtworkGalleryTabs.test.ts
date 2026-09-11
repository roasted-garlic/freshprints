import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  canCustomerDeleteAccountArtworkTile,
  getAccountArtworkGalleryPastTab,
  isDonatedAccountArtworkTile,
  isPastAccountArtworkTile,
  isPersonalAccountArtworkTile,
  isUploadedAccountArtworkTile,
} from './accountArtworkGalleryTabs';

describe('accountArtworkGalleryTabs', () => {
  it('routes Don’t-allow print uploads to Personal until promoted', () => {
    assert.equal(
      getAccountArtworkGalleryPastTab({
        kind: 'upload',
        promotedDesignId: null,
        catalogUseAcknowledged: false,
      }),
      'personal',
    );
    assert.equal(
      isPersonalAccountArtworkTile({
        kind: 'upload',
        promotedDesignId: null,
        catalogUseAcknowledged: false,
      }),
      true,
    );
  });

  it('routes Allow / waiting print uploads to Uploaded until promoted', () => {
    assert.equal(
      getAccountArtworkGalleryPastTab({
        kind: 'upload',
        promotedDesignId: null,
        catalogUseAcknowledged: true,
      }),
      'uploaded',
    );
    assert.equal(
      getAccountArtworkGalleryPastTab({
        kind: 'upload',
        promotedDesignId: null,
        catalogUseAcknowledged: null,
      }),
      'uploaded',
    );
    assert.equal(
      isUploadedAccountArtworkTile({
        kind: 'upload',
        promotedDesignId: null,
        catalogUseAcknowledged: true,
      }),
      true,
    );
  });

  it('routes donations to Donated until promoted', () => {
    assert.equal(
      getAccountArtworkGalleryPastTab({
        kind: 'donation',
        promotedDesignId: null,
        catalogUseAcknowledged: true,
      }),
      'donated',
    );
    assert.equal(
      isDonatedAccountArtworkTile({
        kind: 'donation',
        promotedDesignId: null,
        catalogUseAcknowledged: false,
      }),
      true,
    );
  });

  it('drops promoted rows from past tabs (Design Library only)', () => {
    assert.equal(
      getAccountArtworkGalleryPastTab({
        kind: 'upload',
        promotedDesignId: 'design_1',
        catalogUseAcknowledged: true,
      }),
      null,
    );
    assert.equal(
      isPastAccountArtworkTile({
        kind: 'donation',
        promotedDesignId: 'design_2',
        catalogUseAcknowledged: true,
      }),
      false,
    );
  });

  it('allows customer delete only for Personal tiles', () => {
    assert.equal(
      canCustomerDeleteAccountArtworkTile({
        kind: 'upload',
        promotedDesignId: null,
        catalogUseAcknowledged: false,
      }),
      true,
    );
    assert.equal(
      canCustomerDeleteAccountArtworkTile({
        kind: 'upload',
        promotedDesignId: null,
        catalogUseAcknowledged: true,
      }),
      false,
    );
    assert.equal(
      canCustomerDeleteAccountArtworkTile({
        kind: 'donation',
        promotedDesignId: null,
        catalogUseAcknowledged: true,
      }),
      false,
    );
  });
});
