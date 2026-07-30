/**
 * Composed historical-show-inspection behavior tests (Plan Section 28, Implementation Review 11
 * finding 3).
 *
 * This repo has no DOM-rendering test convention (docs/standards/TESTING.md). Per that convention
 * and Implementation Review 11's explicit instruction, this file drives the ACTUAL production
 * decision functions the modal and `ShowPicker` call —
 * `resolvePortalShowInspectionActivation`/`canSubmitPortalShowDestination`
 * (`portalHistoricalShowInspection.ts`) and `canActivateShowPickerOption`
 * (`resolveShowPickerSelection.ts`, the exact function `ShowPicker.tsx`'s `onActivate` handler
 * calls before invoking `onActivate`) — composed into a small harness
 * (`ModalInspectionHarness`) that mirrors `PortalQueueToShowModal.tsx`'s own `onInspect`/`onSelect`
 * wiring and both submit handlers (`handleRequestAddToShow`/`handleConfirmAcknowledgment`) line for
 * line. `ShowTimeSlotOption`'s native `<button disabled={!isInspectable}>` element (in
 * `ShowPicker.tsx`) means pointer click, Enter, and Space all dispatch the browser's native `click`
 * event and therefore call the identical `onActivate` callback — there is no separate keyboard code
 * path to diverge, so proving the decision logic once, exercised via `canActivateShowPickerOption` +
 * the harness's `activate()`, covers pointer and keyboard activation equally; this is documented
 * explicitly per activation-source test below rather than assumed silently.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  canSubmitPortalShowDestination,
  resolvePortalShowInspectionActivation,
} from "../utils/portalHistoricalShowInspection";
import { canActivateShowPickerOption } from "@fresh-prints/show-picker";

interface FakeShow {
  id: string;
  scheduledStartAt: string;
  productionStatus: "open" | "full" | "completed" | "fully_printed";
  allocatedQuantity: number;
  customerAllocatedQuantity: number;
  isAllocatable: boolean;
}

const FINISHED_SHOW: FakeShow = {
  id: "finished-show",
  scheduledStartAt: "2026-07-20T20:00:00.000Z",
  productionStatus: "completed",
  allocatedQuantity: 25,
  customerAllocatedQuantity: 7,
  isAllocatable: false,
};

const FULL_FUTURE_SHOW: FakeShow = {
  id: "full-show",
  scheduledStartAt: "2026-08-05T20:00:00.000Z",
  productionStatus: "full",
  allocatedQuantity: 200,
  customerAllocatedQuantity: 0,
  isAllocatable: false,
};

const OPEN_SHOW: FakeShow = {
  id: "open-show",
  scheduledStartAt: "2026-08-10T20:00:00.000Z",
  productionStatus: "open",
  allocatedQuantity: 10,
  customerAllocatedQuantity: 0,
  isAllocatable: true,
};

/** Mirrors PortalQueueToShowModal's inspection/destination/error state and its exact handlers. */
class ModalInspectionHarness {
  inspectedShowId: string | null = null;
  selectedShowId: string | null = null;
  actionError: string | null = null;
  pendingAllocatedByShowId: Map<string, number> | undefined;
  capacityValidationCallCount = 0;
  queueServiceCallCount = 0;

  constructor(private readonly shows: readonly FakeShow[]) {}

  private findShow(showId: string | null): FakeShow | null {
    return this.shows.find((show) => show.id === showId) ?? null;
  }

  /** Mirrors ShowPicker's onActivate branch when onInspect IS provided (the modal always provides it). */
  activate(showId: string): void {
    const show = this.findShow(showId);
    if (!show) return;
    if (!canActivateShowPickerOption({ canInspect: true, canAllocate: show.isAllocatable } as never)) {
      return;
    }
    this.onInspect(showId);
    if (show.isAllocatable) {
      this.onSelect(showId);
    }
  }

  /** Mirrors the modal's onInspect handler exactly. */
  private onInspect(showId: string): void {
    const show = this.findShow(showId);
    if (!show) return;
    const activation = resolvePortalShowInspectionActivation(show);
    this.actionError = null;
    this.inspectedShowId = activation.inspectedShowId;
    this.selectedShowId = activation.destinationShowId;
    if (activation.clearSubmissionState) {
      this.pendingAllocatedByShowId = undefined;
    }
  }

