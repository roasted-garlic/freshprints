import type { PrintRequest } from "@fresh-prints/shared/types/printRequest/printRequest.types";

/**
 * Render-time safety net: keeps only requests whose persisted `isInternal` matches the selected
 * Customer (`false`) or Internal (`true`) list. Complements `filterPrintRequestsByActiveTab`.
 * Discriminator is the boolean field, never the request name.
 */
export function filterPrintRequestsByRequestKind(
  requests: readonly PrintRequest[],
  isInternal: boolean,
): PrintRequest[] {
  return requests.filter((request) => request.isInternal === isInternal);
}
