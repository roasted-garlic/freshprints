import { FirebaseError } from "firebase/app";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
} from "firebase/auth";

import { auth } from "../../../config/firebase";
import type { LoginCredentials } from "../types/auth.types";
import { authPreferencesService } from "./authPreferencesService";

type AuthStateObserver = (user: FirebaseUser | null) => void;

function getAuthErrorMessage(error: unknown): string {
  if (!(error instanceof FirebaseError)) {
    return "Authentication failed. Please try again.";
  }

  switch (error.code) {
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "The email or password is incorrect.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/user-disabled":
      return "This account has been disabled.";
    case "auth/too-many-requests":
      return "Too many login attempts. Wait a moment and try again.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    default:
      return "Authentication failed. Please try again.";
  }
}

export const authService = {
  async configurePersistence(rememberMe = authPreferencesService.getRememberMe()): Promise<void> {
    try {
      await setPersistence(
        auth,
        rememberMe ? browserLocalPersistence : browserSessionPersistence,
      );
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  },

  async login({ email, password, rememberMe }: LoginCredentials): Promise<void> {
    try {
      await setPersistence(
        auth,
        rememberMe ? browserLocalPersistence : browserSessionPersistence,
      );
      await signInWithEmailAndPassword(auth, email.trim(), password);
      authPreferencesService.storeLoginPreferences(email, rememberMe);
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  },

  async logout(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  },

  subscribeToAuthState(observer: AuthStateObserver): () => void {
    return onAuthStateChanged(auth, observer);
  },
};
