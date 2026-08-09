# Plan: AI Processing Monotonic Reconciliation Repair

| Field | Value |
|---|---|
| Date | 2026-08-05 |
| Branch | `fix/post-launch-catalog-and-processing-stability` (unchanged) |
| PR | #40 (existing; not merged; not commented on) |
| Phase | **Plan + Formal Review only. No implementation.** |
| HEAD | `d5f75bdfbf9c78ed924ae2b96b9ac10758e5feee` |
| Scope | Narrow Studio AI Processing list monotonicity repair only |
| Out of scope | Snapshot removal, Portal catalog, Algolia, Open Graph, taxonomy cutover, unrelated PR #40 work |

---

## 1. Problem statement

Owner reproduction on current HEAD:

1. Designs A, B, C begin in Processing.
2. A completes and initially disappears.
3. Queue advances.
4. A later reappears; completed designs remain visible.
5. Processing count stops dynamically updating.
6. Navigating away and back reloads the correct authoritative state.

Confirmed prior investigation:

- Snapshot introduction (`b45542a`) is **not** the root cause.
- `13a1099` introduced ungated import-background `reloadDesigns()` observers.
- `6c47170` correctly introduced patch-primary reconciliation, `pendingAdvanceIndexRef`, and `generationRef`.
- HEAD preserves that Amendment 4 mechanism.
- Remaining defect: a **list reload started after a successful terminal patch** replaces the locally newer array with a result that still contains the design as `pending`.

Architectural requirement: during one processing run, progress must be **monotonic**. Once a terminal result has authoritatively patched a design out of `pending`, a later list response must not reinsert that design as `pending` unless a genuine later reprocessing transition is proven.

---

## 2. Git / mechanism baseline (read-only evidence)

| SHA | Role |
|---|---|
| `02519a52` | Pre-snapshot: Processing auto-queue uses `applyDesignPatch`; live subscription; no background-queue→inbox observers |
| `13a1099` | First-bad for import→UI: observer calls ungated `reloadDesigns()` per terminal event |
| `6c47170` | Patch-primary + generation invalidation of **older** in-flight reloads |
| `d5f75bd` | Keeps Amendment 4; Amendments 5–7 fix loops; **post-patch reloads still replace state wholesale** |

Do **not** restore donor files, revert snapshot work, remove patch-primary reconciliation, or return to reload-per-event.

---

## 3. Inventory: every post-patch list-replacement path

All paths below can call `reloadDesigns()` → `useDesigns.loadDesigns()` which, for non-append loads:

1. bumps `generationRef` to a **new** generation (so it is **not** rejected by the prior patch bump);
2. clears `designs` to `[]` while loading (`useDesigns.ts` ~116–123);
3. on accept, **replaces** state with `page.designs` wholesale (`~201–202`);
4. fetches via `designService.listDesignsPage` → `designPageCache` (**15s TTL**, `designService.ts` ~58–69) and does **not** invalidate that cache when AI terminal patches apply.

`generationRef` only discards reloads that **started before** a successful patch. Reloads started **after** a patch are intentionally honored today — that is the hole.

