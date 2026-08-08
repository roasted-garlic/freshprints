# Plan: Amendment 9 P4 — Snapshot Publication Read Amplification Guard

| Field | Value |
|-------|-------|
| Date | 2026-08-06 |
| Author | Planning Agent |
| Status | approved (Formal Review corrections R1–R5 applied) |
| Workflow | managed-phase |
| Managed goal | `post-launch-catalog-and-processing-stability` |
| Phase | Amendment 9 P4 — snapshot publication read amplification |
| Branch | `fix/post-launch-catalog-and-processing-stability` |
| Starting HEAD | `862f7d1` |
| PR | #40 — open / unmerged (do not merge this pass) |
| Related | Amendment 9 Plan; P0 Signoff; Stage 1a Signoff; Phase 1B revalidation Plan/Review |
| Pass mode | Investigate → Plan → Formal Review → **Stop** (no Implement) |

---

## Goal

Prevent sequential or batch AI approvals (and related design writes) from causing repeated full Portal catalog publications and full Firestore scans, while preserving the generated search, multi-tag, and facet assets that Stage 1b has not replaced yet. Deliver a bounded, multi-instance-safe transition guard that can be retired after Stage 1b.

---

## Background

- Amendment 9 **P0** is signed off: AI Review no longer reloads the remaining list or refreshes three-tab counts on successful actions.
- Runtime attribution (`docs/workflow/reviews/2026-08-06-amendment-9-p0-server-read-attribution.md`) found **snapshot publication dominated** remaining reads: **25** successful full Portal publications and ~**28,710** catalog/taxonomy/ready document reads in one QA window; AI taxonomy ~**3,420** secondary.
- Stage **1a** is signed off: known-ID hydration and Portal categories are Firestore; **generated text search, multi-tag AND, tag facets, and narrowed facets remain**.
- Therefore the generated search publisher **cannot** be deleted yet. P4 is a **production-promotion blocker** and a **short transition guard**, not Stage 1b.
- Owner priority: reduce Firestore reads from AI processing. **Do not begin Stage 1b / provider selection.**

---

## Scope

### In Scope (this Plan / later Implement)

- Source-proven investigation of the post–Stage 1a publication path (this pass).
- Design a **bounded publication rate / coalescing guard** for `portal-catalog` full publications.
- Optional **classifier eligibility** refinement: do not schedule full portal publication for index-filter field churn when **neither** before nor after status is `ready` (published set cannot change).
- Preserve eventual generated search/facet correctness; preserve lease, dirty-generation, retry, and multi-instance safety.
- Tests and logging expectations for the later Implement pass.
- Docs updates for behavior (BACKEND / DECISIONS / handoff) in the Implement pass.

### Out of Scope

- Stage 1b / managed-search provider selection or implementation.
- Disabling or deleting generated publication while search/multi-tag/facets still consume it.
- Full generated-object cleanup / Function retirement.
- Amendment 9 **P3** taxonomy caching (separate, secondary).
- Portal customer feature changes.
- Rules, Storage Rules, indexes, migrations.
- Firebase deploy, PR #40 merge, production actions.
- **Any implementation in this Investigate/Plan/Review pass.**

---

## Affected Areas

### Files / Modules (expected later Implement — verified present at `862f7d1`)

| Path | Role |
|------|------|
| `functions/src/catalogSnapshots/publishCatalogSnapshots.ts` | Debounce claim, lease, catch-up, `publishPortal`, design/category/tag triggers; **add W2 coordination-doc trigger** |
| `functions/src/catalogSnapshots/publicationRecovery.ts` | Catch-up / retry helpers (`PUBLICATION_PASS_LIMIT`, lease-busy) |
| `functions/src/catalogSnapshots/portalCatalogChangeClassifier.ts` | Ready-boundary / index-filter / card-only / operational |
| `functions/src/catalogSnapshots/snapshotSchedulingCoalescing.test.ts` | Coalescing + Amendment 1 claim/timeout regressions |
| `functions/src/catalogSnapshots/publicationRecovery.test.ts` | Catch-up / retry regressions |
| `functions/src/catalogSnapshots/portalCatalogChangeClassifier.test.ts` | Classifier regressions (incl. non-ready INDEX_FILTER skip) |
| `functions/src/catalogSnapshots/publishCatalogSnapshots.test.ts` | Publisher tests (as needed) |
| `functions/src/index.ts` | Export new W2 trigger if added — **[verify on Implement]** |

