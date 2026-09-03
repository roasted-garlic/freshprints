# Roadmap and Phases

> 2026-09-03: **AI enrichment visible-text + catalog-copy quality — CLOSED (DEV)** — Goal `ai-enrichment-visible-text-and-catalog-copy-quality` **DONE**. Signoff **approved_with_notes**. Owner canary **PASS**. Live DEV: **catalog-enrich-v32** / **smart-profile-normalizer-v6**. Autonomous **OFF**. Production **NOT AUTHORIZED**. FreshForge **IDLE**. Next queued: Smart Profiling completion (not started).
>
> 2026-09-03: **AI enrichment visible-text + catalog-copy quality — DEV DEPLOYED; OWNER CANARY PENDING** — Live DEV v32/v6 on four Functions. Owner ≤10-design canary pending. No mass reprocess. Autonomous OFF. Production NOT AUTHORIZED. Smart Profiling completion remains next after this goal closes.
>
> 2026-09-03: **AI enrichment visible-text + catalog-copy quality — IMPLEMENT + TEST + IR (STOP before deploy)** — Code v32/v6. IR **approved_with_notes**. Live DEV still v31/v5. Await owner DEV deploy + canary. Smart Profiling completion remains next after this goal closes.
>
> 2026-09-03: **AI enrichment visible-text + catalog-copy quality — PLAN + FORMAL REVIEW (STOP)** — Goal `ai-enrichment-visible-text-and-catalog-copy-quality`. Review **approved_with_changes**. Proposed v32/v6. No implement. Smart Profiling completion remains next after this goal closes. Production **NOT AUTHORIZED**.
>
> 2026-09-03: **AI Processing queue multi-select — CLOSED** — Goal `ai-processing-queue-multi-select` **DONE**. Signoff **approved**. Owner QA **PASS**. Studio multi-select + Shift+click range + owner bulk Delete (existing callable). No Firebase deploy. Production **NOT AUTHORIZED**. FreshForge **IDLE**. Smart Profiling **PARKED**.
>
> 2026-09-03: **Smart Profile subject canonicalization + derivative suppression — CLOSED (DEV)** — Goal `smart-profile-subject-canonicalization-and-derivative-suppression` **DONE**. Signoff **approved_with_notes**. Live DEV: **catalog-enrich-v31** / **smart-profile-normalizer-v5**. Owner canary **PASS**. Autonomous **OFF**. Production **NOT AUTHORIZED**. Next queued: Smart Profiling completion (not started).
>
> 2026-09-03: **Firestore Rules resize expression budget + Interactive Upscale DPI corrective — CLOSED (DEV)** — Goal `firestore-rules-print-request-item-resize-expression-budget` **DONE**; corrective `interactive-upscale-dpi-rehydration-and-eligibility` / TD-033 **COMPLETE**. Focused Rules **22/22**; full **169/169**; DEV Rules + two enhance callables on `fresh-prints-dev`. Owner Interactive Upscale DEV QA **PASS**. Signoff **approved_with_notes**. Production **NOT AUTHORIZED**. FreshForge **IDLE**. Smart Profiling **PARKED**; batch-allocation **DEFERRED**.
>
> 2026-09-03: **Portal modal + import Smart Profile presets + intake metadata controls — CLOSED (DEV)** — Goal `portal-modal-dont-show-again-and-import-smart-profile-presets` **DONE**. Signoff **approved_with_notes**; owner QA **PASS** across Workstreams A/B/C. Workstream A: shared Portal Upload/Donate informational notice dismissal via localStorage only. Workstream B: Studio Import Session Smart Profile presets tab, durable `smartProfileImportPresets`, provenance tracking, post-AI merge, reprocess/staff-edit preservation, 4 DEV Functions + Firestore Rules live on `fresh-prints-dev`. Workstream C: Studio Auto/Light/Dark/Halftone intake controls, trusted background save, authoritative promotion with `halftoneDecisionSource: intake` and `artworkBackgroundSource: staff_manual`; `recordCustomerUploadArtworkBackgroundStaffDecision` + `promoteCustomerUploadToAiReview` live on `fresh-prints-dev`. First C promotion deploy timed out on Firebase discovery; shell-local `FUNCTIONS_DISCOVERY_TIMEOUT=60` retry succeeded. Production / App Hosting / Studio publish **NOT AUTHORIZED**. FreshForge **IDLE**. Smart Profiling **PARKED**; batch-allocation **DEFERRED**.
>
> 2026-09-02: **Customer-specific temporary Print Request + Show quota override — CLOSED (DEV)** — Goal `customer-specific-temporary-print-request-and-show-quota-override` **DONE**. Signoff **approved**; Owner QA **PASS**. ADR-FP-159. DEV Rules + Functions (+ corrective callable) on `fresh-prints-dev`. Production **NOT AUTHORIZED**. FreshForge **IDLE**. Smart Profiling **PARKED**; batch-allocation **DEFERRED**.
>
> 2026-09-02: **Portal Editing parks current draft — CLOSED (DEV)** — Goal `portal-editing-request-parks-current-draft` **DONE**. Signoff **approved_with_notes**; corrective + polish Owner QA **PASS**. Production **NOT AUTHORIZED**. FreshForge **IDLE**. Smart Profiling **PARKED**.
>
> 2026-08-31: **Print Request sizing + interactive upscale — CLOSED (DEV)** — Goal `print-request-11-inch-default-15-inch-upscale-and-legacy-art-upscale` **DONE**. Signoff **approved**; owner DEV QA **PASS**. Configurable PR default (10″ fallback); 15″ automated upscale; WS-TOGGLE interactive enhance Studio+Portal; production export parity. DEV Firebase deployed (`fresh-prints-dev`). Production **NOT AUTHORIZED**. FreshForge **IDLE**. Smart Profiling **NOT STARTED**.
>
> 2026-08-30: **Print Request 11″ + 15″ upscale + legacy enhance — IMPLEMENT COMPLETE (local)** — *(superseded by 2026-08-31 signoff banner above)*
>
> 2026-08-30: **Customer Identity WS1–WS4 — COMPLETE (DEV)** — WS4 signoff **approved**; owner DEV QA **PASS**. Production / Studio / Portal hosting **not authorized**. FreshForge active on sizing goal.
>
> 2026-08-30: **Show Queue Did Not Print recovery — CLOSED (DEV)** — Move-to-another-show + Release-only → Needs Re-queue; DEV fixture repair; Owner Edit Show scoped enabler. Signoff approved.
>
> 2026-08-28: **Customer Account Identity Management — WS1 CLOSED (DEV)** — *(superseded by WS1–WS4 complete banner above)*

