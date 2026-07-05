import { useCallback, useMemo, useState } from "react";

import { DismissibleSuccessAlert } from "../../../shared/components/DismissibleSuccessAlert";
import { useShellHeaderConfig } from "../../../shared/hooks/useShellHeaderConfig";
import { useAuth } from "../../auth/hooks/useAuth";
import { useCustomersDirectory } from "../../customers/hooks/useCustomersDirectory";
import { permissionService } from "../../permissions/services/permissionService";
import { AddUserModal, type AddUserModalCreatedPayload } from "../components/AddUserModal";
import { CustomerDirectoryTable } from "../components/CustomerDirectoryTable";
import { EditCustomerModal } from "../components/EditCustomerModal";
import { EditUserModal } from "../components/EditUserModal";
import { UserDirectoryTable } from "../components/UserDirectoryTable";
import { useTeamUsers } from "../hooks/useTeamUsers";
import { useUpdateTeamUser } from "../hooks/useUpdateTeamUser";
import type { User } from "../types/user.types";
import { filterTeamUsers } from "../utils/teamUserSearch";
import type { Customer } from "../../../../../../shared/types/customer/customer.types";

export function UserManagementPage() {
  const { user } = useAuth();
  const { error, isLoading, reloadUsers, users } = useTeamUsers();
  const {
    customers,
    error: customersError,
    isLoading: isCustomersLoading,
    reloadCustomers,
  } = useCustomersDirectory();
  const { clearMessages, error: updateError, isSubmitting, successMessage, updateTeamUser } =
    useUpdateTeamUser();

  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [pageSuccessMessage, setPageSuccessMessage] = useState<string | null>(null);
  const [successAlertSeed, setSuccessAlertSeed] = useState(0);

  const filteredUsers = useMemo(
    () => filterTeamUsers(users, searchQuery),
    [searchQuery, users],
  );
  const filteredCustomers = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return customers;
    }

    return customers.filter((customer) =>
      [customer.displayName, customer.username ?? "", customer.email ?? "", customer.notes ?? ""].some((value) =>
        value.toLowerCase().includes(normalizedQuery),
      ),
    );
  }, [customers, searchQuery]);

  const canManageUsers = permissionService.canManageUsers(user);
  const openAddUserModal = useCallback(() => {
    setIsAddModalOpen(true);
  }, []);

  const teamUserCountLabel = useMemo(() => {
    const count = searchQuery.trim() ? filteredUsers.length : users.length;
    return `${count} team user${count === 1 ? "" : "s"}`;
  }, [filteredUsers.length, searchQuery, users.length]);
  const customerCountLabel = useMemo(() => {
    const count = searchQuery.trim() ? filteredCustomers.length : customers.length;
    return `${count} customer${count === 1 ? "" : "s"}`;
  }, [customers.length, filteredCustomers.length, searchQuery]);

  const dismissSuccessMessage = useCallback(() => {
    setPageSuccessMessage(null);
  }, []);

  const handleAddModalCreated = useCallback(
    async (payload: AddUserModalCreatedPayload) => {
      await Promise.all([reloadUsers(), reloadCustomers()]);

      if (payload.kind === "customer" && payload.message) {
        setPageSuccessMessage(payload.message);
        setSuccessAlertSeed((current) => current + 1);
      }
    },
    [reloadCustomers, reloadUsers],
  );

  const shellHeaderConfig = useMemo(
    () => ({
      title: "Users",
      description: "Manage staff access and customers for Print Requests.",
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
      {pageSuccessMessage ? (
        <DismissibleSuccessAlert
          key={`${successAlertSeed}-${pageSuccessMessage}`}
          message={pageSuccessMessage}
          onDismiss={dismissSuccessMessage}
        />
      ) : null}

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
          <span className="user-directory-count-chip">{teamUserCountLabel}</span>
          <span className="user-directory-count-chip">{customerCountLabel}</span>
        </div>

        <div className="user-directory-section-copy">
          <p className="eyebrow">Team users</p>
          <h2>Staff</h2>
          <p>Admin and helper accounts with Fresh Prints Studio access.</p>
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

        <div className="user-directory-section-copy">
          <p className="eyebrow">Customers</p>
          <h2>Customers</h2>
          <p>Customer entries are for Print Requests only. They do not create Studio logins or Portal accounts.</p>
        </div>
        <CustomerDirectoryTable
          customers={filteredCustomers}
          error={customersError}
          isLoading={isCustomersLoading}
          onEditCustomer={(customer) => setEditingCustomer(customer)}
          searchQuery={searchQuery}
        />
      </section>

      <AddUserModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onCreated={handleAddModalCreated}
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

      <EditCustomerModal
        customer={editingCustomer}
        isOpen={editingCustomer !== null}
        onClose={() => setEditingCustomer(null)}
        onUpdated={async (message) => {
          await reloadCustomers();
          setPageSuccessMessage(message);
          setSuccessAlertSeed((current) => current + 1);
        }}
      />
    </main>
  );
}