No new managed-search packages. No Portal app feature cuts.

### Architecture Impact

- [x] Details: Temporary coordination semantics on existing `snapshotPublicationState/{kind}` docs; no new search architecture; no Stage 1b.

### Security Impact

- [x] None material — Admin SDK publisher path unchanged; no Rules/public exposure change. Attribution logs must remain free of document field contents (existing constraint).

### Data Model Impact

- [x] Details: Additive optional fields on **coordination** docs only (`snapshotPublicationState/portal-catalog`), e.g. `nextEligiblePublishAt`. No design/category/tag schema migration.

### Backend Impact

- [x] Details: Cloud Functions publisher behavior only. Deploy of touched Functions required in a **later** owner-approved checkpoint (not this pass).

### UI / UX Impact

- [x] None for customer features. Possible Portal search/facet freshness delay up to worst-case bound below (eventual consistency already inherent).

### Migration Impact

- [x] None — no backfill; missing new coordination fields treated as “eligible now.”

---

## Investigation results (source-proven at `862f7d1`)

### Current publication call graph (post–Stage 1a)

```text
designs/{designId} write
  → onPortalCatalogSnapshotSourceWritten (timeoutSeconds: 300)
    → classifyPortalCatalogDesignChange(before, after)
         operational  → skip (dev accounting log only)
         card-only    → publishPortalCardOverride (Storage manifest/overrides; 0 FS catalog scan)
         index-filter → markAndPublishAfterDebounce("portal-catalog", "design-write")
              → markDirtyAndClaimDebounceWaiter
                   (requestedGeneration++, wakeGeneration++; claim debounceOwner/Expires
                    for DEBOUNCE_MS + PUBLISH_ATTEMPT_MARGIN_MS = 15s + 90s = 105s)
              → non-waiter: return
              → waiter: sleep DEBOUNCE_MS (15s)
                   → runPublicationCatchUpLoop (passLimit = 3)
                        → publishKind("portal-catalog")
                             → transactional lease (LEASE_MS = 10 min)
                             → publishPortal(generation)
                                  → FS: designs where status=="ready" (full scan)
                                  → FS: categories isActive + tags approved (full taxonomy)
                                  → Storage: search shards, tag/category ID assets, tag facets,
                                    card buckets, discover, studio ready index, browse pages,
                                    manifest
                        → if requestedGeneration > publishedGeneration: immediate next pass
                   → finally releaseDebounceClaimIfOwned

categories/{id} / tags/{id} writes
  → markAndPublishAfterDebounce("catalog-reference", …)
  → separate coordination doc + generation counter (does NOT schedule portal-catalog)
  → publishReference loads taxonomy only (no ready-design scan)

Manual: rebuildCatalogSnapshots / retryPortalCatalogPublication (owner/admin callables)
```

**Ready / index-filter transitions that schedule full portal publication today:**

1. Any **ready-boundary** change (`status` crosses into/out of `ready`) — including AI Review approve (`applyCatalogApprovalUpdate` → `status: "ready"` + `readyAt`) and reject/archive leaving ready.
2. Any change to **INDEX_FILTER_FIELDS** (`title`, `description`, `categoryId`, `tags`, `createdAt`, `readyAt`) — including on **non-ready** designs (create/import title churn), which still schedules a full scan even though `publishPortal` only reads `status=="ready"` (explains early attribution pubs with `readyDesignsRead=0`).
3. Card-only changes do **not** full-publish (targeted override path).
4. Operational AI enrichment fields (`aiSuggestions`, counts, etc.) do **not** schedule.

