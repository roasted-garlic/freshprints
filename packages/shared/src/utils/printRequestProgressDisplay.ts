import type { PrintRequestQueueState } from "./printRequestQueueState";

export function getPrintRequestProgressLabel(state: PrintRequestQueueState): string {
  switch (state) {
    case "not_queued":
      return "Working";
    case "partially_queued":
      return "Partially queued";
    case "queued":
      return "Queued";
    case "printing":
      return "Printing";
    case "partially_printed":
      return "Partially printed";
    case "printed":
      return "Printed";
  }
}
