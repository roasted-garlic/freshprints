import type { ShowProductionStatus } from "@fresh-prints/shared/types/upcomingShow/upcomingShow.enums";

export type ShowFinishMutationPlan = "mutate" | "already_terminal" | "reject";

export function resolveShowFinishMutationPlan(
  productionStatus: ShowProductionStatus | string | null | undefined,
): ShowFinishMutationPlan {
  if (productionStatus === "completed" || productionStatus === "fully_printed") {
    return "already_terminal";
  }
  if (productionStatus === "printing") {
    return "mutate";
  }
  return "reject";
}