**Every `ready` approval schedules independently** at the trigger layer (each write calls `markAndPublishAfterDebounce`). Coalescing is only via the shared debounce claim + dirty generation — not via an AI batch signal.

### Answers to required investigation questions

| # | Question | Answer |
|---|----------|--------|
| 1 | Which transitions schedule publication? | Ready-boundary + INDEX_FILTER_FIELDS changes → full; card-only → override; operational → skip. |
| 2 | Does every ready approval schedule independently? | Yes at trigger; coalesce only while an unexpired debounce claim exists. |
| 3 | Why 25 pubs not one? | See root cause below. |
| 4 | Does debounce claim expire before publish completes? | Claim duration is 105s from claim; claim is also **released in `finally`** after catch-up ends. Amendment 1 reduced stuck-claim risk; paced batches still reopen windows after release. |
| 5 | Do queued dirty gens force serial catch-up pubs? | **Yes** — `runPublicationCatchUpLoop` immediately republishes while `requestedGeneration > publishedGeneration`, up to `PUBLICATION_PASS_LIMIT = 3`, **without** a new quiet period. |
| 6 | Shared generation with category/tag? | **No** — separate docs: `snapshotPublicationState/portal-catalog` vs `…/catalog-reference`. |
| 7 | Generated assets needing full-catalog input after Stage 1a? | Text shards; tag→design ID lists (multi-tag); tag facet summary (+ narrowed facets derived client-side); card buckets still used by `portalCatalogAssetService.getDesignsByIds` for search-path card resolution. Publisher still also writes discover / studio ready index / browse pages (unused for Stage 1a ordinary browse) in the same full pass. |
| 8 | Delta update without Stage 1b redesign? | Not recommended for P4 — would create a second search-maintenance architecture. Defer to Stage 1b. |
| 9 | Scan C+T+R every generation? | **Yes** — `publishPortal` always loads ready designs + active categories + approved tags. |
| 10 | Delay until batch settled? | Yes via stronger quiet + min interval; **not** via AI batch-complete coupling. |
| 11 | Max-rate guard preserve correctness? | Yes if dirty watermark retained and a waiter can publish after `nextEligiblePublishAt` without requiring a new write when catch-up remains. |
| 12 | Retry / failure / lease / catch-up safety? | Keep lease mutex; keep dirty `requestedGeneration`; keep lease-busy + transient retries; keep `retryPortalCatalogPublication`; avoid process-memory-only gates. |

### Exact cause of the observed 25 publications

Attribution window: 180 scheduling events (**14** `claimed-debounce-waiter`, **166** `joined-existing-debounce-window`), **25** `outcome=success` full pubs, all sampled `design-write`.

**Root cause (compound):**

1. **Claim windows reopen across a paced batch.** Debounce coalescing works only while one waiter holds an unexpired claim. After the waiter finishes `runPublicationCatchUpLoop` and **releases** the claim (or the 105s claim ages out), the next ready/index-filter write starts a **new** 15s quiet window and another full publish cycle. A human-paced ~45-approval session spanning minutes therefore yields many waiters (~14 claimed), not one.
2. **Immediate catch-up multiplies pubs per waiter.** While a publish runs, further approvals bump `requestedGeneration`. The catch-up loop then runs additional full scans **immediately** (up to 3 passes) without re-quieting — explaining **25 successes > 14 claims** (~1.8 pubs/waiter).
3. **Secondary waste:** INDEX_FILTER scheduling on non-ready designs produces full C+T(+R=0) publications during import/create churn (attribution: many early pubs with `readyDesignsRead=0`).

This is **not** “each approval always publishes once” (166 joins prove coalescing works inside a window). It **is** “many windows + intra-window catch-up serial full scans.”

---

## Options evaluated

### Option A — stronger coalescing window

Lengthen quiet/debounce so more approvals share one waiter.

