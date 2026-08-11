# Review: Production legacy Pending reconciliation + Global OG Static letterbox parity

| Field | Value |
|-------|-------|
| Date | 2026-08-11 |
| Reviewer | Review Agent (independent) |
| Plan | docs/workflow/plans/2026-08-11-prod-legacy-pending-and-og-static-letterbox-plan.md |
| Verdict | **approved_with_changes** |

---

## Summary

Independent Formal Review spot-checked the plan’s core claims against Functions/DATA_MODEL. The **`draft` ≠ completed Add-to-Show / never-rewinds-to-draft** claim holds in current code and docs, so the frozen production IDs `kkD1yLR9UNFsleK4Bg4Z` and `sTN1ewGYYpK8fWg6nU0s` are **safely repairable** under the stated dry-run/APPLY predicates. Track B Static letterbox reuse of `composePortalOgLetterboxImage` / `getPortalOgShareImage` is architecturally sound; Static must **always** letterbox (binding). Not blocked.

Production promotion of A–H and any production mutation remain **out of scope** for this review.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Track A recon tooling + gated prod APPLY; Track B Static letterbox; A–H promote explicitly out |
| Architecture alignment | pass | Admin script for data; OG reuses existing compositor; no second letterbox system |
| Security impact addressed | pass with changes | Prod APPLY gates OK; upload letterbox path must reuse `parsePortalStaticOgImageStoragePath` (binding) |
| Data model impact addressed | pass | Status-only `pending_staff_review` → `not_eligible`; no rewind invention; logs-only audit |
| Backend impact addressed | pass | E-first ordering preferred; OG Functions + share-image extension |
| Test strategy adequate | pass with changes | Cases 1–15 + Facebook manual DEV must be binding; amend A–H DEV QA scope |
| Human checkpoints identified | pass | Formal Review → implement DEV → E deploy → dry-run → APPLY → A–H promote still blocked |
| Roadmap alignment | pass | Pre-prod corrective; does not authorize promote |
| Documentation plan | pass | DATA_MODEL / BACKEND / DEPLOYMENT / Studio copy called out |
| No silent scope expansion | pass | Donation Pending, deletes, F3/Algolia, design-share semantics excluded |

---

## Spot-check: repo claims

### `functions/src/lib/customerUploadCatalogConfirmation.ts`

- Print-request attach / assisted: `submitForStaffReview: false` → `catalogReviewStatus: not_eligible`.
- Advance gate: **only** `not_eligible` → `pending_staff_review` (`shouldAdvanceCustomerUploadToStaffReview`).
- Transition patch writes **only** `catalogReviewStatus` + `updatedAt` — matches plan (no allocation id / queuedAt / ever-allocated flag).
- **Pass.**

### `functions/src/queuePortalPrintRequestToShow.ts` (status `active` on queue)

- Successful TX: `applyCustomerUploadStaffReviewTransitionInTransaction` for queued customer uploads, creates `showAllocations`, then updates request to **`status: "active"`** and writes **`showQueueBiddingAcknowledgment`** in the **same** transaction.
- Stale Cap B `selections` are rejected by validation (current code is full-queue / simple-request).
- **Pass** for “completed Portal Add to Show ⇒ `active` + bidding ack”.

### Deallocation / never back to `draft`

- Studio `markPrintRequestEditingIfNoActiveAllocations`: **`active` → `editing` only**; explicitly never touches `draft` (`upcomingShowService.ts`; DATA_MODEL § printRequests status).
- Studio first allocate: `draft`/`editing` → `active`.
- DATA_MODEL: de-allocation does **not** rewind `catalogReviewStatus` (one-way). `onShowAllocationCreated.ts` documents the same.
- **Pass** for plan’s `draft` ⇒ never completed a successful queue/clear cycle under normal product paths.

### Historical Cap B note (does **not** invalidate frozen-ID repair)

- Past Cap B partial-queue could theoretically leave a Continuable request without flipping to `active` in older designs, but Portal queue that wrote Pending also wrote **bidding acknowledgment** in the success path. Plan predicates require **`draft` + no bidding ack + zero live allocations** — that combination still excludes legitimate “queued then cleared” rows (`editing`) and Portal-queued-then-deallocated rows (ack and/or `editing`).
- Studio-only allocate may lack bidding ack, but full clear yields **`editing`**, not `draft`.
- **Pass** for frozen pair; general A-vs-B ambiguity for **`editing` / non-draft** remains correctly **non-auto-repair**.