| # | Path | File(s) | Why it exists | Required? | Can run after `applyDesignPatch`? | May contain older `pending`? | Generation rejects it? | Replace or merge? |
|---|---|---|---|---|---|---|---|---|
| P1 | Selected live-design completion effect | `useAiReviewInbox.ts` ~448–472 | When selected `liveDesign` becomes `needs_review`, reconcile list + tab counts (Amendment 2 / 7-follow-up one-shot) | Partially — counts may still need refresh; **full list replace is redundant after terminal patch** | **Yes — primary confirmed reintroduction path when completed design was selected** | **Yes** — Firestore lag and/or **15s list cache hit** | **No** (new generation) | **Replace** |
| P2 | Background-queue observer fallback | `useAiReviewInbox.ts` ~577–587 | When `reconcileBackgroundAiQueueEvent` returns null patch (enqueue failure / non-terminal) | **Yes** for genuine no-patch recovery | Only when no patch; not after successful patch | Yes | No for this new reload | Replace |
| P3 | Mount / tab-activate pending-work reload | `useAiReviewInbox.ts` ~603–627 | Catch pump activity that completed while Processing tab unmounted (Amendment 5) | Yes at tab activation; not per-event | Can run after prior patches in same session if tab re-entered while pump pending | Yes | No | Replace |
| P4 | Auto-queue / manual Process `refreshDesignList` | `useAiProcessingQueue.ts` ~258–278, called after enqueue ~341 / ~451 | Reconcile list + counts after Processing-tab enqueue | Counts useful; list replace redundant after successful patch | **Yes — always after `applyDesignPatch` when patch exists** | **Yes** (cache/lag) | **No** | **Replace** |
| P5 | Retry failed processing | `useAiReviewInbox.ts` ~1048–1058 | Patch then reload after retry callable | Reload as confirmation; must not downgrade | Yes | Yes | No | Replace |
| P6 | Rerun from Needs Review / rejected | `useAiReviewInbox.ts` ~794–803 | Force Processing membership after reprocess enqueue | Required to show design as pending again | After server write; intentional return-to-pending | Pending is **desired** | No | Replace (legitimate) |
| P7 | Approve/reject/`runInboxAction` reload | `useAiReviewInbox.ts` (action paths using `pendingAdvanceIndexRef` + `reloadDesigns`) | Confirm server action | Yes for mutations that change membership | After action, not after background terminal patch | Usually consistent | No | Replace |
| P8 | Error-boundary / UI Retry | `AiReviewPage.tsx` `inbox.reloadDesigns()` | Manual recovery | Yes | User-initiated | Possible | No | Replace |
| P9 | Query-key / `useDesigns` mount effect | `useDesigns.ts` ~230–233 | Initial load / filter change | Yes | On remount/navigation | Authoritative after cache miss/expiry — explains nav fix | N/A | Replace |
| P10 | `loadMoreDesigns` append | `useDesigns.ts` | Pagination | Yes | Rare during Processing run | Append path | Generation-aware | **Append** (not primary defect) |

### Confirmed exact reintroduction path (owner reproduction)

Most likely sequence under import background queue + Processing tab:

1. Observer receives terminal event for A with `patchSource` → `applyDesignPatch` sets `aiReviewStatus` off `pending` → client filter removes A (count 3→2). Selection advances via `pendingAdvanceIndexRef`.
2. Live subscription still holds A (or briefly did) with `needs_review` → **P1** one-shot `reloadDesigns()`.
3. Independently or additionally, if auto-queue path is involved, **P4** `refreshDesignList` also reloads after patch.
4. `loadDesigns` starts **after** the patch → new generation → **accepted**.
5. `listDesignsPage` often returns **`designPageCache` HIT** (15s) for `aiReviewStatus: "pending"` query keyed from initial load — still includes A as pending — **or** a lagging Firestore read.
6. Wholesale replace reinserts A; count freezes / regresses; further patches fight a poisoned list until route remount (P9) misses/expires cache and shows truth.

Supporting evidence:

- `useDesigns` comments explicitly allow post-patch reloads as “legitimate newer confirmation reads” (~281–285) — unsafe when confirmation is stale/cached.
- AI enrichment completion does **not** call `invalidateDesignReadCaches` on the Studio client (invalidation is on Studio mutation paths in `designService`, not on background-queue patch).
- Navigation works because remount/load misses or expires cache and reads current Firestore.

---

## 4. Approach comparison

### Approach A — Gate post-terminal reloads

When a terminal patch succeeds for design D, suppress completion-triggered list reloads for D/this run (especially P1 after background-queue patch; P4 after successful patch). Keep P2 (no-patch fallback), P3 (tab activation), P6 (intentional reprocess), P8 (manual retry), P9 (remount).

- Pros: smallest diff surface; preserves Amendment 4 as primary.
- Cons: alone does not defend against any remaining post-patch reload (P3/P5/P8) or cache poison.

### Approach B — Monotonic merge of reload results

Maintain a bounded **terminal reconciliation ledger** (designId → terminal patch metadata / run generation). When accepting a list replace/append, do not reinsert or downgrade a ledgered design back to `pending` unless a genuine later reprocessing transition is proven.

- Pros: defense in depth for every reload path; matches monotonic requirement directly.
- Cons: slightly more state; must define clear ledger clear rules for reprocess.

### Approach C — Combined (recommended)

