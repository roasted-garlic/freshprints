# Roadmap and Phases

> 2026-08-01: Final Studio remediations are on a clean production-promotion branch. Production Functions deployment and combined installer QA remain pending; Stage 2 stays paused and domain cutover blocked.

> Align all work with the current phase / active managed goal. Do not jump ahead.

## Current status (2026-07-31)

| Item | Status |
|------|--------|
| Goal #13 `production-release` | **Active** — Stage 2 paused; Customer Upload intake parity Amendment 4 and separate Whatnot development QA pending; domain deferred; Stage 1 + Class D closed |
| Phases 1-7 | Complete (Studio foundation through Show Queue MVP; staff-assisted Whatnot import built; live scheduled Whatnot sync **not planned**) |
| Phase 8 Portal MVP | **Complete in `fresh-prints-dev`** |
| Phase 8 fast-follows (uploads, CR, image quality, caching, auth, etc.) | **Complete** through mid-July signoffs |
| Phase 9A Etsy recommendations | **Complete in `fresh-prints-dev`** |
| Phase 9C Assisted Creation / Custom Requests | **Complete in `fresh-prints-dev`** - polish + Brevo proof email IP **PASS** 2026-07-18 |
| Phase 9 remaining | Create My Design with AI; design fee / Stripe; questionnaire branching — deferred |
| Portal catalog image load caching | **Complete** (2026-07-14) — not an open next step |
| Account linking (same email) | Firebase/Google console setting — not a custom app build |
| Small Managed #5 show queue cutoff | **Done** — owner **PASS** 2026-07-20 (ADR-FP-103) |
| Small Managed #6 design library newest first | **Done** — Portal `createdAt` desc already; owner **PASS** covered already 2026-07-20 |
| Small Managed #7–#10 account auth + owner delete | **Done** — owner **PASS** 2026-07-20 (ADR-FP-104; Delete user modal polish included) |
| Small Managed #11 OG / social sharing | **Done** — owner **PASS** 2026-07-20 (ADR-FP-105) |
| Small Managed #13 public browse + guest overlay | **Done** — owner UI **PASS** 2026-07-20; signoff **approved_with_notes** (ADR-FP-106); Anonymous Auth + rules/Functions deploy deferred |
| Small Managed #14 Recently Requested CF | **Done** — soft-deployed `onShowAllocationCreated` to `fresh-prints-dev` 2026-07-21 (ADR-FP-107); #12/#13 Function redeploy leftovers owner **PASS** same day |
| Production Portal App Hosting | Pending human approval |
| Brand logo uploads (ADR-FP-114) | **Done in repo + fresh-prints-dev** (owner PASS 2026-07-22); production Functions/rules/storage still gated |
| Portal SEO foundations (ADR-FP-116) | **Done** (owner PASS 2026-07-22; approved_with_notes) |
| Portal FAQ and How To (ADR-FP-117/118) | **Done** (owner PASS 2026-07-23; approved_with_notes) |
| Firestore usage efficiency Wave C (ADR-FP-121) | **Done** (owner PASS 2026-07-27; PASS WITH NOTES) — bounded Firestore permanent for Print Requests; private read-model explored and abandoned |
| Portal print-request pre-launch stability | **Done** (owner QA v18 PASS 2026-07-29; approved) — complete Studio lifecycle, Portal Printed progress, terminal reconciliation, and current-schema completion authorization |
| Studio Test Data legacy print-limit cleanup | **Done** (owner PASS 2026-07-29; approved) — retired Cap A counters are truthfully labeled optional legacy cleanup; target and safety behavior unchanged |
| Pre-production static-analysis cleanup | **Done** (2026-07-29; approved; owner QA not required) — `npm run build:studio` and `npm run lint` both exit 0; no product behavior change |
| Customer-upload oversized-image processing performance (Workstream A, ADR-FP-123) | **Done** (2026-07-29; approved; owner QA not required) — bounded concurrency (3) for ZIP batch processing; `finalizeCustomerUploadZip` timeout/root-cause fix; no format/limit/quality change |
| Assisted Creation reference-image MB limit increase (ADR-FP-124) | **Done** (2026-07-29; approved) — 40 MB/file (owner-selected), 8 files unchanged, 320 MB combined ceiling, all live in `fresh-prints-dev`; owner QA FAIL (stale 15 MB deployed Cloud Functions) → Amendment 1 root-caused and fixed via scoped Functions redeploy → owner re-QA PASS |

