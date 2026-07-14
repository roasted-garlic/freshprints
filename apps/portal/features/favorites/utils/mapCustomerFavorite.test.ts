import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Timestamp } from 'firebase/firestore';

import {
  favoriteDocIdMatchesDesign,
  mapCustomerFavorite,
} from './mapCustomerFavorite';

describe('mapCustomerFavorite', () => {
  it('maps a valid favorite document', () => {
    const createdAt = Timestamp.fromMillis(1_700_000_000_000);

    assert.deepEqual(
      mapCustomerFavorite('design-1', {
        designId: 'design-1',
        customerId: 'customer-1',
        createdBy: 'uid-1',
        createdAt,
      }),
      {
        designId: 'design-1',
        customerId: 'customer-1',
        createdBy: 'uid-1',
        createdAtMs: 1_700_000_000_000,
      },
    );
  });

  it('falls back to the document id when designId is missing', () => {
    assert.deepEqual(
      mapCustomerFavorite('design-2', {
        customerId: 'customer-1',
        createdBy: 'uid-1',
      }),
      {
        designId: 'design-2',
        customerId: 'customer-1',
        createdBy: 'uid-1',
        createdAtMs: undefined,
      },
    );
  });

  it('rejects docs missing customerId or createdBy', () => {
    assert.equal(
      mapCustomerFavorite('design-1', {
        designId: 'design-1',
        createdBy: 'uid-1',
      }),
      null,
    );
    assert.equal(
      mapCustomerFavorite('design-1', {
        designId: 'design-1',
        customerId: 'customer-1',
      }),
      null,
    );
  });
});

describe('favoriteDocIdMatchesDesign', () => {
  it('requires the favorite designId to match the doc id', () => {
    assert.equal(
      favoriteDocIdMatchesDesign('design-1', {
        designId: 'design-1',
        customerId: 'customer-1',
        createdBy: 'uid-1',
      }),
      true,
    );
    assert.equal(
      favoriteDocIdMatchesDesign('design-1', {
        designId: 'design-other',
        customerId: 'customer-1',
        createdBy: 'uid-1',
      }),
      false,
    );
  });
});
