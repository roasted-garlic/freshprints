# Roadmap and Phases

> Align all work with the current phase / active managed goal. Do not jump ahead.

## Current status (2026-07-20)

| Item | Status |
|------|--------|
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
| Production Portal App Hosting | Pending human approval |

**Active managed goal:** none (idle). **#11** OG/social sharing **Done** (owner PASS 2026-07-20, ADR-FP-105). Next queued: Small Managed **#12** library design share.

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
- Limits (100 files, 100 MB/image, 2 GB batch, concurrency 8)
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
