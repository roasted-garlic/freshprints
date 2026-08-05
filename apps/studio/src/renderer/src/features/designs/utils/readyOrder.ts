import type { Design } from "../types/design.types";

interface ReadyOrderable {
  id: string;
  readyAt?: { toMillis: () => number };
  createdAt?: { toMillis: () => number };
}

function readMillis(value: { toMillis: () => number } | undefined): number | undefined {
  if (!value || typeof value.toMillis !== "function") {
    return undefined;
  }

  const millis = value.toMillis();
  return Number.isFinite(millis) ? millis : undefined;
}

/**
 * Canonical default catalog ordering key (Owner QA Amendment 3): the most recent transition into
 * `status: "ready"`.
 *
 * Documented legacy fallback: designs approved before `readyAt` existed have no value, so they
 * order by `createdAt` instead of disappearing. This keeps every legacy ready design visible
 * without a migration, and is why the bounded Firestore query still orders by `createdAt` — a
 * Firestore `orderBy("readyAt")` would silently exclude every document missing the field.
 * Once a production backfill runs, the query itself can move to `readyAt` and this fallback can be
 * retired.
 */
export function resolveReadyOrderMillis(design: ReadyOrderable): number | undefined {
  return readMillis(design.readyAt) ?? readMillis(design.createdAt);
}

/**
 * Orders ready designs newest-transition-first with deterministic ID tie-breaking. Designs with
 * no resolvable timestamp sort last, matching the existing list-sort convention.
 */
export function sortDesignsByReadyTransition<T extends ReadyOrderable>(designs: readonly T[]): T[] {
  return [...designs].sort((left, right) => {
    const leftMillis = resolveReadyOrderMillis(left);
    const rightMillis = resolveReadyOrderMillis(right);

    if (leftMillis === undefined) return rightMillis === undefined ? 0 : 1;
    if (rightMillis === undefined) return -1;

    if (leftMillis !== rightMillis) {
      return rightMillis - leftMillis;
    }

    return right.id.localeCompare(left.id);
  });
}

export function sortReadyDesigns(designs: readonly Design[]): Design[] {
  return sortDesignsByReadyTransition(designs);
}
