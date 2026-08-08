# Amendment 9 Plan: Large-batch Firestore read amplification

| Field | Value |
|---|---|
| Date | 2026-08-06 |
| Managed goal | `post-launch-catalog-and-processing-stability` |
| Amendment | **9 — Large-batch Firestore read amplification** |
| Branch | `fix/post-launch-catalog-and-processing-stability` |
| PR | #40 (open; **unmerged**) |
| Starting HEAD | `4a0c039e63778d82a40efba678fdfa3c311cead3` |
| Incident evidence | `docs/workflow/reviews/2026-08-06-large-batch-firestore-read-amplification-incident.md` |
| This pass | **Investigate → Plan → Formal Review only. No implementation.** |

**Implement is not authorized by this Plan.** Implementation requires a later explicit owner approval after Formal Review clearance.

---

## 1. Incident timeline

| When (UTC / local) | Event |
|---|---|
| 2026-08-06 ~10:04–10:05 AM owner-local | **Test Run A:** Console ~7.1K reads / 93 writes (exact UTC + composition unresolved) |
| Before Run B | Owner deleted existing designs (ready vs non-ready mix unknown) |
| `15:29:47Z`–`15:35:39Z` | **Test Run B:** Studio Debug session — import 45 → AI Review 45 approvals → Design Library |
| This planning pass | Parse Debug JSON; source-trace import / AI Review / taxonomy / snapshots; write Plan + Review |

**Test Run A and Test Run B remain separate observations.** Do not subtract 2,495 from 7.1K.

---

## 2. Goal

Reduce large-batch import + AI Review Firestore reads from **quadratic / repeated full-collection** behavior to **bounded, approximately linear** cost while preserving correctness, concurrent-staff safety, and all protected product features.

---

## 3. Scope

### In scope (future implement)

**Authorized first Implement slice (after owner Implement approval):** **P0 only** (AI Review local reconciliation + budgets/tests for P0).  

**Optional same-PR if call graph locked before coding:** **P1** (import / approval oneshot reduction).  

**Not in first Implement without logs + re-review:** **P3** (Functions taxonomy), **P4** (snapshot guard).

1. AI Review post-approval **local reconciliation** (list + selection + tab counts) with bounded authoritative recovery
2. Import-path **duplicate design document read** reduction / dedupe where safe (P1)
3. Studio taxonomy load **reuse** improvements only if needed beyond current 12h cache (optional; not P0)
4. Server AI taxonomy **cache / enqueue** containment options (P3; may include `[NEEDS OWNER DECISION]`)
5. Snapshot **attribution** from owner logs; temporary publisher guard **only if** logs prove material contribution before Phase 1B (P4)
6. Measurable read-budget tests + Debug regression harness (P0 mandatory)

### Out of scope

- Phase 1B / managed-search provider choice
- Snapshot Function/Storage deletion
- PR #40 merge / production promotion
- AI model/prompt / PNG policy / print-request / show-queue changes
- New dependencies
- Destructive wipes / test imports during planning
- Rules/index migrations unless a later amend explicitly adds them
- Broad invalidate-strategy experiments that reintroduce full page/count reloads on the happy path

---

## 4. Proven root causes (client — Run B)

1. **`useAiReviewInbox.runInboxAction` always `await reloadDesigns()`** after successful approve/reject/archive → full Needs Review page refetch.
2. **`onQueueChanged` → `useAiReviewTabCounts.reloadCounts()`** refreshes **all three** tab aggregations after every success.
3. **`invalidateDesignReadCaches` on every design write** ensures those refetches miss page/count caches.
4. **Approval return value discarded** — `approveFromInbox` / `approveDesignForCatalog` already produce a `Design` that could drive local remove.
5. **Import path:** two traced `getDesignById` per design (processing + derivatives) **plus** untraced `getDoc` inside `createDesign` / `updateDesign` (~5 client design reads/design before enqueue).
6. **Listeners:** none in Run B (Amendment 7 loop not the cause of this spike).

### Complexity classes

