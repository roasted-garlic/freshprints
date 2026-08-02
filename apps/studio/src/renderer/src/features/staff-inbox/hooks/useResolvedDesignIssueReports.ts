import { useCallback, useState } from "react";
import type { DesignIssueReport } from "@fresh-prints/shared/designIssueReports/designIssueReport.types";
import { designIssueReportService } from "../services/designIssueReportService";

export function useResolvedDesignIssueReports() {
  const [reports, setReports] = useState<DesignIssueReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setReports(await designIssueReportService.listResolved());
      setHasLoaded(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load resolved reports.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { reports, isLoading, hasLoaded, error, load };
}
