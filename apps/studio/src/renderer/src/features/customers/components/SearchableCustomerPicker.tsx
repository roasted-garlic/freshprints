import { useEffect, useMemo, useState, type ChangeEvent } from "react";

import type { Customer } from "@fresh-prints/shared/types/customer/customer.types";

import { Select } from "../../../shared/components/Select";
import { customerService } from "../services/customerService";
import {
  classifyCustomerAccountVisibility,
  isActiveCustomerAccount,
} from "../../users/utils/customerDirectoryVisibility";
import type { User } from "../../users/types/user.types";

interface SearchableCustomerPickerProps {
  caller: User | null | undefined;
  value?: string | null;
  onChange: (customerId: string | null, customer?: Customer) => void;
  /**
   * When false (default), only active customers appear.
   * Merged, disabled, and closed/deleted accounts are hidden.
   */
  allowHistorical?: boolean;
  /**
   * When set, only these customer IDs appear (plus the current value if missing).
   * Use for list filters that should show customers tied to the current result set.
   */
  allowedCustomerIds?: ReadonlySet<string> | readonly string[] | null;
  disabled?: boolean;
  id?: string;
  label?: string;
  /** Label for the empty/null option. Defaults to "Unassigned". */
  emptyOptionLabel?: string;
  className?: string;
  searchEmptyMessage?: string;
}

function formatCustomerOptionLabel(customer: Customer, includeVisibility: boolean): string {
  const username = customer.username ? ` · @${customer.username}` : "";
  if (!includeVisibility) {
    return `${customer.displayName}${username}`;
  }
  const visibility = classifyCustomerAccountVisibility(customer);
  return `${customer.displayName}${username} · ${visibility}`;
}

export function SearchableCustomerPicker({
  caller,
  value,
  onChange,
  allowHistorical = false,
  allowedCustomerIds = null,
  disabled = false,
  id = "staff-artwork-customer",
  label = "Customer",
  emptyOptionLabel = "Unassigned",
  className,
  searchEmptyMessage = "No active customers match",
}: SearchableCustomerPickerProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    if (!caller) return;
    void customerService
      .listCustomersForIntakeSearch(caller)
      .then(setCustomers)
      .catch(() => setCustomers([]));
  }, [caller]);

  const allowedIdSet = useMemo(() => {
    if (!allowedCustomerIds) return null;
    return allowedCustomerIds instanceof Set
      ? allowedCustomerIds
      : new Set(allowedCustomerIds);
  }, [allowedCustomerIds]);

  const options = useMemo(() => {
    const eligible = customers
      .filter((customer) => {
        if (allowedIdSet) {
          return allowedIdSet.has(customer.id);
        }
        return allowHistorical ? true : isActiveCustomerAccount(customer);
      })
      .filter((customer) => classifyCustomerAccountVisibility(customer) !== "merged")
      .sort((left, right) => left.displayName.localeCompare(right.displayName));

    const selected = value
      ? customers.find((customer) => customer.id === value)
      : undefined;
    const selectedMissing =
      selected && !eligible.some((customer) => customer.id === selected.id) ? [selected] : [];

    return [
      { label: emptyOptionLabel, value: "" },
      ...[...selectedMissing, ...eligible].map((customer) => ({
        label: formatCustomerOptionLabel(
          customer,
          allowHistorical || Boolean(selectedMissing.length) || Boolean(allowedIdSet),
        ),
        value: customer.id,
        disabled: classifyCustomerAccountVisibility(customer) === "merged",
      })),
    ];
  }, [allowHistorical, allowedIdSet, customers, emptyOptionLabel, value]);

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextId = event.target.value || null;
    const customer = nextId ? customers.find((entry) => entry.id === nextId) : undefined;
    onChange(nextId, customer);
  };

  return (
    <Select
      className={className}
      id={id}
      label={label}
      name={id}
      value={value ?? ""}
      onChange={handleChange}
      options={options}
      disabled={disabled || !caller}
      searchable
      searchPlaceholder="Search name, username, or email"
      searchEmptyMessage={searchEmptyMessage}
    />
  );
}