| Path | Class | Notes |
|---|---|---|
| AI Review post-approval list reload | **O(n²)** docs for N ≤ 100 | Triangular Σ remaining |
| AI Review post-approval counts | **O(n)** aggregations | 3n (+ initial) |
| Approval authority gets | **O(n)** | Necessary floor TBD after dedupe |
| Import getDesignById (traced) | **O(n)** | 2n traced |
| Studio tags | **O(T)** once / session | T≈1121; acceptable fixed startup if cached |
| Server AI taxonomy | **O(C+T)** per cold instance / TTL window | Not O(n) per design when warm |
| Snapshot full publish | **O(R+C+T)** per coalesced publish | Coalesced, not 1:1 with approvals |

---

## 5. Unproven / remaining unknowns

| Item | Status |
|---|---|
| Exact Run A UTC + composition | Unresolved — owner checklist |
| Run A vs B identity | **Not the same run** on current evidence |
| Snapshot contribution to A or B | Modeled only — needs publication logs |
| Deletion-triggered overlap into B | Needs pre-`15:29Z` logs |
| AI taxonomy cold loads during A/B | Needs Function logs |
| Index-entry charges in Console | Unknown |
| Multi-instance taxonomy amplification in practice | Modeled; needs instance metrics |

---

## 6. Source-level read-path inventory (exact paths)

### AI Review approval (current)

1. `AiReviewWorkspace` / keyboard → `AiReviewPage` → `inbox.approveSelected`
2. `useAiReviewInbox.ts` → `runInboxAction` → `aiReviewInboxService.approveFromInbox`
3. `updateDesign` (draft) → untraced `getDoc` + `updateDoc` + invalidate
4. `catalogApprovalService.approveDesignForCatalog` → `getDesignById` → `applyCatalogApprovalUpdate` (untraced `getDoc` + `updateDoc` + invalidate)
5. `runInboxAction` → `reloadDesigns()` → `useDesigns` → `designService.listDesignsPage`
6. `onQueueChanged` → `tabCounts.reloadCounts()` → 3× `designService.countDesigns`

**Page size:** inbox omits `limitCount` → `DEFAULT_LIST_LIMIT = 100` (`designService.ts`); fetch uses `limit(pageSize+1)`.

### Import

1. `importOrchestrationService` / `useBatchImport` → `createDesign` → `importDerivativeService` → `designReadyService.mark*` → `enqueueImportedDesignsForBackgroundAi`
2. AI pump: `importAiBackgroundQueue.ts` — sequential `enqueueAiEnrichment`

### Taxonomy (Studio)

- `useGeneratedDesignLibraryTaxonomy.ts` → `categoryService.listCategories` + `catalogTagService.listTags`
- Consumer: AI Review tag picker (`approvedTags` → form panel)

### Server

- `functions/src/enqueueAiEnrichment.ts`
- `functions/src/ai/aiEnrichmentPipeline.ts`
- `functions/src/ai/aiEnrichmentRuntimeCache.ts` (60s)
- `functions/src/ai/loadAiCatalogReferenceSnapshot.ts` (5 min + in-flight)
- `functions/src/catalogSnapshots/publishCatalogSnapshots.ts` + `portalCatalogChangeClassifier.ts`

---

## 7. Client / server / snapshot attribution summaries

See incident §11 for Run B table. Summary:

| Layer | Run B | Run A |
|---|---|---|
| Client traced | ≈2,495 dominated by tags (once) + triangular lists + counts | Unknown share |
| Client untraced write gets | ≈225 (source) | Included in Console if same workflow |
| Functions AI taxonomy | Not in Debug; likely ≥1×~1,140 if warm | Candidate for multi-k |
| Snapshots | Not measured | Candidate; coalesced |
| Index entries | Excluded from Debug | May inflate Console |

---

## 8. Immediate remediation sequence (recommended)

### Priority 0 — MUST FIX BEFORE PRODUCTION

**P0.1 AI Review local reconciliation after successful approve/reject/archive**

**Locked happy-path design (no OR forks):**

