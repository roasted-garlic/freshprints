/**
 * Pure helpers for the pairwise (non-transitive) companion link model. A companion relationship
 * is an edge between exactly two designs — never a transitive group — so linking B↔D when D is
 * already linked to A must never make A and B appear related. See `companionSetService` for the
 * transactional read/write side (edge doc + `companionDesignIds` denorm sync).
 */

/**
 * Deterministic ascending pair for a companion edge between `a` and `b`. Stable regardless of
 * call order, so `sortedCompanionPair(a, b)` and `sortedCompanionPair(b, a)` always agree.
 */
export function sortedCompanionPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

/**
 * Canonical `companionLinks/{id}` document ID for the edge between `a` and `b`:
 * `${min(a,b)}_${max(a,b)}`. Deterministic and order-independent, which is what prevents a
 * duplicate edge from ever being created for the same pair.
 */
export function buildCompanionLinkId(a: string, b: string): string {
  const [first, second] = sortedCompanionPair(a, b);
  return `${first}_${second}`;
}

/**
 * Adds `peerId` to a design's `companionDesignIds` neighbor list if not already present.
 * Idempotent.
 */
export function addCompanionNeighbor(companionDesignIds: string[], peerId: string): string[] {
  if (companionDesignIds.includes(peerId)) {
    return companionDesignIds;
  }

  return [...companionDesignIds, peerId];
}

/**
 * Removes `peerId` from a design's `companionDesignIds` neighbor list. Idempotent — a no-op when
 * already absent.
 */
export function removeCompanionNeighbor(companionDesignIds: string[], peerId: string): string[] {
  return companionDesignIds.filter((neighborId) => neighborId !== peerId);
}

export type CompanionSetStatusLabel = "Needs Companion" | "Linked" | "Not linked";

/**
 * Staff-facing status from a design's own denorm fields only (no Firestore reads).
 *
 * - **Linked** — the design has at least one direct companion neighbor (`companionDesignIds`
 *   non-empty). This always wins, even over a stale `companionSetIncomplete: true` left over
 *   from before it was linked — a linked design must never display as queued.
 * - **Needs Companion** — the unlinked-only working queue: no neighbors, and staff explicitly
 *   flagged it.
 * - **Not linked** — no neighbors, not flagged.
 */
export function resolveCompanionSetStatusLabel(
  design: { companionDesignIds?: string[]; companionSetIncomplete?: boolean },
): CompanionSetStatusLabel {
  if (design.companionDesignIds && design.companionDesignIds.length > 0) {
    return "Linked";
  }

  if (design.companionSetIncomplete === true) {
    return "Needs Companion";
  }

  return "Not linked";
}

/**
 * Sort/link-picker helper: Needs Companion designs first, then title.
 */
export function compareDesignsForCompanionLinkPicker(left: DesignLike, right: DesignLike): number {
  const leftNeeds = left.companionSetIncomplete === true ? 0 : 1;
  const rightNeeds = right.companionSetIncomplete === true ? 0 : 1;

  if (leftNeeds !== rightNeeds) {
    return leftNeeds - rightNeeds;
  }

  return left.title.localeCompare(right.title, undefined, { sensitivity: "base" });
}

interface DesignLike {
  title: string;
  companionSetIncomplete?: boolean;
}

/**
 * Eligible link-picker targets: exclude self and designs already a direct neighbor of the
 * current design. Deliberately does **not** exclude candidates that are already linked
 * elsewhere — companion links are many-to-many, so a design with other companions must remain
 * linkable to additional partners.
 *
 * Generic so callers passing the full `Design[]` (or any richer shape) get that same richer type
 * back, rather than being narrowed down to this helper's minimal structural requirement.
 */
export function filterEligibleCompanionLinkTargets<
  T extends { id: string; companionDesignIds?: string[]; title: string; companionSetIncomplete?: boolean },
>(designs: T[], options: { currentDesignId: string; currentCompanionDesignIds?: string[] }): T[] {
  const currentNeighborIds = new Set(options.currentCompanionDesignIds ?? []);

  return designs.filter((candidate) => {
    if (candidate.id === options.currentDesignId) {
      return false;
    }

    return !currentNeighborIds.has(candidate.id);
  });
}
