# Plan: Production legacy Pending reconciliation + Global OG Static letterbox parity

| Field | Value |
|-------|-------|
| Date | 2026-08-11 |
| Author | Planning Agent |
| Status | reviewed (`approved_with_changes`) |
| Workflow | managed-phase |
| Related | Formal Review `2026-08-11-prod-legacy-pending-and-og-static-letterbox-plan-review.md` · A–H DEV QA signoff `2026-08-11-prefinal-a-h-development-qa-signoff.md` |

---

## Goal

Before A–H production promotion Signoff:

1. **Safely classify and (only if proven) reconcile** production print-request `customerUploads` stuck in `pending_staff_review` from obsolete attach-time behavior, without guessing away legitimate one-way Pending after de-allocation.
2. **Correct Global OG Static Image** so both Design Library picks and uploads use the **existing** Fresh Prints OG letterbox pipeline (1200×630 contain), matching library/design-share presentation on non-design URLs.

This pass is **Plan + Formal Review only**. No production mutation. No A–H promote.

---

## Background

- Workstream **H** fixed Studio badge vs empty Pending (purpose-scoped queries). It does **not** rewrite production docs.
- Workstream **E** stops **new** false-Pending on attach; it did **not** migrate legacy Pending.
- Owner observed production Uploaded Designs badge `2` with empty list pre-H; H shows the real docs.
- During DEV QA of non-design URL `https://myprintrequest.dev/`, Facebook showed correct title/description/artwork but **cropped/zoomed** Static Image — Global OG Static path returns **raw** snapshot URLs and bypasses letterbox (documented as intentional previously; owner now requires parity).

Prior A–H DEV QA PASS does **not** cover this Static letterbox requirement; amend DEV QA scope after implement.

---

## Scope

### In Scope

**Track A — Legacy Pending reconciliation (production data, gated)**
- Read-only inventory of print-request `pending_staff_review` on `fresh-prints-prod`
- Repo-backed classification rules for proven false-Pending vs legitimate vs ambiguous
- Dry-run + bounded Admin repair design (`pending_staff_review` → `not_eligible` only)
- Ordering relative to E Functions deploy + Studio H / 1.0.3

**Track B — Global OG Static letterbox (DEV implement after approval; prod later with A–H)**
- Reuse `composePortalOgLetterboxImage` / `getPortalOgShareImage` for Static Design + Static Upload
- Tests + DEV manual Facebook debugger QA
- Docs/copy updates (remove “Static uses asset as-is”)

### Out of Scope

- A–H production promote / App Hosting / Studio 1.0.3 package (separate)
- Deleting uploads, artwork, printRequestItems, donations
- Rewinding legitimate Pending / Excluded / sent_to_ai / promoted
- F3 quota changes, Algolia mutation
- Inventing a second letterbox system or new audit fields (unless Review mandates a future schema ADR for remaining ambiguity)
- Design-share OG behavior changes beyond shared-helper reuse

---

## Part 1 — Read-only production inventory (2026-08-11)

**Method:** Admin SDK `applicationDefault()`, project `fresh-prints-prod`, read-only queries. No writes.

| Metric | Value |
|--------|------:|
| All `catalogReviewStatus == pending_staff_review` | **90** |
| Print-request classified (`purpose == print_request` or missing→print_request) | **2** |
| Donation / other Pending (left untouched) | **88** |

### Candidates (print-request Pending)

| Upload id | purpose | technicalStatus | printRequestId | Request status | Bidding ack | Live `showAllocations` | printRequestItems | createdAt (UTC) | confirmedAt (UTC) |
|-----------|---------|-----------------|----------------|----------------|-------------|------------------------|-------------------|-----------------|-------------------|
| `kkD1yLR9UNFsleK4Bg4Z` | explicit `print_request` | ready | `IF2zGUOvkeZjkM53q4P0` | **draft** | **none** | **0** | 1 (`customer_upload`) | 2026-08-11T15:03:09Z | 2026-08-11T15:03:31Z |
| `sTN1ewGYYpK8fWg6nU0s` | explicit `print_request` | ready | `IF2zGUOvkeZjkM53q4P0` | **draft** | **none** | **0** | 1 (`customer_upload`) | 2026-08-11T15:02:00Z | 2026-08-11T15:02:30Z |

**Original “badge = 2”:** Still **exactly 2** print-request Pending; both still `pending_staff_review`. Purpose fields are **explicit** (not missing).