1. On success, use the **returned `Design`** from `approveFromInbox` / reject / archive services.
2. **Remove** that design from local inbox `rawDesigns` / filtered list for the **current tab** (or patch fields so `designMatchesInboxTab` excludes it).
3. **Advance selection** locally via existing `aiReviewInboxSelection` helpers (preserve A→B→C→none).
4. Apply **local tab-count deltas** only for tabs whose counts change from that action (e.g. Needs Review −1 on approve; do not call `reloadCounts()`).
5. **Do not** call `reloadDesigns()` / `listDesignsPage` on the happy path.
6. **Do not** call `reloadCounts()` / three-tab `countDesigns` on the happy path from `runInboxAction`.
7. **Cache policy (locked):** keep existing write-path `invalidateDesignReadCaches` for correctness toward *other* Studio surfaces, but AI Review happy path **must not subscribe to that invalidation** (no automatic refetch). Document-cache misses are acceptable for later one-shot gets; page/count caches may miss for Design Library without forcing AI Review reload.
8. **Processing tab counts must remain live:** paths that already call `onQueueChanged` for AI Processing completion (`applyDesignPatch` / background queue / live-design reconciliation) **continue** to refresh counts. P0 only removes the **per-approval** triple-count refresh from `runInboxAction` success — it must not strip Processing inbound count updates.

**Inbound Needs Review under local-only mode (K=∞ default):**

With no periodic reconciliation, designs that **newly enter** Needs Review while the reviewer stays on the tab (other staff, or Processing completions moving items in) may **not** appear until remount, tab re-entry, explicit refresh, or error recovery.  

**Default Plan stance:** accept that drift for P0 (`K=∞`); Processing→Needs Review UX that today relies on `onQueueChanged` + list behavior must be preserved via **existing Processing reconciliation paths** (patch/reload already used there) — verify with tests that approving on Needs Review does not break Processing count monotonicity.  

If owner rejects inbound drift: set `K` or `T` in §18 (owner decision) before Implement.

**Authoritative recovery (required):**

| Trigger | Action |
|---|---|
| Approval/reject/archive **failure** | One bounded `reloadDesigns` + `reloadCounts` |
| Permission / not-found / archived rejection from server | Same bounded reload |
| Explicit user refresh / route remount / tab change | Authoritative load (current) |
| Optional: after K successes or T seconds idle | Single bounded reconciliation — **default off (K=∞)**; see §18 |

**Concurrency / stale-write (honest vs source):**

Current approval path is **last-writer-wins** with existence + archived-status guards. It does **not** implement optimistic concurrency / etag fail-closed on `aiReviewVersion` as a write precondition.  

P0 **must not claim** new fail-closed concurrency. P0 **preserves** today’s server guards and surfaces write errors with bounded reload. Multi-staff overwrite risk remains **as today**; local list may briefly diverge until remount/recovery. Do not add a new version gate in P0 unless a separate amend specifies it.

### Priority 1 — SHOULD FIX BEFORE PRODUCTION

**P1.1 Import read containment**

- Collapse derivative `getDesignById` + `updateDesign` internal `getDoc` duplication where the mark helpers already hold authoritative state.
- Prefer: mark helpers accept known design snapshot **or** `updateDesign` skip redundant get when caller passes validated prior; **or** instrumented single-read helper shared by mark+update.
- Preserve: upload security, metadata, normalization, exactly-one AI enqueue, failure recovery.
- Optional: trace write-path `getDoc` in Debug so future incidents match Console.

**P1.2 Approval path oneshot reduction**

- After draft `updateDesign` returns merged `Design`, avoid immediate `getDesignById` miss if document cache was cleared — pass through to `applyCatalogApprovalUpdate` or re-seed cache from merge result when safe.

### Priority 2 — ACCEPTABLE CURRENT COST (optimize later)

**P2.1 Studio full approved-tag hydrate once per session (~1,121 docs)**

- Required for instant tag picker / alias-aware staff UX today.
- Already cached 12h with hits on later mounts.
- Future options (not required for P0): compact projection; on-demand search; shared workspace singleton — flag any new shared Storage read model as architecture decision (must not silently recreate snapshots).

### Priority 3 — Server AI taxonomy

**P3.1** Confirm via logs whether Run A was taxonomy-dominated.

**P3.2** Options (pick at implement after evidence):