- Pros: Simple; fits existing claim model.
- Cons: Alone, claim release + catch-up still allow many pubs across a long paced batch; very long claims reintroduce Amendment 1 kill/stuck-claim risk against `timeoutSeconds: 300`.

### Option B — minimum publication interval

At most one successful full portal publication per bounded interval; preserve pending dirty generation for eventual catch-up.

- Pros: Hard upper bound on pubs vs wall-clock; multi-instance safe if persisted on coordination doc.
- Cons: Must not lose final dirty generation; must wake without relying only on process memory; must fit Function timeout.

### Option C — batch-aware publication suppression

Trigger one final publish from AI queue “batch complete.”

- **Reject.** No trustworthy cross-instance batch-complete signal for Portal publication; brittle coupling between AI processing and catalog publication; multi-tab / partial / failed queues unsafe.

### Option D — incremental search-asset updates

Patch shards/facets from a design delta.

- **Reject for P4.** Honest evaluation: feasible in theory for some assets, but creates a second search-maintenance architecture and silently redesigns Stage 1b. Out of scope.

### Option E — temporarily disable generated publication

- **Reject.** Stage 1a left search/multi-tag/facets on generated assets with no truthful Firestore fallback that preserves current behavior.

### Option F — immediate Stage 1b provider migration

- **Out of scope.** P4 is the transition guard; D1 / Stage 1b follows after the read blocker is controlled.

---

## Recommended P4 guard — Option A∪B hybrid (“quiet + min interval + deferred catch-up”)

**Name:** Portal full-publication rate guard (temporary until Stage 1b).

### Semantics (persisted on `snapshotPublicationState/portal-catalog`)

1. Keep existing `requestedGeneration` / `publishedGeneration` dirty watermark, transactional **lease**, and debounce claim pattern.
2. Add **`nextEligiblePublishAt`** (Timestamp | null). Missing field ⇒ eligible immediately.
3. After each **successful** full `publishKind("portal-catalog")`, set  
   `nextEligiblePublishAt = now + MIN_PUBLICATION_INTERVAL_MS` in the **same post-publish coordination write** that advances `publishedGeneration` (not a best-effort later write).
3a. **Enforcement checkpoint:** Immediately before attempting `publishKind("portal-catalog")` (design-trigger waiter **and** deferred-wake drain path), read the coordination doc and, if `now < nextEligiblePublishAt`, sleep until eligible **only when** remaining invocation budget permits one full publish + margin; otherwise execute the wake rule (item 5) without publishing early. Do **not** rely on quiet sleep alone — a new waiter after claim reopen must still honor a prior instance’s `nextEligiblePublishAt`.
4. **One full portal publish per invocation:** For `portal-catalog`, effective `passLimit = 1` per design-trigger waiter invocation **and** per deferred-wake execution. Additional dirty generations are drained by deferred wake (item 5), **not** by immediate in-process catch-up. Today’s immediate `PUBLICATION_PASS_LIMIT=3` serial full scans for portal-catalog are removed. `PUBLICATION_PASS_LIMIT` may remain for lease-busy / transient retries of the **same** attempted pass, and for `catalog-reference` if unchanged.
5. **Wake rule (no lost final generation — mandatory auto-wake):** After a successful full portal publish, if `requestedGeneration > publishedGeneration`, remaining dirty **must** drain without requiring further design writes. Process-memory sleep alone is insufficient when the Function timeout budget is exhausted (with `QUIET=30s`, `MIN_INTERVAL=120s`, ~90s publish, and `timeoutSeconds=300`, a single invocation typically cannot complete two min-interval-spaced full publishes).

   **Required mechanism — Option W2 (Plan mandate):** Add `onDocumentWritten` on `snapshotPublicationState/portal-catalog` (or equivalent coordination-doc trigger) that, when `requestedGeneration > publishedGeneration` and `now >= nextEligiblePublishAt` (or eligibility missing), claims the debounce waiter role under the same lease/min-interval guards and runs **exactly one** portal full publish pass. Guard against trigger storms with the existing transactional debounce claim + lease + eligibility check. When a design-trigger waiter must release with dirty remaining and insufficient budget to wait+publish, it MUST perform a coordination write that **fires** this path (e.g. bump `wakeGeneration` / set an explicit `deferredWakeNonce`) while leaving the dirty watermark intact.

   - `retryPortalCatalogPublication` remains the **ops escape hatch**, not the primary drain path.
   - Tests MUST cover: N approvals with **zero writes after the last** → eventual `publishedGeneration == requestedGeneration` within the freshness bound.
   - Cloud Tasks (W1) are **not** required if W2 is implemented correctly; do not add new GCP products unless W2 proves insufficient in Implement review.