No customer display names / emails recorded in this plan.

---

## Part 2 — Ever-added-to-show evidence (repo)

### E transition writers

| Path | File | Behavior |
|------|------|----------|
| Portal Add to Show | `functions/src/queuePortalPrintRequestToShow.ts` | Same TX: create `showAllocations` + `applyCustomerUploadStaffReviewTransitionInTransaction` |
| Any allocation create | `functions/src/onShowAllocationCreated.ts` | Trigger advances upload when `sourceType === customer_upload` |
| Shared | `functions/src/lib/customerUploadCatalogConfirmation.ts` | Gate: only from `not_eligible` → `pending_staff_review` |

**Fields written on upload at transition:** only `catalogReviewStatus`, `updatedAt`. **No** allocation id, `queuedAt`, or ever-allocated flag.

**Deallocation:** hard-deletes `showAllocations`; does **not** rewind `catalogReviewStatus` (one-way). Request may become `editing`.

### Evidence hierarchy

| Signal | Proves |
|--------|--------|
| Live `showAllocations` with `customerUploadId` | Currently / soft-canceled allocated — **legitimate** |
| `printRequests.status === "editing"` (+ typically prior active) | Request was queued then cleared — Pending may be **legitimate one-way**; **do not** treat as false |
| `showQueueBiddingAcknowledgment` on request | Portal Add to Show occurred at least once (survives remove); Studio-only allocate may lack this |
| `printRequestItems` with `customer_upload` | Attach proof only — **not** show proof |
| Upload `pending_staff_review` alone | **Not** sufficient |

### Critical limitation (general)

For a Pending print-request upload with **no live allocations**:

| Case | Schema can distinguish? |
|------|-------------------------|
| A. Pre-E attach-only false Pending | vs |
| B. E (or post-E) legitimately queued then deallocated | **Not from `customerUploads` alone** |

**However**, request status **`draft`** is incompatible with a completed Add to Show (which sets **`active`**; full clear sets **`editing`**, never back to `draft`). Combined with **no bidding ack** and **zero allocations**, both current candidates are classifiable as **proven false-Pending** without inventing fields.

**Ambiguous class** (must NOT repair without new evidence/ADR): Pending + no allocations + request `editing` / missing / unknown history / restore-from-excluded without staff intent review.

### Classification of current inventory

| Class | Count | IDs |
|-------|------:|-----|
| Proven legitimate Pending (print-request) | **0** | — |
| Proven false-Pending (legacy attach) | **2** | `kkD1yLR9UNFsleK4Bg4Z`, `sTN1ewGYYpK8fWg6nU0s` |
| Ambiguous print-request Pending | **0** | — |
| Donation Pending (out of scope) | **88** | not listed |

---

## Part 3 — Recommended repair (Track A)

**Only if** frozen candidate still matches dry-run predicates at APPLY time:

```
catalogReviewStatus: pending_staff_review → not_eligible
updatedAt: serverTimestamp
```

Optional audit note field **only if** Formal Review requires an existing optional metadata map — do **not** invent required schema. Prefer Cloud Logging + dry-run JSON record as audit trail.

**Why not delete artwork:** badge integrity ≠ storage cleanup; files remain for the draft request items.

### Dry-run mechanism

Admin script (new, fail-closed, prod-pinned), default dry-run:

1. Load explicit ID allowlist (from frozen inventory JSON).
2. Re-read each upload + linked request + allocations.
3. Assert predicates: `purpose` print_request (or missing), `catalogReviewStatus==pending_staff_review`, `technicalStatus` ready (or agreed), `printRequest.status==draft`, allocations empty, no bidding ack.
4. Emit report: would-patch / skip-stale / skip-ambiguous.
5. Exit 0 with JSON artifact under `docs/workflow/reviews/`.

### Bounded mutation

Same script with `APPLY=1` + `CONFIRM_PROD_LEGACY_PENDING_REPAIR=1` + owner phrase:

- Transaction per doc: re-check predicates; abort if changed.
- Patch only status + `updatedAt`.
- Idempotent: already `not_eligible` → no-op success.
- Fail closed: any failed assert → skip that id, non-zero summary if any skip unexpected.

### Rollback

- Forward-only preferred: re-queue via normal Add to Show if a repair was wrong (would set Pending again under E).
- Manual Admin restore to `pending_staff_review` from dry-run backup IDs if needed (documented emergency only).

