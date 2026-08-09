# Formal Review: AI Processing Monotonic Reconciliation Repair Plan

| Field | Value |
|---|---|
| Date | 2026-08-05 |
| Plan | `docs/workflow/plans/2026-08-05-ai-processing-monotonic-reconciliation-repair-plan.md` |
| HEAD | `d5f75bdfbf9c78ed924ae2b96b9ac10758e5feee` |
| Branch | `fix/post-launch-catalog-and-processing-stability` |
| Scope | Independent Formal Review of the monotonic reconciliation repair Plan only |

---

## 1. Method

Read-only verification against current HEAD source (not against Plan prose alone):

- `useAiReviewInbox.ts` — liveDesign reload effect, background observer, mount pending-work reload, retry/rerun reload sequences
- `useDesigns.ts` — `generationRef`, clear-on-reload, wholesale replace on accept, patch bump semantics
- `useAiProcessingQueue.ts` — `applyDesignPatch` then `refreshDesignList` → `reloadDesigns`
- `backgroundAiQueueReconciliation.ts` — patch-primary pure helper
- `importAiBackgroundQueue.ts` — `patchSource` notify
- `designService.ts` — `designPageCache` 15s TTL; `invalidateDesignReadCaches` not tied to AI patch path
- Existing Amendment 4–7 tests (presence and what they do / do not cover)

---

## 2. Independent confirmation of the defect model

### 2.1 Generation guard does not stop post-patch reloads

`applyDesignPatch` bumps `generationRef` only to invalidate loads that **already started**. Comments in `useDesigns.ts` explicitly treat a reload started **after** a patch as a “legitimate newer confirmation read.” That matches the owner failure mode: confirmation is newer in wall-clock order but older in data.

### 2.2 List accept is wholesale replace

Non-append accept sets `designs: page.designs` with no merge against patched local state. A pending-query page that still contains design A reinserts A even if a prior patch removed A from the filtered UI.

### 2.3 Cache makes stale confirmation likely

`designPageCache` TTL is **15 seconds**. Background AI completion does not invalidate it. A post-patch `reloadDesigns` within that window can HIT the pre-completion Processing page. Navigation/remount explaining recovery is consistent with cache miss/expiry or fresh mount load.

### 2.4 Confirmed primary reintroduction path

This reviewer agrees with Plan path **P1** (and **P4** when auto/manual Process queue is used) as the confirmed post-patch replace vectors:

1. Terminal patch removes A from client-filtered Processing list.
2. Completion-triggered `reloadDesigns` starts after the patch.
3. Cached or lagging pending list replaces state → A reappears.

Snapshot code is not implicated.

---

## 3. Approach recommendation

Plan’s comparison of A / B / C is sound.

- **A alone** is insufficient: any remaining reload (tab activate, manual retry, race) can still poison via cache/replace.
- **B alone** would work but would leave unnecessary confirmation reload traffic and clear-to-empty flashes (`loadDesigns` clears designs before fetch).
- **C (gate redundant reloads + cache invalidation + narrow monotonic merge)** is the correct smallest *safe* design.

This reviewer endorses **Approach C**.

Ledger clear rules for retry/rerun must be implemented carefully; Plan §5.2–5.3 states that requirement adequately for Implement.

---

## 4. Scope discipline

Plan correctly:

- preserves Amendment 4 patch-primary / `pendingAdvanceIndexRef` / generation-for-older-loads;
- does not propose donor restore or snapshot revert;
- lists exact edit files and an explicit untouched set;
- separates snapshot-removal Amendment 8 from this repair;
- requires behavioral tests that fail on HEAD for stale reintroduction (not grep-only).

No silent scope expansion into Portal/Algolia/Open Graph detected.

---

## 5. Test plan review

The 14 behavioral scenarios are necessary and sufficient for this defect class. Especially critical:

- #2–#4 (stale pending reintroduction / cross-event)
- #8 (later reprocessing still allowed)
- #14 (no-patch recovery reload retained)
- #9–#10 (do not regress Amendment 7 loop fixes)

Implement must add executable tests that simulate post-patch stale list accept; existing Amendment 4 tests prove patch vs older in-flight reload, **not** post-patch stale accept — Plan correctly identifies that gap.

---

## 6. Challenges

| Challenge | Resolution |
|---|---|
| Skipping P1 reload loses count updates | Plan keeps `onQueueChanged`; acceptable if counts API does not depend on poisoned list replace |
| Monotonic merge in `useDesigns` could affect Design Library | Plan requires no-op when ledger empty / non-pending Processing query — must be enforced in Implement review |
| Invalidating all page caches on every patch | Prefer existing `invalidateDesignReadCaches(designId)` clearing page+count caches (already clears all pages) — acceptable and already used elsewhere |

No blocking product decision required before Implement for this narrow repair.

---

## 7. Verdict

**APPROVED**

The Plan is narrowly scoped, source-evidenced, approach-correct, and safe relative to Amendment 4–7. Implementation remains a separate phase and must not begin until explicitly authorized; live owner QA remains a post-Implement checkpoint (Plan §9), not a reason to reject this Plan.

---

## 8. Remaining blockers before Implement

1. Explicit owner/agent authorization to enter Implement for **this** plan only (not Amendment 8 snapshot removal).
2. After Implement: live owner QA of 3→2→1→0 / A→B→C→none without navigation (Plan §9).

No unresolved `[NEEDS OWNER DECISION]` architecture gaps for the repair design itself.

---

## 9. Confirmation

- Only this review and the companion Plan markdown were written.
- No application source or tests edited.
- No workflow state / handoff updates.
- No Git mutation, Firebase action, or deployment.
- HEAD remains `d5f75bdfbf9c78ed924ae2b96b9ac10758e5feee`.
