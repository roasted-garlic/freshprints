# Plan: Taxonomy trigger rebuild corrective (awaited coalesce)

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Author | Planning Agent |
| Status | approved_with_changes (Formal Review) |
| Workflow | managed-phase |
| Managed goal | `post-launch-catalog-and-processing-stability` |
| Follow-up | `taxonomy-read-spike-elimination` |
| Related failure | `docs/workflow/reviews/2026-08-07-taxonomy-mutation-server-rebuild-verify-result.md` |
| Mutation checkpoint | `docs/workflow/reviews/2026-08-07-taxonomy-mutation-revision-smoke-checkpoint.md` |
| Live project | **fresh-prints-dev** |
| Implement gate (future) | `APPROVE TAXONOMY TRIGGER REBUILD CORRECTIVE IMPLEMENTATION` |

---

## Goal

Make taxonomy source-write triggers **reliably rebuild** `taxonomyMaterialization/**` on Gen2/Cloud Run by ensuring every invocation that decides a rebuild is needed **awaits owned rebuild work to completion** (no detached `setTimeout` after the handler returns). Preserve atomic chunk→meta publication, Firestore `tags`/`categories` authority, and the existing Studio/Algolia/Storage boundaries.

---

## Background

### Proven live failure (authoritative)

On `fresh-prints-dev`, owner added alias `taxonomy-smoke-20260807` to approved tag `tags/acdc` via Studio Tag Management.

| Observation | Evidence |
|-------------|----------|
| Canonical write | `tags/acdc` contains alias; `updateTime` ≈ `2026-08-08T03:10:35.765Z` |
| Trigger fired | `onTagTaxonomySourceWritten` HTTP 200 ≈ `03:10:35.905Z`, latency **~176ms** |
| Materialization | Still **revision 1**, hash `38e69b…d33e59`, chunk-0 **lacks** alias |
| Rebuild telemetry | **0** `taxonomy-materialization-rebuild-success` after mutation; **0** failures |
| Category trigger | **0** runs (not responsible) |
| Prior successful rebuild | Bootstrap callable only (`callable-rebuild`, revision 1, ~3s latency) |

### Exact current source mechanism (repo-confirmed)

File: `functions/src/taxonomy/onTaxonomySourceWritten.ts`

```text
onTag/onCategory handler
  → if taxonomyFieldsChanged
  → scheduleCoalescedRebuild(reason)   // returns void; NOT awaited
  → handler returns (HTTP success)

scheduleCoalescedRebuild:
  module-level coalesceTimer + coalescePendingReason
  setTimeout(750ms)
  → void rebuildTaxonomyMaterialization(...).catch(log failure)
```

Confirmed facts from source:

1. Handler **does not await** anything related to the rebuild.
2. Rebuild runs only inside a **detached timer callback** after the invocation has already completed successfully.
3. Module-level timer survival after HTTP completion is **incidental** on Gen2/Cloud Run (instance may freeze/idle); live ~176ms success with no rebuild proves drop.
4. Errors in the detached path are `.catch`-logged only; they **cannot** fail the trigger invocation.
5. Shared rebuild lives in `functions/src/taxonomy/rebuildTaxonomyMaterialization.ts` (chunks first → meta last).
6. Exports: `onTagTaxonomySourceWritten`, `onCategoryTaxonomySourceWritten`, `rebuildTaxonomyMaterializationCallable` via `functions/src/index.ts`.
7. No other single-flight/coalesce helpers exist under `functions/src` for taxonomy (only this module).
8. Existing tests (`taxonomyMaterializationContainment.test.ts`, builder tests) assert imports/exports; they **do not** prove awaited rebuild lifecycle.
9. Telemetry today: success/failure only **inside** `rebuildTaxonomyMaterialization` / detached catch — **no** “trigger received / joined coalesce / rebuild started” discrimination; live failure looked like “trigger OK, silence.”

### Concurrent rebuild behavior (current rebuild helper)

`rebuildTaxonomyMaterialization`:

