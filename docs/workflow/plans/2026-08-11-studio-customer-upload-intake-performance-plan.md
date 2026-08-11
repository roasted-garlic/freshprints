# Plan: Workstream H — Studio Customer Upload / Donation intake load + sidebar count integrity

| Field | Value |
|-------|-------|
| Date | 2026-08-11 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase / pre-final follow-up (pre-Studio 1.0.3) |
| Parent | prelaunch-catalog-search-count-and-first-visit-ux / A–G package |
| Related | docs/workflow/reviews/2026-08-11-studio-customer-upload-intake-performance-plan-review.md |
| A–G status | Implement complete; **do not merge/deploy A–G in this pass** |

---

## A–G branch tip reconciliation (authoritative)

Recorded without altering, merging, rebasing, or discarding any A–G branch.

| PR | Branch | Tip SHA (full) | Short |
|----|--------|----------------|-------|
| **PR-Portal** | `fix/prefinal-a-g-portal-wt` | `e618a87afb4cc5c308dfd4e4644287f1d1a05de9` | `e618a87` |
| **PR-OG** | `fix/prefinal-a-g-og` | `9d2144dcb5c34122654b47efb7530442449ab13f` | `9d2144d` |
| **PR-Intake** | `fix/prefinal-a-g-intake` | `633d3fad7760ed05b58589dbe3840c54e4403d31` | `633d3fa` |
| **PR-Quota** | `fix/prefinal-a-g-quota` | `e39fc2080713646df226cd0be94bafb58971ca7c` | `e39fc20` |

### Why Implementation Review tips differed

| PR | Impl Review snapshot | Actual tip now | Explanation |
|----|----------------------|----------------|-------------|
| Portal | `e618a87` | `e618a87` | Same |
| OG | `9d2144d` | `9d2144d` | Same |
| Intake | `684717b` | `633d3fa` | **Later docs-only commit** on top of feature: `633d3fa docs: A-G implementation review (approved_with_notes)`. Feature source remains `684717b`. **No product source divergence.** |
| Quota | `e7d6863` | `e39fc20` | **Later chore commits** after feature `d33f085`: `e7d6863` dropped accidental `state.md`; `e39fc20` fixed missing newline after portal delete exports. **No F3 product divergence.** |

**Verdict:** Differences are post-feature documentation/chore commits, not conflicting product trees. Prefer citing **actual tips** (`633d3fa` / `e39fc20`) going forward. Update Implementation Review tip table accordingly (docs fix only; no branch rewrite).

Studio intake/badge hooks are **byte-identical** across A–G worktrees; A–G Intake changed Functions status transitions only, not Studio queries.

---

## Goal

Make Studio **Uploaded Designs** and **Donated Designs** intake load promptly, and make sidebar badges match the actionable Pending (and related) intake predicates — especially after cold Studio restart and after Workstream E’s `not_eligible` until Add-to-Show boundary.

---

## Background / verified root causes

### Performance (both routes ~20s)

| Fact | Evidence |
|------|----------|
| Same list query for both routes | `useCustomerUploadIntake`: `where catalogReviewStatus == filter` + `orderBy createdAt desc` + **`limit(50)`** — **no purpose** |
| Purpose filtered **after** enrichment | Client `mapped.filter(...)` after sequential `enrichRowLookups` |
| Enrichment is sequential per doc | `for ... of docs` → customer `getDoc` → optional PR `getDoc` → `getDownloadURL` |
| Initial Loading waits for all enrichments | `isInitialLoading` cleared only after full `mapSnapshotDocs` |
| Index used today | `catalogReviewStatus` + `createdAt` |
| Purpose composites **already in repo** | `purpose` + `catalogReviewStatus` + `createdAt`; also `purpose` + `catalogReviewStatus` in `firestore.indexes.json` |

So Uploaded Designs with 0–2 visible rows can still enrich up to **50** mixed-purpose pending docs (mostly donations), paying ~donation-scale latency.

### Badge vs empty Pending (cold start)

| Fact | Evidence |
|------|----------|
| Badge source | `usePendingCustomerUploadCounts` — single `onSnapshot` on **all** `pending_staff_review` (**no limit**, no orderBy); client split by purpose |
| Badge statuses | **Only** `pending_staff_review` — **never** `not_eligible` |
| List vs badge | **Different queries** (list limited 50 + orderBy; badge unlimited) |
| Persistence | Studio Firebase config: **no** persistent IndexedDB cache for this path |
| Cold-start “2” | Survives restart because it is **live Firestore** count of print_request-classified `pending_staff_review` docs, not React/local state |

**Primary discrepancy mechanism (source-verified):**

