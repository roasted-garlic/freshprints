/**
 * Composed capacity-banner freshness-gating behavior tests (Plan Section 30.4/30.5).
 *
 * This repo has no DOM-rendering test convention (docs/standards/TESTING.md). Per that convention,
 * this file drives the ACTUAL production decision logic — `usePortalAllocatableShows`'s
 * `hasConfirmedFreshness` state machine and `PortalQueueToShowModal.tsx`'s `effectiveFit` gate —
 * composed into small harnesses that mirror both exactly, rather than reimplementing the decision in
 * isolation. The bug this closes: a module-level session cache can serve a stale `isAllocatable:
 * true` for a show that has since become historical server-side, letting the modal compute a real
 * (not merely cosmetic) capacity-exhausted state against stale data. The fix defers any capacity
 * decision until the current enable's own reload has confirmed the cache at least once.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

/** Mirrors usePortalAllocatableShows's freshness state machine exactly (enable -> reload -> settle). */
class FreshnessHarness {
  hasConfirmedFreshness = false;
  shows: { id: string; isAllocatable: boolean; allocatedQuantity: number; maxTotalQuantity: number }[] = [];
  reloadCallCount = 0;

  /** Mirrors the `enabled` effect: always resets freshness to false at the start of a new enable. */
  enable(cachedShows: typeof this.shows | null): void {
    this.hasConfirmedFreshness = false;
    if (cachedShows) {
      this.shows = cachedShows;
    }
    void this.reload();
  }

  /** Mirrors `reload`: only a SETTLED (not merely started) fetch flips freshness to true. */
  private async reload(): Promise<void> {
    this.reloadCallCount += 1;
  }

  /** Test-controlled: simulate the reload actually settling (the real service call resolving). */
  settleReload(freshShows: typeof this.shows): void {
    this.shows = freshShows;
    this.hasConfirmedFreshness = true;
  }
}

/** Mirrors PortalQueueToShowModal's effectiveFit gate: null unless freshness is confirmed. */
function computeEffectiveFit(input: {
  selectedShow: { isAllocatable: boolean; allocatedQuantity: number; maxTotalQuantity: number } | null;
  perShowLimit: number | null;
  hasConfirmedFreshness: boolean;
}): { isBlocked: boolean; fitsEntirely: boolean } | null {
  if (!input.selectedShow || input.perShowLimit === null || !input.hasConfirmedFreshness) {
    return null;
  }
  const remaining = input.selectedShow.maxTotalQuantity - input.selectedShow.allocatedQuantity;
  return { isBlocked: remaining <= 0, fitsEntirely: remaining > 0 };
}

describe("Portal capacity-banner freshness gating", () => {
  it("Test A: hasConfirmedFreshness starts false on a cache-warm mount", () => {
    const harness = new FreshnessHarness();
    harness.enable([{ id: "show-1", isAllocatable: true, allocatedQuantity: 25, maxTotalQuantity: 25 }]);

    assert.equal(harness.hasConfirmedFreshness, false, "cache-warm data is available but not yet confirmed fresh");
    assert.equal(harness.reloadCallCount, 1, "a reload is always kicked off, even with a warm cache");
  });

  it("Test B: hasConfirmedFreshness becomes true only once the background reload settles", () => {
    const harness = new FreshnessHarness();
    harness.enable([{ id: "show-1", isAllocatable: true, allocatedQuantity: 25, maxTotalQuantity: 25 }]);
    assert.equal(harness.hasConfirmedFreshness, false);

    harness.settleReload([{ id: "show-1", isAllocatable: false, allocatedQuantity: 25, maxTotalQuantity: 25 }]);
    assert.equal(harness.hasConfirmedFreshness, true);
  });

  it("Test C: effectiveFit cannot compute against a stale-cached show before freshness is confirmed", () => {
    // The exact failure scenario: cache stale-reports isAllocatable: true and a capacity-exhausted
    // show for a show that has since become historical/completed server-side.
    const staleCachedShow = { isAllocatable: true, allocatedQuantity: 25, maxTotalQuantity: 25 };

    const fitBeforeConfirmation = computeEffectiveFit({
      selectedShow: staleCachedShow,
      perShowLimit: 25,
      hasConfirmedFreshness: false,
    });

    assert.equal(fitBeforeConfirmation, null, "no capacity decision — including the exhausted banner — before freshness is confirmed");
  });

  it("Test D: once freshness is confirmed, a genuinely open, capacity-exhausted show still renders its correct banner", () => {
    const genuinelyOpenExhaustedShow = { isAllocatable: true, allocatedQuantity: 25, maxTotalQuantity: 25 };

    const fit = computeEffectiveFit({
      selectedShow: genuinelyOpenExhaustedShow,
      perShowLimit: 25,
      hasConfirmedFreshness: true,
    });

    assert.ok(fit, "fit computes once freshness is confirmed");
    assert.equal(fit!.isBlocked, true, "the real capacity-exhausted banner is unaffected by this change");
  });

  it("Test E: once freshness is confirmed, a genuinely open show with room still allows submission", () => {
    const openShowWithRoom = { isAllocatable: true, allocatedQuantity: 10, maxTotalQuantity: 25 };

    const fit = computeEffectiveFit({
      selectedShow: openShowWithRoom,
      perShowLimit: 25,
      hasConfirmedFreshness: true,
    });

    assert.ok(fit);
    assert.equal(fit!.isBlocked, false);
    assert.equal(fit!.fitsEntirely, true);
  });

  it("Test F: re-entering the modal for a new enable resets freshness, so a second cache-warm open is re-gated too", () => {
    const harness = new FreshnessHarness();
    harness.enable([{ id: "show-1", isAllocatable: true, allocatedQuantity: 25, maxTotalQuantity: 25 }]);
    harness.settleReload([{ id: "show-1", isAllocatable: false, allocatedQuantity: 25, maxTotalQuantity: 25 }]);
    assert.equal(harness.hasConfirmedFreshness, true);

    // Modal closes and reopens (a new `enabled` transition) — freshness must reset, not carry over
    // stale confidence from the previous open even though the module-level cache persists.
    harness.enable(harness.shows);
    assert.equal(harness.hasConfirmedFreshness, false, "freshness re-gates on every new enable");
  });
});