| Option | Notes |
|---|---|
| Lengthen `FALLBACK_TTL_MS` | Simple; stale taxonomy risk documented |
| Stronger process cache + metrics | Log hit/miss/instance |
| Batch enqueue callable | `[NEEDS OWNER DECISION]` — new API surface |
| Shared versioned taxonomy doc | `[NEEDS OWNER DECISION]` — architecture; snapshot-like |

Default recommendation if logs show multi-load on single-instance long batches: **increase TTL + emit hit/miss metrics**; defer batch enqueue unless owner wants import API change.

### Priority 4 — Snapshots / Phase 1B

| Finding | Action |
|---|---|
| Client AI Review O(n²) | Fix in P0 — **independent of Phase 1B** |
| Snapshot scans | Phase 1B **WILL ADDRESS** publisher retirement |
| Temporary publisher guard | Only if owner logs show import create/derivative fallthrough causing multi-k reads **before** 1B — e.g. skip full publish schedule for non-ready create `[NEEDS OWNER DECISION]` |
| PR #40 production | Remain blocked until P0 (+ preferably P1) tested |

**Do not** use “remove snapshots” as substitute for P0.

---

## 9. Target behavior — 45-design batch (acceptance)

1. Import + AI Review remain responsive.
2. Approving N designs must **not** cause Σ(N−1 … 0) design-list document reads.
3. Successful approval must **not** automatically reload the complete remaining page.
4. All three tab counts must **not** be recomputed after every approval on the happy path.
5. Selection advances immediately.
6. Approved design disappears immediately from the current tab list.
7. Reopening AI Review returns authoritative server state.
8. Concurrent staff changes cannot be silently overwritten.
9. Failed approval → exactly one bounded authoritative recovery (not a loop).
10. No listener storm; no repeated effect resubscription.
11. No full taxonomy query per design.
12. Snapshot publications (if still enabled) remain debounce-coalesced; optional guard only if proven.
13. Cost scales approximately **linear** in N aside from fixed taxonomy startup.

### Derived read budgets (Studio client, Needs Review approve-N, N≤100)

Constants from source: `DEFAULT_LIST_LIMIT = 100`; fetch peek `pageSize+1`.

**P0 gate metrics (mandatory, measurable with Debug spies):**

| Metric | Current (N=45) | P0 acceptance |
|---|---:|---|
| Post-approval happy-path `listDesignsPage` docs | 990 | **0** |
| Post-approval happy-path `countDesigns` ops from `runInboxAction` | 135 | **0** |
| Fixed tag startup | 1,121 | ≤1 full load / session (cache OK) |
| Failure recovery | n/a | ≤1 list page + ≤3 counts **per failure** |
| Remount | n/a | 1 list page + 3 counts + taxonomy cache hit |

**Authority oneshot budgets (provisional — not a P0 ship gate):**

Current approve path typically performs **1 traced `getDesignById` + 2 untraced write-path `getDoc`s** per success (≥3). P0 does **not** require reducing that. P1 may target ≤2 combined after a locked call-graph review; until P1 ships, do **not** fail Signoff on authority-get count.

At N=100/500/1000: happy-path list docs remain **0** (vs thousands–tens of thousands today).

---

## 10. Numerical model — expected reads at scale

### Client — AI Review approve-only (exclude tags; N designs already on page)

| N | Current list docs | Current count ops | Current getById traced | P0 list (gate) | P0 counts (gate) | Authority gets (unchanged by P0) |
|---:|---:|---:|---:|---:|---:|---:|
| 45 | 990 | 135 | 45 | **0** | **0** | ~3N (traced+untraced) |
| 100 | 4,950 | 300 | 100 | **0** | **0** | ~3N |
| 500 | ≈45,349 | 1,500 | 500 | **0** | **0** | ~3N |
| 1,000 | ≈95,849 | 3,000 | 1,000 | **0** | **0** | ~3N |

### Server AI taxonomy (independent)

| Scenario | Approx taxonomy docs |
|---|---:|
| 1 warm instance / &lt;5 min | ~1,140 |
| 1 instance / 30 min | ~6,840 |
| 16 cold instances | ~18,240 |