- Reads `meta.revision`, sets `newRevision = prior + 1`, loads full approved/active corpus, writes chunks then meta.
- **No** fleet-wide lock / transaction / CAS on revision.
- Same-instance or multi-instance concurrent calls can both compute the same `newRevision` and race; last `meta.set` wins. Fence still prevents mixed revision/hash readers **for a single completed publish**, but an older corpus can win if a slower rebuild finishes last.
- Bound: taxonomy writes are staff-rare; residual cross-instance race is pre-existing and acceptable for this corrective **unless** Implement adds a cheap meta re-check (optional, see Approach). Not a reason to introduce Cloud Tasks/Pub/Sub.

### Burst sources (repo)

- `catalogTagService.bulkCreateTags` can emit many tag writes quickly → many trigger invocations.
- Category `sortOrder` is in `taxonomyFieldsChanged` → reorder can burst category writes.
- Process-local coalesce remains useful; durable fleet coalesce is **not** justified for this defect.

---

## Scope

### In Scope

- Fix trigger execution model in `functions/src/taxonomy/onTaxonomySourceWritten.ts` (and small extracted helper module **only if needed for testability**).
- Automated unit tests for coalesce/await/failure/reset behavior.
- Update containment test so detached post-return rebuild is forbidden.
- Telemetry events distinguishing trigger receive / coalesce join / rebuild start / success/failure.
- Docs: plan/review/state; brief BACKEND/DECISIONS note if behavior change warrants.
- Future **scoped** Functions redeploy allowlist (not this pass).
- Future reduced live re-QA using existing `acdc` alias (not this pass; **do not remove alias now**).

### Out of Scope

- Studio materialization client / disk cache
- Firestore Rules / Storage / Algolia
- Canonical taxonomy mutation in this planning pass
- Invoking rebuild callable
- Any deploy / production / PR #40 merge
- 45-design batch
- Cloud Tasks / Pub/Sub / Scheduler / new infra
- Changing publication fence semantics (chunks→meta remains)

---

## Affected Areas

### Files / Modules (expected)

| Path | Change |
|------|--------|
| `functions/src/taxonomy/onTaxonomySourceWritten.ts` | Replace detached timer with awaited coalesce |
| `functions/src/taxonomy/taxonomyTriggerCoalesce.ts` (optional extract) | Testable coalesce helper |
| `functions/src/taxonomy/onTaxonomySourceWritten.coalesce.test.ts` (or equivalent) | New unit tests A–E,F-bound |
| `functions/src/taxonomy/taxonomyMaterializationContainment.test.ts` | Assert await + no detached setTimeout rebuild pattern |
| `functions/src/taxonomy/rebuildTaxonomyMaterialization.ts` | **Prefer no change**; optional CAS/re-read only if Formal Review requires |
| Docs under `docs/workflow/` + state/handoff | This phase |

### Architecture Impact

- [x] Details: Backend trigger lifecycle only. Still: FS authoritative → server rebuild → materialization. No layer bypass.

### Security Impact

- [x] Details: None material. Triggers remain Admin SDK writers to materialization; client write still false. No new public endpoints.

### Data Model Impact

- [x] None (same `taxonomyMaterialization` schema; revision continues monotonic per successful rebuild).

### Backend Impact

- [x] Details: Gen2 Firestore triggers must stay alive until rebuild Promise settles. Timeout budget: current trigger timeout **60s**; observed rebuild ~**3s**; coalesce **750ms**; design must bound trailing passes so worst case stays under timeout (see Approach).

### UI / UX Impact

- [x] None in Implement. Later live QA uses Studio Tag Management + Firebase Debug only.

### Migration Impact

- [x] None. Live materialization stays at revision 1 until next successful rebuild after deploy + re-QA write.

---

## Option comparison

### OPTION A — Awaited per-instance coalescing (RECOMMENDED)

**Model:** Module-level shared `Promise` (not a fire-and-forget timer). Every trigger invocation that needs a rebuild **awaits** that Promise. Coalesce window (~750ms) runs *inside* the awaited work so the Cloud Function remains active.

| Concern | Assessment |
|---------|------------|
| Detached work after return | **Eliminated** if handlers `await` and never `void` the rebuild |
| Same-instance bursts | Multiple writes join one Promise; dirty/trailing flag forces another pass if writes arrive during wait/rebuild |
| Cross-instance | Each instance may still rebuild (duplicate cost); acceptable for rare taxonomy |
| Complexity | Moderate; must clear Promise on settle; prevent poison |
| Infra | None |

