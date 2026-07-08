import { useCallback, useEffect, useState } from "react";

import { useAuth } from "../../auth/hooks/useAuth";
import { buildPrintRequestAllocationTotalsByRequestId } from "@fresh-prints/shared/utils/showAllocationTotals";
import { upcomingShowService } from "../../upcoming-shows/services/upcomingShowService";

type AllocationTotalsByRequestId = ReturnType<typeof buildPrintRequestAllocationTotalsByRequestId>;

/**
 * Loads every show allocation once and groups totals by `printRequestId`, so the Print Requests
 * list can derive Working/Queued/Printed tabs without a persisted queue-status field on each
 * request.
 */
interface ReloadAllocationTotalsOptions {
  silent?: boolean;
}

export function usePrintRequestAllocationTotals() {
  const { user } = useAuth();
  const [totalsByRequestId, setTotalsByRequestId] = useState<AllocationTotalsByRequestId>({});
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async (options?: ReloadAllocationTotalsOptions) => {
    if (!user) {
      setTotalsByRequestId({});
      setIsLoading(false);
      return;
    }

    if (!options?.silent) {
      setIsLoading(true);
    }
    const allocations = await upcomingShowService.listAllShowAllocations(user);
    setTotalsByRequestId(buildPrintRequestAllocationTotalsByRequestId(allocations));
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { totalsByRequestId, isLoading, reload };
}
