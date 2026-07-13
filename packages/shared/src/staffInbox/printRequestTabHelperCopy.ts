import type { PrintRequestListTab } from "../utils/printRequestListGrouping";

export function getPrintRequestTabHelperCopy(tab: PrintRequestListTab): string {
  switch (tab) {
    case "working":
      return "Working — open carts not yet on a show. Default view is Active (has items, updated recently). Use Stale / Empty / All and search to find others.";
    case "queued":
      return "Queued — customer requests assigned to a show's print run. Also visible on Show Queue. Use search to find a customer or request name.";
    case "printing":
      return "Printing — requests currently in production on a show. Use search to find a customer or request name.";
    case "printed":
      return "Printed — completed print runs. Use search to find a customer or request name.";
    default:
      return "";
  }
}
