import type { SubmitPortalDesignIssueReportRequest, SubmitPortalDesignIssueReportResponse } from '@fresh-prints/shared/designIssueReports/designIssueReport.types';
import { callTracedFunction } from '../../../lib/firebase/tracedCallable';

export const catalogDesignIssueReportService = {
  submit(input: SubmitPortalDesignIssueReportRequest) {
    return callTracedFunction<SubmitPortalDesignIssueReportRequest, SubmitPortalDesignIssueReportResponse>(
      'submitPortalDesignIssueReport', { source: 'catalogDesignIssueReportService.submit' },
    )(input);
  },
};