### `functions/src/getPortalGlobalOpenGraph.ts` static branch

- `globalOgImageSource === "static"` → `resolveStaticOgImageUrl(settings.staticOgImage)` only.
- Does **not** consult `letterboxOgImages` and does **not** call `getPortalOgShareImage` / letterbox URL builders.
- Fail-safe today: missing static → brand logo.
- **Pass** — plan correctly diagnoses Static bypass / crop cause.

### `functions/src/lib/portalOgImageCompose.ts`

- `composePortalOgLetterboxImage` → **1200×630**, `fit: "contain"`, mat from design hex or grey (`#e5e7eb` via artwork background helpers).
- Ephemeral JPEG bytes — matches plan “do not pre-bake Storage letterbox assets.”
- **Pass.**

---

## Architecture Review

**Findings:**

- Track A as Admin SDK script (allowlist, dry-run default, TX re-check) is the right layer — not client/Studio.
- Track B correctly reuses existing Global OG → letterbox Function pipeline rather than inventing a compositor.
- Extending `getPortalOgShareImage` beyond `designId` is the main coupling point; must stay fail-closed and prefix-scoped.
- Design-share / library letterbox paths should remain regression-protected; Static always-letterbox must not change design-specific share semantics.

**Required changes:**

- [x] When `globalOgImageSource === "static"`, **always** letterbox (ignore `letterboxOgImages` for Static). Library mode continues to honor the toggle.
- [x] Upload Static letterbox input must validate via existing `parsePortalStaticOgImageStoragePath` (or equivalent shared helper) — reject anything outside `portal-social-meta/static-og/{uuid}.{ext}`.
- [x] Fail-safe: compositor/missing source → existing brand logo / bundled Portal logo path — **do not** fall back to raw design/upload URLs that recreate crop.

---

## Security Review

**Findings:**

- Prod APPLY gated by allowlist + env confirms + per-doc TX re-assert is appropriate fail-closed posture.
- New risk: HTTP letterbox Function accepting a Storage path for Static Upload — path traversal / arbitrary object read if validation is weaker than Save-time snapshot rules.
- No secrets, no Rules relaxation, no client-writable review status in this plan.

**Required changes:**

- [x] Bind upload Static letterbox to `parsePortalStaticOgImageStoragePath` (+ content-type/size checks already used by static OG helpers where applicable).
- [x] Do not invent required audit schema fields for repair.

**Human approval needed before production:**

- [x] E Functions deploy (A–H promote preflight)
- [x] Prod dry-run after freeze
- [x] Prod APPLY (`APPROVE PROD APPLY: LEGACY PENDING FALSE-PENDING REPAIR`)
- [x] A–H production promote (still **not** authorized by this review)

---

## Data Model Review

**Findings:**

- Repair field set `catalogReviewStatus → not_eligible` + `updatedAt` is consistent with one-way intake and Workstream E semantics.
- Deallocation-not-rewind is correctly treated as why Pending alone ≠ false-Pending.
- Inventing durable “ever queued” fields is correctly deferred; optional future ADR only if ambiguous class appears.
- Logs + dry-run JSON artifact are sufficient audit for a 2-ID allowlist repair.

**Required changes:**

- [x] APPLY / dry-run “allocations empty” means **no non-canceled allocation with `allocatedQuantity > 0`** for that `customerUploadId` / request (canceled-only or hard-deleted both OK). Document this in script predicates.
- [x] Prefer logs-only audit (no new required metadata map) — **confirmed**.

---

## Backend Review

**Findings:**

- Ordering E deploy → re-inventory → dry-run → APPLY → H Studio is sound; prevents new attach→Pending races during repair.
- Track B DEV in parallel is fine; prod OG Functions with A–H / OG wave after DEV letterbox PASS.
- Current `getPortalOgShareImage` is designId-scoped; Static Design can reuse `designId` + contain + bg; Static Upload needs a narrowly validated path/kind query extension.

**Required changes:**

- [x] Keep Workstream D cache/version bust behavior (`updatedAtMs`, invalidate on Save, letterbox URL changes when designId/path/bg change).
- [x] Storage Rules: unchanged **if** path stays under existing `portal-social-meta/static-og/`; redeploy Functions for Global OG + share-image after Track B implement.

