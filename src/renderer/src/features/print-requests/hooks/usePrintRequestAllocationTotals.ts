import { useCallback, useEffect, useState } from "react";

import { useAuth } from "../../auth/hooks/useAuth";
import { upcomingShowService, isPrintedAllocationStatus } from "../../upcoming-shows/services/upcomingShowService";

export interface PrintRequestAllocationTotals {
  totalAllocatedQuantity: number;
  totalPrintedQuantity: number;
}

type AllocationTotalsByRequestId = Record<string, PrintRequestAllocationTotals>;

/**
 * Loads every show allocation once and groups totals by `printRequestId`, so the Print Requests
 * list can derive Working/Queued/Printed tabs without a persisted queue-status field on each
 * request.
 */
export function usePrintRequestAllocationTotals() {
  const { user } = useAuth();
  const [totalsByRequestId, setTotalsByRequestId] = useState<AllocationTotalsByRequestId>({});
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!user) {
      setTotalsByRequestId({});
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const allocations = await upcomingShowService.listAllShowAllocations(user);
    const totals: AllocationTotalsByRequestId = {};

    for (const allocation of allocations) {
      if (allocation.status === "canceled") {
        continue;
      }

      const current = totals[allocation.printRequestId] ?? { totalAllocatedQuantity: 0, totalPrintedQuantity: 0 };
      current.totalAllocatedQuantity += allocation.allocatedQuantity;

      if (isPrintedAllocationStatus(allocation.status)) {
        current.totalPrintedQuantity += allocation.allocatedQuantity;
      }

      totals[allocation.printRequestId] = current;
    }

    setTotalsByRequestId(totals);
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { totalsByRequestId, isLoading, reload };
}
