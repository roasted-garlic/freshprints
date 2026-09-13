import { X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import type { Customer } from "@fresh-prints/shared/types/customer/customer.types";
import { formatCustomerUsernameForDisplay } from "@fresh-prints/shared/utils/formatCustomerUsernameForDisplay";

import { Button } from "../../../shared/components/Button";
import { ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";
import { TextInput } from "../../../shared/components/TextInput";
import {
  buildCustomerUpdateSuccessMessage,
  useUpdateCustomerRecord,
} from "../../customers/hooks/useUpdateCustomerRecord";
import { UserManagementModal } from "./UserManagementModal";

interface ChangeUsernameModalProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: (message: string) => Promise<void> | void;
}

export function ChangeUsernameModal({
  customer,
  isOpen,
  onClose,
  onUpdated,
}: ChangeUsernameModalProps) {
  const { clearResult, error, isSubmitting, updateCustomerRecord } = useUpdateCustomerRecord();
  const [username, setUsername] = useState("");

  useEffect(() => {
    if (!isOpen || !customer) {
      return;
    }

    clearResult();
    setUsername(customer.username ?? "");
  }, [clearResult, customer, isOpen]);

  if (!isOpen || !customer) {
    return null;
  }

  const normalizedUsername = username.trim().toLowerCase();
  const currentUsername = (customer.username ?? "").trim().toLowerCase();
  const usernameWillChange = normalizedUsername !== currentUsername;
  const usernameLabel = formatCustomerUsernameForDisplay(customer.username, {
    isDeleted: customer.isDeleted === true,
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const subject = customer;
    if (!subject) {
      return;
    }

    if (!usernameWillChange) {
      onClose();
      return;
    }

    try {
      const { updateResult, updatedCustomer } = await updateCustomerRecord(subject.id, {
        displayName: subject.displayName,
        username,
        email: subject.email,
        notes: subject.notes,
      });
      onClose();
      await onUpdated(buildCustomerUpdateSuccessMessage(updateResult, updatedCustomer.displayName));
    } catch {
      // Hook surfaces error state.
    }
  }

  return (
    <UserManagementModal
      ariaLabelledBy="change-username-title"
      isOpen={isOpen}
      onClose={onClose}
      size="md-lg"
    >
      <form className="user-management-form" onSubmit={handleSubmit}>
        <ModalHeader>
          <div>
            <p className="eyebrow">Customer identity</p>
            <h2 id="change-username-title">Change username</h2>
            <p>
              Current username: <strong>{usernameLabel}</strong>. Print request names such as{" "}
              {currentUsername || "username"}-CR001 stay unchanged; identity snapshots propagate to
              historical records.
            </p>
          </div>

          <button
            aria-label="Close change username"
            className="icon-button icon-button-md icon-button-ghost"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={18} strokeWidth={2.2} />
          </button>
        </ModalHeader>

        <ModalBody>
          <TextInput
            autoCapitalize="none"
            autoComplete="off"
            label="New username"
            name="username"
            onChange={(event) => setUsername(event.target.value)}
            pattern="[a-z0-9][a-z0-9_-]{1,30}[a-z0-9]"
            required
            value={username}
          />

          {usernameWillChange ? (
            <p className="auth-message auth-message-warning" role="status">
              @{normalizedUsername} will replace @{currentUsername} on current identity snapshots.
            </p>
          ) : null}

          {error ? (
            <p className="auth-message auth-message-error" role="alert">
              {error}
            </p>
          ) : null}
        </ModalBody>

        <ModalFooter>
          <Button disabled={isSubmitting} onClick={onClose} type="button" variant="secondary">
            Cancel
          </Button>
          <Button disabled={isSubmitting || !usernameWillChange} type="submit">
            {isSubmitting ? "Saving…" : "Save username"}
          </Button>
        </ModalFooter>
      </form>
    </UserManagementModal>
  );
}
