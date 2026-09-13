import type { ShowProductionRecoveryAction } from "@fresh-prints/shared/types/showProductionRecovery/showProductionRecovery.types";
import {
  deriveShowNeedsAttentionReason,
  formatShowNeedsAttentionReasonLabel,
  isUnresolvedPastWhatnotShow,
} from "@fresh-prints/shared/utils/showProductionRecovery";
import { isFinishableShowAllocationStatus } from "@fresh-prints/shared/utils/showFinishAllocationStatuses";
import type { UpcomingShow } from "@fresh-prints/shared/types/upcomingShow/upcomingShow.types";
import type { ShowAllocation } from "@fresh-prints/shared/types/showAllocation/showAllocation.types";

import { Button } from "../../../shared/components/Button";
import { Card } from "../../../shared/components/Card";
import { SHOW_PRODUCTION_RECOVERY_ACTION_LABELS } from "../services/showProductionRecoveryService";

interface NeedsAttentionShowPanelProps {
  show: UpcomingShow;
  allocations: ShowAllocation[];
  now: Date;
  canManage: boolean;
  isOwner: boolean;
  onSelectRecoveryAction: (action: ShowProductionRecoveryAction) => void;
  onOpenDidNotPrint: () => void;
  onOpenOwnerOverride: () => void;
}

export function NeedsAttentionShowPanel({
  show,
  allocations,
  now,
  canManage,
  isOwner,
  onSelectRecoveryAction,
  onOpenDidNotPrint,
  onOpenOwnerOverride,
}: NeedsAttentionShowPanelProps) {
  if (!isUnresolvedPastWhatnotShow(show, now)) {
    return null;
  }

  const activeAllocations = allocations.filter((allocation) => allocation.status !== "canceled");
  const finishableCount = activeAllocations.filter((allocation) =>
    isFinishableShowAllocationStatus(allocation.status),
  ).length;

  const reason = deriveShowNeedsAttentionReason({
    show,
    now,
    activeAllocationCount: activeAllocations.length,
    finishableAllocationCount: finishableCount,
    printStartedAtPresent: show.printStartedAt != null,
  });

  const printRequestCount = new Set(activeAllocations.map((allocation) => allocation.printRequestId))
    .size;

  return (
    <Card className="show-needs-attention-panel">
      <h3>Needs attention</h3>
      <p>{formatShowNeedsAttentionReasonLabel(reason)}</p>
      <ul className="show-needs-attention-facts">
        <li>Print Requests attached: {printRequestCount}</li>
        <li>Active allocation quantity: {show.allocatedQuantity}</li>
        <li>Production started: {show.printStartedAt ? "Yes" : "No"}</li>
      </ul>
      {canManage ? (
        <div className="show-needs-attention-actions">
          {activeAllocations.length === 0 ? (
            <Button onClick={() => onSelectRecoveryAction("close_empty")} type="button" variant="primary">
              {SHOW_PRODUCTION_RECOVERY_ACTION_LABELS.close_empty}
            </Button>
          ) : (
            <>
              <Button
                onClick={() => onSelectRecoveryAction("mark_fulfilled")}
                type="button"
                variant="primary"
              >
                {SHOW_PRODUCTION_RECOVERY_ACTION_LABELS.mark_fulfilled}
              </Button>
              <Button onClick={onOpenDidNotPrint} type="button" variant="secondary">
                Did Not Print…
              </Button>
            </>
          )}
          {isOwner ? (
            <Button onClick={onOpenOwnerOverride} type="button" variant="secondary">
              Owner override…
            </Button>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
