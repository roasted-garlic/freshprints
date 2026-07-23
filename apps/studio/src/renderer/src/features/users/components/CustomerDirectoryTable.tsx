import { BadgeInfo, FileText, Pencil } from "lucide-react";

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

interface CustomerDirectoryTableProps {
  customers: Customer[];
  error: string | null;
  isLoading: boolean;
  canTombstoneCustomer?: boolean;
  onEditCustomer: (customer: Customer) => void;
  onTombstoneCustomer?: (customer: Customer) => void;
  onViewAuditTrail: (customer: Customer) => void;
  searchQuery: string;
}

export function CustomerDirectoryTable({
  customers,
  error,
  isLoading,
  canTombstoneCustomer = false,
  onEditCustomer,
  onTombstoneCustomer,
  onViewAuditTrail,
  searchQuery,
}: CustomerDirectoryTableProps) {
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
      : "Create the first customer to use customer Print Requests.";

    return (
      <EmptyState
        message={emptyMessage}
        title={searchQuery.trim() ? "No matching customers" : "No customers yet"}
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
              return (
                <tr key={customer.id}>
                  <td className="user-directory-name">{customer.displayName}</td>
                  <td>{formatCustomerUsernameForDisplay(customer.username, { isDeleted })}</td>
                  <td>{customer.email ?? "—"}</td>
                  <td>
                    <Badge variant={getCustomerSignupSourceBadgeVariant(customer)}>
                      {getCustomerSignupSourceBadgeLabel(customer)}
                    </Badge>
                    {isDeleted ? <Badge variant="warning">Deleted</Badge> : null}
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
                      <IconButton
                        label="Edit Customer"
                        onClick={() => onEditCustomer(customer)}
                        variant="outline"
                      >
                        <Pencil aria-hidden="true" size={15} strokeWidth={2} />
                      </IconButton>
                      {canTombstoneCustomer && !isDeleted && onTombstoneCustomer ? (
                        <DangerOverflowMenu
                          ariaLabel={`Customer actions for ${customer.displayName}`}
                          items={[
                            {
                              id: "disable-customer",
                              label: "Disable customer account…",
                              onSelect: () => onTombstoneCustomer(customer),
                            },
                          ]}
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
