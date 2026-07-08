import type { PrintRequest, PrintRequestOrigin } from "../types/printRequest/printRequest.types";

const PRINT_REQUEST_ORIGINS: PrintRequestOrigin[] = [
  "studio_internal",
  "studio_customer",
  "portal_customer",
];

export function isPrintRequestOrigin(value: unknown): value is PrintRequestOrigin {
  return typeof value === "string" && PRINT_REQUEST_ORIGINS.includes(value as PrintRequestOrigin);
}

export function getPrintRequestOriginBadgeLabel(
  printRequest: Pick<PrintRequest, "requestOrigin" | "isInternal" | "customerId">,
): "Internal" | "Staff Created" | "Customer Submitted" | "Legacy" {
  switch (printRequest.requestOrigin) {
    case "studio_internal":
      return "Internal";
    case "studio_customer":
      return "Staff Created";
    case "portal_customer":
      return "Customer Submitted";
    default:
      break;
  }

  if (printRequest.isInternal) {
    return "Internal";
  }

  if (printRequest.customerId) {
    return "Staff Created";
  }

  return "Legacy";
}
