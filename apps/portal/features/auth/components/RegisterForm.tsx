'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';

import { useAuth } from '../context/AuthContext';
import { UserPlusIcon } from '../../shared/components/PortalIcons';

export function RegisterForm() {
  const router = useRouter();
  const { bootstrapStatus, error, isAuthActionLoading, isAuthenticated, register } = useAuth();
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/catalog');
    }
  }, [isAuthenticated, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') ?? '');
    const password = String(formData.get('password') ?? '');
    const confirmPassword = String(formData.get('confirmPassword') ?? '');
    const displayName = String(formData.get('displayName') ?? '');
    const username = String(formData.get('username') ?? '');

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }

    await register({ email, password, displayName, username });
  }

  const displayError = localError ?? error;

  return (
    <form className="portal-auth-form" onSubmit={handleSubmit}>
      <label className="portal-field">
        <span>Display name</span>
        <input autoComplete="name" name="displayName" required type="text" />
      </label>

      <label className="portal-field">
        <span>Username</span>
        <input
          autoComplete="username"
          name="username"
          pattern="[a-z0-9][a-z0-9_-]{1,30}[a-z0-9]"
          required
          spellCheck={false}
          type="text"
        />
        <span className="portal-field-hint">Lowercase letters, numbers, underscores, or hyphens.</span>
      </label>

      <label className="portal-field">
        <span>Email</span>
        <input autoComplete="email" name="email" required type="email" />
      </label>

      <label className="portal-field">
        <span>Password</span>
        <input autoComplete="new-password" minLength={6} name="password" required type="password" />
      </label>

      <label className="portal-field">
        <span>Confirm password</span>
        <input autoComplete="new-password" minLength={6} name="confirmPassword" required type="password" />
      </label>

      {displayError ? <p className="portal-form-error">{displayError}</p> : null}

      <button
        className="portal-button portal-button-primary portal-button-leading-icon"
        disabled={isAuthActionLoading}
        type="submit"
      >
        <UserPlusIcon />
        {isAuthActionLoading || bootstrapStatus === 'loading-profile' ? 'Creating account…' : 'Create account'}
      </button>

      <p className="portal-auth-footer">
        Already have an account? <Link href="/login">Sign in</Link>
      </p>
    </form>
  );
}
