import { userService } from "../../users/services/userService";
import type { User } from "../../users/types/user.types";
import { authProfileCacheService } from "./authProfileCacheService";

const inFlightProfileLoads = new Map<string, Promise<User>>();

export const authSessionService = {
  clearSession(): void {
    authProfileCacheService.clear();
    inFlightProfileLoads.clear();
  },

  getCachedProfile(userId: string): User | null {
    return authProfileCacheService.getProfile(userId);
  },

  async loadUserProfile(userId: string): Promise<User> {
    const cachedProfile = authProfileCacheService.getProfile(userId);

    if (cachedProfile) {
      return cachedProfile;
    }

    const inFlightLoad = inFlightProfileLoads.get(userId);

    if (inFlightLoad) {
      return inFlightLoad;
    }

    const profileLoad = userService
      .getUserById(userId)
      .then((user) => {
        authProfileCacheService.setProfile(user);
        inFlightProfileLoads.delete(userId);
        return user;
      })
      .catch((error: unknown) => {
        inFlightProfileLoads.delete(userId);
        throw error;
      });

    inFlightProfileLoads.set(userId, profileLoad);
    return profileLoad;
  },
};
