import type { PortalCustomerShowSchedule } from "../../utils/portalCustomerShowSchedule";

export interface GetPortalPrintRequestShowSchedulesRequest {
  printRequestIds: string[];
}

export interface PortalPrintRequestShowScheduleEntry {
  printRequestId: string;
  shows: Array<Pick<PortalCustomerShowSchedule, "upcomingShowId" | "scheduledStartAt" | "missingShow">>;
}

export interface GetPortalPrintRequestShowSchedulesResponse {
  requests: PortalPrintRequestShowScheduleEntry[];
}
