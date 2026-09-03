import { BadgeInfo, FileText, Pencil, RotateCcw } from "lucide-react";
import { useMemo } from "react";

import { Badge } from "../../../shared/components/Badge";
import { Card } from "../../../shared/components/Card";
import { DangerOverflowMenu } from "../../../shared/components/DangerOverflowMenu";
import { EmptyState } from "../../../shared/components/EmptyState";
import { ErrorState } from "../../../shared/components/ErrorState";
import { IconButton } from "../../../shared/components/IconButton";
import { PageLoadingState } from "../../../shared/components/PageLoadingState";
import type { Customer } from "@fresh-prints/shared/types/customer/customer.types";
import {
  getCustomerSignupSourceBadgeLabel,
  getCustomerSignupSourceBadgeVariant,
} from "@fresh-prints/shared/utils/customerSignupSource";
import { formatCustomerUsernameForDisplay } from "@fresh-prints/shared/utils/formatCustomerUsernameForDisplay";
import { hasActivePrintRequestQuotaOverride } from "@fresh-prints/shared/utils/printRequestQuotaOverride";
import { isReversibleDisabledCustomer } from "../utils/customerDirectoryVisibility";

import type { CustomerDirectoryVisibilityTab } from "../utils/customerDirectoryVisibility";

interface CustomerDirectoryTableProps {
  customers: Customer[];
  allCustomers?: Customer[];
  error: string | null;
  isLoading: boolean;
  visibilityTab?: CustomerDirectoryVisibilityTab;
  canTombstoneCustomer?: boolean;
  canHardDeleteCustomer?: boolean;
  canDisableCustomer?: boolean;
  onEditCustomer: (customer: Customer) => void;
  onTombstoneCustomer?: (customer: Customer) => void;
  onHardDeleteCustomer?: (customer: Customer) => void;
  onDisableCustomer?: (customer: Customer) => void;
  onRestoreCustomer?: (customer: Customer) => void;
  onViewAuditTrail: (customer: Customer) => void;
  onViewSurvivorCustomer?: (customer: Customer) => void;
  searchQuery: string;
}

