import { FirebaseError } from 'firebase/app';
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
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
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Google sign-in was cancelled.';
    case 'auth/popup-blocked':
      return 'Google sign-in popup was blocked. Allow popups for this site and try again.';
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with this email using a different sign-in method. Sign in with email and password instead.';
    case 'auth/operation-not-allowed':
      return 'Google sign-in is not enabled yet. Contact support or try email and password.';
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
    case 'functions/failed-precondition':
      return error.message || 'This action is not available right now.';
    case 'functions/resource-exhausted':
      return error.message || 'Upload limit reached. Try again later.';
    case 'functions/unavailable':
      return error.message || 'Service temporarily unavailable. Try again shortly.';
    case 'functions/deadline-exceeded':
      return (
        error.message ||
        'Processing took too long. Tap Retry failed — larger files can take a few minutes.'
      );
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

  async loginWithGoogle(): Promise<void> {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(getPortalAuth(), provider);
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
