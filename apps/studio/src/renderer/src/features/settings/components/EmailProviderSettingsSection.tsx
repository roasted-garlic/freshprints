import { useEffect, useState } from "react";

import type {
  EmailProviderId,
  EmailProviderSettings,
} from "@fresh-prints/shared/constants/emailProviders.constants";
import { Button } from "../../../shared/components/Button";
import { Select, type SelectOption } from "../../../shared/components/Select";
import { useEmailProviderSettings } from "../hooks/useEmailProviderSettings";

const PROVIDER_OPTIONS: SelectOption[] = [
  { label: "Resend", value: "resend" },
  { label: "Brevo", value: "brevo" },
];

const PROVIDER_DASHBOARD_LINKS: Record<
  EmailProviderId,
  { href: string; label: string }
> = {
  resend: {
    href: "https://resend.com/emails",
    label: "Open Resend email log",
  },
  brevo: {
    href: "https://app.brevo.com/transactional/email/logs",
    label: "Open Brevo transactional logs",
  },
};

function ProviderDashboardLink({ provider }: { provider: EmailProviderId }) {
  const link = PROVIDER_DASHBOARD_LINKS[provider];
  return (
    <a
      className="settings-provider-dashboard-link"
      href={link.href}
      rel="noopener noreferrer"
      target="_blank"
    >
      {link.label}
    </a>
  );
}

export function EmailProviderSettingsSection() {
  const { error, isLoading, isSaving, save, saved, settings } = useEmailProviderSettings();
  const [draft, setDraft] = useState<EmailProviderSettings>(settings);

  useEffect(() => setDraft(settings), [settings]);

  return (
    <section aria-labelledby="email-provider-settings-title" className="card settings-section">
      <header className="settings-section-header">
        <h2 className="settings-section-title" id="email-provider-settings-title">
          Email Providers
        </h2>
        <p className="settings-section-description">
          Choose the delivery provider independently for invitations and proof-ready notices.
        </p>
      </header>

      {isLoading ? (
        <p aria-live="polite" className="settings-section-status">
          Loading email providers…
        </p>
      ) : (
        <div className="settings-form-grid">
          <div className="settings-control-grid">
            <div className="settings-control-item">
              <Select
                disabled={isSaving}
                label="Invitation emails"
                name="inviteProvider"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    inviteProvider: event.target.value as EmailProviderId,
                  }))
                }
                options={PROVIDER_OPTIONS}
                value={draft.inviteProvider}
              />
              <ProviderDashboardLink provider={draft.inviteProvider} />
            </div>
            <div className="settings-control-item">
              <Select
                disabled={isSaving}
                label="Proof-ready emails"
                name="proofNoticeProvider"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    proofNoticeProvider: event.target.value as EmailProviderId,
                  }))
                }
                options={PROVIDER_OPTIONS}
                value={draft.proofNoticeProvider}
              />
              <ProviderDashboardLink provider={draft.proofNoticeProvider} />
            </div>
          </div>
          <p className="settings-field-hint">
            Use a verified sender address for the provider you select.
          </p>
          {error ? (
            <p className="auth-message auth-message-error" role="alert">
              {error}
            </p>
          ) : null}
          {saved ? (
            <p aria-live="polite" className="auth-message auth-message-success">
              Email providers saved.
            </p>
          ) : null}
          <div className="settings-form-actions">
            <Button
              disabled={isSaving || JSON.stringify(draft) === JSON.stringify(settings)}
              onClick={() => void save(draft)}
              variant="primary"
            >
              {isSaving ? "Saving…" : "Save email providers"}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
