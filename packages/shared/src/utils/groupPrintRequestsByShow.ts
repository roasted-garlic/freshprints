import type { PrintRequest } from "../types/printRequest/printRequest.types";
import type { ShowAllocation } from "../types/showAllocation/showAllocation.types";
import { compareStaffGangSheetHistoryOrder } from "./staffGangSheetHistorySort";

export const UNASSIGNED_SHOW_SECTION_KEY = "unassigned";

export type PrintRequestShowSectionOrder = "scheduled_start_asc" | "staff_gang_sheet_history";

export interface PrintRequestShowSectionShow {
  id: string;
  scheduledStartAt?: unknown;
  staffGangSheetCycleNumber?: number | null;
  printFinishedAt?: { toMillis: () => number } | null;
}

export interface PrintRequestShowSection<TShow extends PrintRequestShowSectionShow> {
  sectionKey: string;
  show: TShow | null;
  requests: PrintRequest[];
  extraShowCountByRequestId: Record<string, number>;
}

export function resolveGangSheetProductionGroupKey(request: {
  customerId?: string;
  customerUsernameSnapshot?: string;
  internalBaseName?: string;
  isInternal: boolean;
  printRequestId: string;
}): string {
  if (request.customerId) {
    return `customer:${request.customerId}`;
  }

  if (request.customerUsernameSnapshot?.trim()) {
    return `customer-username:${request.customerUsernameSnapshot.trim().toLowerCase()}`;
  }

  if (request.isInternal && request.internalBaseName?.trim()) {
    return `internal-base:${request.internalBaseName.trim().toLowerCase()}`;
  }

  return `request:${request.printRequestId}`;
}

export function buildGroupedGangSheetSectionHeading(requestNames: readonly string[]): string {
  const uniqueNames = [...new Set(requestNames.map((name) => name.trim()).filter(Boolean))].sort((left, right) =>
    left.localeCompare(right),
  );

  if (uniqueNames.length === 0) {
    return "Request group";
  }

  return uniqueNames.join(", ");
}

export function buildGroupedGangSheetSectionContinuedHeading(baseHeading: string): string {
  const trimmed = baseHeading.trim();
  if (!trimmed) {
    return "Request group-Continued";
  }

  return `${trimmed}-Continued`;
}

function resolveShowTimestamp(show: { scheduledStartAt?: unknown } | null): number {
  if (!show?.scheduledStartAt) {
    return Number.POSITIVE_INFINITY;
  }

  if (typeof show.scheduledStartAt === "object" && show.scheduledStartAt !== null && "toDate" in show.scheduledStartAt) {
    const value = (show.scheduledStartAt as { toDate: () => Date }).toDate();
    return value.getTime();
  }

  if (show.scheduledStartAt instanceof Date) {
    return show.scheduledStartAt.getTime();
  }

  return Number.POSITIVE_INFINITY;
}

function resolvePrimaryShowId<TShow extends PrintRequestShowSectionShow>(
  showIds: readonly string[],
  showsById: Readonly<Record<string, TShow>>,
): string | null {
  if (showIds.length === 0) {
    return null;
  }

  const sorted = [...showIds].sort((leftId, rightId) => {
    const leftAt = resolveShowTimestamp(showsById[leftId] ?? null);
    const rightAt = resolveShowTimestamp(showsById[rightId] ?? null);
    return leftAt - rightAt;
  });

  return sorted[0] ?? null;
}

function compareSectionsByScheduledStartAsc<TShow extends PrintRequestShowSectionShow>(
  left: PrintRequestShowSection<TShow>,
  right: PrintRequestShowSection<TShow>,
): number {
  const leftAt = resolveShowTimestamp(left.show);
  const rightAt = resolveShowTimestamp(right.show);
  if (leftAt !== rightAt) {
    return leftAt - rightAt;
  }

  return left.sectionKey.localeCompare(right.sectionKey);
}

function compareSectionsByStaffGangSheetHistory<TShow extends PrintRequestShowSectionShow>(
  left: PrintRequestShowSection<TShow>,
  right: PrintRequestShowSection<TShow>,
): number {
  if (!left.show && !right.show) {
    return left.sectionKey.localeCompare(right.sectionKey);
  }
  if (!left.show) {
    return 1;
  }
  if (!right.show) {
    return -1;
  }

  return compareStaffGangSheetHistoryOrder(left.show, right.show);
}

export function groupPrintRequestsByShow<TShow extends PrintRequestShowSectionShow>(input: {
  requests: readonly PrintRequest[];
  allocationsByRequestId: Readonly<Record<string, readonly ShowAllocation[]>>;
  showsById: Readonly<Record<string, TShow>>;
  now?: Date;
  /** Default: upcoming-schedule ASC. Use `staff_gang_sheet_history` for Internal→Printed. */
  sectionOrder?: PrintRequestShowSectionOrder;
}): PrintRequestShowSection<TShow>[] {
  const sectionOrder = input.sectionOrder ?? "scheduled_start_asc";
  const sectionMap = new Map<string, PrintRequestShowSection<TShow>>();

  for (const request of input.requests) {
    const activeAllocations = (input.allocationsByRequestId[request.id] ?? []).filter(
      (allocation) => allocation.status !== "canceled",
    );

    if (activeAllocations.length === 0) {
      const section =
        sectionMap.get(UNASSIGNED_SHOW_SECTION_KEY) ??
        ({
          sectionKey: UNASSIGNED_SHOW_SECTION_KEY,
          show: null,
          requests: [],
          extraShowCountByRequestId: {},
        } satisfies PrintRequestShowSection<TShow>);
      section.requests.push(request);
      sectionMap.set(UNASSIGNED_SHOW_SECTION_KEY, section);
      continue;
    }

    const uniqueShowIds = [...new Set(activeAllocations.map((allocation) => allocation.upcomingShowId))];
    const primaryShowId = resolvePrimaryShowId(uniqueShowIds, input.showsById);

    const sectionKey = primaryShowId ?? UNASSIGNED_SHOW_SECTION_KEY;
    const section =
      sectionMap.get(sectionKey) ??
      ({
        sectionKey,
        show: primaryShowId ? (input.showsById[primaryShowId] ?? null) : null,
        requests: [],
        extraShowCountByRequestId: {},
      } satisfies PrintRequestShowSection<TShow>);

    section.requests.push(request);
    sectionMap.set(sectionKey, section);

    if (uniqueShowIds.length > 1) {
      section.extraShowCountByRequestId[request.id] = uniqueShowIds.length - 1;
    }
  }

  const sections = [...sectionMap.values()];

  sections.sort((left, right) => {
    if (left.sectionKey === UNASSIGNED_SHOW_SECTION_KEY) {
      return 1;
    }
    if (right.sectionKey === UNASSIGNED_SHOW_SECTION_KEY) {
      return -1;
    }

    if (sectionOrder === "staff_gang_sheet_history") {
      return compareSectionsByStaffGangSheetHistory(left, right);
    }

    return compareSectionsByScheduledStartAsc(left, right);
  });

  for (const section of sections) {
    section.requests.sort((left, right) => right.updatedAt.toMillis() - left.updatedAt.toMillis());
  }

  return sections;
}
