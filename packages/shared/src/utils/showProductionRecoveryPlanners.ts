import type { ShowProductionStatus } from "../types/upcomingShow/upcomingShow.enums";
import type { ShowProductionRecoveryAction } from "../types/showProductionRecovery/showProductionRecovery.types";
import { isFinishableShowAllocationStatus } from "./showFinishAllocationStatuses";
import {
  isTerminalWhatnotProductionStatus,
  resolveProductionResolutionKindForAction,
  type ShowAllocationRecoverySnapshot,
} from "./showProductionRecovery";

export type ShowFinishMutationPlan = "mutate" | "already_terminal" | "reject";

/** Shared finish gate for Studio timer Finish and Functions remediation (ADR-FP-139). */
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

export interface ProductionRecoveryMutationPlan {
  canApply: boolean;
  alreadyTerminal: boolean;
  resolutionKind: ReturnType<typeof resolveProductionResolutionKindForAction>;
  finishAllocations: boolean;
  cancelAllocations: boolean;
  requeueAllocations: boolean;
  completeShow: boolean;
}

export function planProductionRecoveryMutation(
  action: ShowProductionRecoveryAction,
  input: {
    productionStatus: ShowProductionStatus | string | null | undefined;
    allocationsOnShow: readonly ShowAllocationRecoverySnapshot[];
    upcomingShowId: string;
  },
): ProductionRecoveryMutationPlan {
  const resolutionKind = resolveProductionResolutionKindForAction(action);
  const alreadyTerminal = isTerminalWhatnotProductionStatus(input.productionStatus);

  const activeOnShow = input.allocationsOnShow.filter(
    (allocation) =>
      allocation.upcomingShowId === input.upcomingShowId && allocation.status !== "canceled",
  );
  const finishableOnShow = activeOnShow.filter((allocation) =>
    isFinishableShowAllocationStatus(allocation.status as never),
  );

  const base = {
    alreadyTerminal,
    resolutionKind,
    finishAllocations: false,
    cancelAllocations: false,
    requeueAllocations: false,
    completeShow: false,
    canApply: false,
  };

  if (alreadyTerminal) {
    return { ...base, canApply: false };
  }

  switch (action) {
    case "close_empty":
      return {
        ...base,
        canApply: activeOnShow.length === 0,
        completeShow: true,
      };
    case "mark_fulfilled":
      return {
        ...base,
        canApply: finishableOnShow.length > 0,
        finishAllocations: true,
        completeShow: true,
      };
    case "release_unfulfilled":
      return {
        ...base,
        canApply: activeOnShow.length > 0,
        cancelAllocations: true,
        completeShow: true,
      };
    case "requeue_unfulfilled":
      return {
        ...base,
        canApply: finishableOnShow.length > 0,
        cancelAllocations: true,
        requeueAllocations: true,
        completeShow: true,
      };
    case "force_completed":
      if (finishableOnShow.length > 0) {
        return {
          ...base,
          canApply: true,
          finishAllocations: true,
          completeShow: true,
        };
      }
      if (activeOnShow.length === 0) {
        return {
          ...base,
          canApply: true,
          completeShow: true,
        };
      }
      return {
        ...base,
        canApply: true,
        cancelAllocations: true,
        completeShow: true,
      };
    default:
      return base;
  }
}
