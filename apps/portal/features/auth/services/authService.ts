import { FirebaseError } from 'firebase/app';
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth';

import { getPortalAuth } from '../../../lib/firebase/client';
import type { LoginCredentials, RegisterCredentials } from '../types/auth.types';

type AuthStateObserver = (user: FirebaseUser | null) => void;

function getAuthErrorMessage(error: unknown): string {
  if (!(error instanceof FirebaseError)) {
    return 'Authentication failed. Please try again.';
  }

  switch (error.code) {
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'The email or password is incorrect.';
    case 'auth/invalid-email':
      return 'Enter a valid email address.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Sign in instead.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a moment and try again.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    default:
      return 'Authentication failed. Please try again.';
  }
}

function getCallableErrorMessage(error: unknown): string {
  if (!(error instanceof FirebaseError)) {
    return 'Registration could not be completed. Please try again.';
  }

  switch (error.code) {
    case 'functions/already-exists':
      return error.message || 'That email or username is already in use.';
    case 'functions/invalid-argument':
      return error.message || 'Check your registration details and try again.';
    case 'functions/permission-denied':
      return error.message || 'You do not have permission to register for the portal.';
    case 'functions/unauthenticated':
      return 'Sign-in is required to finish registration.';
    default:
      return error.message || 'Registration could not be completed. Please try again.';
  }
}

export const portalAuthService = {
  async configurePersistence(): Promise<void> {
      await setPersistence(getPortalAuth(), browserLocalPersistence);
  },

  async login({ email, password }: LoginCredentials): Promise<void> {
    try {
      await signInWithEmailAndPassword(getPortalAuth(), email.trim(), password);
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  },

  async register({ email, password }: RegisterCredentials): Promise<void> {
    try {
      await createUserWithEmailAndPassword(getPortalAuth(), email.trim(), password);
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  },

  async logout(): Promise<void> {
    try {
      await signOut(getPortalAuth());
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  },

  subscribeToAuthState(observer: AuthStateObserver): () => void {
    return onAuthStateChanged(getPortalAuth(), observer);
  },

  getCallableErrorMessage,
};