### OPTION B — Direct awaited rebuild

Each trigger `await rebuildTaxonomyMaterialization(...)` with no delay.

| Concern | Assessment |
|---------|------------|
| Reliability | Excellent / simplest |
| Bulk import / reorder | N writes → N full corpus rebuilds (~3s each) — costly but rare |
| Concurrent instances | Same residual race as A |
| Coalesce storms | None reduced |

**Not rejected for being simple.** Prefer A only because Studio already has `bulkCreateTags` and category reorder can burst, and 750ms coalesce was an intentional product constraint. If Implement discovers A cannot be made poison-safe without complexity, **fall back to B** is explicitly allowed.

### OPTION C — Durable cross-instance coalescing

Firestore lease / Cloud Tasks / Pub/Sub.

| Concern | Assessment |
|---------|------------|
| Needed to fix Gen2 drop? | **No** |
| Complexity / surface | High |
| Verdict | **Reject** for this corrective |

---

## Recommended corrective design (Option A)

### Binding requirements (RC)

| ID | Requirement |
|----|-------------|
| **TRC1** | Handlers must `await` coalesce/rebuild ownership. **No** `setTimeout`/`setImmediate`/`queueMicrotask` that starts rebuild **after** the handler returns. |
| **TRC2** | Same-instance concurrent invocations join one in-flight Promise; they remain alive until that cycle’s rebuild work completes (including trailing dirty pass). |
| **TRC3** | Writes that arrive while a coalesce wait or rebuild is in flight set a **dirty/trailing** flag so a **fresh** rebuild runs after the current one (final corpus not dropped). |
| **TRC4** | After resolve **or** reject, clear module Promise/state so a later write can start a new cycle (no permanent poison). |
| **TRC5** | On rebuild throw: log failure telemetry; **rethrow** (or return rejected Promise) so the trigger invocation is **not** a silent HTTP success. |
| **TRC6** | Cap trailing passes (e.g. max **5** rebuilds per chain) then perform one final rebuild and clear dirty — prevent timeout loops under pathological bursts. |
| **TRC7** | Preserve `rebuildTaxonomyMaterialization` fence: chunks → meta; FS tags/categories remain authoritative. |
| **TRC8** | Do not change Studio cache, Rules, Algolia, Storage, or canonical taxonomy in Implement. |
| **TRC9** | Telemetry must distinguish at least: trigger-received (or fields-changed), coalesce-joined, rebuild-started, rebuild-success (existing), rebuild-failure (existing/enhanced). |
| **TRC10** | Cross-instance duplicate rebuilds are **accepted**; document residual last-writer corpus race; no durable lock in this corrective. Optional cheap meta revision re-read before `meta.set` only if Review requires — prefer keep deploy surface to triggers only. |

### Pseudocode (illustrative)

```ts
let inFlight: Promise<void> | null = null;
let dirty = false;
let lastReason = "taxonomy-source-written";
const COALESCE_MS = 750;
const MAX_PASSES = 5;

export async function awaitCoalescedTaxonomyRebuild(reason: string): Promise<void> {
  lastReason = reason;
  log("taxonomy-trigger-coalesce-request", { reason });

  if (inFlight) {
    dirty = true;
    log("taxonomy-trigger-coalesce-join", { reason });
    await inFlight;
    return;
  }

  inFlight = (async () => {
    let passes = 0;
    do {
      dirty = false;
      passes += 1;
      await sleep(COALESCE_MS);
      const reasonForPass = lastReason;
      log("taxonomy-trigger-rebuild-start", { reason: reasonForPass, pass: passes });
      await rebuildTaxonomyMaterialization({
        updatedBy: "onTaxonomySourceWritten",
        reason: reasonForPass,
      });
    } while (dirty && passes < MAX_PASSES);
    if (dirty) {
      dirty = false;
      await rebuildTaxonomyMaterialization({
        updatedBy: "onTaxonomySourceWritten",
        reason: lastReason,
      });
    }
  })().finally(() => {
    inFlight = null;
  });

  try {
    await inFlight;
  } catch (error) {
    // failure already logged inside rebuild or here
    throw error;
  }
}
```

