import { Check, Copy, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { PreviewDuplicateAccountResolutionResponse } from "@fresh-prints/shared/types/customer/customerDuplicateResolution.types";
import type { Customer } from "@fresh-prints/shared/types/customer/customer.types";
import {
  getCustomerSignupSourceBadgeLabel,
} from "@fresh-prints/shared/utils/customerSignupSource";
import { formatCustomerUsernameForDisplay } from "@fresh-prints/shared/utils/formatCustomerUsernameForDisplay";

import { Button } from "../../../shared/components/Button";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";
import { Select } from "../../../shared/components/Select";
import { Toggle } from "../../../shared/components/Toggle";
import { customerIdentityManagementService } from "../services/customerIdentityManagementService";

type WizardStep = "select" | "roles" | "preview" | "confirm" | "result";

interface ResolveDuplicateAccountWizardProps {
  customers: Customer[];
  isOpen: boolean;
  onClose: () => void;
  onCompleted: () => void;
}

function customerOptionLabel(customer: Customer): string {
  const username = formatCustomerUsernameForDisplay(customer.username, {
    isDeleted: customer.isDeleted === true,
  });
  return `${customer.displayName} (${username}) — ${customer.email ?? "no email"}`;
}

function resolveAccountLabel(
  customerId: string,
  accountAId: string,
  accountBId: string,
): "A" | "B" | undefined {
  if (customerId === accountAId) {
    return "A";
  }
  if (customerId === accountBId) {
    return "B";
  }
  return undefined;
}

function RoleAssignmentCard({
  title,
  supportingText,
  tone,
  customer,
  accountLabel,
}: {
  title: string;
  supportingText: string;
  tone: "source" | "survivor";
  customer: Customer | undefined;
  accountLabel?: "A" | "B";
}) {
  if (!customer) {
    return (
      <div className={`duplicate-resolution-role-card duplicate-resolution-role-card-${tone}`}>
        <p className="duplicate-resolution-role-label">{title}</p>
        <p className="duplicate-resolution-role-supporting">{supportingText}</p>
        <p className="duplicate-resolution-role-empty">Choose a transfer direction below.</p>
      </div>
    );
  }

  const username = formatCustomerUsernameForDisplay(customer.username, {
    isDeleted: customer.isDeleted === true,
  });

  return (
    <div className={`duplicate-resolution-role-card duplicate-resolution-role-card-${tone}`}>
      <p className="duplicate-resolution-role-label">
        {title}
        {accountLabel ? ` · Account ${accountLabel}` : null}
      </p>
      <p className="duplicate-resolution-role-supporting">{supportingText}</p>
      <p className="duplicate-resolution-role-username">{username}</p>
      <dl className="duplicate-resolution-role-details">
        <div>
          <dt>Display name</dt>
          <dd>{customer.displayName}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>{customer.email ?? "—"}</dd>
        </div>
        <div>
          <dt>Signup</dt>
          <dd>{getCustomerSignupSourceBadgeLabel(customer)}</dd>
        </div>
      </dl>
    </div>
  );
}

function IdentitySummaryCard({
  title,
  tone,
  summary,
}: {
  title: string;
  tone: "source" | "survivor";
  summary: PreviewDuplicateAccountResolutionResponse["source"];
}) {
  return (
    <div className={`duplicate-resolution-identity-card duplicate-resolution-identity-card-${tone}`}>
      <p className="duplicate-resolution-identity-card-title">{title}</p>
      <dl className="duplicate-resolution-identity-list">
        <div>
          <dt>Username</dt>
          <dd>{formatCustomerUsernameForDisplay(summary.username, { isDeleted: summary.isDeleted })}</dd>
        </div>
        <div>
          <dt>Display name</dt>
          <dd>{summary.displayName}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>{summary.email ?? "—"}</dd>
        </div>
        <div>
          <dt>Auth / provider</dt>
          <dd>
            {summary.authProviders.length > 0
              ? summary.authProviders.map((provider) => provider.providerId).join(", ")
              : "—"}
          </dd>
        </div>
        <div>
          <dt>Customer ID</dt>
          <dd>{summary.customerId}</dd>
        </div>
        <div>
          <dt>Auth UID</dt>
          <dd>{summary.userId ?? "—"}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>
            {summary.isDeleted ? "Closed" : summary.isDisabled ? "Disabled" : "Active"}
          </dd>
        </div>
      </dl>
    </div>
  );
}

export function ResolveDuplicateAccountWizard({
  customers,
  isOpen,
  onClose,
  onCompleted,
}: ResolveDuplicateAccountWizardProps) {
  const [step, setStep] = useState<WizardStep>("select");
  const [accountAId, setAccountAId] = useState("");
  const [accountBId, setAccountBId] = useState("");
  const [sourceCustomerId, setSourceCustomerId] = useState("");
  const [survivorCustomerId, setSurvivorCustomerId] = useState("");
  const [preview, setPreview] = useState<PreviewDuplicateAccountResolutionResponse | null>(null);
  const [confirmationPhrase, setConfirmationPhrase] = useState("");
  const [ownerAttestedSameCustomer, setOwnerAttestedSameCustomer] = useState(false);
  const [ownerVerificationReason, setOwnerVerificationReason] = useState("");
  const [phraseCopied, setPhraseCopied] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [resultOutcome, setResultOutcome] = useState<string | null>(null);

  const selectableCustomers = useMemo(
    () =>
      customers.filter(
        (customer) => customer.isDeleted !== true && customer.isMerged !== true,
      ),
    [customers],
  );

  const customerSelectOptions = useMemo(
    () => [
      { label: "Select customer…", value: "" },
      ...selectableCustomers.map((customer) => ({
        label: customerOptionLabel(customer),
        value: customer.id,
      })),
    ],
    [selectableCustomers],
  );

  const accountACustomer = useMemo(
    () => selectableCustomers.find((customer) => customer.id === accountAId),
    [accountAId, selectableCustomers],
  );
  const accountBCustomer = useMemo(
    () => selectableCustomers.find((customer) => customer.id === accountBId),
    [accountBId, selectableCustomers],
  );
  const sourceCustomer = useMemo(
    () => selectableCustomers.find((customer) => customer.id === sourceCustomerId),
    [sourceCustomerId, selectableCustomers],
  );
  const survivorCustomer = useMemo(
    () => selectableCustomers.find((customer) => customer.id === survivorCustomerId),
    [survivorCustomerId, selectableCustomers],
  );

  const accountAUsername = accountACustomer
    ? formatCustomerUsernameForDisplay(accountACustomer.username, {
        isDeleted: accountACustomer.isDeleted === true,
      })
    : "Account A";
  const accountBUsername = accountBCustomer
    ? formatCustomerUsernameForDisplay(accountBCustomer.username, {
        isDeleted: accountBCustomer.isDeleted === true,
      })
    : "Account B";

  const resetWizard = useCallback(() => {
    setStep("select");
    setAccountAId("");
    setAccountBId("");
    setSourceCustomerId("");
    setSurvivorCustomerId("");
    setPreview(null);
    setConfirmationPhrase("");
    setOwnerAttestedSameCustomer(false);
    setOwnerVerificationReason("");
    setPhraseCopied(false);
    setError(null);
    setResultMessage(null);
    setResultOutcome(null);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      resetWizard();
    }
  }, [isOpen, resetWizard]);

  useEffect(() => {
    if (step !== "roles" || !accountAId || !accountBId) {
      return;
    }

    if (!sourceCustomerId && !survivorCustomerId) {
      setSourceCustomerId(accountAId);
      setSurvivorCustomerId(accountBId);
    }
  }, [step, accountAId, accountBId, sourceCustomerId, survivorCustomerId]);

  const runPreview = useCallback(async () => {
    if (!sourceCustomerId || !survivorCustomerId) {
      setError("Select the username source account and the account to keep.");
      return;
    }

    setIsLoadingPreview(true);
    setError(null);
    setPreview(null);

    try {
      const response = await customerIdentityManagementService.previewDuplicateResolution({
        sourceCustomerId,
        survivorCustomerId,
      });
      setPreview(response);
      setStep("preview");
    } catch (previewError: unknown) {
      setError(
        previewError instanceof Error
          ? previewError.message
          : "Unable to preview username transfer.",
      );
    } finally {
      setIsLoadingPreview(false);
    }
  }, [sourceCustomerId, survivorCustomerId]);

  const handleApply = useCallback(async () => {
    if (!preview) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await customerIdentityManagementService.transferUsername({
        previewId: preview.previewId,
        previewChecksum: preview.previewChecksum,
        sourceCustomerId: preview.source.customerId,
        survivorCustomerId: preview.survivor.customerId,
        desiredUsername: preview.desiredUsername,
        confirmationPhrase,
        ownerAttestedSameCustomer: preview.verification.requiresOwnerAttestation
          ? ownerAttestedSameCustomer
          : undefined,
        ownerVerificationReason: preview.verification.requiresOwnerVerificationReason
          ? ownerVerificationReason
          : undefined,
      });

      setResultOutcome(response.outcome);
      setResultMessage(response.message);
      setStep("result");

      if (response.outcome === "success" || response.outcome === "partial_success") {
        onCompleted();
      }
    } catch (applyError: unknown) {
      setError(
        applyError instanceof Error ? applyError.message : "Unable to transfer username.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [
    confirmationPhrase,
    onCompleted,
    ownerAttestedSameCustomer,
    ownerVerificationReason,
    preview,
  ]);

  const canProceedFromSelect =
    accountAId.length > 0 && accountBId.length > 0 && accountAId !== accountBId;
  const canProceedFromRoles = sourceCustomerId.length > 0 && survivorCustomerId.length > 0;
  const requiresAttestation = preview?.verification.requiresOwnerAttestation === true;
  const canApply =
    preview?.outcome === "allowed" &&
    confirmationPhrase === customerIdentityManagementService.transferUsernameConfirmationPhrase &&
    (!requiresAttestation ||
      (ownerAttestedSameCustomer && ownerVerificationReason.trim().length >= 8));

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay modal-overlay-blur">
      <Modal
        aria-labelledby="transfer-username-title"
        className="modal-panel-lg duplicate-resolution-wizard-modal"
        role="dialog"
      >
        <ModalHeader>
          <div>
            <p className="eyebrow">Customer identity</p>
            <h2 id="transfer-username-title">Transfer Username</h2>
            <p>
              Move a username from one customer account to another. The account receiving the
              username stays active. The account giving up the username is disabled after a
              successful transfer. Customer history is not merged.
            </p>
          </div>
          <button
            aria-label="Close"
            className="icon-button icon-button-md icon-button-ghost"
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={18} strokeWidth={2.2} />
          </button>
        </ModalHeader>

      <ModalBody>
        {error ? (
          <p className="auth-message auth-message-error" role="alert">
            {error}
          </p>
        ) : null}

        {step === "select" ? (
          <div className="duplicate-resolution-step">
            <p>Select the two customer accounts for this username transfer.</p>
            <Select
              label="Account A"
              name="duplicateResolutionAccountA"
              onChange={(event) => setAccountAId(event.target.value)}
              options={customerSelectOptions}
              searchable
              searchPlaceholder="Search name, username, email…"
              value={accountAId}
            />
            <Select
              label="Account B"
              name="duplicateResolutionAccountB"
              onChange={(event) => setAccountBId(event.target.value)}
              options={customerSelectOptions}
              searchable
              searchPlaceholder="Search name, username, email…"
              value={accountBId}
            />
          </div>
        ) : null}

        {step === "roles" ? (
          <div className="duplicate-resolution-step">
            <p>
              Choose which account owns the username to transfer and which account the customer
              will keep using.
            </p>
            <div className="duplicate-resolution-role-grid">
              <RoleAssignmentCard
                accountLabel={resolveAccountLabel(sourceCustomerId, accountAId, accountBId)}
                customer={sourceCustomer}
                supportingText="This account currently owns the username and will be disabled after the transfer."
                title="Username Source (Source)"
                tone="source"
              />
              <RoleAssignmentCard
                accountLabel={resolveAccountLabel(survivorCustomerId, accountAId, accountBId)}
                customer={survivorCustomer}
                supportingText="This account receives the username and remains the customer's active login."
                title="Account to Keep (Survivor)"
                tone="survivor"
              />
            </div>
            <div className="duplicate-resolution-role-actions">
              <Button
                className="duplicate-resolution-direction-button"
                onClick={() => {
                  setSourceCustomerId(accountAId);
                  setSurvivorCustomerId(accountBId);
                }}
                type="button"
                variant={sourceCustomerId === accountAId ? "primary" : "secondary"}
              >
                <span className="duplicate-resolution-direction-label">
                  Transfer {accountAUsername} to Account B
                </span>
                <span className="duplicate-resolution-direction-note">
                  Account B remains the active login.
                </span>
              </Button>
              <Button
                className="duplicate-resolution-direction-button"
                onClick={() => {
                  setSourceCustomerId(accountBId);
                  setSurvivorCustomerId(accountAId);
                }}
                type="button"
                variant={sourceCustomerId === accountBId ? "primary" : "secondary"}
              >
                <span className="duplicate-resolution-direction-label">
                  Transfer {accountBUsername} to Account A
                </span>
                <span className="duplicate-resolution-direction-note">
                  Account A remains the active login.
                </span>
              </Button>
            </div>
          </div>
        ) : null}

        {(step === "preview" || step === "confirm") && preview ? (
          <div className="duplicate-resolution-step">
            {step === "preview" ? (
              <>
                <div className="duplicate-resolution-identity-grid">
                  <IdentitySummaryCard
                    summary={preview.source}
                    title="Username Source (Source)"
                    tone="source"
                  />
                  <IdentitySummaryCard
                    summary={preview.survivor}
                    title="Account to Keep (Survivor)"
                    tone="survivor"
                  />
                </div>

                <div className="duplicate-resolution-preview-meta">
                  <p>
                    <strong>Desired username:</strong>{" "}
                    {formatCustomerUsernameForDisplay(preview.desiredUsername)}
                  </p>
                  <p>
                    <strong>Verification:</strong> {preview.verification.status}
                    {preview.verification.mode ? ` (${preview.verification.mode})` : ""}
                  </p>
                  {preview.verification.requiresOwnerAttestation ? (
                    <p className="duplicate-resolution-verification-note">
                      Verified email match was not found. You will need to attest that both accounts
                      belong to the same customer before transferring.
                    </p>
                  ) : null}
                  <p>
                    <strong>Reservation owner:</strong>{" "}
                    {preview.usernameReservation.ownedBySource
                      ? "Source"
                      : preview.usernameReservation.ownedBySurvivor
                        ? "Survivor"
                        : preview.usernameReservation.ownedByThirdParty
                          ? "Another account"
                          : "Unreserved"}
                  </p>
                </div>

                {preview.blockers.length > 0 ? (
                  <ul className="duplicate-resolution-blockers">
                    {preview.blockers.map((blocker) => (
                      <li key={blocker.code}>{blocker.message}</li>
                    ))}
                  </ul>
                ) : null}

                <ul className="duplicate-resolution-summary-lines duplicate-resolution-summary-lines-scroll">
                  <li>
                    {formatCustomerUsernameForDisplay(preview.desiredUsername)} will move to{" "}
                    {formatCustomerUsernameForDisplay(preview.survivor.username, {
                      isDeleted: preview.survivor.isDeleted,
                    })}{" "}
                    (Account to Keep)
                  </li>
                  <li>The account to keep remains active.</li>
                  <li>
                    The username source receives an internal replacement username, then is disabled.
                  </li>
                  <li>
                    Business history on the username source stays on that customer ID — account
                    history is not merged.
                  </li>
                  {preview.survivor.username &&
                  preview.survivor.username !== preview.desiredUsername ? (
                    <li>
                      The account to keep releases{" "}
                      {formatCustomerUsernameForDisplay(preview.survivor.username, {
                        isDeleted: preview.survivor.isDeleted,
                      })}
                      .
                    </li>
                  ) : null}
                </ul>
              </>
            ) : null}

            {step === "confirm" ? (
              <div className="duplicate-resolution-confirm-step">
                <div className="duplicate-resolution-confirm-recap">
                  <div className="duplicate-resolution-confirm-recap-row">
                    <span className="duplicate-resolution-confirm-recap-label">Username source</span>
                    <span className="duplicate-resolution-confirm-recap-value">
                      {formatCustomerUsernameForDisplay(preview.source.username, {
                        isDeleted: preview.source.isDeleted,
                      })}
                    </span>
                  </div>
                  <div className="duplicate-resolution-confirm-recap-row">
                    <span className="duplicate-resolution-confirm-recap-label">Account to keep</span>
                    <span className="duplicate-resolution-confirm-recap-value">
                      {formatCustomerUsernameForDisplay(preview.survivor.username, {
                        isDeleted: preview.survivor.isDeleted,
                      })}
                    </span>
                  </div>
                  <div className="duplicate-resolution-confirm-recap-row">
                    <span className="duplicate-resolution-confirm-recap-label">Username after transfer</span>
                    <span className="duplicate-resolution-confirm-recap-value">
                      {formatCustomerUsernameForDisplay(preview.desiredUsername)}
                    </span>
                  </div>
                </div>

                <div className="duplicate-resolution-confirm-summary">
                  <p className="duplicate-resolution-confirm-summary-title">Confirm transfer</p>
                  <ul className="duplicate-resolution-summary-lines">
                    <li>
                      Transferring{" "}
                      {formatCustomerUsernameForDisplay(preview.desiredUsername)} to the account to
                      keep.
                    </li>
                    <li>The receiving account remains active.</li>
                    <li>The username source gets a placeholder username and is disabled.</li>
                    <li>No customer history is merged.</li>
                  </ul>
                </div>

                {requiresAttestation ? (
                  <div className="duplicate-resolution-attestation">
                    <div className="duplicate-resolution-toggle-row">
                      <Toggle
                        checked={ownerAttestedSameCustomer}
                        label="I independently verified both accounts belong to the same customer."
                        name="transfer-owner-attestation"
                        onChange={setOwnerAttestedSameCustomer}
                      />
                    </div>
                    <label className="form-field" htmlFor="transfer-owner-verification-reason">
                      <span className="form-label">Verification reason (min 8 characters)</span>
                      <textarea
                        disabled={!ownerAttestedSameCustomer || isSubmitting}
                        id="transfer-owner-verification-reason"
                        onChange={(event) => setOwnerVerificationReason(event.target.value)}
                        placeholder="Describe how you verified both accounts belong to the same customer."
                        rows={3}
                        value={ownerVerificationReason}
                      />
                    </label>
                  </div>
                ) : null}

                <div className="duplicate-resolution-confirm-phrase">
                  <label className="form-field" htmlFor="transfer-username-confirm-input">
                    <span className="form-label duplicate-resolution-confirm-phrase-label">
                      <span>
                        Type{" "}
                        <code>{customerIdentityManagementService.transferUsernameConfirmationPhrase}</code>{" "}
                        to confirm
                      </span>
                      <button
                        aria-label="Copy confirmation phrase"
                        className="icon-button icon-button-sm icon-button-ghost"
                        disabled={isSubmitting}
                        onClick={(event) => {
                          event.preventDefault();
                          void navigator.clipboard.writeText(
                            customerIdentityManagementService.transferUsernameConfirmationPhrase,
                          );
                          setPhraseCopied(true);
                        }}
                        type="button"
                      >
                        {phraseCopied ? (
                          <Check aria-hidden="true" size={15} strokeWidth={2.2} />
                        ) : (
                          <Copy aria-hidden="true" size={15} strokeWidth={2.2} />
                        )}
                      </button>
                    </span>
                    <input
                      autoComplete="off"
                      className="form-input"
                      disabled={isSubmitting}
                      id="transfer-username-confirm-input"
                      onChange={(event) => setConfirmationPhrase(event.target.value)}
                      spellCheck={false}
                      type="text"
                      value={confirmationPhrase}
                    />
                  </label>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {step === "result" ? (
          <div className="duplicate-resolution-step">
            <p
              className={
                resultOutcome === "success"
                  ? "auth-message auth-message-success"
                  : resultOutcome === "partial_success"
                    ? "auth-message auth-message-warning"
                    : "auth-message auth-message-error"
              }
              role="status"
            >
              {resultMessage}
            </p>
          </div>
        ) : null}
      </ModalBody>

      <ModalFooter>
        <Button onClick={onClose} type="button" variant="secondary">
          {step === "result" ? "Close" : "Cancel"}
        </Button>

        {step === "select" ? (
          <Button
            disabled={!canProceedFromSelect}
            onClick={() => {
              setSourceCustomerId("");
              setSurvivorCustomerId("");
              setStep("roles");
            }}
            type="button"
          >
            Next
          </Button>
        ) : null}

        {step === "roles" ? (
          <>
            <Button onClick={() => setStep("select")} type="button" variant="secondary">
              Back
            </Button>
            <Button
              disabled={!canProceedFromRoles || isLoadingPreview}
              onClick={() => void runPreview()}
              type="button"
            >
              {isLoadingPreview ? "Loading preview…" : "Preview"}
            </Button>
          </>
        ) : null}

        {step === "preview" && preview ? (
          <>
            <Button onClick={() => setStep("roles")} type="button" variant="secondary">
              Back
            </Button>
            <Button
              disabled={preview.outcome !== "allowed"}
              onClick={() => setStep("confirm")}
              type="button"
            >
              Continue to confirmation
            </Button>
          </>
        ) : null}

        {step === "confirm" && preview ? (
          <>
            <Button onClick={() => setStep("preview")} type="button" variant="secondary">
              Back
            </Button>
            <Button disabled={!canApply || isSubmitting} onClick={() => void handleApply()} type="button">
              {isSubmitting ? "Applying…" : "Transfer username"}
            </Button>
          </>
        ) : null}
      </ModalFooter>
      </Modal>
    </div>
  );
}