6. **Classifier refinement (P4-a, same Implement):** Treat INDEX_FILTER field changes as **operational (skip full schedule)** when **neither** before nor after is `ready`. Ready-boundary and ready-document index-filter changes still schedule. Card-only unchanged.
7. Do **not** couple to AI queue completion (Option C rejected).
8. Do **not** change Portal customer APIs or disable generated consumers.
9. Admin callables (`rebuildCatalogSnapshots`, `retryPortalCatalogPublication`) intentionally bypass quiet/min-interval; document in BACKEND.md — not counted against AI-batch publication bounds.
10. Retire this guard after Stage 1b removes generated search consumers / publishers.

### Concrete numerical targets

| Parameter | Value | Notes |
|-----------|------:|-------|
| Quiet / debounce window (`QUIET_MS`) | **30_000** | Up from 15_000 |
| Minimum publication interval | **120_000** | Between successful full portal pubs |
| Lease duration | **600_000** (10 min) | Unchanged |
| Publish-attempt claim margin | **90_000** | Keep Amendment 1 self-heal intent |
| Debounce claim duration (`claimDurationMs`) | **`QUIET_MS + MIN_PUBLICATION_INTERVAL_MS + PUBLISH_ATTEMPT_MARGIN_MS` (= 240_000)** | Replace `DEBOUNCE_MS + PUBLISH_ATTEMPT_MARGIN_MS` for portal-catalog waiter claims; update coalescing regression tests |
| Max claim liability for one wake | **≈ 240s** | Must stay **&lt; raised waiter timeout** (see below) |
| Portal waiter / wake `timeoutSeconds` | **≥ 300** (keep); raise to **540** if Implement proves one quiet+publish cycle needs more headroom | Event-driven CF v2 allows this; do not reintroduce Amendment 1 stuck-claim via oversized claim liability |
| Catch-up | `passLimit=1` per wake; deferred W2 wake for remaining dirty | Replace today’s immediate ≤3 serial pubs |
| Max full pubs — **45** sequential approvals | **≤ 5** | Assumes owner-paced batch wall **≤ ~10 min** (formula `1 + ⌊600/120⌋ = 6`; target keeps margin for reopen edges). **Stretch ≤ 4** if wall ≤ ~6 min (`1 + ⌊360/120⌋ = 4`). |
| Max full pubs — **100** sequential approvals | **≤ 8** | Assumes batch wall **≤ ~14 min** (`1 + ⌊840/120⌋ = 8`). **Stretch ≤ 6** if wall ≤ ~10 min (`1 + ⌊600/120⌋ = 6`). |
| Worst-case search/facet freshness delay | **≤ ~6 minutes** | ≈ `MIN_INTERVAL + QUIET + one publish (~90s) + one W2 wake latency` after a change that arrives just as a publish completes; not only in-process sleep |
| Full-scan read upper bound **per** publication | **≈ 1,140 + R** | `categoriesRead + tagsRead + readyDesignsRead` (+ small coordination) |

