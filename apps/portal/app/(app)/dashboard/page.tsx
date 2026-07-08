'use client';

import { getCustomerSignupSourceBadgeLabel } from '@fresh-prints/shared/utils/customerSignupSource';

import { useAuth } from '../../../features/auth/context/AuthContext';

export default function DashboardPage() {
  const { customer, logout, user } = useAuth();

  return (
    <main className="portal-page">
      <header className="portal-page-header">
        <h1>Welcome, {customer?.displayName ?? user?.displayName}</h1>
        <p className="portal-muted">Browse designs for print requests or manage your account.</p>
      </header>

      <section className="portal-panel">
        <h2>Your account</h2>
        <dl className="portal-details">
          <div>
            <dt>Username</dt>
            <dd>{customer?.username ?? '—'}</dd>
          </div>
          <div>
            <dt>Signup</dt>
            <dd>{customer ? getCustomerSignupSourceBadgeLabel(customer) : '—'}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{user?.email ?? '—'}</dd>
          </div>
        </dl>
        <button className="portal-sign-out-button" onClick={() => void logout()} type="button">
          Sign out
        </button>
      </section>
    </main>
  );
}
