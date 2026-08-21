export type PrintRequestItemPersistenceHealth =
  | "clean"
  | "dirty_valid"
  | "dirty_invalid"
  | "saving"
  | "failed"
  | "optimistic";

export interface PrintRequestItemPersistenceHealthInput {
  isOptimistic: boolean;
  isSaving: boolean;
  isFailed: boolean;
  isDirty: boolean;
  canSave: boolean;
}

export function resolvePrintRequestItemPersistenceHealth(
  input: PrintRequestItemPersistenceHealthInput,
): PrintRequestItemPersistenceHealth {
  if (input.isOptimistic) {
    return "optimistic";
  }
  if (input.isSaving) {
    return "saving";
  }
  if (input.isFailed) {
    return "failed";
  }
  if (input.isDirty && !input.canSave) {
    return "dirty_invalid";
  }
  if (input.isDirty && input.canSave) {
    return "dirty_valid";
  }
  return "clean";
}

export interface PrintRequestPersistenceSummary {
  canOpenQueue: boolean;
  needsFlush: boolean;
  blockReason: string | null;
}

const BLOCKING_HEALTH: ReadonlySet<PrintRequestItemPersistenceHealth> = new Set([
  "dirty_invalid",
  "saving",
  "failed",
  "optimistic",
]);

export function summarizePrintRequestPersistenceHealth(
  healthByItemId: Readonly<Record<string, PrintRequestItemPersistenceHealth | undefined>>,
): PrintRequestPersistenceSummary {
  const values = Object.values(healthByItemId).filter(
    (value): value is PrintRequestItemPersistenceHealth => value !== undefined,
  );

  if (values.some((health) => health === "dirty_invalid")) {
    return {
      canOpenQueue: false,
      needsFlush: false,
      blockReason: "Fix invalid print sizes before adding this request to a show.",
    };
  }
  if (values.some((health) => health === "failed")) {
    return {
      canOpenQueue: false,
      needsFlush: false,
      blockReason: "Save failed. Retry or fix item sizes before adding this request to a show.",
    };
  }
  if (values.some((health) => health === "optimistic")) {
    return {
      canOpenQueue: false,
      needsFlush: false,
      blockReason: "Wait for new items to finish saving before adding this request to a show.",
    };
  }
  if (values.some((health) => health === "saving")) {
    return {
      canOpenQueue: false,
      needsFlush: false,
      blockReason: "Wait for item sizes to finish saving before adding this request to a show.",
    };
  }
  if (values.some((health) => health === "dirty_valid")) {
    return {
      canOpenQueue: true,
      needsFlush: true,
      blockReason: null,
    };
  }

  return {
    canOpenQueue: true,
    needsFlush: false,
    blockReason: null,
  };
}

export function isBlockingPrintRequestPersistenceHealth(
  health: PrintRequestItemPersistenceHealth,
): boolean {
  return BLOCKING_HEALTH.has(health);
}
