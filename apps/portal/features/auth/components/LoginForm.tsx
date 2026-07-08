'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, type FormEvent } from 'react';

import { useAuth } from '../context/AuthContext';

export function LoginForm() {
  const router = useRouter();
  const { bootstrapStatus, error, isAuthActionLoading, isAuthenticated, login } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/catalog');
    }
  }, [isAuthenticated, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') ?? '');
    const password = String(formData.get('password') ?? '');

    await login({ email, password });
  }

  return (
    <form className="portal-auth-form" onSubmit={handleSubmit}>
      <label className="portal-field">
        <span>Email</span>
        <input autoComplete="email" name="email" required type="email" />
      </label>

      <label className="portal-field">
        <span>Password</span>
        <input autoComplete="current-password" name="password" required type="password" />
      </label>

      {error ? <p className="portal-form-error">{error}</p> : null}

      <button className="portal-button portal-button-primary" disabled={isAuthActionLoading} type="submit">
        {isAuthActionLoading || bootstrapStatus === 'loading-profile' ? 'Signing in…' : 'Sign in'}
      </button>

      <p className="portal-auth-footer">
        New here? <Link href="/register">Create an account</Link>
      </p>
    </form>
  );
}