### Snapshots (independent)

| Scenario | Approx |
|---|---|
| 1 full publish | R + ~1,140 |
| 45 approvals coalesced to 1–3 publishes | 1–3 × (R+~1,140) |

---

## 11. Classification matrix

| Contributor | Classification |
|---|---|
| AI Review full page reload per approval | **MUST FIX BEFORE PRODUCTION** |
| Triple count refresh per approval | **MUST FIX BEFORE PRODUCTION** |
| Import duplicate design reads | **SHOULD FIX BEFORE PRODUCTION** |
| Approval getDesignById after update invalidate | **SHOULD FIX BEFORE PRODUCTION** |
| Studio tags once (~1121) | **ACCEPTABLE CURRENT COST** |
| Server AI taxonomy per cold/TTL | **NEEDS RUNTIME EVIDENCE** then SHOULD FIX |
| Snapshot full scans | **NEEDS RUNTIME EVIDENCE**; **PHASE 1B WILL ADDRESS**; client AI Review **PHASE 1B WILL NOT ADDRESS** |
| Index charges | **NEEDS RUNTIME EVIDENCE** |
| Listener storms | **ACCEPTABLE** (absent in B; keep Amendment 7 tests) |

---

## 12. Exact future files to modify (implement later)

### P0 — AI Review

- `apps/studio/src/renderer/src/features/ai-review/hooks/useAiReviewInbox.ts`
- `apps/studio/src/renderer/src/features/ai-review/hooks/useAiReviewTabCounts.ts` (local adjust API or callback payload)
- `apps/studio/src/renderer/src/features/ai-review/pages/AiReviewPage.tsx` (wire count deltas)
- `apps/studio/src/renderer/src/features/ai-review/services/aiReviewInboxService.ts` (ensure return value used)
- `apps/studio/src/renderer/src/features/ai-review/utils/aiReviewInboxSelection.ts` (if helpers need export)
- Possibly new pure helper: `aiReviewLocalReconciliation.ts` (preferred for testability)

### P1 — Import / design service

- `apps/studio/src/renderer/src/features/designs/services/designReadyService.ts`
- `apps/studio/src/renderer/src/features/designs/services/designService.ts` (`updateDesign` / cache reseed / invalidate granularity)
- `apps/studio/src/renderer/src/features/imports/services/importDerivativeService.ts`
- `apps/studio/src/renderer/src/features/designs/services/catalogApprovalService.ts`

### P3 — Functions (if authorized)

- `functions/src/ai/loadAiCatalogReferenceSnapshot.ts`
- `functions/src/ai/aiEnrichmentRuntimeCache.ts`
- Optionally metrics-only logging helpers

### P4 — Snapshots (only if owner-approved guard)

- `functions/src/catalogSnapshots/portalCatalogChangeClassifier.ts` and/or `publishCatalogSnapshots.ts`

### Debug (optional, same amend)

- Trace write-path `getDoc` in `designService` for parity with Console

Mark unknown paths: none critical — all above verified via `git ls-files` / Read. Any new file must live under `features/ai-review/utils/` or adjacent.

---

## 13. Future test plan

### AI Review

- Unit: local reconcile removes one id; advances selection once; count deltas; no `reloadDesigns` on success (mock spy).
- Unit: failure path calls reload once.
- Unit: write error / not-found → recovery once (no new concurrency protocol).
- Unit: Processing completion path still invokes count refresh (`onQueueChanged`) after P0.
- Wiring/regression: no effect resubscription loop (keep Amendment 7 suites).
- Integration/Debug fixture: simulate 45 approvals → assert `listDesignsPage` call count = 1 (initial) not 46; returned doc sum not triangular; post-approval `countDesigns` from approve path = 0.
- Manual: 45-design batch approve through; P0 Debug budgets met; reopen authoritative; Processing 3→2→1→0 still works if a batch is processing.

### Imports

- One design: assert ≤ target getDoc/getDesignById count.
- Parallel upload concurrency 2: no duplicate identical in-flight doc reads (if dedupe added).
- Enqueue exactly once; failure recoverable.

### Taxonomy

