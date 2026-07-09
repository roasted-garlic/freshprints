import { BadgeInfo, Lock, Pencil } from "lucide-react";

import { Badge } from "../../../shared/components/Badge";
import { Card } from "../../../shared/components/Card";
import { EmptyState } from "../../../shared/components/EmptyState";
import { ErrorState } from "../../../shared/components/ErrorState";
import { IconButton } from "../../../shared/components/IconButton";
import { PageLoadingState } from "../../../shared/components/PageLoadingState";
import { permissionService } from "../../permissions/services/permissionService";
import type { User } from "../types/user.types";
import { formatTeamUserRoleLabel, getTeamUserRoleBadgeVariant } from "../utils/teamUserRoleDisplay";

interface UserDirectoryTableProps {
  caller: User | null;
  error: string | null;
  isLoading: boolean;
  onEditUser: (teamUser: User) => void;
  onViewAuditTrail: (teamUser: User) => void;
  searchQuery: string;
  users: User[];
}

export function UserDirectoryTable({
  caller,
  error,
  isLoading,
  onEditUser,
  onViewAuditTrail,
  searchQuery,
  users,
}: UserDirectoryTableProps) {
  if (isLoading) {
    return (
      <Card className="user-directory-panel">
        <PageLoadingState label="Loading team users" message="Loading team users..." />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="user-directory-panel">
        <ErrorState eyebrow="Load failed" message={error} title="Unable to load team users" />
      </Card>
    );
  }

  if (users.length === 0) {
    const emptyMessage = searchQuery.trim()
      ? "Try a different search term or clear the search field."
      : "Add the first admin or helper account to start building your Fresh Prints team.";

    return (
      <EmptyState
        message={emptyMessage}
        title={searchQuery.trim() ? "No matching users" : "No team users yet"}
      />
    );
  }

  return (
    <Card className="user-directory-panel">
      <div className="table-scroll">
        <table className="data-table data-table-compact" aria-label="Team users">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th className="user-directory-info-header">INFO</th>
              <th className="user-directory-actions-header">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((teamUser) => {
              const canEdit = permissionService.canShowUserDirectoryEditAction(caller, teamUser);
              const isProtectedOwner = permissionService.isProtectedOwnerAccount(teamUser);

              return (
                <tr key={teamUser.id}>
                  <td className="user-directory-name">{teamUser.displayName}</td>
                  <td>{teamUser.email}</td>
                  <td>
                    <Badge variant={getTeamUserRoleBadgeVariant(teamUser.role)}>
                      {formatTeamUserRoleLabel(teamUser.role)}
                    </Badge>
                  </td>
                  <td>
                    <Badge variant={teamUser.isActive ? "success" : "danger"}>
                      {teamUser.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="user-directory-info-cell">
                    <IconButton
                      label="View user info"
                      onClick={() => onViewAuditTrail(teamUser)}
                      variant="outline"
                    >
                      <BadgeInfo aria-hidden="true" size={15} strokeWidth={2} />
                    </IconButton>
                  </td>
                  <td className="user-directory-actions-cell">
                    <div className="user-directory-actions">
                      {isProtectedOwner ? (
                        <span
                          aria-label="Owner accounts cannot be modified"
                          className="icon-button icon-button-sm icon-button-muted icon-button-static"
                          title="Owner accounts cannot be modified"
                        >
                          <Lock aria-hidden="true" size={15} strokeWidth={2} />
                        </span>
                      ) : canEdit ? (
                        <IconButton label="Edit User" onClick={() => onEditUser(teamUser)} variant="outline">
                          <Pencil aria-hidden="true" size={15} strokeWidth={2} />
                        </IconButton>
                      ) : (
                        <span className="user-management-action-muted">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