export function CustomerDirectoryTable({
  customers,
  allCustomers = [],
  error,
  isLoading,
  canTombstoneCustomer = false,
  canHardDeleteCustomer = false,
  canDisableCustomer = false,
  onEditCustomer,
  onTombstoneCustomer,
  onHardDeleteCustomer,
  onDisableCustomer,
  onRestoreCustomer,
  onViewAuditTrail,
  onViewSurvivorCustomer,
  searchQuery,
  visibilityTab = "active",
}: CustomerDirectoryTableProps) {
  const customerById = useMemo(() => {
    const lookup = new Map<string, Customer>();
    for (const customer of allCustomers) {
      lookup.set(customer.id, customer);
    }
    return lookup;
  }, [allCustomers]);

  if (isLoading) {
    return (
      <Card className="user-directory-panel">
        <PageLoadingState label="Loading customers" message="Loading customers..." />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="user-directory-panel">
        <ErrorState eyebrow="Load failed" message={error} title="Unable to load customers" />
      </Card>
    );
  }

  if (customers.length === 0) {
    const emptyMessage = searchQuery.trim()
      ? "Try a different search term or clear the search field."
      : visibilityTab === "active"
        ? "No active customers. Check Disabled, Merged, or Closed for other accounts."
        : visibilityTab === "disabled"
          ? "No disabled customers in this view."
          : visibilityTab === "merged"
            ? "No merged customers in this view."
            : "No closed customers in this view.";

    return (
      <EmptyState
        message={emptyMessage}
        title={searchQuery.trim() ? "No matching customers" : "No customers in this view"}
      />
    );
  }

  return (
    <Card className="user-directory-panel">
      <div className="table-scroll">
        <table className="data-table data-table-compact" aria-label="Customers">
          <thead>
            <tr>
              <th>Name</th>
              <th>Username</th>
              <th>Email</th>
              <th>Source</th>
              <th className="user-directory-notes-header">Notes</th>
              <th className="user-directory-info-header">INFO</th>
              <th className="user-directory-actions-header">Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => {
              const isDeleted = customer.isDeleted === true;
              const isMerged = customer.isMerged === true;
              const isReversiblyDisabled = isReversibleDisabledCustomer(customer);
              const survivorCustomer =
                isMerged && customer.mergedIntoCustomerId
                  ? customerById.get(customer.mergedIntoCustomerId)
                  : undefined;
              const showOwnerMenu =
                !isMerged &&
                ((canTombstoneCustomer && !isDeleted && onTombstoneCustomer) ||
                  (canDisableCustomer && onDisableCustomer) ||
                  (canHardDeleteCustomer && onHardDeleteCustomer));

              const menuItems = [];

              if (canDisableCustomer && onDisableCustomer && !isDeleted) {
                if (isReversiblyDisabled && onRestoreCustomer) {
                  menuItems.push({
                    id: "restore-customer",
                    label: "Re-enable Account",
                    danger: false,
                    onSelect: () => onRestoreCustomer(customer),
                  });
                } else if (!isReversiblyDisabled) {
                  menuItems.push({
                    id: "disable-customer-reversible",
                    label: "Disable Account",
                    onSelect: () => onDisableCustomer(customer),
                  });
                }
              }

              if (canTombstoneCustomer && !isDeleted && onTombstoneCustomer) {
                menuItems.push({
                  id: "tombstone-customer",
                  label: "Close Account Permanently",
                  onSelect: () => onTombstoneCustomer(customer),
                });
              }

              if (canHardDeleteCustomer && onHardDeleteCustomer && !isDeleted) {
                menuItems.push({
                  id: "hard-delete-customer",
                  label: "Delete Account Permanently",
                  onSelect: () => onHardDeleteCustomer(customer),
                });
              }

              return (
                <tr key={customer.id}>
                  <td className="user-directory-name">
                    <div className="customer-directory-name-cell">
                      <span>{customer.displayName}</span>
                      {isReversiblyDisabled ? (
                        <Badge className="customer-status-badge-disabled" variant="warning">
                          Disabled
                        </Badge>
                      ) : null}
                      {isMerged ? (
                        <Badge className="customer-status-badge-merged" variant="info">
                          Merged
                        </Badge>
                      ) : null}
                      {isDeleted ? (
                        <Badge className="customer-status-badge-deleted" variant="warning">
                          Closed
                        </Badge>
                      ) : null}
                      {hasActivePrintRequestQuotaOverride(customer.printRequestQuotaOverride) ? (
                        <Badge className="customer-quota-override-badge" variant="info">
                          Quota Override
                        </Badge>
                      ) : null}
                      {isMerged && survivorCustomer ? (
                        onViewSurvivorCustomer ? (
                          <button
                            className="customer-merged-into-link"
                            onClick={() => onViewSurvivorCustomer(survivorCustomer)}
                            type="button"
                          >
                            Merged into{" "}
                            {formatCustomerUsernameForDisplay(survivorCustomer.username, {
                              isDeleted: survivorCustomer.isDeleted === true,
                            })}
                          </button>
                        ) : (
                          <span className="customer-merged-into-link">
                            Merged into{" "}
                            {formatCustomerUsernameForDisplay(survivorCustomer.username, {
                              isDeleted: survivorCustomer.isDeleted === true,
                            })}
                          </span>
                        )
                      ) : null}
                    </div>
                  </td>
                  <td>{formatCustomerUsernameForDisplay(customer.username, { isDeleted })}</td>
                  <td>{customer.email ?? "—"}</td>
                  <td>
                    <Badge variant={getCustomerSignupSourceBadgeVariant(customer)}>
                      {getCustomerSignupSourceBadgeLabel(customer)}
                    </Badge>
                  </td>
                  <td className="user-directory-notes-cell">
                    <span
                      aria-label={
                        customer.notes?.trim() ? "Customer has notes" : "Customer has no notes"
                      }
                      className={`customer-notes-indicator${customer.notes?.trim() ? " has-notes" : ""}`}
                      title={customer.notes?.trim() ? "Customer has notes" : "Customer has no notes"}
                    >
                      <FileText aria-hidden="true" size={15} strokeWidth={2} />
                    </span>
                  </td>
                  <td className="user-directory-info-cell">
                    <IconButton
                      label="View user info"
                      onClick={() => onViewAuditTrail(customer)}
                      variant="outline"
                    >
                      <BadgeInfo aria-hidden="true" size={15} strokeWidth={2} />
                    </IconButton>
                  </td>
                  <td className="user-directory-actions-cell">
                    <div className="user-directory-actions">
                      {canDisableCustomer && isReversiblyDisabled && onRestoreCustomer ? (
                        <IconButton
                          className="icon-button-outline icon-button-success"
                          label="Re-enable Account"
                          onClick={() => onRestoreCustomer(customer)}
                          variant="outline"
                        >
                          <RotateCcw aria-hidden="true" size={15} strokeWidth={2} />
                        </IconButton>
                      ) : null}
                      <IconButton
                        label="Edit Customer"
                        onClick={() => onEditCustomer(customer)}
                        variant="outline"
                      >
                        <Pencil aria-hidden="true" size={15} strokeWidth={2} />
                      </IconButton>
                      {showOwnerMenu && menuItems.length > 0 ? (
                        <DangerOverflowMenu
                          ariaLabel={`Customer actions for ${customer.displayName}`}
                          items={menuItems}
                        />
                      ) : null}
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
