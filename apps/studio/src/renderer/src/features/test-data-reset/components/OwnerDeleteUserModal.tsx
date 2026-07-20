import { Check, Copy, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { Customer } from "@fresh-prints/shared/types/customer/customer.types";
import {
  OWNER_DELETE_USER_CONFIRMATION_PHRASE,
  type OwnerDeleteUserResponse,
  type OwnerDeleteUserSubjectKind,
} from "@fresh-prints/shared/types/account/portalAccountSettings.types";

import { Button } from "../../../shared/components/Button";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";
import { useCustomersDirectory } from "../../customers/hooks/useCustomersDirectory";
import { useTeamUsers } from "../../users/hooks/useTeamUsers";
import type { User } from "../../users/types/user.types";
import { filterCustomers } from "../../users/utils/customerDirectorySearch";
import { filterTeamUsers } from "../../users/utils/teamUserSearch";
import { ownerDeleteUser } from "../services/ownerDeleteUserService";

type DirectoryTab = "staff" | "customers";

interface OwnerDeleteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeleted?: (result: OwnerDeleteUserResponse) => void;
  currentUserId?: string;
}

export function OwnerDeleteUserModal({
  isOpen,
  onClose,
  onDeleted,
  currentUserId,
}: OwnerDeleteUserModalProps) {
  const { users, isLoading: isStaffLoading, error: staffError, reloadUsers } = useTeamUsers();
  const {
    customers,
    isLoading: isCustomersLoading,
    error: customersError,
    reloadCustomers,
  } = useCustomersDirectory();

  const [directoryTab, setDirectoryTab] = useState<DirectoryTab>("customers");
  const [staffSearchQuery, setStaffSearchQuery] = useState("");
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [selectedKind, setSelectedKind] = useState<OwnerDeleteUserSubjectKind | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedLabel, setSelectedLabel] = useState<string>("");
  const [confirmationPhrase, setConfirmationPhrase] = useState("");
  const [phraseCopied, setPhraseCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setDirectoryTab("customers");
    setStaffSearchQuery("");
    setCustomerSearchQuery("");
    setSelectedKind(null);
    setSelectedId(null);
    setSelectedLabel("");
    setConfirmationPhrase("");
    setPhraseCopied(false);
    setError(null);
    void Promise.all([reloadUsers(), reloadCustomers()]);
  }, [isOpen, reloadCustomers, reloadUsers]);

  const copyConfirmationPhrase = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(OWNER_DELETE_USER_CONFIRMATION_PHRASE);
      setPhraseCopied(true);
      window.setTimeout(() => setPhraseCopied(false), 1500);
    } catch {
      setPhraseCopied(false);
    }
  }, []);

  const filteredUsers = useMemo(
    () => filterTeamUsers(users, staffSearchQuery),
    [staffSearchQuery, users],
  );
  const filteredCustomers = useMemo(
    () => filterCustomers(customers, customerSearchQuery),
    [customerSearchQuery, customers],
  );

  const phraseMatches = confirmationPhrase.trim() === OWNER_DELETE_USER_CONFIRMATION_PHRASE;
  const canSubmit = Boolean(selectedKind && selectedId && phraseMatches && !isSubmitting);

  const selectStaff = useCallback((user: User) => {
    setSelectedKind("staff");
    setSelectedId(user.id);
    setSelectedLabel(`${user.displayName} · ${user.email} · ${user.role}`);
    setError(null);
  }, []);

  const selectCustomer = useCallback((customer: Customer) => {
    setSelectedKind("customer");
    setSelectedId(customer.id);
    const username = customer.username ? `@${customer.username}` : "no username";
    setSelectedLabel(
      `${customer.displayName} · ${customer.email ?? "no email"} · ${username}${
        customer.isGuest ? " · guest" : ""
      }`,
    );
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    if (isSubmitting) {
      return;
    }
    onClose();
  }, [isSubmitting, onClose]);

  const handleDelete = useCallback(async () => {
    if (!selectedKind || !selectedId || !phraseMatches) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const result = await ownerDeleteUser({
        kind: selectedKind,
        subjectId: selectedId,
        confirmationPhrase: OWNER_DELETE_USER_CONFIRMATION_PHRASE,
      });
      onDeleted?.(result);
      onClose();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete user.");
    } finally {
      setIsSubmitting(false);
    }
  }, [onClose, onDeleted, phraseMatches, selectedId, selectedKind]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay modal-overlay-blur">
      <Modal
        aria-labelledby="owner-delete-user-title"
        className="modal-panel modal-panel-lg owner-delete-user-modal"
        role="dialog"
      >
        <ModalHeader>
          <h2 id="owner-delete-user-title">Delete individual user</h2>
        </ModalHeader>
        <ModalBody className="owner-delete-user-body">
          <p className="test-data-reset-copy owner-delete-user-intro">
            Permanently deletes one Auth account (when present), username reservation, customer/staff
            profile, and associated operational records for that identity. Not a bulk wipe.
          </p>

          <div className="user-directory-tab-bar" role="tablist" aria-label="Delete user directories">
            <button
              aria-selected={directoryTab === "staff"}
              className={`user-directory-tab-button${directoryTab === "staff" ? " is-active" : ""}`}
              onClick={() => setDirectoryTab("staff")}
              role="tab"
              type="button"
            >
              Staff ({users.length})
            </button>
            <button
              aria-selected={directoryTab === "customers"}
              className={`user-directory-tab-button${directoryTab === "customers" ? " is-active" : ""}`}
              onClick={() => setDirectoryTab("customers")}
              role="tab"
              type="button"
            >
              Customers ({customers.length})
            </button>
          </div>

          {directoryTab === "staff" ? (
            <div className="user-directory-tab-panel owner-delete-user-directory" role="tabpanel">
              <label className="user-directory-search">
                <span className="visually-hidden">Search staff</span>
                <Search aria-hidden className="user-directory-search-icon" size={14} strokeWidth={2} />
                <input
                  className="user-directory-search-input"
                  onChange={(event) => setStaffSearchQuery(event.target.value)}
                  placeholder="Search name, email, role…"
                  type="search"
                  value={staffSearchQuery}
                />
              </label>
              {staffError ? (
                <p className="auth-message auth-message-error" role="alert">
                  {staffError}
                </p>
              ) : null}
              {isStaffLoading ? <p className="test-data-reset-copy">Loading staff…</p> : null}
              <ul className="owner-delete-user-list">
                {filteredUsers.map((user) => {
                  const isSelf = user.id === currentUserId;
                  const isSelected = selectedKind === "staff" && selectedId === user.id;
                  return (
                    <li key={user.id}>
                      <button
                        className={`owner-delete-user-row${isSelected ? " is-selected" : ""}`}
                        disabled={isSelf || isSubmitting}
                        onClick={() => selectStaff(user)}
                        type="button"
                      >
                        <span className="owner-delete-user-row-title">{user.displayName}</span>
                        <span className="owner-delete-user-row-meta">
                          {user.email} · {user.role}
                          {isSelf ? " · (you)" : ""}
                          {!user.isActive ? " · inactive" : ""}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <div className="user-directory-tab-panel owner-delete-user-directory" role="tabpanel">
              <label className="user-directory-search">
                <span className="visually-hidden">Search customers</span>
                <Search aria-hidden className="user-directory-search-icon" size={14} strokeWidth={2} />
                <input
                  className="user-directory-search-input"
                  onChange={(event) => setCustomerSearchQuery(event.target.value)}
                  placeholder="Search name, username, email…"
                  type="search"
                  value={customerSearchQuery}
                />
              </label>
              {customersError ? (
                <p className="auth-message auth-message-error" role="alert">
                  {customersError}
                </p>
              ) : null}
              {isCustomersLoading ? (
                <p className="test-data-reset-copy">Loading customers…</p>
              ) : null}
              <ul className="owner-delete-user-list">
                {filteredCustomers.map((customer) => {
                  const isSelf = Boolean(currentUserId && customer.userId === currentUserId);
                  const isSelected = selectedKind === "customer" && selectedId === customer.id;
                  return (
                    <li key={customer.id}>
                      <button
                        className={`owner-delete-user-row${isSelected ? " is-selected" : ""}`}
                        disabled={isSelf || isSubmitting}
                        onClick={() => selectCustomer(customer)}
                        type="button"
                      >
                        <span className="owner-delete-user-row-title">{customer.displayName}</span>
                        <span className="owner-delete-user-row-meta">
                          {customer.email ?? "no email"}
                          {customer.username ? ` · @${customer.username}` : ""}
                          {customer.isGuest ? " · guest" : ""}
                          {isSelf ? " · (you)" : ""}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <div className="owner-delete-user-confirm">
            <p className="test-data-reset-copy">
              Selected: <strong>{selectedLabel || "none"}</strong>
            </p>
            <label className="form-field" htmlFor="owner-delete-user-confirm-input">
              <span className="form-label test-data-reset-confirm-phrase-label">
                <span>
                  Type <code>{OWNER_DELETE_USER_CONFIRMATION_PHRASE}</code> to confirm
                </span>
                <button
                  aria-label="Copy confirmation phrase"
                  className="icon-button icon-button-sm icon-button-ghost"
                  disabled={isSubmitting}
                  onClick={(event) => {
                    event.preventDefault();
                    void copyConfirmationPhrase();
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
                disabled={!selectedId || isSubmitting}
                id="owner-delete-user-confirm-input"
                onChange={(event) => setConfirmationPhrase(event.target.value)}
                spellCheck={false}
                type="text"
                value={confirmationPhrase}
              />
            </label>
          </div>

          {error ? (
            <p className="auth-message auth-message-error" role="alert">
              {error}
            </p>
          ) : null}
        </ModalBody>
        <ModalFooter>
          <Button disabled={isSubmitting} onClick={handleClose} type="button" variant="secondary">
            Cancel
          </Button>
          <Button
            disabled={!canSubmit}
            onClick={() => void handleDelete()}
            type="button"
            variant="danger"
          >
            {isSubmitting ? "Deleting…" : "Delete user permanently"}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