- Route `/imports`→`/ai-review`→`/designs`: full tag load ≤1 per session (cache).
- Server: unit/fake clock for TTL + in-flight dedupe; parallel jobs share load.

### Snapshots

- Non-ready import churn: assert classifier skip / no schedule where required after any guard.
- Batch ready transitions: coalesce ≤ expected publishes; log scanned counts.
- Phase 1B removal remains independently testable.

### Regression

- Artwork backgrounds; AI Processing 3→2→1→0; readyAt; large PNG; Portal browse/search/facets; reporting; Assisted Creation; tag/category management; permissions.

---

## 14. Failure and reconciliation behavior

| Case | Behavior |
|---|---|
| Success | Local list/selection/counts; no full reload |
| Transient network / permission / not-found | Surface error; one authoritative reload; clear pending advance |
| Partial draft update succeeded, approval failed | Reload; do not leave divergent local-only ready state |
| Remount | Full authoritative inbox + counts |
| Multi-tab staff | **Same as today:** server LWW + archived guards; on write failure, error + reload. Local UI may lag other staff until remount/recovery. P0 does not add etag fail-closed |

---

## 15. Rollback strategy

1. Revert P0 commit(s) → restore `reloadDesigns`/`reloadCounts` happy path (known costly but correct).
2. P1/P3/P4 independently revertable.
3. No Rules/index dependency for P0/P1.
4. No Firebase deploy required for Studio-only P0/P1 (renderer). P3/P4 need Functions deploy checkpoint.

---

## 16. Firebase deployment checkpoints

| Change set | Deploy? |
|---|---|
| Studio P0/P1 only | No Firebase; Studio build/release channel as usual |
| Functions taxonomy TTL/metrics | `firebase deploy --only functions:<names> --project fresh-prints-dev` after owner phrase |
| Snapshot guard | Same; high caution; owner approval |
| Production | **Blocked** until P0 verified on dev + owner promotion approval |

---

## 17. Production promotion recommendation

| Item | Recommendation |
|---|---|
| Merge PR #40 to production | **Do not** until Amendment 9 P0 (and preferably P1) implemented, tested, signed off |
| Phase 1B | Still blocked on managed-search provider; **not** a substitute for P0 |
| Snapshot deletion | Do not start |
| Ship Phase 1A alone to prod | **Not recommended** while AI Review O(n²) remains |

---

## 18. `[NEEDS OWNER DECISION]`

1. Optional periodic bounded reconciliation interval/K after local-only approvals (default: **none / K=∞** — remount, tab change, or error only). Confirm acceptance of inbound Needs Review drift while staying on the tab.
2. Whether to authorize Functions taxonomy TTL change and/or batch enqueue API (**blocked until Run A/B Function logs**).
3. Whether to authorize a temporary non-ready import snapshot schedule guard before Phase 1B (**blocked until publication logs**).
4. Run A log retrieval and confirmation whether Console spike included approvals.
5. Whether first Implement PR may include **P1** alongside P0, or P0-only.

## 19. `[NEEDS REPO CHECK]`

None for P0/P1 primary paths (verified). Owner log retrieval is **runtime**, not repo.

---

## 20. Relationship to Amendment 8

- Phase 1A signed off; Firestore Portal ordinary browse remains.
- Phase 1B not started.
- ADR-FP-120 supersession / managed search unchanged by this amend.
- AI Processing monotonic repair remains **KEEP CURRENT** — do not regress Amendment 7 observer fixes while changing `runInboxAction`.

---

## 21. Human checkpoints (implement phase)

- Owner approve Implement start for Amendment 9.
- Manual QA on 45-design batch with Debug budgets.
- Any Functions deploy phrase.
- Production promotion separate.
- Provider choice still blocks 1B only.

---

## 22. Stop condition for this planning pass

STOP after Formal Review with no unresolved planning blocker. **Do not implement** until owner explicitly approves.

**Post–Formal Review correction note (2026-08-06):** Plan updated in-place for Formal Review R1–R6 — locked P0 happy-path (no invalidate OR fork), honest LWW concurrency, Processing count preservation, P0-only gate budgets, inbound drift default, Implement slice = P0 (+ optional P1).
