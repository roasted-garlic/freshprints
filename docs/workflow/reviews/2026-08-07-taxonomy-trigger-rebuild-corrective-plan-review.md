# Formal Review: Taxonomy trigger rebuild corrective plan

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Reviewer | Review Agent (independent of Planning) |
| Plan | `docs/workflow/plans/2026-08-07-taxonomy-trigger-rebuild-corrective-plan.md` |
| Failure record | `docs/workflow/reviews/2026-08-07-taxonomy-mutation-server-rebuild-verify-result.md` |
| Verdict | **approved_with_changes** |

---

## Summary

Root cause and Option A direction are correct and proportionate: the live Gen2 drop matches the detached `setTimeout(750)` + non-awaited handler in `onTaxonomySourceWritten.ts`. Durable infra (Option C) is rightly rejected. The plan is **approved with binding changes**: fix join/trailing-waiter semantics in the illustrative design, require an exported test seam, tighten failure logging, and make Option B the mandatory fallback if A cannot satisfy the join invariant without complexity.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Triggers + tests + docs; Studio/Rules/Algolia/Storage excluded |
| Architecture alignment | pass | Server-owned rebuild preserved |
| Security impact addressed | pass | No new public surface |
| Data model impact addressed | pass | No schema change |
| Backend impact addressed | pass_with_changes | Await model OK; join pseudocode has a drop risk — RC below |
| Test strategy adequate | pass_with_changes | A–G present; need injectable export + explicit join-during-rebuild case |
| Human checkpoints identified | pass | Implement phrase + deploy gate + live re-QA |
| Roadmap alignment | pass | Taxonomy spike follow-up |
| Documentation plan | pass | BACKEND note after Implement sufficient |
| No silent scope expansion | pass | |

---

## Challenge answers (required)

### 1. Could the handler still return before rebuild completion?

**Yes, if Implement is sloppy** — e.g. `void awaitCoalesced…`, fire-and-forget, or catching errors without rethrow. Plan TRC1/TRC5 address this. **Required change RC-R1:** containment test must fail if tag/category handlers do not `await` the coalesce entrypoint.

### 2. Could a second taxonomy write be dropped?

**Yes under the plan’s illustrative join pseudocode.** Pattern “if `inFlight`, set `dirty`, `await inFlight`, **return**” is unsafe if the leader’s `do/while` has already observed `dirty === false` and finished the rebuild, while the joiner set `dirty` in a race window after the last dirty check but before `finally` clears `inFlight`. Also, a joiner that only awaits the *current* Promise and returns does not itself ensure a trailing pass if the leader does not loop on dirty.

**Required change RC-R2:** Implement must use a single shared Promise that **only settles after dirty is clear** (leader loop owns trailing passes). Joiners await that same Promise and must **not** “await once and return” in a way that can miss a trailing rebuild. Unit test: write arrives mid-rebuild → exactly one extra rebuild; all waiters resolve only after the extra rebuild.

### 3. Could a failed rebuild permanently poison a shared Promise?

**Mitigated if `finally` clears `inFlight` and dirty flags reset on reject.** Plan states this; **RC-R3:** failure test must assert dirty/`lastReason` do not block a subsequent successful cycle after rejection.

### 4. Could concurrent instances corrupt revision publication?

**They can race (pre-existing).** Fence prevents mixed revision/hash chunk sets for a completed publish; last `meta.set` can still publish an older corpus. Plan correctly rejects durable lock for this defect. **RC-R4:** Keep TRC10 — document residual race; do **not** expand Implement into CAS/rebuild helper changes unless a later incident demands it (keeps deploy allowlist to the two triggers).

### 5. Could multiple rebuilds race and publish an older corpus last?

