/**
 * Awaited per-instance taxonomy materialization rebuild coalesce (Option A).
 *
 * Gen2/Cloud Run must not schedule rebuild work after the trigger handler returns.
 * Every caller awaits a shared in-flight Promise that only settles after dirty
 * trailing rebuilds complete (RC-R2). Process-local only — cross-instance
 * duplicate rebuilds remain an accepted residual (no fleet lock).
 */

import { logPipelineEvent } from "../lib/pipelineLog";

export const DEFAULT_TAXONOMY_TRIGGER_COALESCE_MS = 750;
export const DEFAULT_TAXONOMY_TRIGGER_MAX_PASSES = 5;

export type TaxonomyTriggerRebuildFn = (input: {
  updatedBy: string;
  reason: string;
}) => Promise<unknown>;

export type TaxonomyTriggerLogFn = (
  event: string,
  context?: Record<string, unknown>,
) => void;

export type TaxonomyTriggerCoalesceDeps = {
  rebuild: TaxonomyTriggerRebuildFn;
  sleep?: (ms: number) => Promise<void>;
  log?: TaxonomyTriggerLogFn;
  coalesceMs?: number;
  maxPasses?: number;
};

export type TaxonomyTriggerCoalesce = {
  awaitCoalescedTaxonomyRebuild: (reason: string) => Promise<void>;
  /** Test seam: whether a shared cycle is currently owned. */
  getInFlightForTest: () => Promise<void> | null;
  /** Test seam: trailing-dirty flag. */
  isDirtyForTest: () => boolean;
};

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function defaultLog(event: string, context: Record<string, unknown> = {}): void {
  logPipelineEvent(event, context);
}

/**
 * Creates an isolated coalesce controller (also used so tests can spin two "instances").
 */
export function createTaxonomyTriggerCoalesce(
  deps: TaxonomyTriggerCoalesceDeps,
): TaxonomyTriggerCoalesce {
  const sleep = deps.sleep ?? defaultSleep;
  const log = deps.log ?? defaultLog;
  const coalesceMs = deps.coalesceMs ?? DEFAULT_TAXONOMY_TRIGGER_COALESCE_MS;
  const maxPasses = deps.maxPasses ?? DEFAULT_TAXONOMY_TRIGGER_MAX_PASSES;

  let inFlight: Promise<void> | null = null;
  let dirty = false;
  let lastReason = "taxonomy-source-written";

  async function runRebuild(reason: string, pass: number, final = false): Promise<void> {
    log("taxonomy-trigger-rebuild-start", {
      reason,
      pass,
      ...(final ? { final: true } : {}),
    });
    try {
      await deps.rebuild({
        updatedBy: "onTaxonomySourceWritten",
        reason,
      });
    } catch (error) {
      const errorName = error instanceof Error ? error.name : "unknown";
      const errorMessage =
        error instanceof Error ? error.message.slice(0, 200) : "unknown";
      log("taxonomy-materialization-rebuild-failure", {
        reason,
        errorName,
        errorMessage,
      });
      dirty = false;
      throw error;
    }
  }

  async function runOwnedCycle(): Promise<void> {
    let passes = 0;
    let continueCycle = true;
    while (continueCycle) {
      passes += 1;
      if (passes > maxPasses) {
        dirty = false;
        await runRebuild(lastReason, passes, true);
        dirty = false;
        continueCycle = false;
        break;
      }
      // Coalesce wait: joiners during the wait only update lastReason/dirty;
      // they are included in the upcoming corpus load, so clear dirty before rebuild.
      dirty = false;
      await sleep(coalesceMs);
      dirty = false;
      await runRebuild(lastReason, passes);
      // Mid-rebuild (or post-rebuild) dirty → trailing pass before Promise settles.
      continueCycle = dirty;
    }
  }

  async function awaitCoalescedTaxonomyRebuild(reason: string): Promise<void> {
    lastReason = reason;
    dirty = true;
    log("taxonomy-trigger-fields-changed", { reason });

    if (!inFlight) {
      inFlight = runOwnedCycle().finally(() => {
        inFlight = null;
      });
    } else {
      log("taxonomy-trigger-coalesce-join", { reason });
    }

    await inFlight;

    // Cover the race where dirty flipped after the owner loop exited but before
    // inFlight was cleared — every waiter that still sees pending work re-enters.
    if (dirty) {
      await awaitCoalescedTaxonomyRebuild(lastReason);
    }
  }

  return {
    awaitCoalescedTaxonomyRebuild,
    getInFlightForTest: () => inFlight,
    isDirtyForTest: () => dirty,
  };
}
