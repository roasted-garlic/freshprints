import type { Customer } from "@fresh-prints/shared/types/customer/customer.types";
import { resolveCustomerSignupSource } from "@fresh-prints/shared/utils/customerSignupSource";

import type { AuditTrailEntry, AuditTrailSubject } from "../types/auditTrail.types";
import type { User } from "../types/user.types";
import { getAuditTimestampMillis } from "./auditTrailUtils";

export interface AuditTrailProfileSummary {
  displayName: string;
  email?: string;
  initials: string;
  kind: AuditTrailSubject["kind"];
  metadataItems: string[];
  registeredAtMillis: number;
}

export interface AuditTrailActivityStats {
  designsUploaded: number;
  printRequests: number;
  queuedShows: number;
  recentEvents: number;
}

function formatRoleLabel(role: User["role"]): string {
  if (role === "owner") {
    return "Owner";
  }

  if (role === "admin") {
    return "Admin";
  }

  if (role === "helper") {
    return "Helper";
  }

  return "Customer";
}

export function getDisplayInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "?";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function formatRegisteredLabel(registeredAtMillis: number): string {
  if (!registeredAtMillis) {
    return "Registered date unknown";
  }

  return `Registered ${new Date(registeredAtMillis).toLocaleDateString()}`;
}

function getCustomerCreatedLabel(customer: Customer): string {
  return resolveCustomerSignupSource(customer) === "portal" ? "Portal created" : "Studio created";
}

function buildTeamUserMetadata(user: User, registeredAtMillis: number): string[] {
  const items = [
    "Studio created",
    user.isActive ? "Active" : "Inactive",
    formatRoleLabel(user.role),
    formatRegisteredLabel(registeredAtMillis),
  ];

  if (user.email) {
    items.push(user.email);
  }

  return items;
}

function buildCustomerMetadata(customer: Customer, registeredAtMillis: number): string[] {
  const items = [getCustomerCreatedLabel(customer), formatRegisteredLabel(registeredAtMillis)];

  if (customer.username) {
    items.push(`@${customer.username}`);
  }

  if (customer.email) {
    items.push(customer.email);
  }

  return items;
}

export function buildAuditTrailProfile(subject: AuditTrailSubject): AuditTrailProfileSummary {
  if (subject.kind === "team_user") {
    const registeredAtMillis = getAuditTimestampMillis(subject.user.createdAt);

    return {
      kind: "team_user",
      displayName: subject.user.displayName,
      email: subject.user.email,
      initials: getDisplayInitials(subject.user.displayName),
      metadataItems: buildTeamUserMetadata(subject.user, registeredAtMillis),
      registeredAtMillis,
    };
  }

  const registeredAtMillis = getAuditTimestampMillis(subject.customer.createdAt);

  return {
    kind: "customer",
    displayName: subject.customer.displayName,
    email: subject.customer.email,
    initials: getDisplayInitials(subject.customer.displayName),
    metadataItems: buildCustomerMetadata(subject.customer, registeredAtMillis),
    registeredAtMillis,
  };
}

export function deriveAuditTrailActivityStats(
  subject: AuditTrailSubject,
  entries: AuditTrailEntry[],
): AuditTrailActivityStats {
  const printRequestIds = new Set<string>();
  let queuedShows = 0;
  let designsUploaded = 0;

  for (const entry of entries) {
    if (entry.id.startsWith("print-request:")) {
      const [, printRequestId] = entry.id.split(":");

      if (printRequestId) {
        printRequestIds.add(printRequestId);
      }
    }

    if (entry.id.startsWith("show-allocation:")) {
      queuedShows += 1;
    }

    if (entry.id.startsWith("design:")) {
      designsUploaded += 1;
    }
  }

  const printRequests =
    subject.kind === "customer"
      ? Math.max(subject.customer.totalPrintRequests, printRequestIds.size)
      : printRequestIds.size;

  return {
    printRequests,
    queuedShows,
    designsUploaded,
    recentEvents: entries.length,
  };
}
