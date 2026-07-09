import type { PrintRequestListTab } from "../utils/printRequestListGrouping";

export function getPrintRequestTabHelperCopy(tab: PrintRequestListTab): string {
  switch (tab) {
    case "working":
      return "Working — portal customers build requests here until they add them to a show's print run.";
    case "queued":
      return "Queued — customer requests assigned to a show's print run. Also visible on Show Queue.";
    case "printing":
      return "Printing — requests currently in production on a show.";
    case "printed":
      return "Printed — completed print runs.";
    default:
      return "";
  }
}