**Wall-clock bound rationale:** With min interval 120s, publications in a continuous dirty stream lasting wall time \(D\) seconds are bounded by roughly \(1 + \lfloor D / 120 \rfloor\) (plus at most one trailing W2 catch-up). Targets MUST NOT use stretch values tighter than `1 + \lfloor D / MIN_PUBLICATION_INTERVAL_MS \rfloor`. Synthetic tests should assume ~6–13 s between approvals unless otherwise stated.

### Estimated read reduction

| Scenario | Before (observed / projected) | After (upper bound) | Approx reduction |
|----------|-------------------------------|---------------------|------------------|
| 45 approvals QA window | 25 pubs × ~1.15K ≈ **28.7K** | ≤5 × ~1.15K ≈ **≤5.8K** | **~80%** fewer publication reads |
| Non-ready INDEX_FILTER waste | Early R=0 full pubs | Eliminated by P4-a | Additional savings during import |

P3 taxonomy (~3.4K) remains separate and secondary.

### Retry and crash-recovery behavior

| Event | Behavior |
|-------|----------|
| Transient Storage / lease-busy | Existing retry classification retained; do not clear dirty watermark |
| Fatal publish failure | `status=failed`; `requestedGeneration` remains ahead; next waiter or `retryPortalCatalogPublication` drains |
| Function killed mid-publish | Lease expires (≤10 min); debounce claim self-heals via expiry (Amendment 1 margin, not LEASE_MS); dirty preserved |
| Multiple instances | Lease remains sole scan mutex; debounce claim reduces redundant waiters; `nextEligiblePublishAt` is transactional/ persisted |
| Pass / timeout budget exhausted with dirty remaining | Leave dirty; do not mark published caught up; ops callable or next eligible waiter recovers |
| Process restart | No correctness dependency on in-memory timers alone — eligibility + dirty + lease live in Firestore |

---

## Approach (later Implement only — not this pass)

1. Implement `nextEligiblePublishAt` write on successful portal full publish (same coordination update as `publishedGeneration`).
2. Enforce eligibility checkpoint before every portal `publishKind`; portal `passLimit=1` per invocation.
3. Implement **W2** coordination-doc trigger + dirty-remaining wake write; prove zero-writes-after-last-approval drain in tests.
4. Raise portal-catalog claim duration to `QUIET + MIN_INTERVAL + MARGIN` (240s); keep claim ≪ LEASE_MS.
5. Classifier P4-a: skip full schedule when neither side is ready for pure INDEX_FILTER churn.
6. Extend unit tests: coalescing, min-interval bound for 45/100 synthetic schedules, non-ready skip, lease contention, crash/claim expiry, W2 storm guard, final generation drain.
7. Keep attribution logs (`catalog-snapshot-scheduling`, `catalog-snapshot-publication`, accounting); add deferred-wake outcome codes.
8. Docs: BACKEND / DECISIONS / CURRENT-STATE note temporary guard; roadmap: retire after Stage 1b.
9. **Stop for owner-approved Functions deploy** (design triggers + W2 trigger) before claiming live read reduction.

---

## Acceptance criteria

1. Current post–Stage 1a publication call graph is source-proven (this Plan §Investigation).
2. Cause of the observed 25 publications is identified (claim reopen + immediate catch-up + non-ready INDEX_FILTER waste).
3. A batch of 45 approvals cannot trigger 25 full publications (target ≤5).
4. A batch of 100 approvals has documented upper bound (≤8).
5. Eventual generated search/facet correctness preserved.
6. Failed publication remains retryable.
7. A killed Function cannot strand publication indefinitely (lease + claim expiry + dirty watermark + retry callable).
8. Multiple Function instances cannot publish concurrently (lease).
9. Dirty generations cannot cause an unbounded immediate catch-up loop.
10. No process-memory-only correctness dependency.
11. No Portal feature cut.
12. No managed-search provider selected.
13. No Stage 1b implementation begins.
14. No full generated-object cleanup.
15. P3 taxonomy caching remains separate and secondary.
16. No Rules/Storage Rules/indexes/migration/deploy/merge/production action in Plan/Review pass.
17. PR #40 remains open and unmerged.

