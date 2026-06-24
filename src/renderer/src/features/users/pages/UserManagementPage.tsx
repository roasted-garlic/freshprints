import { useCallback, useMemo, useState } from "react";

import { useShellHeaderConfig } from "../../../shared/hooks/useShellHeaderConfig";
import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";
import { AddUserModal } from "../components/AddUserModal";
import { EditUserModal } from "../components/EditUserModal";
import { UserDirectoryTable } from "../components/UserDirectoryTable";
import { useTeamUsers } from "../hooks/useTeamUsers";
import { useUpdateTeamUser } from "../hooks/useUpdateTeamUser";
import type { User } from "../types/user.types";
import { filterTeamUsers } from "../utils/teamUserSearch";

export function UserManagementPage() {
  const { user } = useAuth();
  const { error, isLoading, reloadUsers, users } = useTeamUsers();
  const { clearMessages, error: updateError, isSubmitting, successMessage, updateTeamUser } =
    useUpdateTeamUser();

  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const filteredUsers = useMemo(
    () => filterTeamUsers(users, searchQuery),
    [searchQuery, users],
  );

  const canManageUsers = permissionService.canManageUsers(user);
  const openAddUserModal = useCallback(() => {
    setIsAddModalOpen(true);
  }, []);

  const userCountLabel = useMemo(() => {
    const count = searchQuery.trim() ? filteredUsers.length : users.length;
    return `${count} user${count === 1 ? "" : "s"}`;
  }, [filteredUsers.length, searchQuery, users.length]);

  const shellHeaderConfig = useMemo(
    () => ({
      title: "Users",
      description: "Manage admin and helper accounts for the Fresh Prints desktop app.",
      search: {
        value: searchQuery,
        onChange: setSearchQuery,
        placeholder: "Search...",
      },
      primaryAction: canManageUsers
        ? {
            label: "Add user",
            onClick: openAddUserModal,
          }
        : null,
    }),
    [canManageUsers, openAddUserModal, searchQuery],
  );

  useShellHeaderConfig(shellHeaderConfig);

  return (
    <main className="page-layout page-layout-shell">
      {updateError ? (
        <p className="auth-message auth-message-error" role="alert">
          {updateError}
        </p>
      ) : null}

      {successMessage ? (
        <p className="auth-message auth-message-success" role="status">
          {successMessage}
        </p>
      ) : null}

      <section className="user-directory-section">
        <div className="user-directory-summary-row">
          <span className="user-directory-count-chip">{userCountLabel}</span>
        </div>

        <UserDirectoryTable
        caller={user}
        error={error}
        isLoading={isLoading}
        onEditUser={(teamUser) => {
          clearMessages();
          setEditingUser(teamUser);
        }}
        searchQuery={searchQuery}
        users={filteredUsers}
        />
      </section>

      <AddUserModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onCreated={reloadUsers}
      />

      <EditUserModal
        caller={user}
        error={updateError}
        isOpen={editingUser !== null}
        isSubmitting={isSubmitting}
        onClose={() => setEditingUser(null)}
        onSave={updateTeamUser}
        onUpdated={reloadUsers}
        teamUser={editingUser}
      />
    </main>
  );
}