**Join semantics note (binding for Implement):** Late joiners that `await inFlight` and return must not miss a dirty trailing pass started by their own join. Prefer: all waiters share the same Promise that only settles after dirty is cleared (leader loop), rather than “await once and return while dirty still scheduled outside.” Implement must unit-test that a write during rebuild causes a second rebuild before any waiter resolves successfully.

### Same-instance behavior

| Scenario | Expected |
|----------|----------|
| Single write | One coalesce wait + one rebuild; revision +1; waiter completes after success |
| N rapid writes during coalesce window | One rebuild reflecting latest FS state (corpus loaded at rebuild time) |
| Write during rebuild | Trailing second rebuild before Promise settles |
| Write after settle | New `inFlight` cycle |
| Rebuild throws | Promise rejects; state cleared in `finally`; next write can retry |

### Cross-instance behavior

| Scenario | Expected |
|----------|----------|
| Two instances each see a write | Up to two rebuilds; both await their own work (defect fixed per instance) |
| Overlapping rebuilds | Possible duplicate revision publish / last meta wins; readers still see consistent revision+hash+chunks for whichever publish completes; rare |
| Need durable lock? | **No** for this defect |

---

## Approach (Implement steps — not this pass)

1. Replace `scheduleCoalescedRebuild` with awaited coalesce helper satisfying TRC1–TRC10.
2. Change both triggers to `await awaitCoalescedTaxonomyRebuild(...)`.
3. Leave callable path unchanged (already awaits rebuild).
4. Add unit tests with injectable clock + mock rebuild (see Test Strategy).
5. Harden containment test against detached timer pattern.
6. Run scoped unit tests / functions typecheck as applicable.
7. **STOP** for owner: `APPROVE DEV TAXONOMY TRIGGER REBUILD CORRECTIVE DEPLOY` (exact allowlist below) — separate from Implement approval.
8. After deploy: reduced live re-QA (below). Then Studio stale-cache proof.

---

## Test Strategy

### Automated

| ID | Case | Required proof |
|----|------|----------------|
| **A** | Single write | One rebuild call after coalesce; await completes after rebuild resolves |
| **B** | Coalesced writes | Multiple requests during window → **one** rebuild (or design-documented count); final rebuild sees latest reason/dirty |
| **C** | Late write | After prior Promise settles, new request starts new rebuild |
| **D** | Failure | Mock rebuild rejects → awaiters reject; `inFlight` null afterward; subsequent request can rebuild again |
| **E** | Category path | Category trigger uses same helper (shared function or twin await) |
| **F** | Fleet safety | Unit/doc bound: no durable lock; document duplicate-instance behavior; optional test that two independent helper instances each rebuild |
| **G** | Atomicity | Unchanged fence tests in builder / rebuild unit tests still pass; no reader contract change |

Also:

- Containment: source must `await` coalesce helper; must **not** match detached `setTimeout`→`rebuildTaxonomyMaterialization` pattern.
- Commands (expected):  
  `npx tsx --test functions/src/taxonomy/onTaxonomySourceWritten.coalesce.test.ts`  
  `npx tsx --test functions/src/taxonomy/taxonomyMaterializationContainment.test.ts`  
  plus existing taxonomy builder tests if touched.

| Check | Command | Required |
|-------|---------|----------|
| Unit tests | scoped `tsx --test` above | yes |
| Typecheck | functions `tsc` / existing predeploy | yes if TS changed |
| Lint | if repo script applies | as available |
| Build | not required beyond functions compile | no full monorepo |
| E2E | no | live re-QA instead |
| Rules | no | |

### Manual (after future deploy — not planning pass)

See **Reduced live re-QA** below.

---

## Exact future Function deploy allowlist

If Implement touches **only** `onTaxonomySourceWritten.ts` (+ tests):

```bash
firebase deploy --only \
  functions:onTagTaxonomySourceWritten,\
  functions:onCategoryTaxonomySourceWritten \
  --project fresh-prints-dev
```