1. Badge counts **all** print_request `pending_staff_review` (e.g. 2) with no limit.  
2. Pending list fetches newest **50** pending of **any** purpose, enriches them, then keeps only print_request.  
3. If ≥50 donations are newer than the 2 print_request pending rows, **Uploaded Pending renders empty** while badge still shows **2**.

That matches owner: badge `2` + “No uploads pending…” after full Studio restart — **not** a remount/local-state bug.

**Secondary hypothesis (needs prod doc check during Test):** the 2 badge docs may be legacy pre-E attaches still `pending_staff_review`, or purpose-missing docs classified as print_request via `resolveCustomerUploadPurpose`. They are **not** counted as `not_eligible` by current badge code. After purpose-scoped list query, those 2 should **appear** on Pending if they remain `pending_staff_review`.

Workstream E (Functions, not yet prod): new attach/assisted stay `not_eligible` until Add to Show; donate still → pending. H must not weaken that.

---

## Scope

### In Scope
- Studio Uploaded / Donated intake query scoping by `purpose` + `catalogReviewStatus` (+ orderBy/limit)
- Progressive / non-blocking image hydration for intake cards
- Sidebar badge predicates aligned with actionable Pending semantics
- Cheap count strategy matching list predicates
- Tests + docs; index deploy checkpoint if prod missing indexes already defined in repo

### Out of Scope
- Changing E / F3 product lifecycles
- New derivative pipeline
- Portal catalog performance
- Merging/deploying A–G
- Studio 1.0.3 publish

---

## Approach

### H1 — Server-side purpose-scoped list queries

For Pending (and Excluded tab analogously):

```
where("purpose", "==", purposeScope)  // or != catalog_donation carefully — prefer == print_request / == catalog_donation
where("catalogReviewStatus", "==", filter)
orderBy("createdAt", "desc")
limit(50)  // or bounded page size per existing conventions
```

Use `purpose == "print_request"` / `purpose == "catalog_donation"` (not inequality) so indexes apply cleanly. Legacy missing `purpose` resolves as print_request in app code — **[NEEDS IMPLEMENT CHECK]** whether Firestore query `purpose == print_request` excludes docs missing the field (yes it does). Formal Review: require either a one-time note that missing-purpose pending docs need backfill **or** dual query / client-compatible handling — prefer documenting that missing purpose is treated as print_request only in **client** today; if any production pending docs lack `purpose`, badge still counts them as print_request but purpose-equality query would miss them. **Plan:** during Test, sample the 2 badge docs; if `purpose` missing, include a narrow server/client compatibility path or STOP for backfill checkpoint (no silent prod mutation in Plan).

### H2 — Badge counts match list predicate

Preferred product semantics (**Pending only** = actionable staff intake):

| Badge | Predicate |
|-------|-----------|
| Uploaded Designs | `purpose == print_request` AND `catalogReviewStatus == pending_staff_review` |
| Donated Designs | `purpose == catalog_donation` AND `catalogReviewStatus == pending_staff_review` |

Do **not** include Excluded in sidebar badges (Excluded is a tab, not “needs action” default). Align with other Studio “inbox” badges (Pending-style).

Implementation options (prefer cheapest that stays live):

1. **Two purpose-scoped listeners** or **shared hook with two `getCountFromServer` + snapshots** — avoid hydrating images for counts.  
2. Keep one unlimited status listener only if doc count stays small **and** no enrichment — current badge is already enrichment-free; main bug is list contamination. Still purpose-scope badge queries so counts don’t scan opposite purpose at scale.

Prefer: `getCountFromServer` or lightweight `onSnapshot` on purpose+status **without** downloading unused fields if SDK allows; otherwise purpose-scoped snapshot metadata-only is fine.

Badge must not use paginated `rows.length`.

### H3 — Progressive image hydration

- Render card shell from Firestore fields as soon as purpose-scoped snapshot returns.  
- Resolve `getDownloadURL` **per visible row**, concurrent with small bound (e.g. 4–6), not sequential over entire page before first paint.  
- Missing/broken URL → placeholder; never block route-level Loading.  
- Reuse preview/thumbnail paths already on the upload doc.

### H4 — Workstream E / F3 / cold start

- Preserve E timing (Functions).  
- Preserve F3 delete/refund.  
- After H: cold start badge and Pending list agree on purpose-scoped Pending counts.  
- Route navigation not required to “fix” counts.

### H5 — Indexes

Repo already defines `purpose + catalogReviewStatus + createdAt`.  

**Human checkpoint:** confirm production Firebase has these indexes built. If missing → deploy indexes only (no Rules/Functions required for H preferred path).

No new index definition expected if prod already matches `firestore.indexes.json`.

---

## Affected Areas

| Layer | Change? |
|-------|---------|
| Studio | **Yes** — hooks, possibly service, Sidebar wiring |
| Shared | Possibly tiny query helper / purpose constants |
| Functions | **No** preferred |
| Rules | **No** |
| Indexes | Verify/deploy existing composites if needed |
| Portal | **No** |

