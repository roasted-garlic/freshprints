import { Check, Copy, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  MergeContinuablePolicySummary,
  MergeContinuablePrintRequestSummary,
  MergeContinuableRequestClassification,
  MergeCustomerIdentitySummary,
  PreviewCustomerAccountMergeResponse,
} from "@fresh-prints/shared/types/customer/customerAccountMerge.types";
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

const MERGE_STATUS_POLL_INTERVAL_MS = 2000;

function isSuccessfulMergeOutcome(outcome: string | null): boolean {
  return outcome === "success" || outcome === "completed" || outcome === "partial_success";
}

interface MergeCustomerAccountsWizardProps {
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

function formatMergeContinuableState(
  classification: MergeContinuableRequestClassification,
  requests: MergeContinuablePrintRequestSummary[],
): string {
  if (classification === "none") {
    return "No working request";
  }
  if (classification === "empty") {
    return "Empty draft";
  }

  const meaningfulRequest = requests.find((request) => request.classification === "meaningful");
  const itemCount = meaningfulRequest?.itemCount ?? requests[0]?.itemCount ?? 0;
  return `Working request · ${itemCount} items`;
}

function continuableStateForAccount(
  policy: MergeContinuablePolicySummary,
  account: "source" | "survivor",
): string {
  if (account === "source") {
    return formatMergeContinuableState(
      policy.sourceClassification,
      policy.sourceContinuableRequests,
    );
  }

  return formatMergeContinuableState(
    policy.survivorClassification,
    policy.survivorContinuableRequests,
  );
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
  tone: "merge" | "keep";
  customer: Customer | undefined;
  accountLabel?: "A" | "B";
}) {
  if (!customer) {
    return (
      <div className={`merge-accounts-role-card merge-accounts-role-card-${tone}`}>
        <p className="merge-accounts-role-label">{title}</p>
        <p className="merge-accounts-role-supporting">{supportingText}</p>
        <p className="merge-accounts-role-empty">Choose a merge direction below.</p>
      </div>
    );
  }

  const username = formatCustomerUsernameForDisplay(customer.username, {
    isDeleted: customer.isDeleted === true,
  });

  return (
    <div className={`merge-accounts-role-card merge-accounts-role-card-${tone}`}>
      <p className="merge-accounts-role-label">
        {title}
        {accountLabel ? ` · Account ${accountLabel}` : null}
      </p>
      <p className="merge-accounts-role-supporting">{supportingText}</p>
      <p className="merge-accounts-role-username">{username}</p>
      <dl className="merge-accounts-role-details">
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
  continuableStateLabel,
}: {
  title: string;
  tone: "merge" | "keep";
  summary: MergeCustomerIdentitySummary;
  continuableStateLabel: string;
}) {
  return (
    <div className={`merge-accounts-identity-card merge-accounts-identity-card-${tone}`}>
      <p className="merge-accounts-identity-card-title">{title}</p>
      <dl className="merge-accounts-identity-list">
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
            {summary.isDeleted ? "Closed" : summary.isDisabled ? "Disabled" : summary.isMerged ? "Merged" : "Active"}
          </dd>
        </div>
        <div>
          <dt>Continuable request</dt>
          <dd>{continuableStateLabel}</dd>
        </div>
      </dl>
    </div>
  );
}

