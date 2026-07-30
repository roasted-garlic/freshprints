import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ItemMutationGenerationTracker } from './itemMutationGeneration';

describe('ItemMutationGenerationTracker (items 2/5 stale-completion guard)', () => {
  it('a stale pre-delete load resolving after a delete is not the latest mutation', () => {
    const tracker = new ItemMutationGenerationTracker();
    // Simulates: a slow load starts (captures no generation of its own — it is not itself a
    // mutation), then removeItem begins (generation 1). The stale load's completion handler
    // must check isLatest against the generation captured at load-start time, which predates
    // the removal, so it is discarded.
    const preDeleteGeneration = tracker.begin('item-1'); // simulates an earlier in-flight op
    const deleteGeneration = tracker.begin('item-1'); // remove supersedes it
    assert.notEqual(preDeleteGeneration, deleteGeneration);
    assert.equal(tracker.isLatest('item-1', preDeleteGeneration), false);
    assert.equal(tracker.isLatest('item-1', deleteGeneration), true);
  });

  it('two edits to the same item: only the latest edit may apply its failure-path restore', () => {
    const tracker = new ItemMutationGenerationTracker();
    const firstEditGeneration = tracker.begin('item-1');
    const secondEditGeneration = tracker.begin('item-1');
    // First edit's async callable resolves (fails) after the second edit already started —
    // its generation is now stale and must not restore/reload over the second edit's state.
    assert.equal(tracker.isLatest('item-1', firstEditGeneration), false);
    assert.equal(tracker.isLatest('item-1', secondEditGeneration), true);
  });

  it('a failed save for the still-latest edit is allowed to restore authoritative state', () => {
    const tracker = new ItemMutationGenerationTracker();
    const generation = tracker.begin('item-1');
    // No newer mutation started for this item — the failure path may proceed.
    assert.equal(tracker.isLatest('item-1', generation), true);
  });

  it('tracks generations independently per item id', () => {
    const tracker = new ItemMutationGenerationTracker();
    const itemAGeneration = tracker.begin('item-a');
    const itemBGeneration = tracker.begin('item-b');
    assert.equal(tracker.isLatest('item-a', itemAGeneration), true);
    assert.equal(tracker.isLatest('item-b', itemBGeneration), true);
    // Bumping item-b does not invalidate item-a's still-latest generation.
    tracker.begin('item-b');
    assert.equal(tracker.isLatest('item-a', itemAGeneration), true);
  });

  it('an item id never mutated is never "latest" for an arbitrary generation number', () => {
    const tracker = new ItemMutationGenerationTracker();
    assert.equal(tracker.isLatest('never-touched', 1), false);
  });
});