**Yes (same as #4).** Accept for rare staff taxonomy writes. Live re-QA is single-writer and sufficient to prove the Gen2 timer defect is fixed.

### 6. Does the selected approach require a durable fleet-wide lock?

**No.** Option C remains rejected.

### 7. Is the proposed fix unnecessarily complex?

**Borderline.** Option B is simpler and acceptable given rare writes. **RC-R5:** Prefer Option A for bulkCreateTags/reorder bursts; if join/trailing implementation exceeds ~40–60 lines of careful state or cannot prove RC-R2 in tests, **Implement must switch to Option B** (direct await) rather than ship fragile coalesce.

### 8. Does the plan accidentally expand into Studio/Algolia work?

**No.** TRC8 is binding. Review forbids Studio/Rules/Storage/Algolia edits in Implement.

### 9. Is the reduced live mutation test sufficient to prove the original defect fixed?

**Yes, with one clarification (RC-R6):** Removing the alias and observing revision advance + rebuild-success with reason from the tag trigger (and materialization without alias) proves the deferred-work defect is fixed. Studio stale-cache step remains a **separate** subsequent proof and must not be conflated with server rebuild PASS.

---

## Architecture Review

**Findings:**

- Correct layer for the fix (Functions trigger orchestration only).
- Shared `rebuildTaxonomyMaterialization` correctly left as the sole publisher.

**Required changes:**

- [x] RC-R2 join/trailing semantics (above)
- [x] RC-R5 Option B fallback

---

## Security Review

**Findings:**

- No auth/rules change. Failed trigger after Studio write already committed is acceptable (canonical FS remains source of truth); telemetry + next write/callable repair.

**Required changes:**

- [ ] None

**Human approval needed before production:**

- [x] Any production Functions deploy (out of scope)

---

## Data Model Review

**Findings:** None.

**Required changes:**

- [ ] None

---

## Backend Review

**Findings:**

- Live failure attribution confirmed against source.
- Trigger timeout 60s vs ~3s rebuild is adequate with MAX_PASSES bound.
- Deploy allowlist (two triggers only) is correct **if** rebuild helper is untouched — keep it that way (RC-R4).

**Required changes:**

- [x] RC-R7: Log `taxonomy-materialization-rebuild-failure` (or equivalent) from the **awaited** path with `errorName`/`message` when rebuild throws — not only success inside rebuild — so silent HTTP 200 + zero failure logs cannot recur.
- [x] RC-R8: Export coalesce helper (or `__test__` hooks) for fake timers + mock rebuild; do not rely on Firestore emulator for A–D.

---

## Test Review

**Findings:**

- Cases A–G match owner requirements.
- Need explicit mid-rebuild join test (RC-R2).

**Required changes:**

- [x] RC-R1, RC-R2, RC-R3, RC-R8

---

## Required Changes (binding before / during Implement)

1. **RC-R1** — Handlers must `await`; containment test enforces it.
2. **RC-R2** — Shared Promise settles only after dirty trailing rebuilds complete; mid-rebuild write tested.
3. **RC-R3** — Failure clears state; retry possible.
4. **RC-R4** — No rebuild-helper CAS in this corrective; two-Function deploy allowlist.
5. **RC-R5** — Fall back to Option B if A cannot prove RC-R2 cleanly.
6. **RC-R6** — Live re-QA: server rebuild PASS ≠ Studio refresh PASS.
7. **RC-R7** — Failure telemetry on awaited path.
8. **RC-R8** — Testable exported coalesce seam.

Planning Agent may update the plan doc to incorporate these RCs, **or** Implement may treat this review’s RCs as binding without a plan rewrite.

---

## Risks to Track

| Risk | Notes |
|------|-------|
| Join race dropping trailing write | RC-R2 |
| Option A over-engineering | RC-R5 → B |
| Cross-instance stale publish | Accepted residual |

---

## Verdict

**approved_with_changes**

Implementation may proceed only after owner phrase:

`APPROVE TAXONOMY TRIGGER REBUILD CORRECTIVE IMPLEMENTATION`

and must honor RC-R1–RC-R8.

**This review does not authorize:** Implement without phrase, Functions deploy, taxonomy mutation, alias removal, production, or PR merge.