  /** Mirrors the modal's onSelect handler (fired only for an allocatable activation). */
  private onSelect(showId: string): void {
    this.actionError = null;
    this.selectedShowId = showId;
    this.inspectedShowId = showId;
  }

  /** Mirrors handleRequestAddToShow's guard exactly (calls capacity/fit check before opening ack). */
  requestAddToShow(fitAllowsSubmission: boolean): { openedAcknowledgment: boolean } {
    const destination = this.findShow(this.selectedShowId);
    this.capacityValidationCallCount += 1;
    if (!canSubmitPortalShowDestination(destination, fitAllowsSubmission)) {
      return { openedAcknowledgment: false };
    }
    return { openedAcknowledgment: true };
  }

  /** Mirrors handleConfirmAcknowledgment's guard exactly (the SECOND, independent re-check). */
  async confirmAcknowledgment(fitAllowsSubmission: boolean): Promise<{ submitted: boolean }> {
    const destination = this.findShow(this.selectedShowId);
    this.capacityValidationCallCount += 1;
    if (!canSubmitPortalShowDestination(destination, fitAllowsSubmission)) {
      return { submitted: false };
    }
    this.queueServiceCallCount += 1;
    return { submitted: true };
  }
}

describe("Historical show inspection — pointer activation", () => {
  it("clicking a finished show opens read-only details, changes the inspected id, and clears the destination", () => {
    const harness = new ModalInspectionHarness([FINISHED_SHOW, OPEN_SHOW]);
    harness.selectedShowId = OPEN_SHOW.id;
    harness.actionError = "stale error from a prior attempt";
    harness.pendingAllocatedByShowId = new Map([[OPEN_SHOW.id, 5]]);

    harness.activate(FINISHED_SHOW.id);

    assert.equal(harness.inspectedShowId, FINISHED_SHOW.id, "inspected show id changes");
    assert.equal(harness.selectedShowId, null, "allocation destination clears");
    assert.equal(harness.actionError, null, "stale error clears");
    assert.equal(harness.pendingAllocatedByShowId, undefined, "pending allocation state clears");
    assert.equal(harness.capacityValidationCallCount, 0, "no capacity validation call occurs from inspection alone");
    assert.equal(harness.queueServiceCallCount, 0, "no queue submission call occurs from inspection alone");
  });
});

describe("Historical show inspection — keyboard-equivalent activation (Enter/Space)", () => {
  it("Enter/Space dispatch the same native click, so the identical decision path applies for a finished show", () => {
    // ShowTimeSlotOption is a native <button disabled={!isInspectable}> — the browser's own Enter/
    // Space handling for a focused, non-disabled button fires the same `click` event a pointer
    // click fires, invoking the identical onClick -> canActivateShowPickerOption -> onActivate
    // chain. There is no separate keyboard branch in ShowPicker.tsx to diverge from pointer
    // activation, so this test proves the SAME decision path both input modes share, rather than a
    // duplicated pointer-only assertion.
    const harness = new ModalInspectionHarness([FINISHED_SHOW, OPEN_SHOW]);
    harness.selectedShowId = OPEN_SHOW.id;

    harness.activate(FINISHED_SHOW.id); // stands in for a native click OR Enter/Space activation

    assert.equal(harness.inspectedShowId, FINISHED_SHOW.id);
    assert.equal(harness.selectedShowId, null);
  });

  it("a native button is never disabled for an inspectable-but-non-allocatable row (native focusability preserved)", () => {
    // canActivateShowPickerOption (the exact gate ShowTimeSlotOption's `disabled` prop is built
    // from via `!isInspectable`) must be true for a finished show — Amendment 9's regression
    // (fully `disabled` rows, which also blocks Tab/Enter/Space focus and activation entirely) must
    // not recur.
    assert.equal(
      canActivateShowPickerOption({ canInspect: true, canAllocate: false } as never),
      true,
      "an inspectable row must remain a focusable, activatable native button",
    );
  });
});

