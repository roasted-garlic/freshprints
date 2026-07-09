import { BadgeInfo, FileText, Pencil } from "lucide-react";

import { Badge } from "../../../shared/components/Badge";
import { Card } from "../../../shared/components/Card";
import { EmptyState } from "../../../shared/components/EmptyState";
import { ErrorState } from "../../../shared/components/ErrorState";
import { IconButton } from "../../../shared/components/IconButton";
import { PageLoadingState } from "../../../shared/components/PageLoadingState";
import type { Customer } from "@fresh-prints/shared/types/customer/customer.types";
import {
  getCustomerSignupSourceBadgeLabel,
  getCustomerSignupSourceBadgeVariant,
} from "@fresh-prints/shared/utils/customerSignupSource";

interface CustomerDirectoryTableProps {
  customers: Customer[];
  error: string | null;
  isLoading: boolean;
  onEditCustomer: (customer: Customer) => void;
  onViewAuditTrail: (customer: Customer) => void;
  searchQuery: string;
}

export function CustomerDirectoryTable({
  customers,
  error,
  isLoading,
  onEditCustomer,
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
            {customers.map((customer) => (
              <tr key={customer.id}>
                <td className="user-directory-name">{customer.displayName}</td>
                <td>{customer.username ?? "Needs username"}</td>
                <td>{customer.email ?? "—"}</td>
                <td>
                  <Badge variant={getCustomerSignupSourceBadgeVariant(customer)}>
                    {getCustomerSignupSourceBadgeLabel(customer)}
                  </Badge>
                </td>
                <td className="user-directory-notes-cell">
                  <span
                    aria-label={customer.notes?.trim() ? "Customer has notes" : "Customer has no notes"}
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
                    <IconButton label="Edit Customer" onClick={() => onEditCustomer(customer)} variant="outline">
                      <Pencil aria-hidden="true" size={15} strokeWidth={2} />
                    </IconButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
