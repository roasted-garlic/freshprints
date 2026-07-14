import { Timestamp } from 'firebase/firestore';

import type { CustomerFavorite } from '../types/favorite.types';

export function mapCustomerFavorite(
  designId: string,
  data: Record<string, unknown>,
): CustomerFavorite | null {
  if (typeof data.customerId !== 'string' || typeof data.createdBy !== 'string') {
    return null;
  }

  const resolvedDesignId = typeof data.designId === 'string' ? data.designId : designId;

  if (!resolvedDesignId) {
    return null;
  }

  return {
    designId: resolvedDesignId,
    customerId: data.customerId,
    createdBy: data.createdBy,
    createdAtMs: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : undefined,
  };
}

export function favoriteDocIdMatchesDesign(designId: string, data: CustomerFavorite): boolean {
  return data.designId === designId;
}