---

## Testing Review

**Findings:**

- Track A predicate matrix tests are necessary and correctly scoped.
- Owner cases 1–15 for Track B are adequate when treated as binding acceptance.
- Prior A–H DEV QA PASS does **not** cover Static letterbox — must amend QA/signoff scope.

**Required changes:**

- [x] Treat plan “owner-required cases 1–15” as binding automated/manual acceptance for Track B.
- [x] Manual DEV: `https://myprintrequest.dev/` Static Design + Static Upload; Save; `getPortalGlobalOpenGraph`; Facebook Scrape Again; full artwork visible in letterbox (vertical artwork required).
- [x] After Track B, amend A–H DEV QA / signoff artifacts so prior PASS is not claimed to cover this defect.

---

## Documentation Review

**Findings:**

- Plan correctly calls out removal of “Static uses asset as-is” Studio/DEPLOYMENT copy and DATA_MODEL/BACKEND/DEPLOYMENT updates.
- Formal Review return items 20–35 answered below so implement does not guess.

---

## Required Changes (approved_with_changes)

1. **Static always letterbox:** For `globalOgImageSource === "static"`, always route Design + Upload through the existing letterbox pipeline; do **not** honor `letterboxOgImages` as an off-switch for Static. Library mode keeps the toggle.
2. **Path validation:** Static Upload letterbox must reuse `parsePortalStaticOgImageStoragePath` (fail closed); no arbitrary Storage paths.
3. **Fail-safe:** Prefer logo/bundled fallback over raw artwork URLs on letterbox failure.
4. **Allocation predicate wording:** Dry-run/APPLY treat “empty allocations” as no live (non-canceled, qty > 0) rows for the upload/request.
5. **Audit:** Logs + dry-run JSON only; do not add required repair metadata fields.
6. **QA scope:** Amend A–H DEV QA/signoff after Track B implement to include Static letterbox acceptance; prior PASS does not cover this.
7. **Prod APPLY** remains separately gated; this verdict does **not** authorize mutation or A–H promote.

Implement may proceed on DEV for Track B + Track A **tooling** only after owner phrase below. No plan rewrite required if these are treated as binding.

---

## Blockers

None for Plan → DEV implement of tooling + letterbox.

**Not blockers (documented limits):**

- General schema cannot distinguish attach-only false-Pending vs queued-then-deallocated from `customerUploads` alone when request is `editing` / history unknown — correctly **must not** auto-repair.
- Current freeze: **0** ambiguous print-request Pending; **2** proven false-Pending.

---

## Verdict Rationale

**approved_with_changes** (not blocked):

- Critical claim **`draft` incompatible with completed Add to Show / full clear never returns to `draft`** is **correct** vs `queuePortalPrintRequestToShow`, Studio allocate/editing helpers, and DATA_MODEL.
- Frozen IDs with `draft` + no bidding ack + 0 live allocations + explicit `print_request` + `pending_staff_review` are **safely classifiable** as legacy attach false-Pending.
- Track B diagnosis (Static raw URL bypass) and reuse of `composePortalOgLetterboxImage` are correct.
- Binding decisions (always-letterbox Static, path allowlist, logs-only audit, allocation predicate clarity, QA amend) must follow without re-opening scope.

---

## Owner return items 20–35 (explicit)