> 2026-08-28: **Show Queue past-show failsafe CLOSED (DEV)** — Goal `show-queue-past-show-failsafe-and-owner-override` **DONE**. Signoff **approved_with_notes**; owner DEV QA **PASS**. Recovery callables on `fresh-prints-dev`; production / Studio publish not authorized. FreshForge **IDLE**. Phase 9 **PARKED**.

> 2026-08-27: **Show Queue past-show failsafe — PLAN + REVIEW (STOP)** — *(superseded by 2026-08-28 signoff banner above)*

> 2026-08-27: **Show Queue gang-sheet three-mode refinement CLOSED (DEV)** — Signoff **approved**; owner DEV QA **PASS**. FreshForge **IDLE** until next goal. No Studio publish / production.

> 2026-08-27: **Show Queue gang-sheet three-mode refinement — IMPLEMENT COMPLETE (DEV)** — Goal implemented; owner DEV QA pending. **No production / Studio publish.**

> 2026-08-27: **Portal customer username change CLOSED (DEV)** — Signoff **approved**; self-service profile + cooldown on `fresh-prints-dev`. Production deferred.

> 2026-08-27: **Smart Catalog Intelligence Slice 6 CLOSED (DEV)** — Signoff **approved_with_notes**; Ready Catalog backfill + Smart Profile visibility on `fresh-prints-dev`. Shadow ON; Autonomous OFF; production untouched.

