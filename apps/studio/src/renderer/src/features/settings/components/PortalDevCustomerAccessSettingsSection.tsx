import { useEffect, useState } from "react";

import {
  PORTAL_DEV_CUSTOMER_ACCESS_MAX_EMAILS,
  normalizePortalDevCustomerAccessEmail,
  normalizePortalDevCustomerAccessEmails,
  type PortalDevCustomerAccessSettings,
} from "@fresh-prints/shared/constants/portal/portalDevCustomerAccess.constants";
import { Button } from "../../../shared/components/Button";
import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";
import { usePortalDevCustomerAccessSettings } from "../hooks/usePortalDevCustomerAccessSettings";

function formatAuditValue(value: unknown): string | null {
  if (value && typeof (value as { toDate?: () => Date }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toLocaleString();
  }
  return value instanceof Date ? value.toLocaleString() : null;
}

function settingsToDraft(settings: PortalDevCustomerAccessSettings): string[] {
  return [...settings.approvedEmails];
}

export function PortalDevCustomerAccessSettingsSection() {
  const { user } = useAuth();
  const { error, isLoading, isSaving, save, saved, settings } = usePortalDevCustomerAccessSettings();
  const [draftEmails, setDraftEmails] = useState(() => settingsToDraft(settings));
  const [emailInput, setEmailInput] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setDraftEmails(settingsToDraft(settings));
  }, [settings]);

  const auditTime = formatAuditValue(settings.updatedAt);
  const normalizedDraft = normalizePortalDevCustomerAccessEmails(draftEmails);
  const isDirty =
    normalizedDraft.length !== settings.approvedEmails.length ||
    normalizedDraft.some((email, index) => email !== settings.approvedEmails[index]);

  if (!permissionService.canManageSettings(user)) {
    return null;
  }

  function handleAddEmail() {
    setLocalError(null);
    const email = normalizePortalDevCustomerAccessEmail(emailInput);
    if (!email || !email.includes("@") || email.startsWith("@") || email.endsWith("@")) {
      setLocalError("Enter a valid email address.");
      return;
    }
    if (draftEmails.map(normalizePortalDevCustomerAccessEmail).includes(email)) {
      setLocalError("That email is already on the list.");
      return;
    }
    if (draftEmails.length >= PORTAL_DEV_CUSTOMER_ACCESS_MAX_EMAILS) {
      setLocalError(`At most ${PORTAL_DEV_CUSTOMER_ACCESS_MAX_EMAILS} emails are allowed.`);
      return;
    }
    setDraftEmails((current) => [...current, email]);
    setEmailInput("");
  }

  function handleRemoveEmail(email: string) {
    setLocalError(null);
    setDraftEmails((current) =>
      current.filter((entry) => normalizePortalDevCustomerAccessEmail(entry) !== email),
    );
  }

  async function handleSave() {
    setLocalError(null);
    await save({ approvedEmails: normalizePortalDevCustomerAccessEmails(draftEmails) });
  }

  return (
    <section
      aria-labelledby="portal-dev-customer-access-settings-title"
      className="card settings-section"
    >
      <header className="settings-section-header">
        <h2
          className="settings-section-title"
          id="portal-dev-customer-access-settings-title"
        >
          Portal DEV customer access
        </h2>
        <p className="settings-section-description">
          Approved customer emails for the development Portal only. Enforcement runs on
          fresh-prints-dev; production registration and login are unaffected. Staff accounts
          are not restricted by this list.
        </p>
      </header>

      {isLoading ? (
        <p className="settings-section-status">Loading DEV customer access…</p>
      ) : null}
      {error ? (
        <p className="auth-message auth-message-error" role="alert">
          {error}
        </p>
      ) : null}
      {localError ? (
        <p className="auth-message auth-message-error" role="alert">
          {localError}
        </p>
      ) : null}

      <div className="settings-form-grid">
        <div className="settings-control-item">
          <label className="settings-field-label" htmlFor="portal-dev-customer-access-email">
            <span>Add approved email</span>
            <input
              className="settings-text-input"
              disabled={isLoading || isSaving}
              id="portal-dev-customer-access-email"
              onChange={(event) => setEmailInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleAddEmail();
                }
              }}
              placeholder="tester@example.com"
              type="email"
              value={emailInput}
            />
          </label>
          <div className="settings-form-actions">
            <Button
              disabled={isLoading || isSaving || !emailInput.trim()}
              onClick={handleAddEmail}
              type="button"
              variant="secondary"
            >
              Add email
            </Button>
          </div>
          <p className="settings-field-hint">
            Emails are stored lowercase with whitespace trimmed. Duplicates are removed on save.
            ({normalizedDraft.length}/{PORTAL_DEV_CUSTOMER_ACCESS_MAX_EMAILS})
          </p>
        </div>

        <div className="settings-control-item">
          <p className="settings-field-label">Approved emails</p>
          {normalizedDraft.length === 0 ? (
            <p className="settings-field-hint">
              No emails approved yet. On DEV, unapproved customers cannot register or stay signed
              in.
            </p>
          ) : (
            <ul className="settings-field-hint" style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {normalizedDraft.map((email) => (
                <li
                  key={email}
                  style={{
                    alignItems: "center",
                    display: "flex",
                    gap: "0.75rem",
                    justifyContent: "space-between",
                    marginBottom: "0.5rem",
                  }}
                >
                  <span>{email}</span>
                  <Button
                    disabled={isLoading || isSaving}
                    onClick={() => handleRemoveEmail(email)}
                    size="sm"
                    type="button"
                    variant="secondary"
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {auditTime || settings.updatedBy ? (
          <p className="settings-field-hint">
            Last saved{auditTime ? ` ${auditTime}` : ""}
            {settings.updatedBy ? ` by ${settings.updatedBy}` : ""}.
          </p>
        ) : null}

        <div className="settings-form-actions">
          <Button disabled={!isDirty || isLoading || isSaving} onClick={() => void handleSave()}>
            {isSaving ? "Saving…" : "Save DEV access list"}
          </Button>
          {saved ? (
            <p aria-live="polite" className="settings-save-success">
              Saved
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