1. **Gate proven-redundant reloads** (A): after successful terminal patch from background observer or auto-queue enqueue, do **not** call list-replacing `reloadDesigns` solely to “confirm” that same completion; still fire count refresh (`onQueueChanged`) if needed without list replace, or refresh counts via existing count APIs.
2. **Invalidate list/page caches** when applying an AI terminal patch (or immediately before any remaining confirmation reload) so recovery reads cannot serve the pre-completion pending page.
3. **Narrow monotonic merge guard** (B) in `useDesigns` (or a pure helper used at accept time): when replacing designs for the Processing pending query, never reintroduce a ledgered terminal design as `pending`.

Recommend **Approach C** as smallest *safe* approach: A alone is insufficient given cache; B alone leaves unnecessary reload storms; C matches owner acceptance criteria with minimal conceptual change (keep patch-primary; stop hostile confirmation replaces).

---

## 5. Repair design (current-HEAD only)

### 5.1 Preserve

- `reconcileBackgroundAiQueueEvent` / `buildDesignPatchFromEnqueueResult`
- Observer patch-primary path
- `pendingAdvanceIndexRef` advancement
- `generationRef` rejection of **older** in-flight loads
- Amendment 7 observer deps (`designsRef` / stable `[applyDesignPatch, filters.tab, reloadDesigns]`)
- Amendment 7-follow-up one-shot liveDesign guard structure (may stop calling reload after patch)

### 5.2 Ledger semantics (monotonic merge)

Proposed pure helper (new small module under `ai-review/utils/`):

- `recordTerminalAiPatch(designId, patch)` when patch includes terminal `aiReviewStatus` leaving `pending` (e.g. `needs_review`) or equivalent terminal fields from enqueue result.
- `clearTerminalAiPatch(designId)` when client intentionally returns design to Processing (`retryProcessingSelected`, `executeRerunToProcessing`, send-back paths) **before** reload — so genuine reprocessing can appear as `pending`.
- `applyMonotonicDesignListMerge({ incoming, previous, ledger, query })` used when accepting non-append loads for Processing `aiReviewStatus: "pending"` lists:
  - If ledger says design D is terminal for this run and `incoming` includes D as `pending`, **omit** D (or keep previous non-pending local copy out of the pending list — preferred: omit from pending list).
  - Do not permanently ban D: after `clearTerminalAiPatch`, incoming `pending` is allowed.

Ledger is session/hook-scoped (ref on `useDesigns` or inbox), bounded, cleared on logout/unmount as appropriate — not a permanent global ban.

### 5.3 Reload gating rules

| Trigger | After successful terminal patch for same design | Action |
|---|---|---|
| P1 liveDesign `needs_review` | Yes | Prefer **skip list reload**; still allow `onQueueChanged` for counts |
| P4 `refreshDesignList` | Yes | Prefer **skip list reload** or invalidate cache + monotonic merge if reload retained for layout settle |
| P2 no-patch fallback | N/A | Keep reload |
| P3 tab activate + pending work | N/A | Keep reload + monotonic merge |
| P6 rerun to Processing | Clear ledger first | Keep reload |
| P8 manual Retry | Keep | Reload + monotonic merge |
| P9 remount | Ledger empty or cleared | Authoritative load |

### 5.4 Cache

On successful AI terminal `applyDesignPatch` that changes `aiReviewStatus` / processing stage terminal fields, call existing `invalidateDesignReadCaches(designId)` (or export a narrow invalidation from `designService` if not already public). Prevents 15s poison hits.

---

## 6. Exact files to edit later (Implement)

| File | Change |
|---|---|
| `apps/studio/src/renderer/src/features/designs/hooks/useDesigns.ts` | Ledger + monotonic accept merge; optional invalidate on terminal patch; do not weaken generation guard |
| `apps/studio/src/renderer/src/features/ai-review/hooks/useAiReviewInbox.ts` | Gate P1 list reload after observer already patched; clear ledger on rerun/retry-to-processing; keep observer patch-primary |
| `apps/studio/src/renderer/src/features/ai-review/hooks/useAiProcessingQueue.ts` | Gate or slim P4 after successful patch; retain count reconciliation |
| `apps/studio/src/renderer/src/features/designs/services/designService.ts` | Ensure invalidation callable from patch path (export/wrapper if needed) |
| New: `apps/studio/src/renderer/src/features/ai-review/utils/monotonicAiProcessingListMerge.ts` (name flexible) | Pure merge + ledger helpers |
| New tests for that util + behavioral tests extending Amendment 4 suite | See §7 |

### Exact files that remain untouched

