import { Search } from "lucide-react";
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
import { TombstoneCustomerConfirmDialog } from "../components/TombstoneCustomerConfirmDialog";
import { UserAuditTrailModal } from "../components/UserAuditTrailModal";
import { UserDirectoryTable } from "../components/UserDirectoryTable";
import type { AuditTrailSubject } from "../types/auditTrail.types";
import { useTeamUsers } from "../hooks/useTeamUsers";
import { useUpdateTeamUser } from "../hooks/useUpdateTeamUser";
import type { User } from "../types/user.types";
import { filterCustomers } from "../utils/customerDirectorySearch";
import { filterTeamUsers } from "../utils/teamUserSearch";
import type { Customer } from "@fresh-prints/shared/types/customer/customer.types";

type UsersDirectoryTab = "staff" | "customers";

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

  const [directoryTab, setDirectoryTab] = useState<UsersDirectoryTab>("staff");
  const [staffSearchQuery, setStaffSearchQuery] = useState("");
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [tombstoneCustomer, setTombstoneCustomer] = useState<Customer | null>(null);
  const [auditTrailSubject, setAuditTrailSubject] = useState<AuditTrailSubject | null>(null);
  const [pageSuccessMessage, setPageSuccessMessage] = useState<string | null>(null);
  const [successAlertSeed, setSuccessAlertSeed] = useState(0);

  const filteredUsers = useMemo(
    () => filterTeamUsers(users, staffSearchQuery),
    [staffSearchQuery, users],
  );
  const filteredCustomers = useMemo(
    () => filterCustomers(customers, customerSearchQuery),
    [customerSearchQuery, customers],
  );

  const canManageUsers = permissionService.canManageUsers(user);
  const canTombstoneCustomer = permissionService.canTombstoneCustomerAccount(user);
  const openAddUserModal = useCallback(() => {
    setIsAddModalOpen(true);
  }, []);

  const dismissSuccessMessage = useCallback(() => {
    setPageSuccessMessage(null);
  }, []);

  const handleAddModalCreated = useCallback(
    async (payload: AddUserModalCreatedPayload) => {
      await Promise.all([reloadUsers(), reloadCustomers()]);

      if (payload.kind === "customer" && payload.message) {
        setDirectoryTab("customers");
        setPageSuccessMessage(payload.message);
        setSuccessAlertSeed((current) => current + 1);
      } else if (payload.kind === "staff") {
        setDirectoryTab("staff");
      }
    },
    [reloadCustomers, reloadUsers],
  );

  const shellHeaderConfig = useMemo(
    () => ({
      title: "Users",
      description: "Manage staff access and customers for Print Requests.",
      primaryAction: canManageUsers
        ? {
            label: "Add user",
            onClick: openAddUserModal,
          }
        : null,
    }),
    [canManageUsers, openAddUserModal],
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
        <div className="user-directory-tab-bar" role="tablist" aria-label="User directories">
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
          <div className="user-directory-tab-panel" role="tabpanel">
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

            <UserDirectoryTable
              caller={user}
              error={error}
              isLoading={isLoading}
              onEditUser={(teamUser) => {
                clearMessages();
                setEditingUser(teamUser);
              }}
              onViewAuditTrail={(teamUser) => setAuditTrailSubject({ kind: "team_user", user: teamUser })}
              searchQuery={staffSearchQuery}
              users={filteredUsers}
            />
          </div>
        ) : (
          <div className="user-directory-tab-panel" role="tabpanel">
            <label className="user-directory-search">
              <span className="visually-hidden">Search customers</span>
              <Search aria-hidden className="user-directory-search-icon" size={14} strokeWidth={2} />
              <input
                className="user-directory-search-input"
                onChange={(event) => setCustomerSearchQuery(event.target.value)}
                placeholder="Search name, username, email, notes…"
                type="search"
                value={customerSearchQuery}
              />
            </label>

            <CustomerDirectoryTable
              canTombstoneCustomer={canTombstoneCustomer}
              customers={filteredCustomers}
              error={customersError}
              isLoading={isCustomersLoading}
              onEditCustomer={(customer) => setEditingCustomer(customer)}
              onTombstoneCustomer={(customer) => setTombstoneCustomer(customer)}
              onViewAuditTrail={(customer) => setAuditTrailSubject({ kind: "customer", customer })}
              searchQuery={customerSearchQuery}
            />
          </div>
        )}
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

      <TombstoneCustomerConfirmDialog
        customer={tombstoneCustomer}
        isOpen={tombstoneCustomer !== null}
        onCancel={() => setTombstoneCustomer(null)}
        onDeleted={() => {
          setTombstoneCustomer(null);
          void reloadCustomers();
          setPageSuccessMessage("Customer account disabled. History and username are preserved.");
          setSuccessAlertSeed((current) => current + 1);
        }}
      />

      <UserAuditTrailModal
        isOpen={auditTrailSubject !== null}
        onClose={() => setAuditTrailSubject(null)}
        subject={auditTrailSubject}
      />
    </main>
  );
}
