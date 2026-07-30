export interface PortalPersonalShowUsage {
  used: number;
  limit: number;
  remaining: number;
  usedLabel: string;
  /**
   * Undefined for a non-allocatable (historical/full/past) show — displaying "N spots remaining"
   * on a show that can no longer accept requests would falsely imply those spots are still usable
   * (Plan Section 29.6). Always present for an allocatable show.
   */
  remainingLabel: string | undefined;
}

export function buildPortalPersonalShowUsage(
  serverUsed: number,
  limit: number,
  pendingSuccessfulQuantity = 0,
  isAllocatable = true,
): PortalPersonalShowUsage {
  const normalizedLimit = Math.max(0, Math.floor(limit));
  const used = Math.max(0, Math.floor(serverUsed)) + Math.max(0, Math.floor(pendingSuccessfulQuantity));
  const remaining = Math.max(0, normalizedLimit - used);
  return {
    used,
    limit: normalizedLimit,
    remaining,
    usedLabel: `Your print spots: ${used} of ${normalizedLimit} used`,
    remainingLabel: isAllocatable ? `${remaining} spots remaining` : undefined,
  };
}

export function resolveSelectedPortalPersonalShowUsage(input: {
  shows: ReadonlyArray<{ id: string; customerAllocatedQuantity?: number; isAllocatable?: boolean }>;
  selectedShowId: string | null;
  limit: number | null;
  pendingSuccessfulByShowId?: ReadonlyMap<string, number>;
}): PortalPersonalShowUsage | null {
  if (!input.selectedShowId || input.limit === null) return null;
  const selectedShow = input.shows.find((show) => show.id === input.selectedShowId);
  if (!selectedShow) return null;
  return buildPortalPersonalShowUsage(
    selectedShow.customerAllocatedQuantity ?? 0,
    input.limit,
    input.pendingSuccessfulByShowId?.get(input.selectedShowId) ?? 0,
    selectedShow.isAllocatable !== false,
  );
}