### Files (expected)

- `apps/studio/.../useCustomerUploadIntake.ts`
- `apps/studio/.../usePendingCustomerUploadCount.ts`
- `apps/studio/.../customerUploadIntakeService.ts` (enrichment concurrency / progressive)
- `apps/studio/.../CustomerUploadIntakeSection.tsx` (loading UX if needed)
- `apps/studio/.../Sidebar.tsx` (only if badge API shape changes)
- Tests under customer-uploads hooks/services
- `firestore.indexes.json` — verify only unless gap found
- DATA_MODEL / Studio notes for badge semantics

---

## Test Strategy

### Automated
- Purpose+status query construction (containment / unit)
- No cross-purpose contamination given mixed fixtures
- Badge predicate === list Pending predicate
- Empty print_request pending while many donations exist
- E: `not_eligible` not in badge/list; after allocation → pending appears
- Exclude/restore/promote transitions
- Loading clears before all URLs resolve
- Listener cleanup on unmount

### Manual / instrumentation (dev or staging; strip noisy logs)
- Timing: query ms, enrichment ms, first paint ms for Donated (~88) and Uploaded (0–2 relevant)
- Cold start: badge then Pending agreement (criteria 22–30)
- Sample the production “2” docs’ `purpose` / `catalogReviewStatus` / `printRequestId` (read-only)

---

## Human Checkpoints Anticipated
- [ ] Owner approve H Plan/Review for implement  
- [ ] Confirm prod Firestore indexes include purpose composites (deploy if missing)  
- [ ] A–G merge/deploy remains **separate** owner gate  
- [ ] Studio 1.0.3 only after H + A–G lineage as required  

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Missing `purpose` field on legacy pending docs | Prod sample; compatibility path or backfill STOP |
| Index not deployed in prod | Explicit index checkpoint |
| Count lag vs list | Same predicates; live listeners |
| Over-fetch still | Purpose scope + progressive images |

---

## Rollback

Revert Studio H PR; prior client-side purpose filter returns (known slow/discrepant behavior).

---

## Approval phrase (after Formal Review)

`APPROVE IMPLEMENT: STUDIO UPLOAD INTAKE PERF + COUNTS`

---

## Return checklist (planning answers)

| # | Answer |
|---|--------|
| **1** | Donated badge: `usePendingCustomerUploadCounts().catalogDonation` via Sidebar |
| **2** | Uploaded badge: `.printRequest` same hook |
| **3** | Both: `catalogReviewStatus == pending_staff_review` only; purpose client-split |
| **4** | The `2` are **not** `not_eligible` in badge logic — they are counted as print_request-classified **`pending_staff_review`**. List empty is limit(50)+donation crowding, not badge inventing not_eligible. Confirm the 2 docs’ fields in Test. |
| **5** | List: status + orderBy createdAt + limit 50. Badge: status only, no limit |
| **6** | Up to **50** docs before purpose filter (list) |
| **7** | Yes — client-side purpose filter after enrich |
| **8** | Yes — hydration **before** purpose filter |
| **9** | Shared unscoped query + sequential enrich of ≤50 mixed pending ≈ donation-scale cost on both routes |
| **10** | Sequential `getDownloadURL` (and sequential rows) |
| **11** | Yes — route Loading waits for all enrichments |
| **12** | `purpose == …` + `catalogReviewStatus == …` + `orderBy createdAt desc` + limit |
| **13** | Repo already has purpose+status(+createdAt) composites |
| **14** | New definition unlikely; **prod deploy verify** may be required |
| **15** | Pending-only, purpose-scoped (not Excluded) |
| **16** | Yes — prefer aggregate/`getCountFromServer` or purpose-scoped snapshot without image hydration |
| **17** | List: from ≤50 mixed enrich → ≤50 purpose-only (+ progressive URLs). Badge: from N_all_pending → N_purpose_pending |
| **18** | Studio hooks/services/section tests; index verify |
| **19** | See Formal Review |
| **20** | `APPROVE IMPLEMENT: STUDIO UPLOAD INTAKE PERF + COUNTS` |
| **21** | Cold start: **server/live** snapshot (not Studio local remount state) |
| **22** | No Studio persistent Firestore cache configured for this path |
| **23** | **Yes** — badge unlimited vs list limit 50 + orderBy |
| **24** | Live count of 2 print_request pending docs; list hides them behind donation-dominated page |
| **25** | Unlikely `not_eligible` for badge; likely legacy/true `pending_staff_review` print_request (or missing purpose→print_request) |
| **26** | Purpose-scoped list+badge predicates + progressive hydration; then badge/list/restart agree |
