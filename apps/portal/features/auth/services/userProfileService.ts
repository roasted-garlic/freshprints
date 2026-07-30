import { doc, getDoc, type DocumentData } from 'firebase/firestore';

import type { UserProfile } from '@fresh-prints/shared/types/user/user.types';
import { isUserRole } from '@fresh-prints/shared/types/user/user.types';
import {
  traceFirestoreOneShotComplete,
  traceFirestoreOneShotStart,
} from '@fresh-prints/shared/utils/firestoreUsageTrace';

import { getPortalDb } from '../../../lib/firebase/client';
import { mapFirestoreTimestamp } from '../../firebase/utils/mapFirestoreTimestamp';

const USER_PROFILE_TRACE = {
  app: 'portal' as const,
  collection: 'users',
  documentPathPattern: 'users/{currentUserId}',
  source: 'userProfileService.getUserProfile',
  triggerReason: 'authentication' as const,
};

interface UserDocumentData extends DocumentData {
  email?: unknown;
  displayName?: unknown;
  role?: unknown;
  isActive?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  createdBy?: unknown;
  updatedBy?: unknown;
}

function mapUserProfile(userId: string, data: UserDocumentData): UserProfile {
  const createdAt = mapFirestoreTimestamp(data.createdAt);
  const updatedAt = mapFirestoreTimestamp(data.updatedAt);

  if (
    typeof data.email !== 'string' ||
    typeof data.displayName !== 'string' ||
    !isUserRole(data.role) ||
    typeof data.isActive !== 'boolean' ||
    createdAt === undefined ||
    updatedAt === undefined
  ) {
    throw new Error('No Fresh Prints user profile was found for this account.');
  }

  return {
    id: userId,
    email: data.email,
    displayName: data.displayName,
    role: data.role,
    isActive: data.isActive,
    createdAt,
    updatedAt,
    createdBy: typeof data.createdBy === 'string' ? data.createdBy : undefined,
    updatedBy: typeof data.updatedBy === 'string' ? data.updatedBy : undefined,
  };
}

export const userProfileService = {
  async getUserProfile(userId: string): Promise<UserProfile> {
    traceFirestoreOneShotStart('getDoc', USER_PROFILE_TRACE);
    const snapshot = await getDoc(doc(getPortalDb(), 'users', userId));
    traceFirestoreOneShotComplete('getDoc', USER_PROFILE_TRACE, snapshot.exists() ? 1 : 0);

    if (!snapshot.exists()) {
      throw new Error('No Fresh Prints user profile was found for this account.');
    }

    return mapUserProfile(snapshot.id, snapshot.data() as UserDocumentData);
  },
};