| Include | Exclude |
|---------|---------|
| `onTagTaxonomySourceWritten` | `rebuildTaxonomyMaterializationCallable` (unless rebuild helper changes force bundle update — avoid) |
| `onCategoryTaxonomySourceWritten` | AI enrichment / Algolia / unrelated Functions |
| | Rules, Storage, Hosting, production |

Owner phrase for deploy is a **separate** gate after Implement+tests (not granted by this plan approval alone).

---

## Reduced live re-QA sequence (after deploy)

Do **not** create a new taxonomy item. Use existing controlled alias on `tags/acdc`.

1. Read-only note current live `taxonomyMaterialization/meta.revision` (today **1**; do not assume after other work).
2. In Studio Tag Management: **remove** alias `taxonomy-smoke-20260807` from `acdc`; save **once**.
3. Verify:
   - meta.revision advances from the pre-step value to **exactly prior+1** (numeric from live state).
   - `ready: true`; new `contentHash` ≠ previous.
   - chunk fence OK; recomputed hash matches.
   - Alias **absent** from chunk corpus and from canonical tag.
   - Logs: trigger coalesce/rebuild-start + `taxonomy-materialization-rebuild-success` with reason `tag-written` (or coalesce reason).
   - Category trigger not required for this path.
4. Optionally re-add alias only if a second cycle is needed.
5. **Then** Studio stale-cache refresh proof:
   - meta (+ chunk if revision mismatch) refresh
   - **0** old `/tags` pagination
   - **0** full `/categories` hydrate
   - UI matches canonical taxonomy

**Do not remove the alias during this planning pass.**

---

## Human Checkpoints Anticipated

- [x] Other: Owner `APPROVE TAXONOMY TRIGGER REBUILD CORRECTIVE IMPLEMENTATION` before code
- [x] Other: Owner approve **dev** Functions deploy allowlist after Implement
- [x] Manual QA: reduced mutation re-QA + Studio refresh
- [ ] Production deploy — **out of scope**
- [ ] Database migration — none

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Detached timer remains | Critical | TRC1 + containment regex/test |
| Poisoned shared Promise | High | `finally` clear; D test |
| Trailing write dropped | High | dirty flag + joiners share settling Promise; B/C tests |
| Trigger timeout under burst | Medium | MAX_PASSES + final rebuild; 60s budget vs ~3s rebuild |
| Cross-instance stale last-writer | Low–Med | Accept + rare writes; next write/callable heals; optional CAS later |
| Scope creep to Studio/Algolia | Medium | TRC8; Review gate |
| Silent HTTP 200 on rebuild fail | High | TRC5 rethrow |

---

## Rollback Plan

- Redeploy previous trigger revisions for the two Functions on `fresh-prints-dev`.
- Materialization docs remain; callable rebuild remains available for manual repair.
- Alias/canonical tags untouched by rollback.

---

## Documentation Updates Required

- [ ] BACKEND.md — short note: taxonomy triggers await coalesced rebuild (after Implement)
- [ ] DECISIONS.md — ADR note if Review wants (optional small)
- [x] Workflow plan/review/state (this pass)
- [ ] TESTING.md — only if new npm script added

---

## Open Questions

- [x] None blocking Plan/Review. Optional: whether Implement adds meta CAS — default **no** (TRC10).

---

## Approval

- Review doc: `docs/workflow/reviews/2026-08-07-taxonomy-trigger-rebuild-corrective-plan-review.md`
- Verdict: **approved_with_changes**
- Binding Implement RCs from Review: **RC-R1–RC-R8** (join/trailing Promise settle, await containment, failure reset + telemetry, no rebuild CAS this pass, Option B fallback, test seam, live re-QA split)

## Formal Review binding deltas (incorporated)

1. Joiners must share a Promise that settles only after dirty trailing rebuilds finish (illustrative “await and return” is insufficient).
2. Prefer A; switch to direct await (B) if A cannot prove trailing invariant simply.
3. Do not touch `rebuildTaxonomyMaterialization.ts` for CAS in this corrective (deploy = two triggers only).
4. Export coalesce helper for unit tests; rethrow + failure telemetry on awaited path.