> 2026-08-26: **Smart Catalog Intelligence — Slice 5 SIGNOFF approved_with_notes (DEV)** — **Slice 5 DONE**. AI Review Queue reprocess + Shadow calibration + Gate I corrective (v30/v4). Ready Catalog locked; Autonomous OFF; production untouched. Signoff: `docs/workflow/reviews/2026-08-26-smart-catalog-intelligence-slice-5-signoff.md`. Phase 9 **PARKED**.

> 2026-08-24: **Portal Discover show-rail loading + order polish CLOSED (DEV)** — Goal `portal-discover-show-rails-loading-and-order-polish` **DONE**. Signoff **approved**; owner `OWNER DEV QA: PASS`. Independent Next Show / This Week loading on Discover; compact This Week rail presentation reversed; View All unchanged. Production untouched. Phase 9 **PARKED**. FreshForge **IDLE**.
>
> 2026-08-24: **Portal Upcoming Shows theme toggle CLOSED (DEV)** — Signoff **approved**; owner local `PASS`. Sidebar theme toggle restored on `/shows`. Production PR + App Hosting next. Parent promote Gate F parked. Phase 9 PARKED.
>
> 2026-08-24: **Production promote Portal + Studio — IN PROGRESS** — Goal `production-promote-portal-and-studio-2026-08-23`. Gate C **MERGED** PR **#88** @ `94a1ed0`. Studio **1.0.9** pinned on Git (not published). Gate D Firebase **VERIFIED COMPLETE**. Gate E App Hosting **LIVE** `build-2026-08-24-001`. Published Studio still **1.0.8**. Phase 9 **PARKED**.
>
> 2026-08-23: **Studio workflow organization + grouped gang sheet CLOSED (DEV)** — Signoff **approved**; owner `OWNER DEV QA: PASS`. Grouped gang sheets (ADR-FP-143); Print Requests by show; Needs Review search; Design Library scroll. Promoted in PR #88. Phase 9 PARKED.
>
> 2026-08-22/23: **Show discovery / conversion / search CLOSED (DEV)** — Retrospective Signoffs **approved**. Our Shows public browse (ADR-FP-142); Customer→Internal conversion (ADR-FP-141); search normalization; Discover rails. Promoted in PR #88. Phase 9 PARKED.
>
> 2026-08-21: **Studio GitHub Latest + final-copy gates CLOSED** — Signoff **approved**. Publish helper after `APPROVE STUDIO PUBLISH`. 1.0.8 not edited. Workflow **IDLE**. Phase 9 PARKED.
>
> 2026-08-21: **Studio 1.0.8 PUBLISHED** — Signoff **approved_with_notes**. [`v1.0.8`](https://github.com/roasted-garlic/freshprints/releases/tag/v1.0.8) @ `3210190`. Windows updater live. Mac unsigned/manual. Portal still `7716d4a`. Workflow **IDLE**. Phase 9 PARKED.
>
> 2026-08-21: **Studio polish Git promotion CLOSED** — PR **#85** @ `97d6d49`. Git-only. Portal live still `7716d4a`. Studio published **1.0.7**. Workflow **IDLE**. Phase 9 PARKED.
>
> 2026-08-21: **Studio updater / design ID search / tag picker polish CLOSED (DEV)** — Signoff **approved**; owner `AL PASS`. Body-portaled Studio Updates; full design-ID search; Load more hides on short pages; tag picker closes after select. Studio version not bumped. Workflow **IDLE**. Phase 9 PARKED. Parked Print Request production promotion unchanged (Gate D LIVE).
>
> 2026-08-21: **Studio Print Request Customer vs Internal list split CLOSED (DEV)** — Signoff **approved**; owner Studio QA `PASS`. Discriminator `isInternal`; default Customer Requests; DEV index only (ADR-FP-140). `development` @ `bdadd30`. Production index/Studio release later. Workflow **IDLE**. Phase 9 PARKED.

> 2026-08-20: **Print Request shared sizing and queue integrity CLOSED (DEV)** — Signoff **approved**; owner combined QA `PASS`. Manual save 200 DPI + 22″; Past+Printing Finish (ADR-FP-139); Studio Add Designs item-id save. Uncommitted on `development`. Production/Functions deploy later. Workflow **IDLE**. Phase 9 PARKED.

> 2026-08-18: **PR #83 PRODUCTION LIVE / CLOSED** — Owner `PROD PR 83 QA: PASS`. Live `fresh-prints-portal-build-2026-08-19-001` @ `99b2303` **100%**. Goals `portal-add-to-show-unmissable` + `portal-design-engagement-analytics` CLOSED/LIVE. Phase 9 PARKED. Workflow IDLE.

> 2026-08-18: **Portal Design Engagement Analytics CLOSED (DEV)** — Signoff **approved**; owner `DEV DESIGN ENGAGEMENT ANALYTICS QA: PASS`. Amendment 2 GA4 titles/IDs (ADR-FP-138). Promoted in PR **#83**.

> 2026-08-18: **Portal Add to Show Unmissable CLOSED (DEV)** — Signoff **approved**; owner `DEV ADD TO SHOW UNMISSABLE QA: PASS`. Copy/presentation only on Current Request + request review. Promoted in PR **#83**.

> 2026-08-17: **Portal GA4 production enablement CLOSED** — Signoff **approved**; owner `PROD GA4 QA: PASS`; PR **#80** merged; production `124c6fa`; live `fresh-prints-portal-build-2026-08-17-002` @ 100% on `https://myprintrequest.com`. Analytics implementation unchanged. Enablement via `NEXT_PUBLIC_GA_MEASUREMENT_ID` Secret Manager mapping. Enhanced Measurement fully OFF. Cutover **CLOSED**. Phase 9 **PARKED**. Workflow **IDLE**.

> 2026-08-10: Prelaunch companion/censored **production promote COMPLETE** — owner
> `PROD COMPANION CENSORED PROMOTE SMOKE: PASS`; Studio v1.0.2 @ `b6e67be…`; Rules/indexes/
> `getPortalGlobalOpenGraph`/App Hosting LIVE. Goal #13 remains Active only for deferred
> `APPROVE MYPRINTREQUEST.COM CUTOVER` (DNS / Coming Soon not performed). Algolia untouched.

> 2026-08-08: TD-031 Discover View All pagination + NTW count badge **CLOSED** — Signoff approved; live `build-2026-08-08-004`. Parent PR #40 Algolia/Rules/cleanup remain separately gated.

> 2026-08-01: Final Studio remediations are on a clean production-promotion branch. Production Functions deployment and combined installer QA remain pending; Stage 2 stays paused and domain cutover blocked.

> Align all work with the current phase / active managed goal. Do not jump ahead.

## Immediate sequence (2026-08-30)

| # | Goal | Status |
|---|------|--------|
| 1 | Customer Identity WS1–WS4 | **DONE on DEV** |
| 2 | Show Queue recovery + DEV fixture | **DONE on DEV** |
| 3 | Print Request 11″ default + 15″ upscale + legacy enhance | **Implement complete locally — DEV deploy + QA pending** |
| 4 | Smart Profiling completion / tag retirement | **After #3** |
| 5 | Coordinated production promotion | **Later — not authorized** |

---

## Current status (2026-08-30)

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

**Active managed goal (2026-08-24):** `production-promote-portal-and-studio-2026-08-23` — Gate C
done; Gate D Firebase pending owner CLI; Gates E/F (App Hosting + Studio 1.0.9) not started.

Historical note (2026-07-29 idle snapshot below is outdated for “active goal”): last closed then was
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

