import type { CustomerSignupSource } from "../types/customer/customer.enums";
import type { Customer } from "../types/customer/customer.types";

export function isCustomerSignupSource(value: unknown): value is CustomerSignupSource {
  return value === "studio" || value === "portal";
}

function normalizeLegacySignupSource(value: unknown): CustomerSignupSource | undefined {
  if (value === "studio_invite") {
    return "studio";
  }

  return isCustomerSignupSource(value) ? value : undefined;
}

export function parseCustomerSignupSource(value: unknown): CustomerSignupSource | undefined {
  return normalizeLegacySignupSource(value);
}

export function resolveCustomerSignupSource(
  customer: Pick<Customer, "signupSource" | "userId">,
): CustomerSignupSource {
  const normalizedSource = normalizeLegacySignupSource(customer.signupSource);

  if (normalizedSource) {
    return normalizedSource;
  }

  return customer.userId ? "portal" : "studio";
}

export function getCustomerSignupSourceBadgeVariant(
  customer: Pick<Customer, "signupSource" | "userId">,
): "success" | "warning" {
  const source = resolveCustomerSignupSource(customer);

  return source === "portal" ? "success" : "warning";
}

export function getCustomerSignupSourceBadgeLabel(
  customer: Pick<Customer, "signupSource" | "userId">,
): "Studio" | "Portal" {
  const source = resolveCustomerSignupSource(customer);

  return source === "portal" ? "Portal" : "Studio";
}
