import { X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import { Button } from "../../../shared/components/Button";
import { ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";
import { Select } from "../../../shared/components/Select";
import { TextInput } from "../../../shared/components/TextInput";
import { permissionService } from "../../permissions/services/permissionService";
import type { UpdateTeamUserInput } from "../types/userManagement.types";
import type { TeamUserRole, User } from "../types/user.types";
import { DeactivateUserConfirmDialog } from "./DeactivateUserConfirmDialog";
import { UserManagementModal } from "./UserManagementModal";

interface EditUserModalProps {
  caller: User | null;
  error: string | null;
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSave: (input: UpdateTeamUserInput) => Promise<unknown>;
  onUpdated: () => Promise<void> | void;
  teamUser: User | null;
}

const statusOptions = [
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];

function formatRoleLabel(role: TeamUserRole): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export function EditUserModal({
  caller,
  error,
  isOpen,
  isSubmitting,
  onClose,
  onSave,
  onUpdated,
  teamUser,
}: EditUserModalProps) {
  const [isActive, setIsActive] = useState(true);
  const [role, setRole] = useState<TeamUserRole>("helper");
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);

  const canEdit = teamUser ? permissionService.canShowUserDirectoryEditAction(caller, teamUser) : false;
  const canChangeRole = teamUser ? permissionService.canChangeUserRole(caller, teamUser) : false;

  const roleOptions = useMemo(() => {
    if (!canChangeRole) {
      return [];
    }

    return (["admin", "helper"] as TeamUserRole[]).map((optionRole) => ({
      label: formatRoleLabel(optionRole),
      value: optionRole,
    }));
  }, [canChangeRole]);

  useEffect(() => {
    if (!isOpen || !teamUser) {
      return;
    }

    setIsActive(teamUser.isActive);
    setRole(teamUser.role === "admin" || teamUser.role === "helper" ? teamUser.role : "helper");
    setShowDeactivateConfirm(false);
  }, [isOpen, teamUser]);

  if (!isOpen || !teamUser || !canEdit) {
    return null;
  }

  const statusValue = isActive ? "active" : "inactive";
  const roleChanged = canChangeRole && role !== teamUser.role;
  const statusChanged = isActive !== teamUser.isActive;
  const hasChanges = roleChanged || statusChanged;

  async function submitUpdate() {
    if (!teamUser) {
      return;
    }

    try {
      await onSave({
        targetUserId: teamUser.id,
        isActive,
        role: roleChanged ? role : undefined,
      });
      await onUpdated();
      onClose();
    } catch {
      // Error state is handled in the page hook.
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!hasChanges) {
      onClose();
      return;
    }

    if (teamUser?.isActive && !isActive) {
      setShowDeactivateConfirm(true);
      return;
    }

    await submitUpdate();
  }

  return (
    <>
      <UserManagementModal ariaLabelledBy="edit-user-title" isOpen={isOpen} onClose={onClose}>
        <form className="user-management-form" onSubmit={handleSubmit}>
          <ModalHeader>
            <div>
              <p className="eyebrow">Team access</p>
              <h2 id="edit-user-title">Edit user</h2>
              <p>Update account role and status. Changes sync to Firebase Authentication.</p>
            </div>

            <button
              aria-label="Close edit user"
              className="icon-button icon-button-md icon-button-ghost"
              onClick={onClose}
              type="button"
            >
              <X aria-hidden="true" size={18} strokeWidth={2.2} />
            </button>
          </ModalHeader>

          <ModalBody>
            <TextInput
              disabled
              label="Display name"
              name="displayName"
              readOnly
              value={teamUser.displayName}
            />

            <TextInput disabled label="Email" name="email" readOnly type="email" value={teamUser.email} />

            {canChangeRole ? (
              <Select
                label="Role"
                name="role"
                onChange={(event) => setRole(event.target.value as TeamUserRole)}
                options={roleOptions}
                value={role}
              />
            ) : (
              <TextInput disabled label="Role" name="role" readOnly value={teamUser.role} />
            )}

            <Select
              label="Status"
              name="status"
              onChange={(event) => setIsActive(event.target.value === "active")}
              options={statusOptions}
              value={statusValue}
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

      <DeactivateUserConfirmDialog
        isOpen={showDeactivateConfirm}
        isSubmitting={isSubmitting}
        onCancel={() => setShowDeactivateConfirm(false)}
        onConfirm={async () => {
          await submitUpdate();
          setShowDeactivateConfirm(false);
        }}
        teamUser={teamUser}
      />
    </>
  );
}