---

## Test Strategy (for later Implement / Test phases)

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Classifier unit | `npx tsx --test functions/src/catalogSnapshots/portalCatalogChangeClassifier.test.ts` | yes |
| Coalescing / interval | `npx tsx --test functions/src/catalogSnapshots/snapshotSchedulingCoalescing.test.ts` (+ new cases) | yes |
| Recovery / catch-up | `npx tsx --test functions/src/catalogSnapshots/publicationRecovery.test.ts` | yes |
| Publisher / related | `npx tsx --test functions/src/catalogSnapshots/*.test.ts` | yes |
| Functions build | `cd functions && npm run build` | yes |
| Lint / diff check | repo lint + `git diff --check` on touched files | yes |

Synthetic scheduling tests must prove: N ready transitions inside one quiet window → one waiter; continuous dirty stream → pubs spaced ≥ min interval; 45/100 paced schedules → ≤ bound; non-ready title write → no full schedule; lease still exclusive; dirty survives failed publish.

### Manual (after Implement + owner-approved dev deploy)

- [ ] Re-run ~45 AI Review approvals; Cloud Logging: full portal success count ≤5; C+T+R sum ≪ 28.7K.
- [ ] Portal text search / multi-tag / facets eventually correct after last approval (within freshness bound).
- [ ] Kill/timeout simulation or forced failure still recovers via dirty + retry path.
- [ ] No Portal feature regression checklist (browse FS paths untouched).

---

## Human Checkpoints Anticipated

- [x] Plan + Formal Review only this pass
- [ ] Owner approval to **Implement** Amendment 9 P4
- [ ] Owner approval phrase for **dev Functions deploy** of publisher triggers after Implement
- [ ] Manual QA after deploy
- [ ] Production deploy / PR merge — **blocked** (separate)

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Freshness delay up to ~6 min for search/facets | Medium | Documented; ordinary browse already Firestore; temporary until Stage 1b |
| Final dirty stranded if wake incomplete | High | **W2 mandatory** coordination-doc auto-wake; dirty never cleared on failure; retry callable is escape hatch only; tests: zero writes after last approval still drain |
| Claim too long → Amendment 1 stall | High | Cap claim liability (~240s) ≪ LEASE_MS; never use LEASE_MS as claim duration; W2 invocations are short single-pass |
| W2 trigger storm / recursion | Medium | Same debounce claim + lease + eligibility gates; nonce/wakeGeneration bump only when dirty remains |
| Over-coalescing hides bugs | Low | Attribution logs retain per-pub accounting |
| Scope creep into Stage 1b | High | Explicit out-of-scope; Formal Review rejects provider work |

---

## Rollback Plan

1. Revert P4 Function commits → prior debounce/catch-up behavior (costly but correct).
2. Coordination fields are additive; ignore-on-read compatible.
3. No Rules/index rollback needed.
4. Independent of P0 / Stage 1a / P3.

---

## Documentation Updates Required (Implement pass)

- [ ] `docs/architecture/BACKEND.md` — temporary rate guard
- [ ] `docs/project/DECISIONS.md` — short ADR note (retire after Stage 1b)
- [ ] `references/project-chatgpt-handoff/CURRENT-STATE.md`
- [ ] Amendment 9 parent plan cross-link / ROADMAP blocker note if needed

---

## Open Questions

- [x] None blocking Plan/Review — numerical targets chosen above; owner may tighten stretch goals at Implement approval without changing architecture.

---

## Approval

- Review doc: `docs/workflow/reviews/2026-08-06-post-launch-catalog-and-processing-stability-amendment-9-p4-review.md`
- Verdict: **approved** (Formal Review `approved_with_changes`; R1–R5 applied in-place below)
- Applied Formal Review corrections: R1 W2 mandatory wake; R2 numerical/stretch math; R3 eligibility checkpoint; R4 passLimit=1; R5 claim duration 240s + admin bypass note
