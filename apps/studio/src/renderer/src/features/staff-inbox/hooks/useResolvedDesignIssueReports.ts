import { useCallback, useState } from "react";
import { designIssueReportService } from "../services/designIssueReportService";

export function useResolvedDesignIssueReports() {
  const [reports, setReports] = useState<Array<Record<string, unknown>>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => { setIsLoading(true); setError(null); try { setReports(await designIssueReportService.listResolved() as Array<Record<string, unknown>>); } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to load resolved reports."); } finally { setIsLoading(false); } }, []);
  return { reports, isLoading, error, load };
}
