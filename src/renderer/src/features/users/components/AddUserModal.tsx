import { X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import { AutoResizeTextarea } from "../../../shared/components/AutoResizeTextarea";
import { Button } from "../../../shared/components/Button";
import { ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";
import { Select } from "../../../shared/components/Select";
import { TextInput } from "../../../shared/components/TextInput";
import { useAuth } from "../../auth/hooks/useAuth";
import { useCreateCustomerRecord } from "../../customers/hooks/useCreateCustomerRecord";
import { customerService } from "../../customers/services/customerService";
import { permissionService } from "../../permissions/services/permissionService";
import { useCreateTeamUser } from "../hooks/useCreateTeamUser";
import type { TeamUserRole } from "../types/user.types";
import { UserManagementModal } from "./UserManagementModal";

type CreateTarget = "staff" | "customer";

export interface AddUserModalCreatedPayload {
  kind: CreateTarget;
  message?: string;
}

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (payload: AddUserModalCreatedPayload) => Promise<void> | void;
}

function formatRoleLabel(role: TeamUserRole): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export function AddUserModal({ isOpen, onClose, onCreated }: AddUserModalProps) {
  const { user } = useAuth();
  const { clearResult, createTeamUser, error, isSubmitting, result } = useCreateTeamUser();
  const {
    clearResult: clearCustomerResult,
    createCustomerRecord,
    error: customerError,
    isSubmitting: isCreatingCustomer,
  } = useCreateCustomerRecord();
  const [createTarget, setCreateTarget] = useState<CreateTarget>("staff");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");

  const roleOptions = useMemo(() => {
    if (!user) {
      return [];
    }

    return permissionService.getCreatableTeamUserRoles(user).map((role) => ({
      label: formatRoleLabel(role),
      value: role,
    }));
  }, [user]);

  const [role, setRole] = useState<TeamUserRole>(roleOptions[0]?.value ?? "helper");

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    clearResult();
    clearCustomerResult();
    setCreateTarget("staff");
    setDisplayName("");
    setEmail("");
    setCustomerNotes("");
    setRole(roleOptions[0]?.value ?? "helper");
  }, [clearCustomerResult, clearResult, isOpen, roleOptions]);

  if (!user || !permissionService.canManageUsers(user)) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearResult();
    clearCustomerResult();

    if (!user) {
      return;
    }

    try {
      if (createTarget === "staff") {
        await customerService.assertEmailIsUniqueForDirectory(user, email);
        await createTeamUser({
          email,
          displayName,
          role,
        });
        onClose();
        await onCreated({ kind: "staff" });
      } else {
        const createdCustomer = await createCustomerRecord({
          displayName,
          email: email || undefined,
          notes: customerNotes || undefined,
        });
        onClose();
        await onCreated({
          kind: "customer",
          message: `Customer "${createdCustomer.displayName}" was created. No Studio login or Portal account was created.`,
        });
      }
    } catch {
      // Error state is handled in the hook.
    }
  }

  return (
    <UserManagementModal ariaLabelledBy="add-user-title" isOpen={isOpen} onClose={onClose}>
      <form className="user-management-form" onSubmit={handleSubmit}>
        <ModalHeader>
          <div>
            <p className="eyebrow">{createTarget === "staff" ? "Team access" : "Customers"}</p>
            <h2 id="add-user-title">Add user or customer</h2>
            <p>
              {createTarget === "staff"
                ? "Create an admin or helper account. An invitation email is sent automatically."
                : "Create a customer for Print Requests. This does not create Firebase Auth, Studio access, or Portal login."}
            </p>
          </div>

          <button
            aria-label="Close add user"
            className="icon-button icon-button-md icon-button-ghost"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={18} strokeWidth={2.2} />
          </button>
        </ModalHeader>

        <ModalBody>
          <Select
            label="Create type"
            name="createTarget"
            onChange={(event) => {
              clearResult();
              clearCustomerResult();
              setCreateTarget(event.target.value as CreateTarget);
            }}
            options={[
              { label: "Staff", value: "staff" },
              { label: "Customer", value: "customer" },
            ]}
            value={createTarget}
          />

          {createTarget === "staff" ? (
            <Select
              label="Role"
              name="role"
              onChange={(event) => setRole(event.target.value as TeamUserRole)}
              options={roleOptions}
              value={role}
            />
          ) : null}

          <TextInput
            label={createTarget === "staff" ? "Display name" : "Customer display name"}
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
            required={createTarget === "staff"}
            type="email"
            value={email}
          />

          {createTarget === "customer" ? (
            <AutoResizeTextarea
              label="Customer notes"
              name="customerNotes"
              onChange={(event) => setCustomerNotes(event.target.value)}
              placeholder="Optional notes for staff reference"
              value={customerNotes}
            />
          ) : null}

          {createTarget === "staff" && error ? (
            <p className="auth-message auth-message-error" role="alert">
              {error}
            </p>
          ) : null}

          {createTarget === "customer" && customerError ? (
            <p className="auth-message auth-message-error" role="alert">
              {customerError}
            </p>
          ) : null}

          {createTarget === "staff" && result ? (
            <p
              className={`auth-message ${
                result.invitationEmailSent ? "auth-message-success" : "auth-message-warning"
              }`}
              role="status"
            >
              {result.displayName} was created as {result.role}. {result.nextStep}
            </p>
          ) : null}

        </ModalBody>

        <ModalFooter>
          <Button
            disabled={isSubmitting || isCreatingCustomer}
            onClick={onClose}
            type="button"
            variant="secondary"
          >
            Cancel
          </Button>
          <Button disabled={isSubmitting || isCreatingCustomer} type="submit">
            {createTarget === "staff"
              ? isSubmitting
                ? "Creating user..."
                : "Create user"
              : isCreatingCustomer
                ? "Creating customer..."
                : "Create customer"}
          </Button>
        </ModalFooter>
      </form>
    </UserManagementModal>
  );
}
