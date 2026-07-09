import type { Customer } from "@fresh-prints/shared/types/customer/customer.types";

import { userService } from "./userService";
import { userAuditTrailActivityService } from "./userAuditTrailActivityService";
import type { User } from "../types/user.types";
import type { AuditTrailEntry } from "../types/auditTrail.types";
import { mergeAuditTrailEntries } from "../utils/auditTrailUtils";

async function resolveActorLabels(entries: AuditTrailEntry[]): Promise<AuditTrailEntry[]> {
  const actorIds = [...new Set(entries.map((entry) => entry.actorUserId).filter(Boolean))] as string[];
  const actorLabelById = new Map<string, string>();

  await Promise.all(
    actorIds.map(async (actorId) => {
      try {
        const actor = await userService.getUserById(actorId);
        actorLabelById.set(actorId, actor.displayName);
      } catch {
        actorLabelById.set(actorId, actorId);
      }
    }),
  );

  return entries.map((entry) => ({
    ...entry,
    actorLabel: entry.actorUserId ? actorLabelById.get(entry.actorUserId) ?? entry.actorUserId : undefined,
  }));
}

export const userAuditTrailService = {
  async listTeamUserAuditTrail(caller: User, user: User): Promise<AuditTrailEntry[]> {
    const activityEntries = await userAuditTrailActivityService.listTeamUserActivityEntries(caller, user);
    return resolveActorLabels(mergeAuditTrailEntries(activityEntries));
  },

  async listCustomerAuditTrail(caller: User, customer: Customer): Promise<AuditTrailEntry[]> {
    const activityEntries = await userAuditTrailActivityService.listCustomerActivityEntries(caller, customer);
    return resolveActorLabels(mergeAuditTrailEntries(activityEntries));
  },
};
