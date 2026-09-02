import type { PrintRequestListTab } from "../utils/printRequestListGrouping";

export function getPrintRequestTabHelperCopy(
  tab: PrintRequestListTab,
  options?: { isInternal?: boolean },
): string {
  if (options?.isInternal) {
    switch (tab) {
      case "working":
        return "Working — open internal carts not yet on a show or Internal Gang Sheet. Use Stale / Empty / All and search to find others.";
      case "editing":
        return "Editing — internal requests removed from every show / Internal Gang Sheet and back for revision.";
      case "queued":
        return "Queued — internal requests assigned to a show or Internal Gang Sheet. Completing the run moves them to Printed (there is no Printing step for internal requests).";
      case "printed":
        return "Printed — completed internal runs. Newest Internal Gang Sheet groups appear first. Use search to find a request name.";
      case "printing":
        return "";
      default:
        return "";
    }
  }

  switch (tab) {
    case "working":
      return "Working — open carts not yet on a show. Default view is Active (has items, updated recently). Use Stale / Empty / All and search to find others.";
    case "editing":
      return "Editing — customer requests removed from every show and back for revision (distinct from never-queued Working drafts).";
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
