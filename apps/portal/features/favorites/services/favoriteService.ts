import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

import {
  runTracedWrite,
  traceFirestoreOneShotComplete,
  traceFirestoreOneShotStart,
} from '@fresh-prints/shared/utils/firestoreUsageTrace';
import { createBoundedAsyncCache } from '@fresh-prints/shared/utils/boundedAsyncCache';

import { getPortalDb } from '../../../lib/firebase/client';
import type { CustomerFavorite } from '../types/favorite.types';
import { mapCustomerFavorite } from '../utils/mapCustomerFavorite';

function favoritesCollection(customerId: string) {
  return collection(getPortalDb(), 'customers', customerId, 'favorites');
}

const favoritesReadCache = createBoundedAsyncCache<CustomerFavorite[]>({
  maxEntries: 8,
  ttlMs: 30_000,
});

export const favoriteService = {
  async listFavorites(customerId: string): Promise<CustomerFavorite[]> {
    return favoritesReadCache.get(customerId, async () => {
    const traceMetadata = {
      app: 'portal' as const,
      collection: 'customers/{currentCustomer}/favorites',
      orderBy: ['createdAt desc'],
      source: 'favoriteService.listFavorites',
      triggerReason: 'authentication' as const,
    };
    traceFirestoreOneShotStart('getDocs', traceMetadata);
    const snapshot = await getDocs(
      query(favoritesCollection(customerId), orderBy('createdAt', 'desc')),
    );
    traceFirestoreOneShotComplete('getDocs', traceMetadata, snapshot.size);

    return snapshot.docs
      .map((favoriteSnapshot) =>
        mapCustomerFavorite(
          favoriteSnapshot.id,
          favoriteSnapshot.data() as Record<string, unknown>,
        ),
      )
      .filter((favorite): favorite is CustomerFavorite => favorite !== null);
    });
  },

  async addFavorite(input: {
    customerId: string;
    designId: string;
    createdBy: string;
  }): Promise<void> {
    await runTracedWrite('setDoc', () =>
      setDoc(doc(favoritesCollection(input.customerId), input.designId), {
        designId: input.designId,
        customerId: input.customerId,
        createdBy: input.createdBy,
        createdAt: serverTimestamp(),
      }), {
      app: 'portal',
      collection: 'customers/{currentCustomer}/favorites',
      source: 'favoriteService.addFavorite',
      triggerReason: 'explicit-refresh',
    });
    favoritesReadCache.invalidate(input.customerId);
  },

  async removeFavorite(customerId: string, designId: string): Promise<void> {
    await runTracedWrite(
      'deleteDoc',
      () => deleteDoc(doc(favoritesCollection(customerId), designId)),
      {
        app: 'portal',
        collection: 'customers/{currentCustomer}/favorites',
        source: 'favoriteService.removeFavorite',
        triggerReason: 'explicit-refresh',
      },
    );
    favoritesReadCache.invalidate(customerId);
  },

  async removeFavorites(customerId: string, designIds: string[]): Promise<void> {
    const uniqueIds = [...new Set(designIds.map((id) => id.trim()).filter(Boolean))];
    await Promise.all(uniqueIds.map((designId) => this.removeFavorite(customerId, designId)));
  },
};