export function MergeCustomerAccountsWizard({
  customers,
  isOpen,
  onClose,
  onCompleted,
}: MergeCustomerAccountsWizardProps) {
  const [step, setStep] = useState<WizardStep>("select");
  const [accountAId, setAccountAId] = useState("");
  const [accountBId, setAccountBId] = useState("");
  const [sourceCustomerId, setSourceCustomerId] = useState("");
  const [survivorCustomerId, setSurvivorCustomerId] = useState("");
  const [useSourceUsername, setUseSourceUsername] = useState(false);
  const [preview, setPreview] = useState<PreviewCustomerAccountMergeResponse | null>(null);
  const [confirmationPhrase, setConfirmationPhrase] = useState("");
  const [ownerAttestedSameCustomer, setOwnerAttestedSameCustomer] = useState(false);
  const [ownerVerificationReason, setOwnerVerificationReason] = useState("");
  const [phraseCopied, setPhraseCopied] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mergeJobId, setMergeJobId] = useState<string | null>(null);
  const [mergeStatusMessage, setMergeStatusMessage] = useState<string | null>(null);
  const [mergeStatusStage, setMergeStatusStage] = useState<string | null>(null);
  const [mergeOutcome, setMergeOutcome] = useState<string | null>(null);
  const [didNotifyCompleted, setDidNotifyCompleted] = useState(false);
  const pollInFlightRef = useRef(false);

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
    setUseSourceUsername(false);
    setPreview(null);
    setConfirmationPhrase("");
    setOwnerAttestedSameCustomer(false);
    setOwnerVerificationReason("");
    setPhraseCopied(false);
    setError(null);
    setMergeJobId(null);
    setMergeStatusMessage(null);
    setMergeStatusStage(null);
    setMergeOutcome(null);
    setDidNotifyCompleted(false);
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
      setError("Select the account to merge and the account to keep.");
      return;
    }

    setIsLoadingPreview(true);
    setError(null);
    setPreview(null);

    try {
      const response = await customerIdentityManagementService.previewAccountMerge({
        sourceCustomerId,
        survivorCustomerId,
        useSourceUsername,
      });
      setPreview(response);
      setUseSourceUsername(response.useSourceUsername);
      setStep("preview");
    } catch (previewError: unknown) {
      setError(
        previewError instanceof Error ? previewError.message : "Unable to preview account merge.",
      );
    } finally {
      setIsLoadingPreview(false);
    }
  }, [sourceCustomerId, survivorCustomerId, useSourceUsername]);

  const notifyCompletedIfNeeded = useCallback(() => {
    if (didNotifyCompleted) {
      return;
    }

    setDidNotifyCompleted(true);
    onCompleted();
  }, [didNotifyCompleted, onCompleted]);

  const handleClose = useCallback(() => {
    if (step === "result" && isSuccessfulMergeOutcome(mergeOutcome)) {
      notifyCompletedIfNeeded();
    }

    onClose();
  }, [mergeOutcome, notifyCompletedIfNeeded, onClose, step]);

  const pollMergeStatus = useCallback(
    async (jobId: string) => {
      if (pollInFlightRef.current) {
        return;
      }

      pollInFlightRef.current = true;
      try {
        const status = await customerIdentityManagementService.getAccountMergeStatus({ jobId });
        const job = status.job;

        if (job.status === "completed") {
          setMergeOutcome("success");
          setMergeStatusMessage("Account merge completed.");
          setMergeStatusStage(null);
          notifyCompletedIfNeeded();
          return;
        }

        setMergeStatusMessage(job.lastError ?? `Merge job is ${job.status}.`);
        setMergeStatusStage(job.stage);

        if (job.status === "failed") {
          setMergeOutcome("failed");
          setMergeStatusMessage(job.lastError ?? "Account merge failed.");
          return;
        }

        window.setTimeout(() => {
          pollInFlightRef.current = false;
          void pollMergeStatus(jobId);
        }, MERGE_STATUS_POLL_INTERVAL_MS);
      } catch (statusError: unknown) {
        setError(
          statusError instanceof Error
            ? statusError.message
            : "Unable to load account merge progress.",
        );
        setMergeOutcome("failed");
      } finally {
        pollInFlightRef.current = false;
      }
    },
    [notifyCompletedIfNeeded],
  );

  const handleApply = useCallback(async () => {
    if (!preview) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await customerIdentityManagementService.applyAccountMerge({
        previewId: preview.previewId,
        previewChecksum: preview.previewChecksum,
        sourceCustomerId: preview.source.customerId,
        survivorCustomerId: preview.survivor.customerId,
        useSourceUsername: preview.useSourceUsername,
        confirmationPhrase,
        ownerAttestedSameCustomer: preview.verification.requiresOwnerAttestation
          ? ownerAttestedSameCustomer
          : undefined,
        ownerVerificationReason: preview.verification.requiresOwnerVerificationReason
          ? ownerVerificationReason
          : undefined,
      });

      if (response.outcome !== "started" && response.outcome !== "resumed") {
        if (response.outcome === "completed") {
          setMergeOutcome("success");
          setMergeStatusMessage(response.message || "Account merge completed.");
          setMergeStatusStage(null);
          notifyCompletedIfNeeded();
        } else {
          setMergeOutcome(response.outcome);
          setMergeStatusMessage(response.message);
        }
        setStep("result");
        return;
      }

      if (!response.jobId) {
        setError("Account merge did not return a job id.");
        return;
      }

      setMergeJobId(response.jobId);
      setMergeStatusMessage(response.message);
      setMergeOutcome("in_progress");
      setStep("result");
      void pollMergeStatus(response.jobId);
    } catch (applyError: unknown) {
      setError(applyError instanceof Error ? applyError.message : "Unable to start account merge.");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    confirmationPhrase,
    ownerAttestedSameCustomer,
    ownerVerificationReason,
    pollMergeStatus,
    preview,
    notifyCompletedIfNeeded,
  ]);

  const canProceedFromSelect =
    accountAId.length > 0 && accountBId.length > 0 && accountAId !== accountBId;
  const canProceedFromRoles = sourceCustomerId.length > 0 && survivorCustomerId.length > 0;
  const requiresAttestation = preview?.verification.requiresOwnerAttestation === true;
  const canApply =
    preview?.outcome === "allowed" &&
    confirmationPhrase === customerIdentityManagementService.mergeAccountsConfirmationPhrase &&
    (!requiresAttestation ||
      (ownerAttestedSameCustomer && ownerVerificationReason.trim().length >= 8));

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay modal-overlay-blur">
      <Modal
        aria-labelledby="merge-accounts-title"
        className="modal-panel-lg merge-accounts-wizard-modal"
        role="dialog"
      >
        <ModalHeader>
          <div>
            <p className="eyebrow">Customer identity</p>
            <h2 id="merge-accounts-title">Merge Accounts</h2>
            <p>
              Combine two customer accounts into one. The account to keep remains active with all
              operational history consolidated. The account to merge becomes a merge tombstone and
              cannot sign in.
            </p>
          </div>
          <button
            aria-label="Close"
            className="icon-button icon-button-md icon-button-ghost"
            disabled={isSubmitting}
            onClick={handleClose}
            type="button"
          >
            <X aria-hidden="true" size={18} strokeWidth={2.2} />
          </button>
        </ModalHeader>

        <ModalBody>
          {error && step !== "result" ? (
            <p className="auth-message auth-message-error" role="alert">
              {error}
            </p>
          ) : null}

          {step === "select" ? (
            <div className="merge-accounts-step">
              <p>Select the two customer accounts for this merge.</p>
              <Select
                label="Account A"
                name="mergeAccountsAccountA"
                onChange={(event) => setAccountAId(event.target.value)}
                options={customerSelectOptions}
                searchable
                searchPlaceholder="Search name, username, email…"
                value={accountAId}
              />
              <Select
                label="Account B"
                name="mergeAccountsAccountB"
                onChange={(event) => setAccountBId(event.target.value)}
                options={customerSelectOptions}
                searchable
                searchPlaceholder="Search name, username, email…"
                value={accountBId}
              />
            </div>
          ) : null}

          {step === "roles" ? (
            <div className="merge-accounts-step">
              <p>Choose which account to merge into the other.</p>
              <div className="merge-accounts-role-grid">
                <RoleAssignmentCard
                  accountLabel={resolveAccountLabel(sourceCustomerId, accountAId, accountBId)}
                  customer={sourceCustomer}
                  supportingText="This account will be merged and marked as merged into the survivor."
                  title="Account to Merge"
                  tone="merge"
                />
                <RoleAssignmentCard
                  accountLabel={resolveAccountLabel(survivorCustomerId, accountAId, accountBId)}
                  customer={survivorCustomer}
                  supportingText="This account stays active and receives consolidated history."
                  title="Account to Keep"
                  tone="keep"
                />
              </div>
              <div className="merge-accounts-role-actions">
                <Button
                  className="merge-accounts-direction-button"
                  onClick={() => {
                    setSourceCustomerId(accountAId);
                    setSurvivorCustomerId(accountBId);
                  }}
                  type="button"
                  variant={sourceCustomerId === accountAId ? "primary" : "secondary"}
                >
                  <span className="merge-accounts-direction-label">
                    Merge {accountAUsername} into Account B
                  </span>
                  <span className="merge-accounts-direction-note">
                    Account B remains the active login.
                  </span>
                </Button>
                <Button
                  className="merge-accounts-direction-button"
                  onClick={() => {
                    setSourceCustomerId(accountBId);
                    setSurvivorCustomerId(accountAId);
                  }}
                  type="button"
                  variant={sourceCustomerId === accountBId ? "primary" : "secondary"}
                >
                  <span className="merge-accounts-direction-label">
                    Merge {accountBUsername} into Account A
                  </span>
                  <span className="merge-accounts-direction-note">
                    Account A remains the active login.
                  </span>
                </Button>
              </div>
              <div className="merge-accounts-username-toggle">
                <Toggle
                  checked={useSourceUsername}
                  disabled={!sourceCustomer}
                  label="Use username from Account to Merge"
                  name="merge-use-source-username"
                  onChange={setUseSourceUsername}
                />
              </div>
            </div>
          ) : null}

          {step === "preview" && preview ? (
            <div className="merge-accounts-step merge-accounts-preview-step">
              <div className="merge-accounts-identity-grid">
                <IdentitySummaryCard
                  continuableStateLabel={continuableStateForAccount(preview.continuablePolicy, "source")}
                  summary={preview.source}
                  title="Account to Merge"
                  tone="merge"
                />
                <IdentitySummaryCard
                  continuableStateLabel={continuableStateForAccount(preview.continuablePolicy, "survivor")}
                  summary={preview.survivor}
                  title="Account to Keep"
                  tone="keep"
                />
              </div>

              <div className="merge-accounts-preview-meta">
                <p>
                  <strong>Planned survivor username:</strong>{" "}
                  {formatCustomerUsernameForDisplay(preview.plannedSurvivorUsername)}
                </p>
                <p>
                  <strong>Recommendation:</strong> {preview.recommendation}
                </p>
                <p>
                  <strong>Verification:</strong> {preview.verification.status}
                  {preview.verification.mode ? ` (${preview.verification.mode})` : ""}
                </p>
                {preview.verification.requiresOwnerAttestation ? (
                  <p className="merge-accounts-verification-note">
                    Verified email match was not found. You will need to attest that both accounts
                    belong to the same customer before merging.
                  </p>
                ) : null}
              </div>

              {preview.blockers.length > 0 ? (
                <ul className="merge-accounts-blockers">
                  {preview.blockers.map((blocker) => (
                    <li key={blocker.code}>{blocker.message}</li>
                  ))}
                </ul>
              ) : null}

              <ul className="merge-accounts-summary-lines merge-accounts-summary-lines-scroll">
                {preview.resolutionSummaryLines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {step === "confirm" && preview ? (
            <div className="merge-accounts-step merge-accounts-confirm-step">
              <div className="merge-accounts-confirm-recap">
                <div className="merge-accounts-confirm-recap-row">
                  <span className="merge-accounts-confirm-recap-label">Account to Merge</span>
                  <span className="merge-accounts-confirm-recap-value">
                    {formatCustomerUsernameForDisplay(preview.source.username, {
                      isDeleted: preview.source.isDeleted,
                    })}
                  </span>
                </div>
                <div className="merge-accounts-confirm-recap-row">
                  <span className="merge-accounts-confirm-recap-label">Account to Keep</span>
                  <span className="merge-accounts-confirm-recap-value">
                    {formatCustomerUsernameForDisplay(preview.survivor.username, {
                      isDeleted: preview.survivor.isDeleted,
                    })}
                  </span>
                </div>
                <div className="merge-accounts-confirm-recap-row">
                  <span className="merge-accounts-confirm-recap-label">Username after merge</span>
                  <span className="merge-accounts-confirm-recap-value">
                    {formatCustomerUsernameForDisplay(preview.plannedSurvivorUsername)}
                  </span>
                </div>
              </div>

              <div className="merge-accounts-confirm-summary">
                <p className="merge-accounts-confirm-summary-title">Confirm merge</p>
                <ul className="merge-accounts-summary-lines">
                  <li>
                    Merging{" "}
                    {formatCustomerUsernameForDisplay(preview.source.username, {
                      isDeleted: preview.source.isDeleted,
                    })}{" "}
                    into{" "}
                    {formatCustomerUsernameForDisplay(preview.survivor.username, {
                      isDeleted: preview.survivor.isDeleted,
                    })}
                    .
                  </li>
                  <li>The account to keep remains active.</li>
                  <li>Operational history moves to the survivor.</li>
                  <li>The account to merge becomes a merge tombstone.</li>
                </ul>
              </div>

              {requiresAttestation ? (
                <div className="merge-accounts-attestation">
                  <div className="merge-accounts-username-toggle">
                    <Toggle
                      checked={ownerAttestedSameCustomer}
                      label="I independently verified both accounts belong to the same customer."
                      name="merge-owner-attestation"
                      onChange={setOwnerAttestedSameCustomer}
                    />
                  </div>
                  <label className="form-field" htmlFor="merge-owner-verification-reason">
                    <span className="form-label">Verification reason (min 8 characters)</span>
                    <textarea
                      disabled={!ownerAttestedSameCustomer || isSubmitting}
                      id="merge-owner-verification-reason"
                      onChange={(event) => setOwnerVerificationReason(event.target.value)}
                      placeholder="Describe how you verified both accounts belong to the same customer."
                      rows={3}
                      value={ownerVerificationReason}
                    />
                  </label>
                </div>
              ) : null}

              <div className="merge-accounts-confirm-phrase">
                <label className="form-field" htmlFor="merge-accounts-confirm-input">
                  <span className="form-label merge-accounts-confirm-phrase-label">
                    <span>
                      Type{" "}
                      <code>{customerIdentityManagementService.mergeAccountsConfirmationPhrase}</code>{" "}
                      to confirm
                    </span>
                    <button
                      aria-label="Copy confirmation phrase"
                      className="icon-button icon-button-sm icon-button-ghost"
                      disabled={isSubmitting}
                      onClick={(event) => {
                        event.preventDefault();
                        void navigator.clipboard.writeText(
                          customerIdentityManagementService.mergeAccountsConfirmationPhrase,
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
                    id="merge-accounts-confirm-input"
                    onChange={(event) => setConfirmationPhrase(event.target.value)}
                    spellCheck={false}
                    type="text"
                    value={confirmationPhrase}
                  />
                </label>
              </div>
            </div>
          ) : null}

          {step === "result" ? (
            <div className="merge-accounts-step">
              <p
                className={
                  isSuccessfulMergeOutcome(mergeOutcome)
                    ? "auth-message auth-message-success"
                    : mergeOutcome === "in_progress"
                      ? "auth-message auth-message-warning"
                      : "auth-message auth-message-error"
                }
                role="status"
              >
                {mergeStatusMessage ?? "Processing account merge…"}
              </p>
              {isSuccessfulMergeOutcome(mergeOutcome) && preview ? (
                <div className="merge-accounts-result-summary">
                  <p className="merge-accounts-result-summary-title">What happened</p>
                  <ul className="merge-accounts-summary-lines">
                    <li>
                      Merged{" "}
                      {formatCustomerUsernameForDisplay(preview.source.username, {
                        isDeleted: preview.source.isDeleted,
                      })}{" "}
                      into{" "}
                      {formatCustomerUsernameForDisplay(preview.survivor.username, {
                        isDeleted: preview.survivor.isDeleted,
                      })}
                      .
                    </li>
                    <li>
                      Survivor username:{" "}
                      {formatCustomerUsernameForDisplay(preview.plannedSurvivorUsername)}.
                    </li>
                    <li>The source account is now in the Merged tab.</li>
                    <li>Operational history was consolidated onto the survivor.</li>
                    {mergeJobId ? (
                      <li>
                        Merge job <code>{mergeJobId}</code>.
                      </li>
                    ) : null}
                  </ul>
                </div>
              ) : null}
              {mergeStatusStage && mergeOutcome === "in_progress" ? (
                <p className="merge-accounts-progress-stage">
                  Current stage: <strong>{mergeStatusStage}</strong>
                </p>
              ) : null}
              {mergeJobId && mergeOutcome === "in_progress" ? (
                <p className="merge-accounts-progress-note">
                  Merge job <code>{mergeJobId}</code> is running. You can close this dialog and
                  check the customer directory when it completes.
                </p>
              ) : null}
            </div>
          ) : null}
        </ModalBody>

        <ModalFooter>
          <Button onClick={handleClose} type="button" variant="secondary">
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
                {isSubmitting ? "Starting merge…" : "Merge accounts"}
              </Button>
            </>
          ) : null}
        </ModalFooter>
      </Modal>
    </div>
  );
}