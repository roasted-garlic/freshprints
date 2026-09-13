import { RefreshCw } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { Button } from "../../../shared/components/Button";
import { DismissibleSuccessAlert } from "../../../shared/components/DismissibleSuccessAlert";
import { useShellHeaderConfig } from "../../../shared/hooks/useShellHeaderConfig";
import { useAuth } from "../../auth/hooks/useAuth";
import { useCustomersDirectory } from "../../customers/hooks/useCustomersDirectory";
import { permissionService } from "../../permissions/services/permissionService";
import { AddUserModal, type AddUserModalCreatedPayload } from "../components/AddUserModal";
import { CustomerDirectoryTable } from "../components/CustomerDirectoryTable";
import { ChangeUsernameModal } from "../components/ChangeUsernameModal";
import { DisableCustomerConfirmDialog } from "../components/DisableCustomerConfirmDialog";
import { EditCustomerModal } from "../components/EditCustomerModal";
import { EditUserModal } from "../components/EditUserModal";
import { HardDeleteCustomerConfirmDialog } from "../components/HardDeleteCustomerConfirmDialog";
import { MergeCustomerAccountsWizard } from "../components/MergeCustomerAccountsWizard";
import { ResolveDuplicateAccountWizard } from "../components/ResolveDuplicateAccountWizard";
import { RestoreCustomerConfirmDialog } from "../components/RestoreCustomerConfirmDialog";
import { TombstoneCustomerConfirmDialog } from "../components/TombstoneCustomerConfirmDialog";
import { UserAuditTrailModal } from "../components/UserAuditTrailModal";
import { UserDirectorySearchField } from "../components/UserDirectorySearchField";
import { UserDirectoryTable } from "../components/UserDirectoryTable";
import type { AuditTrailSubject } from "../types/auditTrail.types";
import { useTeamUsers } from "../hooks/useTeamUsers";
import { useUpdateTeamUser } from "../hooks/useUpdateTeamUser";
import type { User } from "../types/user.types";
import { filterCustomers } from "../utils/customerDirectorySearch";
import {
  countCustomersByVisibilityTab,
  filterCustomersByVisibilityTab,
  type CustomerDirectoryVisibilityTab,
} from "../utils/customerDirectoryVisibility";
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
    patchCustomer,
    reloadCustomers,
  } = useCustomersDirectory();
  const { clearMessages, error: updateError, isSubmitting, successMessage, updateTeamUser } =
    useUpdateTeamUser();

  const [directoryTab, setDirectoryTab] = useState<UsersDirectoryTab>("customers");
  const [customerVisibilityTab, setCustomerVisibilityTab] =
    useState<CustomerDirectoryVisibilityTab>("active");
  const [staffSearchQuery, setStaffSearchQuery] = useState("");
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [tombstoneCustomer, setTombstoneCustomer] = useState<Customer | null>(null);
  const [hardDeleteCustomer, setHardDeleteCustomer] = useState<Customer | null>(null);
  const [disableCustomer, setDisableCustomer] = useState<Customer | null>(null);
  const [restoreCustomer, setRestoreCustomer] = useState<Customer | null>(null);
  const [changeUsernameCustomer, setChangeUsernameCustomer] = useState<Customer | null>(null);
  const [auditTrailSubject, setAuditTrailSubject] = useState<AuditTrailSubject | null>(null);
  const [pageSuccessMessage, setPageSuccessMessage] = useState<string | null>(null);
  const [successAlertSeed, setSuccessAlertSeed] = useState(0);

  const filteredUsers = useMemo(
    () => filterTeamUsers(users, staffSearchQuery),
    [staffSearchQuery, users],
  );
  const customerVisibilityCounts = useMemo(
    () => countCustomersByVisibilityTab(customers),
    [customers],
  );
  const filteredCustomers = useMemo(() => {
    const visibleCustomers = filterCustomersByVisibilityTab(customers, customerVisibilityTab);
    return filterCustomers(visibleCustomers, customerSearchQuery);
  }, [customerSearchQuery, customerVisibilityTab, customers]);

  const canManageUsers = permissionService.canManageUsers(user);
  const canTombstoneCustomer = permissionService.canTombstoneCustomerAccount(user);
  const canHardDeleteCustomer = permissionService.canHardDeleteCustomerAccount(user);
  const canDisableCustomer = permissionService.canDisableCustomerAccount(user);
  const canResolveDuplicateCustomer = permissionService.canResolveDuplicateCustomerAccount(user);
  const canMergeCustomerAccounts = permissionService.canMergeCustomerAccounts(user);
  const canChangeCustomerUsername = permissionService.canChangeCustomerUsername(user);
  const [isDuplicateWizardOpen, setIsDuplicateWizardOpen] = useState(false);
  const [isMergeWizardOpen, setIsMergeWizardOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const openAddUserModal = useCallback(() => {
    setIsAddModalOpen(true);
  }, []);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) {
      return;
    }

    setIsRefreshing(true);
    try {
      await Promise.all([reloadUsers(), reloadCustomers()]);
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, reloadCustomers, reloadUsers]);

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
      actions: [
        {
          icon: <RefreshCw aria-hidden="true" size={16} strokeWidth={2} />,
          label: isRefreshing ? "Refreshing…" : "Refresh",
          onClick: () => {
            if (!isRefreshing) {
              void handleRefresh();
            }
          },
        },
      ],
      primaryAction: canManageUsers
        ? {
            label: "Add user",
            onClick: openAddUserModal,
          }
        : null,
    }),
    [canManageUsers, handleRefresh, isRefreshing, openAddUserModal],
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
            aria-selected={directoryTab === "customers"}
            className={`user-directory-tab-button${directoryTab === "customers" ? " is-active" : ""}`}
            onClick={() => setDirectoryTab("customers")}
            role="tab"
            type="button"
          >
            Customers ({customers.length})
          </button>
          <button
            aria-selected={directoryTab === "staff"}
            className={`user-directory-tab-button${directoryTab === "staff" ? " is-active" : ""}`}
            onClick={() => setDirectoryTab("staff")}
            role="tab"
            type="button"
          >
            Staff ({users.length})
          </button>
        </div>

        {directoryTab === "staff" ? (
          <div className="user-directory-tab-panel" role="tabpanel">
            <UserDirectorySearchField
              label="Search staff"
              onChange={setStaffSearchQuery}
              placeholder="Search name, email, role…"
              value={staffSearchQuery}
            />

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
            <div
              aria-label="Customer account status"
              className="user-directory-tab-bar user-directory-subtab-bar"
              role="tablist"
            >
              <button
                aria-selected={customerVisibilityTab === "active"}
                className={`user-directory-tab-button${customerVisibilityTab === "active" ? " is-active" : ""}`}
                onClick={() => setCustomerVisibilityTab("active")}
                role="tab"
                type="button"
              >
                Active ({customerVisibilityCounts.active})
              </button>
              <button
                aria-selected={customerVisibilityTab === "disabled"}
                className={`user-directory-tab-button${customerVisibilityTab === "disabled" ? " is-active" : ""}`}
                onClick={() => setCustomerVisibilityTab("disabled")}
                role="tab"
                type="button"
              >
                Disabled ({customerVisibilityCounts.disabled})
              </button>
              <button
                aria-selected={customerVisibilityTab === "closed"}
                className={`user-directory-tab-button${customerVisibilityTab === "closed" ? " is-active" : ""}`}
                onClick={() => setCustomerVisibilityTab("closed")}
                role="tab"
                type="button"
              >
                Closed ({customerVisibilityCounts.closed})
              </button>
              <button
                aria-selected={customerVisibilityTab === "merged"}
                className={`user-directory-tab-button${customerVisibilityTab === "merged" ? " is-active" : ""}`}
                onClick={() => setCustomerVisibilityTab("merged")}
                role="tab"
                type="button"
              >
                Merged ({customerVisibilityCounts.merged})
              </button>
            </div>

            <div className="user-directory-customer-toolbar-row">
              <UserDirectorySearchField
                className="user-directory-search-flex"
                label="Search customers"
                onChange={setCustomerSearchQuery}
                placeholder="Search name, username, email, notes…"
                value={customerSearchQuery}
              />

              {canResolveDuplicateCustomer || canMergeCustomerAccounts ? (
                <div className="user-directory-customer-toolbar">
                  {canResolveDuplicateCustomer ? (
                    <Button
                      onClick={() => setIsDuplicateWizardOpen(true)}
                      type="button"
                      variant="secondary"
                    >
                      Transfer Username
                    </Button>
                  ) : null}
                  {canMergeCustomerAccounts ? (
                    <Button
                      onClick={() => setIsMergeWizardOpen(true)}
                      type="button"
                      variant="secondary"
                    >
                      Merge Accounts
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>

            <CustomerDirectoryTable
              allCustomers={customers}
              canDisableCustomer={canDisableCustomer}
              canHardDeleteCustomer={canHardDeleteCustomer}
              canTombstoneCustomer={canTombstoneCustomer}
              customers={filteredCustomers}
              error={customersError}
              isLoading={isCustomersLoading}
              onDisableCustomer={(customer) => setDisableCustomer(customer)}
              onEditCustomer={(customer) => setEditingCustomer(customer)}
              onHardDeleteCustomer={(customer) => setHardDeleteCustomer(customer)}
              onRestoreCustomer={(customer) => setRestoreCustomer(customer)}
              onTombstoneCustomer={(customer) => setTombstoneCustomer(customer)}
              onViewAuditTrail={(customer) => setAuditTrailSubject({ kind: "customer", customer })}
              onViewSurvivorCustomer={(survivorCustomer) => {
                setCustomerVisibilityTab("active");
                setCustomerSearchQuery(
                  survivorCustomer.username?.trim() || survivorCustomer.displayName,
                );
              }}
              searchQuery={customerSearchQuery}
              visibilityTab={customerVisibilityTab}
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
        canChangeUsername={canChangeCustomerUsername}
        canReenableCustomer={canDisableCustomer}
        customer={editingCustomer}
        isOpen={editingCustomer !== null}
        onChangeUsername={(customer) => {
          setChangeUsernameCustomer(customer);
        }}
        onClose={() => setEditingCustomer(null)}
        onCustomerPatched={(customer) => {
          patchCustomer(customer.id, {
            printRequestQuotaOverride: customer.printRequestQuotaOverride,
          });
          setEditingCustomer(customer);
        }}
        onUpdated={async (message) => {
          await reloadCustomers();
          setPageSuccessMessage(message);
          setSuccessAlertSeed((current) => current + 1);
        }}
      />

      <ChangeUsernameModal
        customer={changeUsernameCustomer}
        isOpen={changeUsernameCustomer !== null}
        onClose={() => setChangeUsernameCustomer(null)}
        onUpdated={async (message) => {
          await reloadCustomers();
          setEditingCustomer(null);
          setPageSuccessMessage(message);
          setSuccessAlertSeed((current) => current + 1);
        }}
      />

      <DisableCustomerConfirmDialog
        customer={disableCustomer}
        isOpen={disableCustomer !== null}
        onCancel={() => setDisableCustomer(null)}
        onDisabled={(customerId) => {
          patchCustomer(customerId, { isDisabled: true });
          setEditingCustomer((current) =>
            current?.id === customerId ? { ...current, isDisabled: true } : current,
          );
          setDisableCustomer(null);
          void reloadCustomers();
          setPageSuccessMessage("Customer account disabled. History and username are preserved.");
          setSuccessAlertSeed((current) => current + 1);
        }}
      />

      <RestoreCustomerConfirmDialog
        customer={restoreCustomer}
        isOpen={restoreCustomer !== null}
        onCancel={() => setRestoreCustomer(null)}
        onRestored={(customerId, message) => {
          patchCustomer(customerId, {
            isDisabled: undefined,
            disabledAt: undefined,
            disabledBy: undefined,
            disabledReason: undefined,
          });
          setEditingCustomer((current) =>
            current?.id === customerId
              ? {
                  ...current,
                  isDisabled: undefined,
                  disabledAt: undefined,
                  disabledBy: undefined,
                  disabledReason: undefined,
                }
              : current,
          );
          setRestoreCustomer(null);
          void reloadCustomers();
          setPageSuccessMessage(message);
          setSuccessAlertSeed((current) => current + 1);
        }}
      />

      <HardDeleteCustomerConfirmDialog
        customer={hardDeleteCustomer}
        isOpen={hardDeleteCustomer !== null}
        onCancel={() => setHardDeleteCustomer(null)}
        onDeleted={() => {
          setHardDeleteCustomer(null);
          void reloadCustomers();
          setPageSuccessMessage("Customer account permanently deleted.");
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

      <ResolveDuplicateAccountWizard
        customers={customers}
        isOpen={isDuplicateWizardOpen}
        onClose={() => setIsDuplicateWizardOpen(false)}
        onCompleted={() => {
          void reloadCustomers();
          setPageSuccessMessage("Username transfer completed.");
          setSuccessAlertSeed((current) => current + 1);
        }}
      />

      <MergeCustomerAccountsWizard
        customers={customers}
        isOpen={isMergeWizardOpen}
        onClose={() => setIsMergeWizardOpen(false)}
        onCompleted={() => {
          void reloadCustomers();
          setPageSuccessMessage("Account merge completed.");
          setSuccessAlertSeed((current) => current + 1);
          setCustomerVisibilityTab("merged");
        }}
      />
    </main>
  );
}