| # | Answer |
|---|--------|
| **20** | Formal Review verdict: **`approved_with_changes`** |
| **21** | Blocker for current frozen 2 IDs: **none**. Residual ambiguity remains **only** for non-draft / editing / unknown-history Pending — out of auto-repair scope. |
| **22** | Repair **is** safely implementable for the frozen 2 IDs under dry-run/APPLY predicates. Next DEV implement phrase: `APPROVE IMPLEMENT: LEGACY PENDING RECON TOOLING + GLOBAL OG STATIC LETTERBOX`. Prod APPLY later: `APPROVE PROD APPLY: LEGACY PENDING FALSE-PENDING REPAIR`. |
| **23** | Static bypass reason: `getPortalGlobalOpenGraph` static branch returns `resolveStaticOgImageUrl(...)` (snapshot downloadUrl / re-signed design asset URL) and never builds `getPortalOgShareImage` letterbox URLs. |
| **24** | Reuse: `composePortalOgLetterboxImage` (`portalOgImageCompose.ts`) + `getPortalOgShareImage` + URL helpers (`portalOgUrls.ts` / shared `portalOgShareImageUrl.ts`). Canvas **1200×630**, `fit: contain`. |
| **25** | Today Design Library Static and Upload Static converge in `resolveStaticOgImageUrl` but differ upstream snapshot kind (`design` signed path vs `upload` Firebase download URL). Neither letterboxes. |
| **26** | Today final assets: Static **design** → raw preview/thumbnail HTTPS; Static **upload** → raw `portal-social-meta/static-og/...` download URL; Library (when letterbox on) → letterbox Function URL; missing static → brand logo. |
| **27** | Proposed common path: Static design → `getPortalOgShareImage?designId=…&fit=contain&bg=…`; Static upload → same Function with validated static-og source + default grey mat; always when source is Static. |
| **28** | Storage/generated-asset impact: letterbox bytes remain **ephemeral** (no new baked letterbox objects). Original static uploads retained; switching design/upload continues existing snapshot replacement cleanup for upload objects only. |
| **29** | Cache/D: keep Function response cache + `updatedAtMs` bust + invalidate on Save; letterbox JPEG `max-age=3600` with `bg`/URL identity change so Scrape Again can fetch new bytes. Do not reintroduce hour-long stale settings. |
| **30** | Design-specific OG regression risk: **low** if share Function gains an additive static path and existing `designId` letterbox tests keep passing; do not change design-share defaults. |
| **31** | Files: `getPortalGlobalOpenGraph.ts`, `getPortalOgShareImage.ts` (+ tests), `portalOgUrls.ts` / shared URL helper (+ tests), possibly `portalStaticOgImage.ts`, Studio `PortalSocialMetaSettingsSection.tsx` copy, DATA_MODEL/BACKEND/DEPLOYMENT as needed, plus new Admin dry-run/APPLY script + tests for Track A. |
| **32** | Additional DEV tests: owner cases **1–15** (portrait/wide/square/transparent; save/replace; missing source; design-share unchanged; compose regressions) + Track A predicate matrix. |
| **33** | DEV redeploy: **Functions** (`getPortalGlobalOpenGraph`, `getPortalOgShareImage`, deps). **Storage Rules** unchanged if path prefix unchanged. |
| **34** | Updated Formal Review verdict: **`approved_with_changes`** (this document). |
| **35** | Exact next owner implementation approval phrase covering **both** tracks (DEV tooling + letterbox; **no** prod APPLY): `APPROVE IMPLEMENT: LEGACY PENDING RECON TOOLING + GLOBAL OG STATIC LETTERBOX` |

### Track A safety for frozen IDs (explicit)

| ID | Safe to repair under predicates? |
|----|----------------------------------|
| `kkD1yLR9UNFsleK4Bg4Z` | **Yes** — re-check at APPLY |
| `sTN1ewGYYpK8fWg6nU0s` | **Yes** — re-check at APPLY |

Both share request `IF2zGUOvkeZjkM53q4P0` (`draft`, no bidding ack, 0 live allocations). Status-only → `not_eligible`; do not delete artwork/items.

---

## Human Checkpoints

| Gate | Status |
|------|--------|
| This Formal Review | Complete — `approved_with_changes` |
| Owner DEV implement approval | Await phrase in §35 |
| Prod E deploy | Separate A–H preflight |
| Prod inventory freeze + dry-run | After E |
| Prod APPLY | Separate phrase |
| A–H prod promote | **Still blocked** until Track B DEV PASS + Track A path cleared |

---

## Risks

| Risk | Review stance |
|------|----------------|
| Mis-repair legitimate Pending | Mitigated for current freeze by draft+no-ack+no-live-alloc; editing = never auto-repair |
| Future ambiguous rows | Leave untouched; ADR only if needed |
| OG path traversal | Binding prefix parser required |
| Facebook cache lag | Document Scrape Again; Fresh Prints source authoritative via version |
| Race before E deploy | Prefer E before APPLY (plan ordering retained) |

---

## Next Step

1. Owner issues: `APPROVE IMPLEMENT: LEGACY PENDING RECON TOOLING + GLOBAL OG STATIC LETTERBOX`
2. Implement phase (DEV): Track B letterbox + Track A dry-run/APPLY **tooling** only, obeying Required Changes §1–7
3. STOP before any production mutation / A–H promote
