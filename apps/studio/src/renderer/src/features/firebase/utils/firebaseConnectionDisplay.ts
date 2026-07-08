import type { BadgeVariant } from "../../../shared/components/Badge";
import type { FirebaseConnectionResult, FirebaseConnectionStatus } from "../types/firebaseConnection.types";

export function getConnectionStatusLabel(status: FirebaseConnectionStatus): string {
  switch (status) {
    case "checking":
      return "Checking";
    case "connected":
      return "Connected";
    case "protected":
      return "Protected by rules";
    case "failed":
      return "Failed";
  }
}

export function getConnectionBadgeVariant(status: FirebaseConnectionStatus): BadgeVariant {
  switch (status) {
    case "failed":
      return "danger";
    case "protected":
      return "warning";
    case "checking":
      return "default";
    case "connected":
      return "success";
  }
}

export function getOverallStatusLabel(status: FirebaseConnectionStatus): string {
  return getConnectionStatusLabel(status);
}

export function getOverallSummaryMessage(result: FirebaseConnectionResult): string {
  if (result.status === "failed") {
    return "One or more Firebase services failed to respond.";
  }

  const protectedChecks = result.checks.filter((check) => check.status === "protected");

  if (protectedChecks.length > 0) {
    const serviceNames = protectedChecks.map((check) => check.label).join(" and ");
    const verb = protectedChecks.length === 1 ? "is" : "are";

    return `Firebase is connected. ${serviceNames} ${verb} reachable but protected by security rules.`;
  }

  return "All Firebase services responded successfully.";
}
