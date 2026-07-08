import type { User } from "../../users/types/user.types";

let cachedProfile: User | null = null;

export const authProfileCacheService = {
  getProfile(userId: string): User | null {
    if (cachedProfile?.id === userId) {
      return cachedProfile;
    }

    return null;
  },

  setProfile(user: User): void {
    cachedProfile = user;
  },

  clear(): void {
    cachedProfile = null;
  },
};
