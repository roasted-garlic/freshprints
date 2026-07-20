import { FirebaseError } from 'firebase/app';
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updatePassword,
  verifyBeforeUpdateEmail,
  type ActionCodeSettings,
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
    case 'auth/requires-recent-login':
      return 'For security, enter your current password and try again.';
    case 'auth/credential-already-in-use':
      return 'That email is already linked to another account.';
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

function buildAuthActionCodeSettings(): ActionCodeSettings {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return {
    url: `${origin}/login`,
    handleCodeInApp: false,
  };
}

export function firebaseUserHasPasswordProvider(user: FirebaseUser | null | undefined): boolean {
  return Boolean(user?.providerData.some((provider) => provider.providerId === 'password'));
}

export function firebaseUserHasGoogleProvider(user: FirebaseUser | null | undefined): boolean {
  return Boolean(user?.providerData.some((provider) => provider.providerId === 'google.com'));
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

  /** Always returns a generic success message to avoid email enumeration. */
  async sendPasswordResetEmail(email: string): Promise<string> {
    const trimmed = email.trim();
    try {
      await sendPasswordResetEmail(getPortalAuth(), trimmed, buildAuthActionCodeSettings());
    } catch (error) {
      if (error instanceof FirebaseError) {
        if (error.code === 'auth/invalid-email' || error.code === 'auth/missing-email') {
          throw new Error(getAuthErrorMessage(error));
        }
      }
    }
    return 'If an account exists for that email, a password reset link is on the way.';
  },

  async reauthenticateWithPassword(user: FirebaseUser, password: string): Promise<void> {
    try {
      const email = user.email;
      if (!email) {
        throw new Error('Your account does not have an email address.');
      }
      const credential = EmailAuthProvider.credential(email, password);
      await reauthenticateWithCredential(user, credential);
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  },

  async updatePassword(user: FirebaseUser, newPassword: string): Promise<void> {
    try {
      await updatePassword(user, newPassword);
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  },

  async verifyBeforeUpdateEmail(user: FirebaseUser, newEmail: string): Promise<void> {
    try {
      await verifyBeforeUpdateEmail(user, newEmail.trim(), buildAuthActionCodeSettings());
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  },

  subscribeToAuthState(observer: AuthStateObserver): () => void {
    return onAuthStateChanged(getPortalAuth(), observer);
  },

  getCallableErrorMessage,
  getAuthErrorMessage,
};
