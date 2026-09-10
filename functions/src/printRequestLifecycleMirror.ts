export interface LifecycleOrderingTuple {
  millis: number;
  precedence: number;
  id: string;
  derivation?: "forward" | "historical";
}

export interface LifecycleMirrorRecord {
  lastLifecycleActivityAt?: unknown;
  lastLifecycleActivityEventId?: unknown;
  lastLifecycleActivityPrecedence?: unknown;
}

function toMillis(value: unknown): number | undefined {
  if (value && typeof (value as { toMillis?: unknown }).toMillis === "function") {
    return (value as { toMillis: () => number }).toMillis();
  }
  if (value instanceof Date) {
    return value.getTime();
  }
  return typeof value === "number" ? value : undefined;
}

/**
 * The reviewed lifecycle ordering comparator: occurrence time, then causal precedence, then
 * the deterministic event identity tie-break. Keep this shared by forward writers and the
 * historical mirror backfill so the two paths cannot drift.
 */
export function compareLifecycleTupleToMirror(
  candidate: LifecycleOrderingTuple,
  current: LifecycleMirrorRecord | undefined,
): number {
  const currentMillis = toMillis(current?.lastLifecycleActivityAt);
  if (currentMillis === undefined) {
    return 1;
  }

  const timeDiff = candidate.millis - currentMillis;
  if (timeDiff !== 0) {
    return timeDiff;
  }

  const currentPrecedence =
    typeof current?.lastLifecycleActivityPrecedence === "number"
      ? current.lastLifecycleActivityPrecedence
      : undefined;
  if (currentPrecedence !== undefined) {
    const precedenceDiff = candidate.precedence - currentPrecedence;
    if (precedenceDiff !== 0) {
      return precedenceDiff;
    }
  }

  const currentEventId =
    typeof current?.lastLifecycleActivityEventId === "string"
      ? current.lastLifecycleActivityEventId
      : "";
  return candidate.id.localeCompare(currentEventId);
}

export function compareLifecycleTuples(
  left: LifecycleOrderingTuple,
  right: LifecycleOrderingTuple,
): number {
  const timeDiff = left.millis - right.millis;
  if (timeDiff !== 0) {
    return timeDiff;
  }

  const precedenceDiff = left.precedence - right.precedence;
  if (precedenceDiff !== 0) {
    return precedenceDiff;
  }

  return left.id.localeCompare(right.id);
}