---

## Part 4 — Ordering vs A–H promote

**Recommended (challenged and confirmed):**

1. A–H production promotion **preflight** (no mutation yet)
2. Deploy Workstream **E** Functions to prod (stop new attach→Pending)
3. Re-run **read-only** inventory; freeze candidate set
4. Human approve dry-run → run dry-run → human approve APPLY
5. Bounded repair APPLY
6. Deploy/release **H** Studio lineage / 1.0.3 as planned
7. Cold-start Studio verify badge ↔ Pending
8. Track B letterbox: implement+DEV QA first; include Functions in same or subsequent prod wave with C/D OG

**Challenge note:** Repair could run before E if candidates are frozen and attach is idle — still prefer E first to close the creation path.

Track B (letterbox) can be **implemented and DEV-QA’d in parallel** with Track A planning/approval; it must not wait for prod data repair, but **prod promote of A–H remains blocked until Track B DEV acceptance**.

---

## Part 5 — Track B: Global OG Static letterbox

### Why Static bypasses letterbox today (exact)

`getPortalGlobalOpenGraph` static branch calls `resolveStaticOgImageUrl(settings.staticOgImage)` and returns snapshot `downloadUrl` (or re-signed Storage URL). It never consults `letterboxOgImages` for static and never calls `getPortalOgShareImage`. Studio/DEPLOYMENT copy previously stated Static uses the saved asset as-is.

### Existing pipeline to reuse

| Piece | Path |
|-------|------|
| Compositor | `functions/src/lib/portalOgImageCompose.ts` — `composePortalOgLetterboxImage` → **1200×630** JPEG, `fit: contain`, mat from design hex or `#e5e7eb` |
| HTTP | `functions/src/getPortalOgShareImage.ts` |
| URL builders | `functions/src/lib/portalOgUrls.ts`, `packages/shared/src/utils/portal/portalOgShareImageUrl.ts` |

Letterboxed bytes are **ephemeral** (not stored). Do not invent a second compositor or pre-bake Storage letterbox assets.

### Current vs proposed URLs

| Static kind | Today | Proposed (letterbox on / required for Static) |
|-------------|-------|-----------------------------------------------|
| `design` | 7-day signed raw preview/thumbnail URL | `getPortalOgShareImage?designId=…&fit=contain&bg=…` (same as library) |
| `upload` | Firebase download URL of `portal-social-meta/static-og/{uuid}.*` | Extend `getPortalOgShareImage` to accept validated static-og path; compose with default grey mat |

Owner requirement: Static sources **must** letterbox (not optional raw crop). Prefer: when `globalOgImageSource==="static"`, always letterbox regardless of toggle **or** force letterbox on for static while keeping toggle for library — Formal Review should pick one; Planning recommends **always letterbox Static** to match owner acceptance.

### Fail-safe

Reuse existing Global OG chain: missing/compositor failure → Portal logo / bundled fallback — **do not** return broken URLs or private Storage URLs. Avoid falling back to raw artwork when that recreates crop (prefer logo fallback).

### Cache / Workstream D

Keep 60s Function cache + `updatedAtMs` bust + invalidate on Save. Letterbox JPEG `max-age=3600` already uses `bg` bust query. Changing designId/path must change the Function URL so Facebook Scrape Again can fetch new bytes.

### Files expected to change (Track B)

- `functions/src/getPortalGlobalOpenGraph.ts`
- `functions/src/getPortalOgShareImage.ts` (+ tests)
- `functions/src/lib/portalOgUrls.ts` / shared URL helper (+ tests)
- `functions/src/portalStaticOgImage.ts` (if helper extracted)
- `apps/studio/.../PortalSocialMetaSettingsSection.tsx` (copy)
- `docs/architecture/DATA_MODEL.md`, `BACKEND.md`, `DEPLOYMENT.md` as needed
- Tests: static design + upload letterbox; regression library/design-share

### Deploy after Track B implement

- **DEV:** redeploy `getPortalGlobalOpenGraph`, `getPortalOgShareImage` (and any URL helper deps). Storage Rules unchanged if path stays under existing `portal-social-meta/static-og/`.
- **Prod:** with A–H / OG wave after DEV QA PASS for letterbox.

---

## Affected Areas

### Architecture Impact
- [x] Details: Global OG static resolution routes through existing letterbox Function; no new compositor. Data repair is Admin script, not client.

