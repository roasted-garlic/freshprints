import { X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import { AutoResizeTextarea } from "../../../shared/components/AutoResizeTextarea";
import { Button } from "../../../shared/components/Button";
import { ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";
import { TextInput } from "../../../shared/components/TextInput";
import {
  buildCustomerUpdateSuccessMessage,
  useUpdateCustomerRecord,
} from "../../customers/hooks/useUpdateCustomerRecord";
import type { Customer } from "@fresh-prints/shared/types/customer/customer.types";
import { formatCustomerUsernameForDisplay } from "@fresh-prints/shared/utils/formatCustomerUsernameForDisplay";
import { customerIdentityManagementService } from "../services/customerIdentityManagementService";
import { isReversibleDisabledCustomer } from "../utils/customerDirectoryVisibility";
import { CustomerQuotaOverrideSection } from "./CustomerQuotaOverrideSection";
import { UserManagementModal } from "./UserManagementModal";

type EditCustomerTab = "details" | "quota";

interface EditCustomerModalProps {
  customer: Customer | null;
  isOpen: boolean;
  canChangeUsername?: boolean;
  canReenableCustomer?: boolean;
  onChangeUsername?: (customer: Customer) => void;
  onClose: () => void;
  onCustomerPatched?: (customer: Customer) => void;
  onUpdated: (message: string) => Promise<void> | void;
}

export function EditCustomerModal({
  customer,
  isOpen,
  canChangeUsername = false,
  canReenableCustomer = false,
  onChangeUsername,
  onClose,
  onCustomerPatched,
  onUpdated,
}: EditCustomerModalProps) {
  const { clearResult, error, isSubmitting, updateCustomerRecord } = useUpdateCustomerRecord();
  const [activeTab, setActiveTab] = useState<EditCustomerTab>("details");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [reenableError, setReenableError] = useState<string | null>(null);
  const [isReenabling, setIsReenabling] = useState(false);

  useEffect(() => {
    if (!isOpen || !customer) {
      return;
    }

    clearResult();
    setActiveTab("details");
    setDisplayName(customer.displayName);
    setEmail(customer.email ?? "");
    setNotes(customer.notes ?? "");
    setReenableError(null);
  }, [clearResult, customer, isOpen]);

  if (!isOpen || !customer) {
    return null;
  }

  const hasPortalAccess = Boolean(customer.userId);
  const normalizedName = displayName.trim();
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedNotes = notes.trim();
  const hasChanges =
    normalizedName !== customer.displayName ||
    normalizedEmail !== (customer.email ?? "").trim().toLowerCase() ||
    normalizedNotes !== (customer.notes ?? "").trim();
  const isReversiblyDisabled = isReversibleDisabledCustomer(customer);
  const isDeleted = customer.isDeleted === true;

  const usernameLabel = formatCustomerUsernameForDisplay(customer.username, {
    isDeleted,
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!customer || activeTab !== "details") {
      return;
    }

    if (!hasChanges) {
      onClose();
      return;
    }

    try {
      const { updateResult, updatedCustomer } = await updateCustomerRecord(customer.id, {
        displayName,
        username: customer.username ?? "",
        email: email || undefined,
        notes: notes || undefined,
      });
      onClose();
      await onUpdated(buildCustomerUpdateSuccessMessage(updateResult, updatedCustomer.displayName));
    } catch {
      // Error state is handled in the hook.
    }
  }

  async function handleReenable() {
    if (!customer) {
      return;
    }

    setIsReenabling(true);
    setReenableError(null);
    try {
      const result = await customerIdentityManagementService.restore(customer.id);
      onClose();
      await onUpdated(result.message);
    } catch (reenableFailure: unknown) {
      setReenableError(
        reenableFailure instanceof Error
          ? reenableFailure.message
          : "Unable to re-enable the customer account.",
      );
    } finally {
      setIsReenabling(false);
    }
  }

  return (
    <UserManagementModal
      ariaLabelledBy="edit-customer-title"
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
    >
      <form className="user-management-form user-management-form-condensed" onSubmit={handleSubmit}>
        <ModalHeader className="user-management-modal-header-condensed">
          <div>
            <p className="eyebrow">Customers</p>
            <h2 id="edit-customer-title">Edit customer</h2>
            <p className="user-management-modal-lead-condensed">
              {activeTab === "quota"
                ? "Temporary Portal print limits for this customer only."
                : hasPortalAccess
                  ? "Updates sync to Portal. Email changes update Firebase Authentication login."
                  : "Update customer details for Print Requests."}
            </p>
          </div>

          <button
            aria-label="Close edit customer"
            className="icon-button icon-button-md icon-button-ghost"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={18} strokeWidth={2.2} />
          </button>
        </ModalHeader>

        <ModalBody className="user-management-modal-body-condensed">
          <div className="user-directory-tab-bar" role="tablist" aria-label="Edit customer sections">
            <button
              aria-selected={activeTab === "details"}
              className={`user-directory-tab-button${activeTab === "details" ? " is-active" : ""}`}
              id="edit-customer-tab-details"
              onClick={() => setActiveTab("details")}
              role="tab"
              type="button"
            >
              Details
            </button>
            <button
              aria-selected={activeTab === "quota"}
              className={`user-directory-tab-button${activeTab === "quota" ? " is-active" : ""}`}
              id="edit-customer-tab-quota"
              onClick={() => setActiveTab("quota")}
              role="tab"
              type="button"
            >
              Quota Override
            </button>
          </div>

          {activeTab === "details" ? (
            <div
              aria-labelledby="edit-customer-tab-details"
              className="edit-customer-tab-panel"
              id="edit-customer-panel-details"
              role="tabpanel"
            >
              {isReversiblyDisabled ? (
                <div className="customer-identity-status-banner customer-identity-status-banner-disabled" role="status">
                  <div>
                    <strong>Disabled</strong>
                    <p>This account cannot sign in or create new activity until it is re-enabled.</p>
                  </div>
                  {canReenableCustomer ? (
                    <Button
                      disabled={isReenabling || isSubmitting}
                      onClick={() => {
                        void handleReenable();
                      }}
                      type="button"
                      variant="success"
                    >
                      {isReenabling ? "Re-enabling…" : "Re-enable account"}
                    </Button>
                  ) : null}
                </div>
              ) : null}

              {isDeleted ? (
                <div className="customer-identity-status-banner customer-identity-status-banner-deleted" role="status">
                  <strong>Closed (tombstone)</strong>
                  <p>Permanent account closure — not reversible through Re-enable.</p>
                </div>
              ) : null}

              <section aria-labelledby="edit-customer-identity-title" className="customer-identity-panel">
                <div className="customer-identity-panel-header">
                  <div>
                    <h3 id="edit-customer-identity-title">Username</h3>
                    <p className="customer-identity-username-value">{usernameLabel}</p>
                  </div>
                  {canChangeUsername && onChangeUsername ? (
                    <Button
                      disabled={isReversiblyDisabled || isDeleted}
                      onClick={() => onChangeUsername(customer)}
                      type="button"
                      variant="secondary"
                    >
                      Change username
                    </Button>
                  ) : null}
                </div>
              </section>

              <div className="user-management-form-grid">
                <TextInput
                  label="Customer name"
                  name="displayName"
                  onChange={(event) => setDisplayName(event.target.value)}
                  required
                  value={displayName}
                />

                <TextInput
                  autoComplete="off"
                  label="Email"
                  name="email"
                  onChange={(event) => setEmail(event.target.value)}
                  required={hasPortalAccess}
                  type="email"
                  value={email}
                />
              </div>

              <AutoResizeTextarea
                label="Customer notes"
                name="notes"
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Optional notes for staff reference"
                value={notes}
              />

              {reenableError ? (
                <p className="auth-message auth-message-error" role="alert">
                  {reenableError}
                </p>
              ) : null}

              {error ? (
                <p className="auth-message auth-message-error" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
          ) : (
            <div
              aria-labelledby="edit-customer-tab-quota"
              className="edit-customer-tab-panel"
              id="edit-customer-panel-quota"
              role="tabpanel"
            >
              <CustomerQuotaOverrideSection
                customer={customer}
                onCustomerPatched={onCustomerPatched}
              />
            </div>
          )}
        </ModalBody>

        {activeTab === "details" ? (
          <ModalFooter className="user-management-modal-footer-condensed">
            <Button disabled={isSubmitting || isReenabling} onClick={onClose} type="button" variant="secondary">
              Cancel
            </Button>
            <Button disabled={isSubmitting || isReenabling || !hasChanges} type="submit">
              {isSubmitting ? "Saving..." : "Save changes"}
            </Button>
          </ModalFooter>
        ) : (
          <ModalFooter className="user-management-modal-footer-condensed">
            <Button onClick={onClose} type="button" variant="secondary">
              Close
            </Button>
          </ModalFooter>
        )}
      </form>
    </UserManagementModal>
  );
}
