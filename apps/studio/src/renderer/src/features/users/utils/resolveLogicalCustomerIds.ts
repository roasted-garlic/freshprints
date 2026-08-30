import type { Customer } from "@fresh-prints/shared/types/customer/customer.types";

/** Survivor id first, then unique merged source ids (WS3 alias set). */
export function resolveLogicalCustomerIds(customer: Customer): string[] {
  const ids = [customer.id];

  for (const sourceId of customer.mergedSourceCustomerIds ?? []) {
    const trimmed = sourceId.trim();
    if (trimmed && !ids.includes(trimmed)) {
      ids.push(trimmed);
    }
  }

  return ids;
}

/** Firestore `in` queries allow at most 10 values. */
export function batchFirestoreInValues(values: readonly string[], batchSize = 10): string[][] {
  const batches: string[][] = [];

  for (let index = 0; index < values.length; index += batchSize) {
    batches.push(values.slice(index, index + batchSize));
  }

  return batches;
}
