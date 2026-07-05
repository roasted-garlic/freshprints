import { X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import { AutoResizeTextarea } from "../../../shared/components/AutoResizeTextarea";
import { Button } from "../../../shared/components/Button";
import { ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";
import { TextInput } from "../../../shared/components/TextInput";
import { useUpdateCustomerRecord } from "../../customers/hooks/useUpdateCustomerRecord";
import type { Customer } from "../../../../../../shared/types/customer/customer.types";
import { UserManagementModal } from "./UserManagementModal";

interface EditCustomerModalProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: (message: string) => Promise<void> | void;
}

export function EditCustomerModal({
  customer,
  isOpen,
  onClose,
  onUpdated,
}: EditCustomerModalProps) {
  const { clearResult, error, isSubmitting, updateCustomerRecord } = useUpdateCustomerRecord();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!isOpen || !customer) {
      return;
    }

    clearResult();
    setDisplayName(customer.displayName);
    setUsername(customer.username ?? "");
    setEmail(customer.email ?? "");
    setNotes(customer.notes ?? "");
  }, [clearResult, customer, isOpen]);

  if (!isOpen || !customer) {
    return null;
  }

  const normalizedName = displayName.trim();
  const normalizedUsername = username.trim().toLowerCase();
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedNotes = notes.trim();
  const hasChanges =
    normalizedName !== customer.displayName ||
    normalizedUsername !== (customer.username ?? "") ||
    normalizedEmail !== (customer.email ?? "").trim().toLowerCase() ||
    normalizedNotes !== (customer.notes ?? "").trim();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!customer) {
      return;
    }

    if (!hasChanges) {
      onClose();
      return;
    }

    try {
      const updatedCustomer = await updateCustomerRecord(customer.id, {
        displayName,
        username,
        email: email || undefined,
        notes: notes || undefined,
      });
      onClose();
      await onUpdated(`Customer "${updatedCustomer.displayName}" was updated.`);
    } catch {
      // Error state is handled in the hook.
    }
  }

  return (
    <UserManagementModal ariaLabelledBy="edit-customer-title" isOpen={isOpen} onClose={onClose}>
      <form className="user-management-form" onSubmit={handleSubmit}>
        <ModalHeader>
          <div>
            <p className="eyebrow">Customers</p>
            <h2 id="edit-customer-title">Edit customer</h2>
            <p>Update customer details for Print Requests. This does not create a Studio login or Portal account.</p>
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

        <ModalBody>
          <TextInput
            label="Customer name"
            name="displayName"
            onChange={(event) => setDisplayName(event.target.value)}
            required
            value={displayName}
          />

          <TextInput
            autoCapitalize="none"
            autoComplete="off"
            label="Customer username"
            name="username"
            onChange={(event) => setUsername(event.target.value)}
            pattern="[a-z0-9][a-z0-9_-]{1,30}[a-z0-9]"
            required
            value={username}
          />

          <TextInput
            autoComplete="off"
            label="Email"
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            value={email}
          />

          <AutoResizeTextarea
            label="Customer notes"
            name="notes"
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Optional notes for staff reference"
            value={notes}
          />

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
          <Button disabled={isSubmitting || !hasChanges} type="submit">
            {isSubmitting ? "Saving..." : "Save changes"}
          </Button>
        </ModalFooter>
      </form>
    </UserManagementModal>
  );
}