**Pre-production sequence (owner queue decision, 2026-07-29):** completed foundations include SEO,
Help/FAQ, GA4 architecture, Firestore efficiency Wave C, `portal-print-request-prelaunch-stability`,
`preproduction-static-analysis-cleanup`,
`customer-upload-oversized-image-normalization-and-processing-performance` (Workstream A only), and
`assisted-creation-reference-image-mb-limit-increase`. Remaining managed order: (1)
`customer-upload-oversized-pixel-normalization-and-processing-timeout-followup` (next queued, not
started, no Plan yet) → (2) `catalog-image-derivative-storage-consolidation` → (3)
`production-release` (blocked until the prior two sign off). The image-related goals may be
coordinated or worked in parallel where their product/security boundaries allow — see
`docs/workflow/plans/2026-07-29-customer-upload-oversized-image-normalization-and-processing-performance-plan.md`
for the originally-recommended coordination-structure rationale.

**Active managed goal:** none (idle). Last closed:
`assisted-creation-reference-image-mb-limit-increase` (Goal #10 — **approved**, 2026-07-29; signoff
`docs/workflow/reviews/2026-07-29-assisted-creation-reference-image-mb-limit-increase-signoff.md`).
No migration or Storage cleanup occurred; production untouched throughout. Exact next queued: Goal
#11, `customer-upload-oversized-pixel-normalization-and-processing-timeout-followup` (not started;
no Plan yet — scope covers pixel-dimension rejection handling, proportional normalized production
derivatives, the `Trimming transparent edges...` timeout/retry investigation, the 80 MB vs. 100 MB
limit discrepancy, and the narrow ADR-FP-080 technical-safety downscaling exception).

---

## Completed phases (summary)

### Phase 1 — Foundation
Firebase, Auth, roles, Studio shell, permissions.

### Phase 2 — Design Library
Catalog CRUD, categories, grid, search foundation.

### Phase 3 — Import System
ZIP/folder import, validation, derivatives, print-size math, upscale/trim.

### Phase 4 — Catalog Search & Organization
Library = approved `ready` only; tag filters; archived toggle.

### Phase 5 — AI Processing / Catalog Approval
AI Review workspace; staff-controlled enrichment (now **catalog-enrich-v21**); approve/reject.

### Phase 6 — Customers and Print Requests
Studio `/print-requests`; internal + customer requests; selection mode; sizing/DPI; naming.

### Phase 7 — Show Queue
Combined Whatnot show + print run; capacity; split allocation; zip + gang sheet export; production timer; shared calendar picker. Staff-assisted Import Shows is the Whatnot sync. Live/hourly scheduled Whatnot sync **not** planned for Studio.

### Phase 8 — Fresh Prints Portal (MVP)
Customer auth, catalog discover/library, print requests + progress tabs, **Add to show**. Signed off in dev 2026-07-08.

### Phase 8 fast-follow — Customer artwork upload (ADR-FP-073)
Sub-phases A–G + remediations r2–r7 on `fresh-prints-dev`:
- Trusted upload finalize (PNG/WebP/ZIP)
- Portal upload UI + attach-to-request
- Studio Customer Uploads intake (promote / exclude / retry)
- Limits (100 files, 80 MB/image, 2 GB batch, concurrency 8)
- Optional library permission (default on); ownership required
- Request item save floor **≥ 200 DPI**

### Phase 8 fast-follow — Image quality + halftone (ADR-FP-080)
- Shared `image-quality-v2` sizing: ≤6× one-pass toward 12″; 10″ request default; 15″×16.5″ envelopes; never downsample
- Factors **>2×** → extended staff visibility only (non-blocking)
- No automatic halftone detection; Portal optional checkbox + Studio/AI Review staff toggle; approve syncs `halftone` tag

### Phase 9C — Assisted Creation (ADR-FP-088)
- Portal structured brief with submitted-only updates and reference images
- Studio Assisted inbox, audited status controls, and proof staging
- Customer proof-ready → revision loop → approval with optional rating/note
- One open Assisted request per customer; owner/admin mutate; helper read-only
- Signed off 2026-07-16 after owner manual QA `PASS`

---

## Planned next

### Remaining Phase 9 deferred
Create My Design with AI; staff design-fee / Stripe; assisted questionnaire branching — start only when explicitly chosen.

### Production
Portal App Hosting / production Google enablement / production email release — human approval required.

### Phase 10 — Analytics
`requestCount`, `showAddCount`, `printCount` dashboards — analytics only, not lifecycle status.

### Deferred backlog
- Gang Sheet Builder **manual canvas** (post-MVP want)
- Always-in-selection Portal redesign (deferred during r6)

---

## Decision framework

1. Does it belong in the current phase or active managed goal?
2. Does it align with the roadmap?
3. Does it depend on unfinished work?
4. Does it increase technical debt?
5. Does it support the long-term vision?

If not, postpone it.

## Out of scope

Ecommerce checkout, shipping, order payment, marketplace, native mobile apps, customer access to Studio, multi-tenant SaaS, custom REST API for core ops.

