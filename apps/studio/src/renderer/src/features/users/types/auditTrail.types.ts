import type { Customer } from "@fresh-prints/shared/types/customer/customer.types";

import type { User } from "../types/user.types";

export interface AuditTrailEntry {
  id: string;
  label: string;
  detail?: string;
  occurredAtMillis: number;
  actorUserId?: string;
  actorLabel?: string;
}

export type AuditTrailSubject =
  | {
      kind: "team_user";
      user: User;
    }
  | {
      kind: "customer";
      customer: Customer;
    };

export function getAuditTrailSubjectTitle(subject: AuditTrailSubject): string {
  return subject.kind === "team_user" ? subject.user.displayName : subject.customer.displayName;
}
