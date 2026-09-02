/**
 * Shared Internal Gang Sheet History / Print Requests Internal→Printed section ordering.
 * Most recently completed sheet first. Do not use for Current/Upcoming/Past Whatnot lists.
 */

export interface StaffGangSheetHistorySortable {
  id: string;
  staffGangSheetCycleNumber?: number | null;
  printFinishedAt?: { toMillis: () => number } | null;
}

function compareCycleNumberDesc(
  left: StaffGangSheetHistorySortable,
  right: StaffGangSheetHistorySortable,
): number | null {
  const leftCycle = left.staffGangSheetCycleNumber;
  const rightCycle = right.staffGangSheetCycleNumber;
  const leftValid = typeof leftCycle === "number" && Number.isInteger(leftCycle);
  const rightValid = typeof rightCycle === "number" && Number.isInteger(rightCycle);

  if (leftValid && rightValid && leftCycle !== rightCycle) {
    return (rightCycle as number) - (leftCycle as number);
  }

  return null;
}

/**
 * Comparator: `printFinishedAt` DESC → missing finish last → cycle DESC → `id`.
 */
export function compareStaffGangSheetHistoryOrder(
  left: StaffGangSheetHistorySortable,
  right: StaffGangSheetHistorySortable,
): number {
  const leftMillis = left.printFinishedAt?.toMillis();
  const rightMillis = right.printFinishedAt?.toMillis();

  if (leftMillis === undefined && rightMillis === undefined) {
    return compareCycleNumberDesc(left, right) ?? left.id.localeCompare(right.id);
  }

  if (leftMillis === undefined) {
    return 1;
  }

  if (rightMillis === undefined) {
    return -1;
  }

  if (leftMillis !== rightMillis) {
    return rightMillis - leftMillis;
  }

  return compareCycleNumberDesc(left, right) ?? left.id.localeCompare(right.id);
}

export function sortStaffGangSheetHistoryRecords<T extends StaffGangSheetHistorySortable>(
  shows: readonly T[],
): T[] {
  return [...shows].sort(compareStaffGangSheetHistoryOrder);
}
