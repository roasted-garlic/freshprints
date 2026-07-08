function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

/**
 * Formats the "Request has N designs with a total qty of M prints" summary shown when adding a
 * Print Request to a show, with correct singular/plural for both design count and print quantity.
 */
export function formatPrintRequestAllocationSummary(designCount: number, totalQuantity: number): string {
  const designWord = pluralize(designCount, "design", "designs");
  const printWord = pluralize(totalQuantity, "print", "prints");

  return `Request has ${designCount} ${designWord} with a total qty of ${totalQuantity} ${printWord}.`;
}
