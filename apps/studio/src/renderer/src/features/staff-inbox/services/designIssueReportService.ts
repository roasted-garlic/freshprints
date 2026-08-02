import { getDocs, limit, orderBy, query, where, type DocumentData } from "firebase/firestore";
import type { ResolveDesignIssueReportRequest, ResolveDesignIssueReportResponse } from "@fresh-prints/shared/designIssueReports/designIssueReport.types";
import { DESIGN_ISSUE_REPORT_HISTORY_PAGE_SIZE } from "@fresh-prints/shared/designIssueReports/designIssueReport.constants";
import { callTracedFunction } from "../../../config/tracedCallable";
import { firestoreCollectionService } from "../../firebase/services/firestoreCollectionService";

export const designIssueReportService = {
  resolve(reportId: string) { return callTracedFunction<ResolveDesignIssueReportRequest, ResolveDesignIssueReportResponse>("resolveDesignIssueReport", { source: "designIssueReportService.resolve" })({ reportId }); },
  async listResolved(): Promise<DocumentData[]> { const snapshot = await getDocs(query(firestoreCollectionService.getDesignIssueReportsCollection(), where("status", "==", "resolved"), orderBy("resolvedAt", "desc"), limit(DESIGN_ISSUE_REPORT_HISTORY_PAGE_SIZE))); return snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })); },
};