### Security Impact
- [x] Details: Prod repair Admin-only, allowlisted IDs, fail-closed predicates. OG Function must validate static-og path ownership/prefix (no path traversal).

### Data Model Impact
- [x] Details: Status-only repair on proven false-Pending. No new required fields. Optional future ADR if ambiguous class appears later.

### Backend Impact
- [x] Details: OG Functions + repair script. No F3/Algolia.

### UI / UX Impact
- [x] Details: Studio social settings copy; Facebook preview visual (manual QA).

### Migration Impact
- [x] Details: Bounded status backfill script (not broad migration).

---

## Test Strategy

### Track A
- Script unit tests: predicate matrix (draft/false vs editing/skip vs allocation present/skip)
- Dry-run on prod after freeze (owner-gated)
- Post-APPLY: Studio cold-start badge = Pending count; both IDs gone from Pending; items/files intact

### Track B (automated)
Owner-required cases 1–15 from addendum (portrait/wide/square/transparent; save/replace; missing source; design-share unchanged; existing compose tests pass)

### Track B (manual DEV)
`https://myprintrequest.dev/` — Static Design + Static Upload; Save; `getPortalGlobalOpenGraph`; Facebook Scrape Again; full artwork visible in letterbox

---

## Human Checkpoints

| Gate | Phrase / action |
|------|-----------------|
| This Plan Formal Review | Complete in this pass |
| Implement Track B (DEV) | See approval phrase below |
| Prod E deploy | Part of A–H promote preflight (separate) |
| Prod inventory freeze + dry-run | After E deploy |
| Prod APPLY repair | After dry-run PASS |
| A–H prod promote | **Still blocked** until Track B DEV PASS + Track A path cleared |

---

## Risks & Rollback

| Risk | Mitigation |
|------|------------|
| Mis-repair legitimate Pending | Strict draft+no-alloc+no-ack predicate; editing = never auto-repair |
| Ambiguous future rows | Leave untouched; optional ADR for audit field — **stop** if only ambiguous remain |
| OG path traversal on upload letterbox | Prefix allowlist `portal-social-meta/static-og/` |
| Facebook cache lag | Document Scrape Again; Fresh Prints source authoritative via version |

---

## Return checklist (owner-required 1–35)

1. Print-request Pending count: **2**
2. Original two still exist: **yes**
3. Status: both `pending_staff_review` / `ready`
4. Purpose: both **explicit** `print_request`
5. Related request `IF2zGUOvkeZjkM53q4P0`: **draft**
6. Allocations: **0** live for both
7. Ever-added evidence: allocations (live), request `editing`/`active`, bidding ack; upload doc alone insufficient
8. Certainty: both **classifiable** as false-Pending via draft+no-ack+no-alloc
9. Proven legitimate print-request Pending: **0**
10. Proven false-Pending: **2**
11. Ambiguous: **0** (current freeze)
12. Repair fields: `catalogReviewStatus→not_eligible`, `updatedAt`
13. No artwork delete — status-only
14. Dry-run: prod-pinned script, default no-write report
15. Mutation: APPLY+confirm env+allowlist TX
16. Idempotent + stale re-check
17. Order: E deploy → re-inventory → repair → H Studio; letterbox DEV parallel, prod with OG wave
18. Rollback: re-Add to Show or emergency Admin restore
19. Formal Review: this workflow file pair
20. Formal Review verdict: **`approved_with_changes`**
21. Blocker: **none for current 2**; general A-vs-B ambiguity remains for non-draft cases
22–35. Answered in Formal Review (always-letterbox Static binding; path allowlist; logs-only audit; DEV phrase §35)

---

## Exact next owner approval phrases

**Implementation (DEV) — Track B letterbox + Track A repair tooling (no prod APPLY):**

`APPROVE IMPLEMENT: LEGACY PENDING RECON TOOLING + GLOBAL OG STATIC LETTERBOX`

**Later production repair APPLY (after E deploy + dry-run PASS):**

`APPROVE PROD APPLY: LEGACY PENDING FALSE-PENDING REPAIR`

**A–H production promotion:** still **not** authorized by this plan.

---

## Open Questions

- [x] Can current 2 be classified? **Yes** (draft rule)
- [x] Formal Review: **always letterbox Static** (ignore `letterboxOgImages` for Static; library mode keeps toggle)
- [x] Durable audit metadata on repair: **logs + dry-run JSON only** (no new required fields)