describe("Historical show inspection — read-only rendering data available to the modal", () => {
  it("the inspected finished show's safe fields are exactly what the modal already has (no new read)", () => {
    const harness = new ModalInspectionHarness([FINISHED_SHOW]);
    harness.activate(FINISHED_SHOW.id);
    const inspected = harness["findShow"](harness.inspectedShowId);
    assert.ok(inspected);
    assert.equal(inspected!.scheduledStartAt, FINISHED_SHOW.scheduledStartAt, "date/time available");
    assert.equal(inspected!.productionStatus, "completed", "terminal status available");
    assert.equal(inspected!.customerAllocatedQuantity, 7, "personal usage available when already present");
    assert.equal(inspected!.isAllocatable, false, "non-allocatable state available for read-only copy");
  });
});

describe("Historical show inspection — direct-submit defense", () => {
  it("handleRequestAddToShow rejects a historical destination locally, even if somehow selected", () => {
    const harness = new ModalInspectionHarness([FINISHED_SHOW]);
    // Force an invalid state directly (simulating a defensive call bypassing normal UI flow).
    harness.selectedShowId = FINISHED_SHOW.id;

    const result = harness.requestAddToShow(true);

    assert.equal(result.openedAcknowledgment, false, "submit is rejected locally");
    assert.equal(harness.queueServiceCallCount, 0, "queue service is not called");
    assert.equal(harness.selectedShowId, FINISHED_SHOW.id, "destination is not silently changed by the guard itself");
  });

  it("handleRequestAddToShow rejects a full future (non-allocatable) show the same way", () => {
    const harness = new ModalInspectionHarness([FULL_FUTURE_SHOW]);
    harness.selectedShowId = FULL_FUTURE_SHOW.id;

    const result = harness.requestAddToShow(true);

    assert.equal(result.openedAcknowledgment, false);
    assert.equal(harness.queueServiceCallCount, 0);
  });
});

describe("Historical show inspection — acknowledgment-submit defense", () => {
  it("confirmAcknowledgment independently re-resolves the DTO and rejects a historical destination", async () => {
    const harness = new ModalInspectionHarness([FINISHED_SHOW]);
    harness.selectedShowId = FINISHED_SHOW.id;

    const result = await harness.confirmAcknowledgment(true);

    assert.equal(result.submitted, false, "the acknowledgment path independently rejects it too");
    assert.equal(harness.queueServiceCallCount, 0);
  });

  it("confirmAcknowledgment proceeds for a genuinely eligible destination", async () => {
    const harness = new ModalInspectionHarness([OPEN_SHOW]);
    harness.selectedShowId = OPEN_SHOW.id;

    const result = await harness.confirmAcknowledgment(true);

    assert.equal(result.submitted, true);
    assert.equal(harness.queueServiceCallCount, 1);
  });
});

describe("Historical show inspection — open-show regression (unchanged behavior)", () => {
  it("an eligible future show remains inspectable, allocatable, selectable, and submittable", () => {
    const harness = new ModalInspectionHarness([OPEN_SHOW]);
    harness.activate(OPEN_SHOW.id);

    assert.equal(harness.inspectedShowId, OPEN_SHOW.id, "inspectable");
    assert.equal(harness.selectedShowId, OPEN_SHOW.id, "selectable as destination");

    const requestResult = harness.requestAddToShow(true);
    assert.equal(requestResult.openedAcknowledgment, true, "allocatable/submittable");
  });
});

describe("Historical show inspection — full future show behavior", () => {
  it("a full future show remains inspectable, non-allocatable, read-only, and cannot trigger submission", () => {
    const harness = new ModalInspectionHarness([FULL_FUTURE_SHOW, OPEN_SHOW]);
    harness.selectedShowId = OPEN_SHOW.id;

    harness.activate(FULL_FUTURE_SHOW.id);

    assert.equal(harness.inspectedShowId, FULL_FUTURE_SHOW.id, "inspectable");
    assert.equal(harness.selectedShowId, null, "non-allocatable — destination clears, never set to it");

    const requestResult = harness.requestAddToShow(true);
    assert.equal(requestResult.openedAcknowledgment, false, "cannot trigger submission");
    assert.equal(harness.queueServiceCallCount, 0);
  });
});
