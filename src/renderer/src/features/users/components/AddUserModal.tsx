import { useEffect, useMemo, useState, type FormEvent } from "react";

import { Button } from "../../../shared/components/Button";
import { ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";
import { Select } from "../../../shared/components/Select";
import { TextInput } from "../../../shared/components/TextInput";
import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";
import { useCreateTeamUser } from "../hooks/useCreateTeamUser";
import type { TeamUserRole } from "../types/user.types";
import { UserManagementModal } from "./UserManagementModal";

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => Promise<void> | void;
}

function formatRoleLabel(role: TeamUserRole): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export function AddUserModal({ isOpen, onClose, onCreated }: AddUserModalProps) {
  const { user } = useAuth();
  const { clearResult, createTeamUser, error, isSubmitting, result } = useCreateTeamUser();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");

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
    setDisplayName("");
    setEmail("");
    setRole(roleOptions[0]?.value ?? "helper");
  }, [clearResult, isOpen, roleOptions]);

  if (!user || !permissionService.canManageUsers(user)) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearResult();

    try {
      await createTeamUser({
        email,
        displayName,
        role,
      });
      await onCreated();
      onClose();
    } catch {
      // Error state is handled in the hook.
    }
  }

  return (
    <UserManagementModal ariaLabelledBy="add-user-title" isOpen={isOpen} onClose={onClose}>
      <form className="user-management-form" onSubmit={handleSubmit}>
        <ModalHeader>
          <div>
            <p className="eyebrow">Team access</p>
            <h2 id="add-user-title">Add user</h2>
            <p>Create an admin or helper account. An invitation email is sent automatically.</p>
          </div>
        </ModalHeader>

        <ModalBody>
          <Select
            label="Role"
            name="role"
            onChange={(event) => setRole(event.target.value as TeamUserRole)}
            options={roleOptions}
            value={role}
          />

          <TextInput
            label="Display name"
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
            required
            type="email"
            value={email}
          />

          {error ? (
            <p className="auth-message auth-message-error" role="alert">
              {error}
            </p>
          ) : null}

          {result ? (
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
          <Button disabled={isSubmitting} onClick={onClose} type="button" variant="secondary">
            Cancel
          </Button>
          <Button disabled={isSubmitting} type="submit">
            {isSubmitting ? "Creating user..." : "Create user"}
          </Button>
        </ModalFooter>
      </form>
    </UserManagementModal>
  );
}
