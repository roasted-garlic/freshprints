# Formal Review: Pre-release lifecycle, Show Queue image parity, and DEV environment hardening

| Field | Value |
|-------|-------|
| Date | 2026-09-15 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-09-15-pre-release-lifecycle-image-parity-and-dev-environment-hardening-plan.md` |
| Verdict | **approved_with_changes** |

---

## Summary

The Plan correctly bounds three related pre-release workstreams, answers the required investigation questions with repo evidence, and keeps production mutation out of implementation authorization. Workstream A correctly refuses a manual Move-to-Printed workaround and centers on the existing WS2 finish→reconcile→`queueTab` path. Workstream B correctly identifies Portal Admin View Designs + Admin `getSignedUrl` (not Studio list thumbs) and correctly gates production IAM. Workstream C correctly reuses ADR-FP-116’s host gate and strengthens the disabled branch only.

Verdict is **approved_with_changes**: Implement may proceed only after the owner explicitly approves implementation **and** accepts the required changes below (diagnostic timing, B surface confirmation, Staff Artwork scope, banner placement/gate).

---

## Checklist

| Area | Status | Notes |
|---|---|---|
| Scope clear and bounded | pass | A/B/C in; production deploy/Rules/backfill out |
| Architecture alignment | pass | Service/Function boundaries preserved |
| Security impact addressed | pass | No Rules weaken; ADR-FP-187 privacy kept; prod IAM separately gated |
| Data model impact addressed | pass | No new statuses; optional DTO-only response fields |
| Backend impact documented | pass | Callables + optional middleware/headers |
| Test strategy adequate | pass | Focused automated + Owner DEV QA; prod smoke separate |
| Human checkpoints identified | pass | Impl approval; A diagnostic; B prod IAM; DEV QA |
| Roadmap alignment | pass | Pre-release corrective/hardening, not new workflow |
| Documentation plan | pass | DEPLOYMENT/BACKEND/DECISIONS as needed |
| No silent scope expansion | pass | Studio queue thumbs / password gate / redesign excluded |

---

## Architecture Review

**Findings:**
- A: Server-authoritative Internal completion remains correct; Studio cache clear / optional sync is presentation freshness, not a second lifecycle.
- B: Correctly scopes to Portal Admin Show Queue View Designs; Studio Show Queue list has no artwork by design.
- C: Root layout banner + shared `isPortalSearchIndexingEnabled` gate avoids page-by-page duplication.

**Required changes:**
- [x] Confirm with owner that the broken B surface is Portal Admin `/admin/show-queue` View Designs (not Studio list/export). If owner meant a different surface, stop and revise Plan before Implement.

---

## Security Review

**Findings:**
- B must not widen Storage Rules or return originals.
- Silent `catch { return {} }` in `resolveArtworkPreview` is an honesty/ops defect; fixing it is in scope.
- Production TokenCreator self-binding is a real likely fix but is **not** authorized by this Formal Review’s implementation path.
- C dual-gate banner (indexing disabled **or** `fresh-prints-dev`) is safer than origin-only for mistaken `.com` origin on DEV; SEO must still remain host-allowlisted.

**Required changes:**
- [x] Implement B source hardening (log + truthful failure) on `development` without assuming IAM is proven.
- [x] Any production IAM/read-write action requires a **new explicit owner checkpoint** after read-only evidence.

**Human approval needed before production:**
- [x] Production Gen2 SA TokenCreator self-binding (if read-only inspection confirms missing)
- [x] Any production Function/Portal promotion for B/C source changes
- [x] Production smoke of View Designs after promotion

---

## Data Model Review

**Findings:**
- A correctly uses existing `done`/`printed`, `completed`, and `queueTab` semantics.
- Partial multi-sheet non-Printed behavior must remain.

**Required changes:**
- [ ] None beyond Plan

---

## Backend Review

**Findings:**
- A tip callable already contains WS2 reconciliation; Formal Review agrees live root cause may be deploy lag, partial qty, recompute miss, or UI cache — diagnostic required.
- B signing path and DEV-only IAM doc are the strongest parity evidence.
- C sitemap always emitting DEV URLs is a real ADR-FP-116 gap relative to owner requirements; emptying on `!indexingEnabled` is approved.

**Required changes:**
- [x] Workstream A: Prefer a short **Owner DEV read-only diagnostic** (one stuck or freshly completed Internal PR: status, queueTab, items qty, allocations) **before or at the start of Implement**, not only at final QA. If H1 (allocations still pending after Mark Complete), treat as Functions deploy freshness / finish-path failure before inventing new eligibility rules.
- [x] Do not add a staff “Move to Printed” control in this goal.

---

## Testing Review

**Findings:**
- A’s existing contract tests are string-level only; behavioral coverage is mandatory.
- B must test signing-failure vs missing-object vs Staff Artwork policy.
- C must test DEV and production matrices separately (not `NODE_ENV` alone).

**Required changes:**
- [x] A: at least one behavioral test proving finishable Internal allocation → Mark Complete path yields `done` + Printed eligibility/`queueTab` (pure or Functions-level with fakes); plus partial + idempotent + isolation cases as Plan states.
- [x] C: assert production branch robots meta remains indexable; DEV meta includes noindex; sitemap empty when indexing disabled; banner absent when production host gate is true.

---

## Documentation Review

**Findings:**
- Plan correctly lists DEPLOYMENT/BACKEND/DECISIONS updates.
- Extend `firebase-signed-url-iam.md` with production checkpoint language after B inspection (still no unauthorized mutation).

---

## Required Changes (approved_with_changes)

1. **Owner confirms B surface** = Portal Admin Show Queue View Designs (or names the correct surface before Implement).
2. **A diagnostic:** Owner provides or authorizes a DEV read-only sample of one stuck/completed Internal PR’s `status` / `queueTab` / allocations **before coding speculative lifecycle changes** beyond hardening (cache clear, returned IDs, behavioral tests). Hardening+tests may begin immediately after implementation approval; eligibility/status semantic changes require diagnostic classification (H1–H4).
3. **Staff Artwork previews (B):** Default for this goal = **leave intentional blank** unless owner explicitly opts in during implementation approval. If opted in, sign preview/thumbnail only under ADR-FP-187 constraints.
4. **DEV banner (C):** Mount in root layout; **non-dismissible**; use danger/warning strip tokens; **sticky top strip** that reserves layout space (does not cover nav/dialogs/toasts); gate with `!isPortalSearchIndexingEnabled(env) || projectId === 'fresh-prints-dev'`.
5. **C noindex pack (locked):** disabled-branch robots `{ index:false, follow:false, noarchive:true, nosnippet:true }` + `X-Robots-Tag` + empty sitemap when indexing disabled; production enabled branch untouched.
6. **No production mutation** in Implement/Test/Signoff of this goal.

---

## Blockers

None that block Formal Review completion. Implementation remains blocked on **explicit owner approval** plus required changes above.

---

## Verdict Rationale

Approved with changes because the investigation is sufficient to plan safely, scope is bounded, and production-risk items are correctly separated. Workstream B’s production root cause is hypothesized (IAM) but not live-proven — that is correctly treated as a checkpoint, not a silent assumption. Workstream A’s tip code may already contain the intended fix; Formal Review therefore requires diagnostic discipline to avoid speculative second lifecycles.

---

## Next Step

1. Owner accepts Formal Review / required changes (reply with any B surface confirmation + Staff Artwork opt-in/out + A diagnostic timing preference).
2. Owner explicitly authorizes **Implement → Test** (and Owner DEV QA before Signoff).
3. Until then: **STOP** — no implementation.

---

## Owner acceptance maintenance (2026-09-15)

Owner accepted Formal Review `approved_with_changes` and authorized **Implement → Test**, with confirmations:

1. **B surface:** Portal Admin `/admin/show-queue` → View Designs.
2. **Staff Artwork previews:** leave intentionally blank (out of scope).
3. **A diagnostic:** authorized before speculative lifecycle-semantic changes.
4. **B production boundary:** DEV source hardening/tests only; no production IAM mutation; STOP for separate checkpoint if read-only prod evidence confirms TokenCreator/`signBlob`.

### REQUIRED CORRECTION — Workstream C robots.txt (implementation constraint)

Do **not** use blanket `robots.txt: Disallow: /` as the primary DEV search-removal strategy.

Authoritative DEV control is the explicit noindex response:

- HTML robots: `index:false`, `follow:false`, `noarchive:true`, `nosnippet:true`
- HTTP `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet`
- sitemap: empty / no DEV URLs when indexing disabled
- `robots.txt`: must **not** prevent compliant crawlers from fetching DEV pages and observing noindex
- production indexing branch unchanged

Keep `isPortalSearchIndexingEnabled(...)` as the SEO gate.

Banner remains as reviewed (root layout; non-dismissible; sticky; exact text `THIS IS A DEVELOPMENT SERVER`; dual-gate; absent on production).

No full re-plan required unless repo evidence exposes a new product decision.
