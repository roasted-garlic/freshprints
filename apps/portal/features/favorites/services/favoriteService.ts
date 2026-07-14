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

import { getPortalDb } from '../../../lib/firebase/client';
import type { CustomerFavorite } from '../types/favorite.types';
import { mapCustomerFavorite } from '../utils/mapCustomerFavorite';

function favoritesCollection(customerId: string) {
  return collection(getPortalDb(), 'customers', customerId, 'favorites');
}

export const favoriteService = {
  async listFavorites(customerId: string): Promise<CustomerFavorite[]> {
    const snapshot = await getDocs(
      query(favoritesCollection(customerId), orderBy('createdAt', 'desc')),
    );

    return snapshot.docs
      .map((favoriteSnapshot) =>
        mapCustomerFavorite(
          favoriteSnapshot.id,
          favoriteSnapshot.data() as Record<string, unknown>,
        ),
      )
      .filter((favorite): favorite is CustomerFavorite => favorite !== null);
  },

  async addFavorite(input: {
    customerId: string;
    designId: string;
    createdBy: string;
  }): Promise<void> {
    await setDoc(doc(favoritesCollection(input.customerId), input.designId), {
      designId: input.designId,
      customerId: input.customerId,
      createdBy: input.createdBy,
      createdAt: serverTimestamp(),
    });
  },

  async removeFavorite(customerId: string, designId: string): Promise<void> {
    await deleteDoc(doc(favoritesCollection(customerId), designId));
  },
};
