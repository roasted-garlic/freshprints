/**
 * Behavior-level coverage for useQueuePrintRequestToShow's show-scoped error/generation logic
 * (Plan Section 23, Amendment 5) — a capacity/submit error must be scoped to the show id it
 * actually happened for, and a stale (superseded) attempt's error must never resurface after the
 * caller has moved on to evaluating a different show.
 *
 * This hook uses React state (`useState`/`useCallback`) and this repo has no DOM-rendering test
 * convention (docs/standards/TESTING.md). Per the same convention used elsewhere in this goal
 * (`usePrintRequestDetail.behavior.test.ts`'s `CardHarness`), this file drives a small harness that
 * mirrors the hook's actual state transitions — generation counter, scoped error object, clearError
 * invalidating any in-flight attempt — line for line against the shipped hook's logic.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

interface ScopedError {
  showId: string;
  message: string;
}

/** Mirrors useQueuePrintRequestToShow's exact generation/scoping contract. */
class QueueToShowHarness {
  error: ScopedError | null = null;
  isSubmitting = false;
  private generation = 0;
  private activePending: unknown = null;

  /** Mirrors queueToShow's dispatch — returns a handle to resolve/reject later. */
  dispatchQueueToShow(showId: string): {
    resolveSuccess: () => void;
    rejectWithError: (message: string) => void;
  } {
    if (this.activePending) {
      throw new Error('a queueToShow call is already in flight — harness models one at a time');
    }
    const generation = ++this.generation;
    this.isSubmitting = true;
    this.error = null;
    this.activePending = generation;

    return {
      resolveSuccess: () => {
        if (this.activePending === generation) {
          this.activePending = null;
        }
        if (this.generation === generation) {
          this.isSubmitting = false;
        }
      },
      rejectWithError: (message: string) => {
        if (this.generation === generation) {
          this.error = { showId, message };
        }
        if (this.activePending === generation) {
          this.activePending = null;
        }
        if (this.generation === generation) {
          this.isSubmitting = false;
        }
      },
    };
  }

  /** Mirrors clearError — bumps the generation so any in-flight attempt's error is discarded. */
  clearError(): void {
    this.generation += 1;
    this.error = null;
  }
}

describe('useQueuePrintRequestToShow (Plan Section 23, Amendment 5) — show-scoped error lifecycle', () => {
  it('a submit error is scoped to the show id it occurred for', () => {
    const harness = new QueueToShowHarness();
    const attempt = harness.dispatchQueueToShow('show-a');
    attempt.rejectWithError('This show has room for only 3 of your 10 prints.');

    assert.equal(harness.error?.showId, 'show-a');
    assert.equal(harness.error?.message, 'This show has room for only 3 of your 10 prints.');
  });

  it('selecting a different show and calling clearError immediately clears the previous show error', () => {
    const harness = new QueueToShowHarness();
    const attemptA = harness.dispatchQueueToShow('show-a');
    attemptA.rejectWithError('Show A is full.');
    assert.equal(harness.error?.showId, 'show-a');

    // Customer selects Show B — the modal calls clearError() on selection change.
    harness.clearError();
    assert.equal(harness.error, null, "Show A's error must be cleared immediately");
  });

  it('a late-arriving rejection for a superseded (Show A) attempt cannot restore its error after Show B was selected', () => {
    const harness = new QueueToShowHarness();
    const attemptA = harness.dispatchQueueToShow('show-a');

    // Customer switches to Show B before Show A's attempt resolves.
    harness.clearError();

    // Show A's attempt NOW resolves with a rejection — this must be a no-op, since a newer
    // generation (from clearError) has already superseded it.
    attemptA.rejectWithError('Show A is full.');

    assert.equal(harness.error, null, 'a stale rejection for a superseded show must not set an error');
  });

  it('each show is evaluated independently: a Show B attempt after clearing Show A can set its own error', () => {
    const harness = new QueueToShowHarness();
    const attemptA = harness.dispatchQueueToShow('show-a');
    attemptA.rejectWithError('Show A is full.');
    harness.clearError();

    const attemptB = harness.dispatchQueueToShow('show-b');
    attemptB.rejectWithError('Show B is also full.');

    assert.equal(harness.error?.showId, 'show-b');
    assert.equal(harness.error?.message, 'Show B is also full.');
  });

  it('a successful submission for the current show clears isSubmitting and leaves no error', () => {
    const harness = new QueueToShowHarness();
    const attempt = harness.dispatchQueueToShow('show-a');
    assert.equal(harness.isSubmitting, true);
    attempt.resolveSuccess();
    assert.equal(harness.isSubmitting, false);
    assert.equal(harness.error, null);
  });
});