- Snapshot architecture / Portal catalog / Algolia / Open Graph planning and source
- `backgroundAiQueueReconciliation.ts` semantics (may import from new helper only if needed — prefer leave pure as-is)
- `importAiBackgroundQueue.ts` pump model (unless a tiny type-only touch is required — default **untouched**)
- Taxonomy hooks, Design Library snapshot consumers, Electron catalogAsset IPC
- Rules, Functions publishers, indexes, Firebase config
- Unrelated PR #40 fixes

---

## 7. Required behavioral tests (must fail on current HEAD)

Do **not** rely only on source-grep tests. Prefer pure-function / simulated state machine tests chaining real helpers (`reconcileBackgroundAiQueueEvent`, `buildDesignPatchFromEnqueueResult`, filter helpers, new merge helper) plus targeted hook/integration style tests where the repo already patterns them.

| # | Scenario | Expected | Why HEAD fails |
|---|---|---|---|
| 1 | A receives terminal patch | A disappears from pending Processing list immediately | Passes today |
| 2 | Later stale reload reports A still `pending` | A must **not** reappear | **Fails** — replace accepts stale/cached page |
| 3 | Same as 2 with cache hit simulation | A stays out | **Fails** |
| 4 | B and C terminal events after A patched | Must not reintroduce A | **Fails** if shared reload replace includes A |
| 5 | Count 3→2→1→0 | Monotonic | **Fails** when A reappears |
| 6 | Selection A→B→C→none | Deterministic via pendingAdvance | May pass patch path; assert still holds with merge |
| 7 | Overlapping reloads complete reverse order | No regression vs patches | Partial today via generation; extend for post-patch stale accept |
| 8 | Genuine later reprocessing of A | A may return to pending after clear/reenqueue | Must pass after repair |
| 9 | No recurring reload loop | No tight load.start cycle | Keep Amendment 7-follow-up coverage |
| 10 | No observer resubscription loop | Deps remain tab-stable | Keep Amendment 7 coverage |
| 11 | Manual Process path | Still works | Pass with gated refresh |
| 12 | Auto-processing path | Still works | Pass with gated refresh |
| 13 | Route remount | Authoritative state | Pass |
| 14 | Recovery reload when no terminal patch | Still reloads / recovers | Pass — P2 preserved |

Existing suites to re-run unmodified as regression: `backgroundAiQueueReconciliation.test.ts`, `useAiReviewInbox.observerSubscription.test.ts`, `useAiReviewInbox.liveDesignReconciliation.test.ts`, `importAiBackgroundQueueSequencing.test.ts`, relevant `aiProcessingReconciliation.test.ts` (update only where reload-after-patch assertions become obsolete).

---

## 8. Acceptance criteria (future Implement)

- Completed cards disappear immediately.
- Completed cards never reappear during the same run.
- No navigation required to recover.
- No stale/cached list response overwrites newer terminal state.
- No repeated full-list reload storm / tight `load.start` cycle.
- No observer resubscription loop.
- Same-design reprocessing later remains supported.
- Snapshot, taxonomy, Portal, Algolia, Open Graph, unrelated PR #40 code untouched.

---

## 9. Human checkpoints

1. Fresh live owner QA after Implement: 3→2→1→0 / A→B→C→none with import background pump; confirm no reappearance without navigation.
2. Manual Process + Auto-advance queue smoke.
3. Retry / Rerun-to-Processing still returns design to pending.

---

## 10. Risks and rollback

| Risk | Mitigation |
|---|---|
| Over-gating blocks recovery | Keep P2/P3/P8; monotonic merge is safety net |
| Ledger blocks legitimate reprocess | Explicit clear on retry/rerun paths + tests #8 |
| Count drift if reload skipped | Keep `onQueueChanged` / count reload without list replace |
| Touching `useDesigns` affects Design Library | Gate merge to Processing pending query shape / ledger empty ⇒ no-op |

Rollback: revert the single repair commit(s); Amendment 4 behavior returns (including known reintroduction defect).

---

## 11. Implement authorization

**Not authorized by this Plan alone.** Requires Formal Review approval and no open `[NEEDS OWNER DECISION]` for this narrow repair (none required beyond live QA after Implement).

Snapshot-removal Amendment 8 remains a separate track and must not be mixed into this Implement.

---

## 12. Safety (this planning pass)

Edits only this Plan and its companion Formal Review under `docs/workflow/`. No application source, tests, workflow state, handoff, Git mutation, or Firebase action.
