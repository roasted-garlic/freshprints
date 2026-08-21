# Fresh Prints Roadmap

> 2026-08-21: **Studio GitHub Latest + final-copy gates CLOSED** — Goal `studio-release-latest-and-final-copy-gates` **DONE**. Signoff **approved**. Publish helper sets Latest + final copy after `APPROVE STUDIO PUBLISH`. Finalize still draft-only. 1.0.8 not edited. Signoff: `docs/workflow/reviews/2026-08-21-studio-release-latest-and-final-copy-gates-signoff.md`. Phase 9 **PARKED**.
>
> 2026-08-21: **Studio 1.0.8 PUBLISHED** — Goal `studio-1.0.8-release-preparation` **DONE**. [`v1.0.8`](https://github.com/roasted-garlic/freshprints/releases/tag/v1.0.8) / release **374575547** @ `32101904b29476e514d0f9a9e8fd5c5b508a7d14` / run [32508917638](https://github.com/roasted-garlic/freshprints/actions/runs/32508917638). Smoke: Windows + Mac arm64 + Mac x64 PASS. A2 declined (ADR-FP-136); Mac auto-update install unsupported; Windows auto-update OK. Signoff: `docs/workflow/reviews/2026-08-21-studio-1.0.8-release-preparation-signoff.md`. Live Portal still `fresh-prints-portal-build-2026-08-21-001` @ `7716d4a`. Phase 9 **PARKED**.
>
> 2026-08-21: **Studio 1.0.8 draft smoke PASS** — Goal `studio-1.0.8-release-preparation`. Run [`32508917638`](https://github.com/roasted-garlic/freshprints/actions/runs/32508917638) **SUCCESS**. Draft **`374575547`**. Owner Windows + Mac arm64 + Mac x64 **PASS**. Publish not started. Published **1.0.7** unchanged. Phase 9 **PARKED**.
>
> 2026-08-21: **Studio 1.0.8 dispatch in progress** — Goal `studio-1.0.8-release-preparation`. Run [`32508917638`](https://github.com/roasted-garlic/freshprints/actions/runs/32508917638) `stable` / `internal-unsigned` from `32101904b29476e514d0f9a9e8fd5c5b508a7d14`. Draft only; publish not authorized. Published **1.0.7** unchanged. Phase 9 **PARKED**.
>
> 2026-08-21: **Studio 1.0.8 pins on production** — Goal `studio-1.0.8-release-preparation`. PR **#86** merged @ `32101904b29476e514d0f9a9e8fd5c5b508a7d14`. Version **1.0.8**. Product baseline `97d6d49`. Published **1.0.7** unchanged until dispatch/publish. Live Portal still `fresh-prints-portal-build-2026-08-21-001` @ `7716d4a`. Phase 9 **PARKED**.
>
> 2026-08-21: **Studio 1.0.8 pins implemented on development** — Goal `studio-1.0.8-release-preparation`. Version pins **1.0.7 → 1.0.8** (`package.json`, `studio-release.yml`, signing-policy test). Product baseline remains `97d6d49`. Published **1.0.7** unchanged until later dispatch/publish. Production PR / dispatch not started. Phase 9 **PARKED**.
>
> 2026-08-21: **Studio polish Git promotion CLOSED** — Goal `promote-studio-updater-design-id-search-tag-picker-polish-to-production` **DONE**. PR **#85** merged @ `97d6d49dd5e2c8cad64ae38b9f883334f56e2f76`. Git-only. Live Portal still `fresh-prints-portal-build-2026-08-21-001` @ `7716d4a`. Published Studio remains **1.0.7**. Signoff: `docs/workflow/reviews/2026-08-21-promote-studio-updater-design-id-search-tag-picker-polish-to-production-signoff.md`. Phase 9 **PARKED**.
>
> 2026-08-21: **Studio updater / design ID search / tag picker polish — SIGNOFF approved (DEV)** — Goal `studio-updater-design-id-search-tag-picker-polish` **DONE**. Studio Updates portals to `document.body`; Design Library finds full document IDs without Algolia `setSettings`; Load more hides on short pages; tag suggestions close after pick. Owner `AL PASS`. Studio version **not** bumped. Signoff: `docs/workflow/reviews/2026-08-21-studio-updater-design-id-search-tag-picker-polish-signoff.md`. Phase 9 **PARKED**. Parked production Print Request promotion unchanged.
>
> 2026-08-18: **PR #83 Portal add-to-show + design engagement analytics — PRODUCTION LIVE / CLOSED** — Goals `portal-add-to-show-unmissable` and `portal-design-engagement-analytics` **DONE**. PR **#83** merged @ `99b230333efd9a4892f8c4a30ccf72008baf2246`. Live App Hosting **`fresh-prints-portal-build-2026-08-19-001` @ 100%**. Owner `PROD PR 83 QA: PASS`. Canonical `https://myprintrequest.com`. Rollback: `fresh-prints-portal-build-2026-08-18-001` / `cb006bd`. Phase 9 **PARKED**. Tag-alias QUEUED ONLY. Signoff: `docs/workflow/reviews/2026-08-18-portal-pr-83-production-signoff.md`. Record: `docs/workflow/reviews/2026-08-18-portal-pr-83-app-hosting-rollout-record.md`.
>
> 2026-08-18: **Portal Add to Show Unmissable — SIGNOFF APPROVED (DEV)** — Goal `portal-add-to-show-unmissable` **DONE** @ `5d042696ddbc7bce2bc40675e5cae82124e5dc04`. Copy/presentation only. Owner `DEV ADD TO SHOW UNMISSABLE QA: PASS`. Promoted in PR **#83**. Signoff: `docs/workflow/reviews/2026-08-18-portal-add-to-show-unmissable-signoff.md`.
>
> 2026-08-17: **Portal GA4 event transmission corrective — PRODUCTION LIVE / CLOSED** — Goal `portal-ga4-event-transmission-corrective` **DONE**. PR **#81** merged @ `cb006bd5a21580cccf89d6c1d13d31f07633c51f`. Live App Hosting **`fresh-prints-portal-build-2026-08-18-001` @ 100%**. Owner `PROD GA4 TRANSPORT QA: PASS`. Bootstrap `gtag('js', new Date())` in the Portal GA stub. Collection proven via `g/collect` (tag detection alone is insufficient). Canonical `https://myprintrequest.com`. Rollback: `fresh-prints-portal-build-2026-08-17-002` / `124c6fa`. Cutover **CLOSED**. Phase 9 **PARKED**. Signoff: `docs/workflow/reviews/2026-08-17-portal-ga4-event-transmission-corrective-production-signoff.md`. Record: `docs/workflow/reviews/2026-08-17-portal-ga4-event-transmission-corrective-app-hosting-rollout-record.md`.
>
> 2026-08-17: **Portal GA4 production enablement — SIGNED OFF / CLOSED** (historical; collection conclusion superseded by the transmission corrective above) — Goal `portal-ga4-production-enablement` **DONE**. PR **#80** merged @ `124c6fa`. Live at that time: **`fresh-prints-portal-build-2026-08-17-002`**. Enablement via `NEXT_PUBLIC_GA_MEASUREMENT_ID` Secret Manager + `apphosting.yaml`. Enhanced Measurement **fully OFF**. Signoff: `docs/workflow/reviews/2026-08-17-portal-ga4-production-enablement-signoff.md`.
> 2026-08-16: **TD-030 qty parity — SIGNOFF approved (DEV)** — Goal `portal-details-share-add-to-request-quantity-parity` **DONE**. Share `/share/design/{id}` reuses Working Request quantity controls. Owner `DEV TD-030 QA: PASS`. TD-030 **resolved**. Production promotion PR pending owner pre-merge audit — **no merge / no App Hosting** until authorized. Later phrase: `AUTHORIZE PROD APP HOSTING ROLLOUT: TD-030 QTY PARITY`. Signoff: `docs/workflow/reviews/2026-08-16-portal-details-share-add-to-request-quantity-parity-signoff.md`.

> 2026-08-15: **Studio 1.0.7 helper update access — SIGNOFF approved** — Goal `studio-1.0.7-helper-update-access` **DONE**. Helpers open existing updater via sidebar footer modal (`canAccessDesktopApp`); Settings stays `manageSettings`-only; version pins **1.0.7**. Owner DEV QA **PASS**. Signoff: `docs/workflow/reviews/2026-08-15-studio-1.0.7-helper-update-access-signoff.md`. Release dispatch/publish still separate owner phrases. Published **v1.0.6** untouched. Phase 9 **PARKED**.

> 2026-08-15: **Studio 1.0.6 PUBLISHED — managed goal CLOSED** — [`v1.0.6`](https://github.com/roasted-garlic/freshprints/releases/tag/v1.0.6) / release **371157683** @ `9f945f3` / run [31908117273](https://github.com/roasted-garlic/freshprints/actions/runs/31908117273). Smoke: Windows + Mac arm64 + Mac x64 PASS. A2 declined (ADR-FP-136); Mac auto-update install unsupported; Windows auto-update OK. Record: `docs/workflow/reviews/2026-08-15-studio-1.0.6-published-record.md`. Signoff: `docs/workflow/reviews/2026-08-15-studio-1.0.6-managed-goal-signoff.md`.
>
> 2026-08-15: **Studio 1.0.6 DRAFT build SUCCESS — smoke pending** — Run [`31908117273`](https://github.com/roasted-garlic/freshprints/actions/runs/31908117273) @ `9f945f3` / `stable` / `internal-unsigned` / **1.0.6**. *(Superseded by PUBLISHED banner above.)*
>
> 2026-08-15: **Studio 1.0.6 managed goal SIGNOFF approved_with_notes** — A1/B/C-SHARED/D complete; A2 **DECLINED** (ADR-FP-136). Test `passed_with_notes` @ `0951075`; release source **`9f945f3`**. Signoff: `docs/workflow/reviews/2026-08-15-studio-1.0.6-managed-goal-signoff.md`. Dispatch authorized and executed by owner. Mac auto-update install remains unsupported; Windows updater unchanged.
>
> 2026-08-15: **Studio 1.0.6 A2 Developer ID DECLINED** — Owner will not enroll in paid Apple Developer Program. No `MAC_CSC_*` / notarization. Mac remains ad-hoc/manual-install; Mac auto-update **install** unsupported (limitation open). Windows updater unchanged. A1 install-failed → manual copy ships as-is. 1.0.6 may proceed to Test/Signoff/release prep **without A2**. ADR-FP-136. Amendment: `docs/workflow/plans/2026-08-15-studio-1.0.6-a2-declined-release-without-apple-program-plan-amendment.md`. Review: approved_with_changes.
>
> 2026-08-15: **Studio 1.0.6 C-SHARED production backend promotion COMPLETE** — PR #77 @ `9f945f3`; Rules+indexes+allowlisted Functions on `fresh-prints-prod`; index `upcomingShows` source+productionStatus READY; smoke passed_with_notes. Deploy: `docs/workflow/reviews/2026-08-15-studio-1.0.6-c-shared-production-deploy-record.md`. Smoke: `docs/workflow/reviews/2026-08-15-studio-1.0.6-c-shared-production-smoke.md`.
>
> 2026-08-15: **Studio 1.0.6 C-SHARED Shared Internal Gang Sheets — SIGNOFF approved_with_notes** — Workstream C-SHARED closed. Shared Internal Sheets (`staff_gang_sheet`), dedicated nav, studio_internal eligibility, Mark Complete → next cycle, queueTab allocate/remove sync; owner DEV QA **PASS**. Test: `docs/workflow/reviews/2026-08-15-studio-1.0.6-workstream-c-shared-test-report.md`. Signoff: `docs/workflow/reviews/2026-08-15-studio-1.0.6-workstream-c-shared-signoff.md`.
>
> 2026-08-15: **Studio AI Review reprocess local reconciliation — CLOSED** — Goal `studio-ai-review-reprocess-local-reconciliation` **DONE**. Owner QA **PASS**; Signoff **approved**. PR **#75** merged; Studio [`v1.0.5`](https://github.com/roasted-garlic/freshprints/releases/tag/v1.0.5) published (run 31857034677) @ `da5304e…`. Stay-on-tab Reprocess with immediate local reconcile. Signoff: `docs/workflow/reviews/2026-08-14-studio-ai-review-reprocess-local-reconciliation-signoff.md`.
>
> 2026-08-14: **Studio AI Review reprocess local reconciliation — SIGNOFF APPROVED** — Goal `studio-ai-review-reprocess-local-reconciliation` **DONE**. Stay-on-tab Reprocess with immediate local membership/count/selection reconcile; ADR-FP-027 amended. Implementation `81613fa5…`. Owner manual QA **PASS**. Signoff **approved**: `docs/workflow/reviews/2026-08-14-studio-ai-review-reprocess-local-reconciliation-signoff.md`. Next: owner merge PR #75 (Studio **1.0.5**); no Firebase/Portal this phase.
>
> 2026-08-14: **Studio Design Library archive/restore/companion — CLOSED** — Goal `studio-design-library-archive-restore-reconciliation` **DONE**. Prod SHA `061185c…` (PR #74); Rules+indexes on `fresh-prints-prod` (companion indexes READY); Studio release **370746562** / `v1.0.4` (run 31827068166, internal-unsigned). Owner: Everything looks good. Signoff **approved**: `docs/workflow/reviews/2026-08-14-studio-design-library-archive-restore-reconciliation-signoff.md`.
>
> 2026-08-13: **Studio 1.0.4 P4 PUBLISHED + repository consolidation closeout (STEPS 6–14)** — Release **370305556** / tag `v1.0.4-e59205d` intact; prod tip **`e59205d7`** (PR #70) **unchanged**; development @ **`a912879`** (PR #71 + #72). Main checkout on **`development`**. Safety archive `C:\coding\_freshprints_cleanup_safety\20260813-222344`. Worktree/branch deletes **hook-blocked** → owner NEEDS_REVIEW. **Phase 9 parked** (`wt-phase9-remediation` KEEP). Domain cutover gated (`APPROVE MYPRINTREQUEST.COM CUTOVER`). Signoff: `docs/workflow/reviews/2026-08-13-repository-consolidation-development-sync-and-cleanup-signoff.md`.
>
> 2026-08-13: **Studio 1.0.4 P4 AI preview cleanup corrective — DEV QA PASS** (superseded for promotion status by publish banner above) — Managed goal `studio-1.0.4-ai-processing-preview-cleanup-corrective`. Root cause: Rules P4 auth gap on derivative path persistence. Corrective: narrow derivative completion Rules fast path + Option B owner safe-delete + Processing Delete UX + instant list reconcile; diagnostic banner OFF. DEV: Rules + `deleteEligibleUnapprovedDesign` on `fresh-prints-dev`. Checkpoints: `docs/workflow/reviews/2026-08-13-studio-1.0.4-p4-dev-qa-checkpoint.md`, `docs/workflow/reviews/2026-08-13-studio-1.0.4-option-b-ui-discoverability-checkpoint.md`.
>
> 2026-08-11: **Track B Static OG letterbox DEV PASS** — Owner `DEV STATIC OG LETTERBOX QA: PASS`. Signoff **approved_with_notes**: `docs/workflow/reviews/2026-08-11-prod-legacy-pending-and-og-static-letterbox-signoff.md`. Track A prod APPLY still gated. Prefinal A–H promote / Studio 1.0.3 / permanent `development` merge still owner-gated.
>
> 2026-08-11: **Prefinal A–H DEV QA COMPLETE** — Owner `DEV A-H QA: PASS`. Signoff **approved_with_notes**: `docs/workflow/reviews/2026-08-11-prefinal-a-h-development-qa-signoff.md`. Branch `qa/prefinal-a-h-dev` (+ QA amendments).

> 2026-08-09: **Production Algolia managed search ON** — Gate C-enable Signoff **approved_with_notes**. Live **100%** `build-2026-08-09-001` @ `f5c0bdb` (PR #49); app `Z1FVCM5QUX` / index `portal_catalog_ready_prod` (46 reconciled). Owner `PROD ALGOLIA ENABLE QA: PASS`. Deferred: **TD-032** catalog filter account-loading flash. Signoff: `docs/workflow/reviews/2026-08-09-prod-algolia-gate-c-enable-signoff.md`.

> 2026-08-08: **PR #40 production Rules preflight** — checkpoint READY; Formal Review **approved_with_changes**. `npm run test:rules` **59/59**. Next: `APPROVE PROD FIRESTORE RULES DEPLOY: PR40 REMAINING` (Storage separate). Algolia optional/OFF. Artifacts: `docs/workflow/reviews/2026-08-08-pr-40-prod-rules-deploy-checkpoint.md`. **STOP before deploy.**

> 2026-08-08: **PR #40 remaining production-parity Gates 1–7 COMPLETE.** Studio `1.0.1` **published**: https://github.com/roasted-garlic/freshprints/releases/tag/v1.0.1 (tag @ `ebcfaf29`). Algolia remains optional/OFF. Record: `docs/workflow/reviews/2026-08-08-pr-40-prod-studio-package-record.md`.
>
> 2026-08-08: **PR #40 remaining production-parity Gates 1–7 COMPLETE WITH NOTES.** Studio `1.0.1` workflow run [31287781630](https://github.com/roasted-garlic/freshprints/actions/runs/31287781630) **success** @ `ebcfaf29`. Draft publish may still be needed for public Release visibility. Algolia remains optional/OFF. Record: `docs/workflow/reviews/2026-08-08-pr-40-prod-studio-package-record.md`.
>
> 2026-08-08: **PR #40 Gate 6 Storage cleanup COMPLETE** on `fresh-prints-prod` (`fullyClean`). Record: `docs/workflow/reviews/2026-08-08-prod-storage-cleanup-apply-record.md`. Next: `APPROVE PROD STUDIO PACKAGE: PR40 TIP`. Gates 1–6 done; Algolia OFF.
>
> 2026-08-08: **PR #40 Gate 5 publisher DELETE COMPLETE** on `fresh-prints-prod` (five ABSENT). Record: `docs/workflow/reviews/2026-08-08-pr-40-prod-functions-delete-stage-4-publishers-record.md`. Next: `APPROVE PROD STORAGE CLEANUP PLAN` (Stage 5 script cannot target prod). Tip `51db805`; Algolia OFF.
>
> 2026-08-08: **PR #40 Gate 4 taxonomy bootstrap COMPLETE** on `fresh-prints-prod` (rev1; 1130 tags / 19 cats; hash `88b122bc…`). Record: `docs/workflow/reviews/2026-08-08-prod-taxonomy-materialization-bootstrap-record.md`. Next parity gate: publisher DELETE (`APPROVE PROD FUNCTIONS DELETE: STAGE 4 PUBLISHERS`). Tip `51db805`; Algolia OFF.
>
> 2026-08-08: **PR #40 remaining production gates reconciliation** — Plan + Formal Review **approved_with_changes**. Live `build-2026-08-08-004` @ `7e13968` verified; Algolia OFF; indexes complete; RC-R3/R6 still OPEN. Sequencing amended: Rules/taxonomy parity lane first. Artifacts: `docs/workflow/reviews/2026-08-08-pr-40-remaining-production-gates-reconciliation.md`. **STOP before mutation.**

> 2026-08-08: **Discover View All pagination + NTW count Signoff** — **approved**. TD-031 **resolved**. Live `build-2026-08-08-004` @ `7e13968` (PR #43/#44/#45). Owner `DISCOVER VIEW ALL PAGINATION QA: PASS`. Signoff: `docs/workflow/reviews/2026-08-08-portal-discover-view-all-complete-pagination-signoff.md`. Parent PR #40 Algolia/Rules/cleanup still separately gated.

> 2026-08-08: **Production readyAt backfill Signoff** — **approved_with_notes**. APPLY 46/46; NTW populated; R-018 **resolved**. Note: Discover View All badge shows 40 vs membership 45 → **TD-031** (not implemented). Signoff: `docs/workflow/reviews/2026-08-08-prod-readyat-backfill-signoff.md`.

> 2026-08-08: **Home/Discover population regression Signoff** — **approved_with_notes**. Live `build-2026-08-08-002` @ `ccfc974`; whole-Home single-design fixed. Note: New This Week empty until optional prod `readyAt` backfill (R-018). Signoff: `docs/workflow/reviews/2026-08-08-prod-portal-home-discover-population-regression-signoff.md`. Recommended next: `APPROVE PROD READYAT BACKFILL`. Parent PR #40 Algolia/Rules/cleanup still separately gated.

> 2026-08-08: **PR #40 pre-merge verification + prod inventory** — pre-merge **PASS WITH NOTES** on `1d13edf`; RC-R2/R5/R7 SATISFIED; RC-R3 Algolia OPEN; App Hosting auto-rollout **disabled** (manual). Next: `APPROVE PR 40 MERGE TO PRODUCTION`. No deploy. Records: `docs/workflow/reviews/2026-08-08-pr-40-pre-merge-verification-result.md`, `docs/workflow/reviews/2026-08-08-pr-40-production-inventory-result.md`.

> 2026-08-08: **Overnight closeout** — Stage 5 Signoff **approved_with_notes**; PR #40 production-promotion Formal Review **approved_with_changes**. App Hosting secrets CLOSED; rollout NOT RUN. Signoff: `docs/workflow/reviews/2026-08-07-stage-5-generated-asset-cleanup-signoff.md`. Plan: `docs/workflow/plans/2026-08-08-pr-40-production-promotion-plan.md`.

> 2026-08-08: **PR #40 production-promotion Plan + Formal Review** — **approved_with_changes**. Stage 5 Formal Signoff now closed (see overnight note). PR #40 not merge-ready until pre-merge verification. Plan: `docs/workflow/plans/2026-08-08-pr-40-production-promotion-plan.md`. Review: `docs/workflow/reviews/2026-08-08-pr-40-production-promotion-plan-review.md`. No merge / production deploy.

> 2026-08-07: **`taxonomy-read-spike-elimination` Signoff** — **approved_with_notes** on `fresh-prints-dev`. 45-design validation **PASS WITH NOTES** (Studio 0 tags/cats; ~139 billable vs ~1461; server materialization cold+warm; Console peak 222 vs ~1.3K/1.4K; AI spot-check 8/8). Signoff: `docs/workflow/reviews/2026-08-07-taxonomy-read-spike-elimination-signoff.md`. Result: `docs/workflow/reviews/2026-08-07-taxonomy-45-design-performance-validation-result.md`. PR #40 open/unmerged. No production. No Stage 6.

> 2026-08-07: Taxonomy trigger rebuild corrective **Signoff approved_with_notes** on `fresh-prints-dev` (awaited coalesce live; rev 1→2; Studio disk cache rev 2). Parent closed via 45-design Signoff above. Checkpoint: `docs/workflow/reviews/2026-08-07-taxonomy-45-design-performance-validation-checkpoint.md`. PR #40 open/unmerged. No production.

> 2026-08-07: Stage 4 **publisher retirement Signoff** — **approved_with_notes** on `fresh-prints-dev`. Six publishers deleted; Algolia sync live; Portal generated search/facet fallback removed. Owner `STAGE 4 POST-DELETE QA: PASS`. Signoff: `docs/workflow/reviews/2026-08-07-stage-4-publisher-retirement-signoff.md`. Stage 5 Storage cleanup **not started**. PR #40 open/unmerged. No production.

> 2026-08-07: Stage 4 **publisher retirement PLANNING** — Formal Review **approved_with_changes**. Plan: `docs/workflow/plans/2026-08-07-stage-4-publisher-retirement-plan.md`. Code Implement owner-gated; live Function delete separately gated. Stage 5/6 / PR merge / production not started. PR #40 open/unmerged.

> 2026-08-07: Stage 1b-C **Algolia owner QA Signoff** — **approved_with_notes**. Checklist complete (`ALGOLIA OUTAGE: PASS`). Publisher retained. Stage 4 **not started**. Signoff: `docs/workflow/reviews/2026-08-07-stage-1b-c-algolia-owner-qa-signoff.md`. PR #40 open/unmerged. No production.

> 2026-08-07: Stage 1b-C **Discover View All regressions Signoff** — **approved_with_notes**. Owner `DISCOVER VIEW ALL: PASS WITH NOTES` (Popular/category View All fixed; rail≠View All order accepted). Signoff: `docs/workflow/reviews/2026-08-07-stage-1b-c-discover-view-all-regressions-signoff.md`. Next Stage 1b-C: Favorites / details / share / Add to Request. PR #40 open/unmerged. No production. No Stage 4.

> 2026-08-06: **Catalog mats + ready order + Assisted proof 80 MB Signoff** — **approved**. Owner QA **PASS**. Commits `42f7b20` / `982855c`; `fresh-prints-dev` storage + three Functions deployed. Signoff: `docs/workflow/reviews/2026-08-06-catalog-display-ready-ordering-and-assisted-proof-limit-signoff.md`. PR #40 open/unmerged. No production. Amendment 9 P4 still deferred.

> 2026-08-06: **Catalog display background + ready-approval ordering Signoff** — **approved_with_notes**. Studio Details mats + Portal Firestore `readyAt` browse. Owner QA **PASS WITH NOTES**. Commit `42f7b20` on `fix/post-launch-catalog-and-processing-stability` (PR #40 open/unmerged). Signoff: `docs/workflow/reviews/2026-08-06-catalog-display-background-and-ready-ordering-signoff.md`. Generated search publisher order and Amendment 9 P4 snapshot reads remain deferred. No production deploy.

> 2026-08-06: Amendment 8 Phase 1B **Stage 1a Signoff** — **approved** (final). Firestore known-ID hydration + Firestore-only categories (active ∧ ready count &gt; 0). Owner QA **PASS**. Impl `e97ab3b` (+ Amendments 1–2). Generated search/multi-tag/facets remain temporary. Stage 1b blocked on D1. PR #40 open/unmerged. No deploy. Signoff: `docs/workflow/reviews/2026-08-06-amendment-8-phase-1b-stage-1a-signoff.md`.

> 2026-08-06: Amendment 8 Phase 1B Stage 1a **Amendment 3 Signoff** — **approved**. Portal customer categories = active ∧ ready count &gt; 0 (`e97ab3b`). Owner QA **PASS**. Studio Category Management still shows empty actives. Stage 1b not started. PR #40 open/unmerged. No deploy. Signoff: `docs/workflow/reviews/2026-08-06-amendment-8-phase-1b-stage-1a-amendment-3-signoff.md`.

> 2026-08-06: Amendment 9 **P0 Signoff** — **approved_with_notes**. AI Review local reconciliation + post-action scroll correction owner re-QA **PASS WITH NOTES**. Client post-action list/count budgets met. Notes: Design Library modal/lightbox artwork-mat follow-up; snapshot-publication read amplification remains **production-promotion blocker** (P4 later). Commits `0a948e0` + `21f95d7` on `fix/post-launch-catalog-and-processing-stability` (PR #40 open/unmerged). Signoff: `docs/workflow/reviews/2026-08-06-amendment-9-p0-signoff.md`. P1/P3/P4/Phase 1B not started. No production deploy.

> 2026-08-06: Amendment 8 **Phase 1A Signoff** — **approved**. Owner re-QA **PASS** covered Studio/Portal Assisted artwork-background correction and updated `staffSuggestAssistedCreationCatalogDesign` on `fresh-prints-dev` (owner-executed scoped deploy before PASS). Commits `4ed41bc` + `bc9e7e7` on `fix/post-launch-catalog-and-processing-stability` (PR #40 open). Signoff: `docs/workflow/reviews/2026-08-05-amendment-8-phase-1a-signoff.md`. No Phase 1A deployment residual. Phase 1B managed-search provider decision still deferred.
>
> 2026-08-05: Studio AI Processing monotonic reconciliation repair (Approach C) — owner live QA **PASS** / Signoff **approved**. Commit `30e1e28` on `fix/post-launch-catalog-and-processing-stability` (PR #40 open). Signoff: `docs/workflow/reviews/2026-08-05-ai-processing-monotonic-reconciliation-repair-signoff.md`. Amendment 8 snapshot removal remains a separate unstarted track.

> 2026-08-01: `portal-design-issue-reporting` implementation is complete and awaits development deployment/owner QA. Stage 2 and public domain cutover remain blocked; the prior Studio installer is intermediate and automatic updates remain separate.

> 2026-08-01: Clean final-Studio remediation promotion is in progress. Production Functions deployment and combined installer QA remain pending; Stage 2 remains paused and domain cutover deferred.

## Purpose

This document defines the official roadmap for the Fresh Prints platform.

This document is the source of truth for:

* Development priorities
* Current phase
* Future phases
* Feature sequencing
* Project milestones
* Technical priorities

The roadmap exists to prevent random feature development.

All work should align with the current roadmap phase.

---

# Vision

Fresh Prints is a centralized **design catalog and print planning platform** for DTF operations.

The platform will support:

* **Fresh Prints Studio** (Electron — staff only)
* **Fresh Prints Portal** (mobile-first responsive web — customers only)
* Approved Design Catalog browsing and search
* AI-assisted catalog enrichment and staff review
* Print Request planning (registered customers, guests, internal lists)
* Print Run / Upcoming Show planning
* Exporting to gangsheet

Fresh Prints consists of **two applications only**. Official names: **Fresh Prints Studio** and **Fresh Prints Portal** (`docs/architecture/ADR-Application-Platform-Strategy.md`). There is no standalone native mobile app. Fresh Prints Portal serves phones, tablets, and desktop browsers.

Fresh Prints is **not** ecommerce, shipping, fulfillment, or order payment software for catalog prints. The only future payment workflow is an optional custom design fee ($5–$10) for in-house Custom Requests.

The goal is to eliminate scattered folders, spreadsheets, messages, ZIP files, and manual workflows.

---

# Guiding Principles

## Build The Foundation First

Do not build advanced features before foundational systems exist.

Bad:

```txt
AI Categorization
```

before:

```txt
Authentication
```

Good:

```txt
Authentication
Roles
Permissions
Dashboard
```

before advanced features.

---

## One Phase At A Time

Complete the current phase before beginning the next phase.

Avoid jumping ahead.

Avoid partially built systems.

---

## Build Reusable Systems

Build systems that can support:

* Fresh Prints Studio
* Fresh Prints Portal (mobile-first responsive web)

Avoid one-off solutions. Do not plan for a separate native mobile application.

---

# Current Project Status

Current Phase:

```txt
Phase 8 — Fresh Prints Portal (MVP complete in dev)
Phase 9 — Custom Designs (9A and 9C complete in dev)
```

Phase 7 Studio MVP and Phase 8 Portal MVP are complete in the dev environment.

Current Goal:

**Pre-production sequence (owner 2026-07-22):** work one managed phase at a time.

| # | Goal | Status |
|---|------|--------|
| 1 | `portal-seo-foundations` — robots.txt, sitemap, design page SEO | **Done** (2026-07-22, approved_with_notes; leftovers committed/pushed 2026-07-23 `63140a5`, reaffirmed) |
| 2 | `portal-how-to-faq` - FAQ and How To (Studio Settings CMS + Portal `/help`) | **Done** (2026-07-23, approved_with_notes) |
| 3 | `firestore-usage-efficiency-wave-c` — idle-read containment + snapshots | **Done** (2026-07-27, PASS WITH NOTES; owner PASS) |
| 4 | `studio-inbox-default-landing` — Studio home opens Inbox | **Done** (2026-07-23, approved; owner PASS) |
| 5 | `portal-google-analytics` — GA4 on Portal | **Done** (architecture 2026-07-27; enablement PR #80 / `124c6fa`; **transmission corrective LIVE 2026-08-17** — PR **#81** / `cb006bd` / `build-2026-08-18-001`, owner `PROD GA4 TRANSPORT QA: PASS`) |
| 6 | `portal-print-request-prelaunch-stability` — complete Studio/Portal request lifecycle and pre-launch reconciliation hardening | **Done** (2026-07-29, approved; owner QA v18 PASS) |
| 7 | `studio-test-data-print-limit-wipe-audit` — relabel obsolete daily-counter wipe as truthful legacy cleanup | **Done** (2026-07-29, approved; owner PASS) |
| 8 | `preproduction-static-analysis-cleanup` — resolve documented TypeScript/lint baseline | **Done** (2026-07-29, approved; owner QA not required) |
| 9 | `customer-upload-oversized-image-normalization-and-processing-performance` (Workstream A) | **Done** (2026-07-29, approved; owner QA not required; bounded-concurrency ZIP processing, ADR-FP-123) |
| 10 | Increase the MB limit for custom-request reference images | **Done** (2026-07-29, approved) — 40 MB/file live in `fresh-prints-dev` at every enforcement layer, 8 files unchanged, 320 MB combined ceiling active; owner QA FAIL (stale 15 MB deployed Cloud Functions) → Amendment 1 root-caused and fixed via scoped Functions redeploy → owner re-QA PASS |
| 11 | `customer-upload-oversized-pixel-normalization-and-processing-timeout-followup` | **Done** (2026-07-30, approved_with_notes; owner QA PASS WITH NOTES — see signoff) |
| 12 | `catalog-image-derivative-storage-consolidation` | **Done — closed_by_owner_after_inventory** (2026-07-30). Real dev inventory measured originals at ~97.66% of catalog Storage (980.8 MB of 1,004.3 MB); thumbnails+previews combined only 23.5 MB; zero orphans/duplicates/violations found. Owner decided the migration's small addressable Storage win did not justify the required backfill/consumer-cutover/bandwidth-increase — closed before implementation, an evidence-based decision. Retained as dev-only tooling: the read-only `inventoryCatalogImageStorage` callable and its Studio invocation panel. |
| 13 | `production-release` — prod Firebase / App Hosting / Google / email | **Active** — Stage 2 customer smoke **COMPLETE / PASS** (2026-08-09): **READY FOR CUSTOMERS** on hosted.app. Prelaunch companion/censored promote **COMPLETE** (2026-08-10): Rules/indexes/`getPortalGlobalOpenGraph`/Portal App Hosting **LIVE**; Studio **v1.0.2** published (`target_commitish` `b6e67be…`); owner `PROD COMPANION CENSORED PROMOTE SMOKE: PASS`. Placement-default **DEFERRED**. Domain still blocked until `APPROVE MYPRINTREQUEST.COM CUTOVER`. |
| 14 | `customer-upload-early-transparency-format-validation` — reject invalid customer artwork before the trimming stage is shown | **Done** (2026-07-30, approved; automated verification 23/23 pass, clean build/lint; owner deployed to `fresh-prints-dev` and confirmed manual QA PASS across all 5 goal-brief scenarios). Separate narrow follow-up run alongside the paused `production-release` (#13), which this goal did not modify. See `docs/workflow/plans/2026-07-30-customer-upload-early-transparency-format-validation-plan.md`. |

**Small Managed Items Backlog:** #5–**#14** **Done** (2026-07-21). See [Small Managed Items Backlog](#small-managed-items-backlog-2026-07-18) below.

**Active managed goal:** none (**IDLE**). Last closed: `portal-ga4-production-enablement` (2026-08-17; Signoff approved; `PROD GA4 QA: PASS`; live `build-2026-08-17-002` @ `124c6fa`). Cutover remains **CLOSED** (do not reopen). Phase 9 remains **PARKED**. Historical Goal #13 row below is not an open DNS task.

**Prior note (superseded for current workflow):** Goal #13 — prelaunch companion/censored **production promote signed off** (2026-08-10; `PROD COMPANION CENSORED PROMOTE SMOKE: PASS`; Studio v1.0.2). Placement-default **DEFERRED**. Stage 2 smoke **PASS** / **READY FOR CUSTOMERS** on hosted.app; cutover still awaits `APPROVE MYPRINTREQUEST.COM CUTOVER`.
`production-studio-assisted-library-design-search-empty` **signed off** (owner Studio QA **PASS**).
Tag-removal / resize / branding / registration remain signed off. Custom-domain cutover deferred until phrase.
Stage 1 complete; Class D closed. Algolia prod enable complete.

**Prior note (superseded — Class D closed):** blocked on Storage↔Firestore cross-service
permission (Class D). IAM applied; owner upload QA PASS WITH NOTES closed the incident.

**Prior note (superseded by Class D confirmation):** blocked on Studio Storage writes
(2026-07-31 incident). Domain-last sequencing still approved. Steps 1–8 complete; CORS closed
(PR #11).

**Prior note (superseded by Storage blocker):** domain-last sequencing amendment approved
2026-07-31. Steps 1–8 complete; CORS closed (PR #11). Remaining: Stage 1
domain-independent setup → Stage 2 hosted.app smoke → Stage 3
`APPROVE MYPRINTREQUEST.COM CUTOVER` → Stage 4 domain + domain-dependent smoke. Coming Soon
stays on apex until Stage 4. See Plan §7.

**Since then (same day, later pass):** the owner changed the repository from private to public,
which resolved the GitHub organization-plan limitation. Independently confirmed via the live GitHub
API (not just the owner's report) that the repository is genuinely `"visibility": "public"` and
that the `production` ruleset is genuinely `"enforcement": "active"` with restrict-deletions,
block-force-pushes, and require-PR-before-merge rules all present — **the prior "created but not
enforced" statement above is now superseded.** Performed the previously-missing full
public-repository security audit: scanned the current working tree and all 131 commits reachable
across all branches/tags/remotes for credentials, private keys, service-account files, and personal
data — **PASS**, with one non-blocking finding (a real personal email address, the owner's own,
in one internal debugging document — `[NEEDS OWNER DECISION]` on redaction, not a release
blocker). Re-documented the local pre-push hook as optional defense-in-depth now that the GitHub
ruleset provides confirmed server-side protection. Updated `docs/standards/DEPLOYMENT.md`'s ruleset
section to reflect the confirmed-active status and audit result.
**Since then (same day, later pass):** owner approved redacting both email findings from the
current repository state and explicitly decided **against** rewriting Git history (neither finding
was a credential, no third-party customer data was found, history rewriting would change the
established `master`/`production`/`v1.0.0-rc1` hashes and require force-pushing public branches —
disproportionate to the finding). Replaced both addresses with non-real placeholders
(`owner@example.com`, `test-user@example.com`) in the two current-tree files; confirmed via
`git grep` that zero occurrences of either original address remain anywhere in the current tracked
tree. **Historical commits still contain the original addresses** — a complete historical purge
remains available only through a separately approved history-rewrite Plan if the owner later
decides it is necessary. Ran the focused unit test for the modified test file (3/3 pass), repo
lint (clean), and `git diff --check` (clean) before committing.
**Since then (same day, later pass):** owner completed and reported the Firebase product-enablement
checkpoint — verified (read-only): Firestore Native mode/`nam5`, Storage `us-central1`,
Authentication with Email/Password + Google, Web App registered as
`Fresh Prints Portal Production` (classic Hosting correctly skipped), production web config
recorded in `apps/portal/.env.production.local` (confirmed gitignored via `git check-ignore -v`,
confirmed untracked via `git ls-files`, confirmed absent from `git status` — no value read or
printed), VAPID key generated, GA4 still disabled, zero production data created. Owner then
reported the App Hosting backend `fresh-prints-portal` was created via **Finish only**
(`us-central1`, connected to `roasted-garlic/freshprints`, branch `production`, root
`apps/portal` — all confirmed matching `firebase.json` exactly) and **shows "Waiting for your
first release" — no rollout occurred.** This empirically resolved the prior pass's open question
of whether backend creation itself triggers an automatic rollout: confirmed **no** — backend
configuration and the first release/deploy are separate steps. Updated
`docs/standards/DEPLOYMENT.md` to record both confirmations with a clear before/after status
table, distinguishing backend configuration (complete) from an actual release/deployment (not
performed; zero production Portal traffic).
**Correction (same day, later pass):** the prior framing above ("stopped at the App Hosting
first-release checkpoint") incorrectly implied the Portal release was the immediate next action.
The owner clarified the approved deployment order places 6 steps before it: (1) Firestore Rules,
(2) Storage Rules, (3) Firestore indexes, (4) Secret Manager, (5) Cloud Functions (approved
99-function allowlist), (6) App Hosting env vars — **then** (7) first Portal release, (8) Studio
build, (9) settings/reference data, (10) domain/Authorized Domains, (11) smoke tests, (12)
GA4/Search Console. Restated accurately: `fresh-prints-prod`'s products and App Hosting backend
are **configured** (not empty), but no Rules, indexes, Functions, or Portal release have been
deployed; no secrets set; no production data seeded; no domain configured; no production traffic
exists. Compared `firestore.rules` between `development` and `production` — identical Git blob
hash (`d4d754e22090a75ec9fa1c7fc38bbf2101822131`) on both, confirming no merge is needed before
deploying Rules. Ran the real `npm run test:rules` emulator suite (using the documented portable
JDK 21 workaround) — **48/48 pass.** Prepared, but did not execute, the exact command
`firebase deploy --only firestore:rules --project fresh-prints-prod`.
**Since then (same day, later pass):** owner approved via `APPROVE FIRESTORE RULES DEPLOY`. Ran
the full pre-deploy safety sequence — switched to `production`, `git pull --ff-only` (already
up to date), verified local `HEAD` = `origin/production` =
`aa570aa875d20ba85fd405480a47e6eda59f85b0` and `firestore.rules` blob hash =
`d4d754e22090a75ec9fa1c7fc38bbf2101822131`, both exact matches. Ran exactly
`firebase deploy --only firestore:rules --project fresh-prints-prod` — **exit 0, "Deploy
complete!"** — the first-ever Fresh Prints production Firestore Rules deployment. No other
Firebase component was touched. Returned to `development` (`git pull --ff-only`, clean tree).
`origin/production` confirmed unchanged at the same commit — this deployment added no Git commit
to `production`, only a Firebase Rules release.
**Since then (same day, later pass):** owner confirmed the local `apps/studio/tsconfig.json`
change was an intentional TypeScript 5.9.3 compatibility fix (removed invalid
`ignoreDeprecations: "5.0"` and unused `baseUrl`); verified (typecheck/build/lint/diff-check all
0) and committed to `development` as `dd05ef2`. Verified the full promotion diff
(8 commits, 9 files, no behavioral file changed) before the owner created and merged GitHub PR #3
("Release: promote verified development state to production") — confirmed via GitHub API
(`merged: true`, `merge_commit_sha: a8b02c9`). Switched to `production`, fast-forward pulled,
ran the complete release verification suite on the exact merged commit (Functions build, Portal/
Studio typecheck, Portal/Studio build, lint, 48/48 Firebase Rules emulator tests, `git diff
--check` — all exit 0; fresh Functions export enumeration re-confirmed 105 total/99 include/6
exclude, `rebuildCatalogSnapshots` included, unchanged). Confirmed `firestore.rules`/
`storage.rules`/`firestore.indexes.json` hashes unchanged by the merge — Firestore Rules remain
correctly deployed, no redeployment needed. Confirmed `v1.0.0-rc1` unchanged at `aa570aa`; created
and pushed annotated tag `v1.0.0-rc2` on the verified merge commit `a8b02c9`. Returned to
`development` (fast-forwarded through a benign GitHub-suggested production→development sync-back
merge, PR #4, content-identical). **The entire promotion went through the protected GitHub PR
workflow — no branch protection was bypassed, no emergency override used, no force-push
anywhere.**
**Since then (same day, later pass):** owner approved via `APPROVE STORAGE RULES DEPLOYMENT`. Ran
the full pre-deploy safety sequence — switched to `production`, `git pull --ff-only` (already up
to date), verified local `HEAD` = `origin/production` = `a8b02c9ee736eb1c619b8dc5fd7530f32cd0fb56`
and `storage.rules` blob hash = `3f1dd48e9f37afacb972ade3dc21c2818038a6fe`, both exact matches;
48/48 Rules-emulator tests passed; `git diff --check` clean. Ran exactly
`firebase deploy --only storage --project fresh-prints-prod` — **exit 0, "Deploy complete!"** —
the first-ever Fresh Prints production Storage Rules deployment. No other Firebase component was
touched. Returned to `development` (`git pull --ff-only`, clean tree). `origin/production`
confirmed unchanged — this deployment added no Git commit to `production`, only a Firebase
Storage Rules release.
**Since then (same day, later pass):** owner approved Firestore indexes deployment. Full
pre-deploy verification passed (`HEAD`/`origin/production`/`firestore.indexes.json` hash all
exact matches; production/development index files identical; JSON valid, 66 indexes/0 field
overrides; remote pre-deployment state confirmed empty). Full-file inspection (as required) found
one genuine duplicate index definition — `customerUploads` `purpose`+`catalogReviewStatus`,
defined twice, byte-identical. Ran `firebase deploy --only firestore:indexes --project
fresh-prints-prod` — **exit 1**, HTTP 409 "index already exists," caused by the CLI submitting
the duplicate entry twice in one batch. Post-failure remote check: **50 of 66 indexes created**
(`categories`, `customers`, `customerUploads`, `designs`, `gangSheetItems`, `gangSheets`,
`printRequestItems`, `printRequests`, `showAllocations`); **7 collection groups have zero
indexes** (`assistedCreationRequests`, `customerNotifications`, `customerUploadBatches`,
`customerUploadFinalizeLeases`, `etsyRecommendationRequests`, `etsyRecommendationSuggestions`,
`etsySuggestionRequests`). No data corrupted, nothing deleted, no unexpected index created — the
50 present indexes exactly match the reviewed file. **Did not retry blindly, did not use
`--force`, did not touch Console.** Firestore Rules (step 1) and Storage Rules (step 2) remain
correctly deployed, unaffected.
**Since then (same day, later pass):** performed a canonical duplicate audit (deterministic
structural identity by collectionGroup+queryScope+fields), confirming exactly the expected single
duplicate group (`customerUploads` purpose+catalogReviewStatus at array positions 44 and 50,
byte-identical) with no other duplicate anywhere in the file, and confirming the legitimate
two-field/three-field pair (positions 44/43) are structurally distinct. Traced provenance via
`git blame`: position 44 (kept) is the original definition from commit `043f38a` (2026-07-13,
donate-designs), position 50 (removed) is a later accidental re-addition from commit `cbba4ca`
(2026-07-14, unrelated design-asset-purge/permission-gates commit). Wrote and independently
reviewed a narrow remediation Plan (`docs/workflow/plans/2026-07-30-firestore-index-duplicate-remediation-plan.md`,
verdict `approved`) — the Review independently re-ran the audit and provenance trace from scratch
and confirmed both matched. Implemented the exact, narrow correction (removed only the 14-line
duplicate block; zero other changes), added deterministic duplicate-validation test coverage
(`packages/shared/src/constants/firestoreIndexesDuplicateValidation.test.ts`, following the
existing `storageRulesAlignment.test.ts` convention, 4/4 pass), and ran full verification (JSON
valid, validator 4/4, Rules 48/48, lint clean, diff-check clean) — all exit 0. Committed narrowly
(only the 4 intended files) and pushed to `origin/development`. Prepared (did not merge — no `gh`
CLI available) the `development → production` pull request.
**Since then (same day, later pass):** owner merged GitHub PR #5 — confirmed via GitHub API
(`merged: true`, merge commit `21f036fab2ff6cb0a4d934ef5e5c9e465b21e293`, 9 files, +1129/-43,
matching this goal's own pre-merge verification exactly). Switched to `production`, fast-forward
pulled, verified the corrected index file on the exact merged commit: 65 unique/0
duplicates/0 field overrides (new hash `e3c15380f...`); `firestore.rules`/`storage.rules`
confirmed unchanged from already-deployed versions; Functions allowlist re-confirmed unchanged
(105/99/6). Full verification suite passed (validator 4/4, Rules 48/48, lint clean, diff-check
clean). Captured remote state read-only — 50 indexes, 0 field overrides, unchanged, untouched.
Confirmed `v1.0.0-rc1`/`v1.0.0-rc2` unchanged; created and pushed annotated tag `v1.0.0-rc3` on
the verified merge commit. Returned to `development` (already in sync, no back-merge needed).
**Since then (same day, later pass):** owner approved the redeploy via
`APPROVE FIRESTORE INDEXES REDEPLOYMENT`. Full pre-deploy verification re-confirmed exact matches
(`HEAD`/`origin/production`/`firestore.indexes.json` hash; validator 4/4; canonical audit
65/65/0/0; Rules 48/48; lint clean; diff-check clean; remote baseline 50/0 confirmed). Ran
`firebase deploy --only firestore:indexes --project fresh-prints-prod` — **exit 0**, "Deploy
complete!", "firestore: deployed indexes ... successfully for (default) database" — no deletion
prompt. Post-deploy remote check: **65 indexes, 0 field overrides**, all 16 collection groups
represented. Precise canonical-identity comparison (correctly excluding Firestore's
server-auto-appended `__name__` tiebreaker field) confirmed **0 missing, 0 unexpected** — every
local definition present remotely with matching content. Returned to `development` (already in
sync). **The CLI cannot report per-index build status** (`Enabled`/`Building`/`Error`), only
definitions — so full closure of this checkpoint awaited owner confirmation via Firebase Console.

**Since then (same day, later pass):** owner confirmed via Firebase Console that all 65 of 65
indexes show `Enabled` — **Firestore indexes (step 3) fully closed.** Immediately continued to
Secret Manager (step 4, `APPROVE SECRET MANAGER INVENTORY AND PRODUCTION POPULATION`). Performed
a source-level secret audit on the verified `production` commit: exactly 4 secrets defined in
`functions/src/lib/secrets.ts` (`GEMINI_API_KEY`, `RESEND_API_KEY`, `BREVO_API_KEY`,
`ETSY_X_API_KEY`), each mapped to its exact binding Functions, all binding Functions confirmed
included in the approved 99-function allowlist (only the dev-only-excluded
`testAiEnrichmentPlayground`/`testAiEnrichmentTagRerank` also reference `GEMINI_API_KEY`).
Confirmed zero `OPENAI_API_KEY` references anywhere in source. Confirmed from source
(`DEFAULT_EMAIL_PROVIDER_SETTINGS`) that the system defaults to Resend and does not fail closed
when `settings/emailProviders` doesn't exist. Owner selected both Resend and Brevo for launch
flexibility; confirmed all four external-provider credentials available and both email-provider
sender domains verified, Etsy application access available — no blocker. Pre-population metadata
check confirmed all four secrets absent from `fresh-prints-prod` (no existing-secret conflict).
**This coding agent's tool environment cannot host a genuinely interactive terminal prompt** for
secret entry, so per the hard security rules, the owner correctly ran
`firebase functions:secrets:set` for all four names directly in their own terminal. Post-
population metadata verification (read-only, no values accessed) confirmed all four secrets at
version 1, state ENABLED. Confirmed no `OPENAI_API_KEY` created; confirmed no secret created in
`fresh-prints-dev`. **No secret value was ever printed, logged, or exposed at any point.**
**Stopped at the Functions deployment approval checkpoint** (step 5 of 12 — approved 99-function
allowlist). `master` was **not** deleted (retained as a temporary transition fallback; its
eventual deletion is a separate, later checkpoint).

**Since then (same day, later pass):** owner issued a multi-phase `Continue Workflow` instruction
authorizing Phase A (non-secret Functions configuration audit) through Phase H (final signoff) in
sequence, pausing only at specific named checkpoints. Phase A found no source change required —
`portalUrlResolver.ts`, `.firebaserc`, and the `INVITATION_FROM_EMAIL`/`PROOF_NOTICE_FROM_EMAIL`
code defaults already matched owner intent exactly. Reverification on the fast-forward-verified
`production` commit (`21f036f`) passed cleanly (build/lint/diff-check all exit 0); fresh
programmatic re-enumeration reconfirmed 105 total/99 include/6 exclude, byte-identical to the
approved allowlist, with zero drift. Ran the exact reviewed 99-function deploy command against
`fresh-prints-prod`. First attempt failed before creating anything (`--non-interactive` mode needed
explicit values for the `defineString` params) — fixed by creating `functions/.env.fresh-prints-prod`
(gitignored, same convention as the existing dev file, containing only the two non-secret
sender-address defaults). Second attempt failed requiring `--force` because
`onEmailDeliveryJobCreated` has a pre-existing, intentional `retry: true` trigger option — surfaced
to the owner via a structured question rather than applied unilaterally; **owner approved `--force`
for this specific reason.** Third attempt deployed 84 of 99 functions; 15 failed with transient
`429 Quota exceeded` (expected on a brand-new project's first bulk 2nd-gen deploy) plus Eventarc
permission-propagation delays. Verified via authoritative `firebase functions:list --json` (not
log-parsing) that all 84 deployed functions were correctly on the approved allowlist — the partial
failure was purely quota/propagation-related, not a configuration defect. Waited ~2.5 minutes, then
retried with an explicit allowlist scoped to exactly the 15 missing names (same owner-approved
`--force`) — all 15 succeeded, log ended with an explicit "Deploy complete!". **Final authoritative
verification: exactly 99 functions deployed, byte-identical to the approved allowlist (zero drift),
0 of the 6 excluded functions present, all in `us-central1`, no function in a non-ACTIVE state,
`rebuildCatalogSnapshots` confirmed present** (deployed but not invoked — that remains its own
Phase D checkpoint). Deploy log directly confirmed the `GEMINI_API_KEY` secret-accessor role was
granted to the Functions service account during this deploy, direct evidence secret bindings are
live. **No secret value was ever accessed, printed, or logged.** **Deployment-order step 5 (Cloud
Functions) is now closed; proceeding into Phase C** (App Hosting environment configuration and
first Portal release, step 6 of 12) under the same multi-phase authorization.

**Since then (same day, later pass):** completed Phase C (App Hosting environment configuration and
first Portal release) — the first-ever Fresh Prints production Portal deployment. Added an `env:`
block to `apps/portal/apphosting.yaml` with the 7 required `NEXT_PUBLIC_FIREBASE_*` values plus
`NEXT_PUBLIC_PORTAL_ORIGIN`, sourced from the owner's gitignored `.env.production.local`;
deliberately omitted `NEXT_PUBLIC_GA_MEASUREMENT_ID` even though a real value already exists in
that file, since GA4 go-live remains its own separate checkpoint. Promoted via PR #6.
**(Superseded 2026-08-08):** plaintext `value:` entries were replaced with Cloud Secret Manager
`secret:` references — see `docs/workflow/plans/2026-08-08-apphosting-env-secrets-plan.md` and
`DEPLOYMENT.md` "Portal App Hosting environment variables".

First rollout attempt (`firebase apphosting:rollouts:create ... --force`) failed at the Cloud Build
stage: `Missing dependency lock file at path '/workspace/apps/portal'`. Root cause: Fresh Prints is
an npm-workspaces monorepo with a single root lock file, but Firebase App Hosting's buildpack has
official first-class monorepo support only for Nx/Turborepo. A second attempt added
`buildCommand`/`runCommand` overrides to `apphosting.yaml` as a first hypothesis — **accidentally
committed directly to `production`** in the process, caught immediately before pushing (no remote
impact; the stray commit never reached GitHub), corrected by resetting the local `production`
branch and reapplying the identical change properly via `development` → PR #7. That retry failed
identically; the owner opened the real Cloud Build Console log and confirmed App Hosting's
monorepo-detection step runs *before* `buildCommand` executes, disproving the first hypothesis with
direct evidence.

Owner directed a narrow Plan + independent Formal Review (both `approved`) to add the minimum
officially-documented Turborepo support instead: `turbo` as a root devDependency, a root
`turbo.json` with a single `build` task, a `packageManager` field required for turbo's own
workspace resolution (discovered during implementation, within approved scope), removed the
now-confirmed-ineffective build-command override, kept the single root lock file and `rootDir`
unchanged. Verified locally (`npm ci`, `turbo run build --filter`, typecheck, Portal build, lint,
YAML validation, diff-check — all exit 0), promoted via PR #8. Retried the rollout pinned to the
merged commit: **"✔ Successfully created a new rollout!"** Verified the hosted backend live at
`https://fresh-prints-portal--fresh-prints-prod.us-central1.hosted.app` — homepage HTTP 200,
correct `<title>`, `robots.txt` returns the allow variant (confirming correct host resolution in
production), no dev-project strings found in served HTML. Automatic rollouts remain disabled.
**Deployment-order steps 6-7 of 12 now closed; proceeding into Phase D** (production settings and
bootstrap inventory, step 9 of 12) — no production Firestore data written yet, pending a
consolidated owner-approved bootstrap list.

**Since then (same day, later pass):** presented the consolidated Phase D bootstrap list for owner
approval before any Firestore write: `settings/emailProviders` (owner approved — will set via
Studio UI, `inviteProvider: "resend"`, `proofNoticeProvider: "brevo"`, matching the owner's
decision, since the code default is Resend for both), at least one category (owner approved — will
create via Studio UI, not required for the app to function but needed for meaningful cataloging).
The most significant finding: **no automated way exists anywhere in this codebase to create the
first owner account** — `createTeamUser` requires an existing owner caller, and Firestore Rules
block all client writes to `users/*`, a genuine chicken-and-egg gap for a cold-start project. Owner
chose a fully guided walkthrough; provided the exact two-part manual Console procedure (Firebase
Auth → Add user, copy UID; Firestore Console → `users/{uid}` document with `role: "owner"`,
`isActive: true`). **Owner confirmed both parts complete — the first production owner account now
exists.** `rebuildCatalogSnapshots` confirmed source-safe to invoke on a fully empty catalog but
deliberately held until real catalog data exists.

Owner then chose to jump ahead to Phase F (production Studio build) before finishing Phase D's
remaining Studio-dependent items, since Studio access is a prerequisite for the owner to actually
configure categories/email providers. Studio source audit confirmed triple-layered protection
against the Test Data Reset UI ever shipping to production (`import.meta.env.DEV` build-time gate,
`OPERATIONAL_WIPE_ALLOWED_PROJECT_IDS = ["fresh-prints-dev"]` allowlist, and `wipeOperationalTestData`
excluded from the deployed Functions allowlist entirely) and no hardcoded Portal URL or other
dev-only assumption anywhere in Studio source. Followed the recommended safest build approach:
backed up the dev `.env.local`, temporarily wrote production `VITE_FIREBASE_*` values, ran the full
production build/package on the verified `production` commit, immediately restored the dev env
file. Build + electron-builder packaging: exit 0. **Produced
`Fresh Prints-Windows-0.0.0-Setup.exe`** (~102.3 MB, SHA-256
`c4ef01b57b7b01c89d94102d4b3af4cf22988a1b1640c62950c55983d58e0720`, unsigned — Windows SmartScreen
will show the expected unrecognized-publisher warning). Not uploaded or distributed publicly.
**Deployment-order step 8 of 12 now closed. Awaiting owner installation and Phase G smoke
testing**, after which Phase D's remaining owner-driven Studio setup resumes.

**Since then (same day, later pass) — production Studio white-screen incident:** owner installed
the first production Studio installer and reported a permanent white screen (window opens, sign-in
UI never appears). This sandboxed environment could not reproduce the packaged failure directly —
the `.exe` exits silently within seconds across multiple launch methods, a genuine environment
limitation confirmed via multiple attempts (Event Viewer showed no crash entry either). Requested
the owner run the installed executable with `--enable-logging` on their own machine; they captured
the real error: `Uncaught TypeError: Cannot read properties of undefined (reading 'createContext')`
in the packaged vendor chunk.

Ruled out Firebase environment injection and packaged asset paths with direct evidence — extracted
the actual `app.asar` via `npx asar extract` and confirmed the embedded Firebase config correctly
resolved to `fresh-prints-prod` with a valid API key, and the packaged `index.html` used correct
relative asset paths. **Confirmed root cause:** `apps/studio/vite.config.ts`'s `manualChunks`
function used a bare substring match (`id.includes('node_modules/react')`) instead of a
package-boundary match — this caught `react`/`react-dom` but not `scheduler` (react-dom's runtime
dependency), which fell into the wrong chunk. The original build log had already warned `Circular
chunk: vendor -> react-vendor -> vendor` — Rollup treats this as a warning, not a build failure, so
the broken build shipped with exit 0. This only reproduces in packaged production builds since
Vite's dev server never applies `manualChunks`.

Fixed via narrow Plan + Formal Review (both `approved`): corrected the chunk-matching condition to
exact package-boundary paths and explicitly included `scheduler`; added a `rollupOptions.onwarn`
hook that fails the build on any future `CIRCULAR_CHUNK` warning, closing the actual process gap
this incident exposed (nothing in the existing verification suite inspected build warnings or
launched packaged output); also removed a dead favicon reference to an asset that never existed in
this repo's history (unrelated, found in the same evidence-gathering pass). Verified: no more
circular-chunk warning, `scheduler` directly confirmed via extraction to now live in `react-vendor`,
full build/typecheck/lint/diff-check all exit 0. Promoted via PR #9 (merge `daaafc1`), tagged
`v1.0.0-rc4`. Built the replacement installer from that exact verified commit using the same
safest env-file-swap procedure. **Produced
`Fresh Prints-Windows-0.0.0-Setup-v1.0.0-rc4.exe`** (~102.3 MB, SHA-256
`a0be8e956108bc786fe3ea629f7dc356bb0e28ed09b60d740c31a64c1bf177ed` — deliberately different from
the original failed installer's checksum, confirming genuinely new packaged content). **Awaiting
owner install/launch/login retest before Phase G smoke testing resumes.**

**Since then (same day, later pass) — Studio desktop icon alignment:** owner requested the
packaged Windows icon match the exact mark shown at the top of the collapsed Studio sidebar.
Traced the render path (`Sidebar.tsx` → `AppLogo variant="collapsed"` →
`src/assets/brand/fresh-prints-studio-logo-collapsed.png`) and confirmed via this session's own
earlier Phase D research that this bundled asset is what actually renders on the cold-start
`fresh-prints-prod` project. Found `electron-builder.json5` already referenced `icon.ico`/
`icon.png` that never existed — matching the "default Electron icon" line seen in every prior
Studio build log. Fixed via a second narrow Plan + Formal Review (both `approved`): measured the
source's opaque-pixel bounds (already extending to the canvas edges, no built-in margin), wrote a
one-time asset-generation script using `sharp` + the new `png-to-ico` devDependency (researched
and selected for being pure-JS, no native binaries, actively maintained) to produce a padded
7-resolution `.ico` (16 through 256px) and a 512px PNG. Also corrected
`main.ts`'s `BrowserWindow.icon` (previously pointing at the same nonexistent
`fresh-prints-logo.svg` found during the white-screen investigation) — confirmed via Electron's
own docs this is redundant for the packaged Windows taskbar (Windows reads the exe's embedded
resources) but genuinely matters for the dev-mode window icon.

**Verified directly, not deferred to the owner:** extracted the actual embedded icon from both the
packaged `.exe` and the installer `.exe` via Windows' own icon-extraction API and visually
confirmed the correct mark on both; confirmed no clipping at 16×16/32×32/256×256; re-confirmed the
white-screen fix's `scheduler`/`react-vendor` chunking remained intact on this build. Promoted via
PR #10 (merge `c644935`), tagged `v1.0.0-rc5`. Built the second replacement installer from that
exact verified commit; directly re-confirmed on this exact build: correct embedded icon, Firebase
config resolving to `fresh-prints-prod`, white-screen fix intact. **Produced
`Fresh Prints-Windows-0.0.0-Setup-v1.0.0-rc5.exe`** (~102.7 MB, SHA-256
`e07914692ad2ff507bce279522852acf4bd9e89eb75d04da2221e3f05c17d011` — different from both the
original failed installer's and `v1.0.0-rc4`'s checksums). `v1.0.0-rc4` remains preserved on disk
for the incident record. **`v1.0.0-rc5` is now the installer awaiting the owner's
install/launch/login/icon retest** (supersedes `rc4` for retest purposes — includes both fixes).

**Since then (same day, later pass) — owner retest result:** owner reported
**`PASS WITH NOTES`**: `v1.0.0-rc5` launches without a white screen, the correct desktop icon is
confirmed in place, and the production owner account can sign in successfully. Sign-in initially
failed until the owner added `createdAt` and `updatedAt` timestamp fields to the manually
bootstrapped `users/{uid}` document — traced to
`apps/studio/src/renderer/src/features/users/services/userService.ts`'s `mapUserDocument()`, which
throws if either field is falsy. **This was a gap in the earlier Phase D manual bootstrap
instructions (missing two fields from the given field list), not a code defect** — the corrected
full field list (`id`, `email`, `displayName`, `role`, `isActive`, `createdAt`, `updatedAt`, with
optional `createdBy`/`updatedBy`) is now recorded in `.cursor/workflow/state.md` for any future
manual first-owner bootstrap. **Deployment-order step 8 of 12 is now fully closed — both installer
defects (white screen, missing icon) are owner-confirmed fixed, not merely built and assumed
correct. Proceeding into Phase G** (Portal + installed Studio + backend smoke testing).

No longer blocked: Goals #9–#12
(`catalog-image-derivative-storage-consolidation`) closed **2026-07-30**,
**closed_by_owner_after_inventory** — the real dev Storage inventory measured originals at
~97.66% of catalog Storage (980,807,863 of 1,004,304,719 bytes across 87 designs), with existing
thumbnails+previews combined using only 23,496,856 bytes and zero orphan/duplicate/violation
findings; the owner decided the migration's small addressable Storage win (~2.3% of total) did not
justify the required backfill, consumer cutover, and accepted grid-bandwidth increase, and closed
the goal before implementation — an evidence-based decision, not a failed one. The dry-run-only
`inventoryCatalogImageStorage` callable and its dev-only Studio invocation panel are retained as
diagnostic tooling (deployed to `fresh-prints-dev` only, explicitly excluded from production scope
unless separately reviewed). Signoff:
`docs/workflow/reviews/2026-07-30-catalog-image-derivative-storage-consolidation-signoff.md`.

**Owner queue decision (2026-07-29):** goals #9–#12 (the four image-related goals) may be coordinated
or worked in parallel where their product/security boundaries allow, but `production-release` (#13)
stays blocked until all four are signed off. Goals #9, #10, #11, and #12 are now all closed; #13
(`production-release`) is active (Plan + Formal Review phase; implementation and deployment not
started). See
`docs/workflow/plans/2026-07-29-customer-upload-oversized-image-normalization-and-processing-performance-plan.md`
for the originally-recommended coordination-structure rationale, which now extends to #11 and #12 as
well.

Phase 9 Custom Designs remains **largely complete in `fresh-prints-dev`**: 9A Etsy recommendations and 9C Assisted Creation shipped with owner PASS; polish + proof-ready email (Resend + Brevo) closed. Brevo IP/blocklist deliverability **PASS** 2026-07-18. Studio Test Data Reset presets + wipe expansion **PASS** / signed off **approved_with_notes** 2026-07-18. AI Processing selective designs wipe (`aiProcessingDesigns`) **PASS** / signed off **approved** 2026-07-21. Library OG rotation intervals + per-design artwork backgrounds **PASS** / signed off **approved_with_notes** 2026-07-21. Studio tag footer + Design Library Halftone + AI Processing artwork bg **PASS** / signed off **approved_with_notes** 2026-07-21. Portal customer temporary shirt-color preview (nested **Background Color** picker) **PASS** / signed off **approved** 2026-07-21. Small Managed **#12** library design sharing proof-line owner **PASS** / soft-signoff **approved_with_notes** 2026-07-21. Portal assisted Reset/Continue + mobile auth overlay **PASS** / soft-signoff **approved** 2026-07-21. Custom request details parity (+ Addenda A–C) **PASS** / soft-signoff **approved** 2026-07-21. Assisted Creation proof preview hang hotfix **PASS** / signed off **approved** 2026-07-21. Still deferred inside Phase 9: Create My Design with AI (product AI integration), staff design-fee / Stripe, assisted questionnaire request-type branching. Production Portal / production Google / production email release remain separate human approvals. **#14** Recently Requested CF (`onShowAllocationCreated`) soft-deploy still open.

Phase 7 Show Queue is complete for Studio MVP: foundation, staff-assisted Whatnot import,
production-file export (zip, multiply-by-qty, auto-nested gang sheet PNG) signed off 2026-07-07,
and production timer + shared calendar picker signed off 2026-07-08.

**User direction (2026-07-07):**
- **Gang Sheet Builder** (manual canvas) is a post-MVP *want*, not a Studio MVP blocker — defer until
  after Portal and other priorities.
- **Whatnot (clarified 2026-07-18):** Staff-assisted Import Shows / show upsert is **built** (Phase 7). That is the day-to-day "Whatnot sync." Automated live/hourly scheduled sync is **not built and not planned** for Studio (Electron is not 24/7).
- **Next step:** Remaining Phase 9 deferred slices (AI Create My Design, design fee) when explicitly started, or production Portal App Hosting deploy / production Google enablement.

See `docs/workflow/reviews/2026-07-07-show-queue-export-and-production-files-signoff.md`,
`docs/workflow/reviews/2026-07-08-show-queue-timer-and-calendar-picker-signoff.md`, and
`docs/workflow/reviews/2026-07-08-portal-customer-show-selection-signoff.md`.

**Portal customer show-selection:** signed off 2026-07-08 — customers add requests to a show's print run via callables + shared calendar picker.

**Completed milestones (per signoffs):** Phase 1 foundation, Phase 2 design library (2A–2C), Phase 3 import pipeline (3A–3C), Phase 3D print size and catalog status separation, **Phase 4 catalog cleanup**, Phase 5 AI Review / AI enrichment baseline and AI Processing smoke checkpoint, **Phase 6 Customers And Print Requests**.

**Phase 6 source plan:** `docs/workflow/plans/2026-06-28-phase-6-print-requests-foundation-plan.md`.

**Last realignment:** 2026-07-06 — Phase 6 was closed out as complete per user confirmation. The prior Phase 6 signoffs remain the source records: `docs/workflow/reviews/2026-07-04-print-request-item-preview-and-dpi-polish-signoff.md`, `docs/workflow/reviews/2026-07-04-print-request-oversized-selection-unblock-signoff.md`, `docs/workflow/reviews/2026-07-04-print-request-origin-tracking-signoff.md`, `docs/workflow/reviews/2026-07-04-print-request-detail-autosave-and-name-locking-signoff.md`, `docs/workflow/reviews/2026-07-04-print-request-item-sizing-and-username-naming-signoff.md`, `docs/workflow/reviews/2026-07-03-print-request-query-index-hardening-signoff.md`, `docs/workflow/reviews/2026-06-29-phase-6-print-requests-catch-up-test-report.md`, and `docs/workflow/reviews/2026-06-29-customer-creation-provisioning-bug-test-report.md`.

**Symmetric apps monorepo** (`studio-apps-folder-monorepo-normalization`) — **complete** (2026-07-08 signoff). Studio lives under `apps/studio/` alongside `apps/portal`. Signoff: `docs/workflow/reviews/2026-07-08-symmetric-apps-monorepo-signoff.md`.

**Current implementation follow-up:** Remaining Phase 9 deferred items (Create My Design with AI, design fee), or production Portal deploy / production Google enablement - pick explicitly. **Already complete:** Portal catalog image load caching (2026-07-14). **Account linking:** handled via Firebase Auth / Google console setting "Link accounts that use the same email" (not a custom app build; ADR-FP-081 note updated 2026-07-18).

---

# Small Managed Items Backlog (2026-07-18)

Owner-directed ordered checklist of smaller todos. Work **one by one** via managed phase (Plan → Review → Implement → Test → Signoff). Do not start the next item until the current one is signed off or explicitly parked.

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1 | **Customers add approved proof to a print request** — after approving an Assisted Creation proof, add that artwork into Current Request / Stash | **Done** | Owner **PASS** 2026-07-18. Signoff: `docs/workflow/reviews/2026-07-18-assisted-approved-proof-add-to-print-request-signoff.md` (**approved_with_notes**). |
| 2 | **Update upload caps** — decrease request uploads, increase donation uploads | **Done** | Owner **PASS** 2026-07-18. Studio Settings + Portal 25 MB / remaining / layout-ZIP polish. Signoff: `docs/workflow/reviews/2026-07-18-portal-upload-limits-copy-zip-signoff.md`. |
| 3 | **Print request & show design caps** → **Sole limit `L`** (ADR-FP-102) — max Current Request = max per customer per show; Cap A daily + Cap B remainder removed | **Done** | Owner **PASS** 2026-07-20. One Continuable/queued Portal request per customer per show **kept** (owner 2026-07-20). Signoff: `docs/workflow/reviews/2026-07-19-simple-request-per-show-limit-signoff.md` (**approved_with_notes**). |
| 4 | **Upload page mobile actions layout** — Back and Add to Request **side by side** on mobile; footer quota / room-hint callout **full width** | **Done** | Owner **PASS** 2026-07-20. Signoff: `docs/workflow/reviews/2026-07-20-upload-page-mobile-actions-layout-signoff.md` (**approved_with_notes**). |
| 5 | **Show queue cutoff time** — customers cannot add a request to a show within **N hours** of show start (default example: **5 hours**; 8pm show → cutoff 3pm); must pick another show. Studio setting on **show settings / show queue** page | **Done** | Owner **PASS** 2026-07-20 (countdown layout/copy/mobile polish included). Signoff: `docs/workflow/reviews/2026-07-20-show-queue-cutoff-countdown-signoff.md`. ADR-FP-103. |
| 6 | **Design library always newest first** — even when filtered by category or tag | **Done** | Already implemented (Portal default browse `createdAt` desc; metrics keep metric sorts). Owner **PASS** covered already 2026-07-20. Verification: `docs/workflow/reviews/2026-07-20-design-library-newest-first-verification.md`. |
| 7 | **User reset password** — Portal forgot-password / reset via Firebase Auth reset email (login + account settings for password users) | **Done** | Owner **PASS** 2026-07-20. Signoff: `docs/workflow/reviews/2026-07-20-portal-account-auth-settings-7-10-signoff.md`. |
| 8 | **User change email** — Portal account settings; verify new email before/after per Firebase best practices; sync Auth + `users`/`customers` email | **Done** | Same batch. Google-only: least resistance = new account (no Sync). ADR-FP-104. |
| 9 | **User request account deletion** — Customer-initiated **request** (not immediate hard delete) | **Done** | Same batch. Owner hard-delete is #10. |
| 10 | **Owner delete users** — On **Test Data** page (not bulk): button → modal with **search**, **Staff** and **Customer** tabs; hard-delete **one** user + Auth + username + all associated records | **Done** | Same batch; owner-only; fresh-prints-dev. |
| 11 | **OG / social sharing meta** - Open Graph / social meta (image, title, description) for link previews when sharing | **Done** | Owner **PASS** 2026-07-20 (deep-link remount fix included). Signoff: `docs/workflow/reviews/2026-07-20-portal-og-social-sharing-meta-signoff.md`. |
| 12 | **Library design sharing on custom design requests** — When a catalog design already matches a customer’s custom/assisted request: instead of a proof image, cancel the request **or** mark complete **without a proof**; in place of the proof, send a **link to the catalog design** (image preview + title). Customer can **approve** it or **ask for it to be changed** to meet their needs | **Done** | Soft-signoff **approved_with_notes** 2026-07-21 (owner proof-line **PASS**). ADR-FP-108. Functions soft-deploy leftovers **PASS** 2026-07-21 (owner: live given #14 already deployed). |
| 13 | **Public browse + login-gated actions** — Anyone can **view** designs and browse the Portal (catalog, design details, share/landing pages) without signing in. Login required for mutating/account actions including **donate**. Guest chrome + in-shell overlay; donate overlay explains library protection kindly. | **Done** | Owner UI **PASS** 2026-07-20. Signoff: `…-signoff.md` (**approved_with_notes**). Login-required donate product **PASS** 2026-07-21. Donation Functions redeploy leftovers **PASS** 2026-07-21 (owner: live given #14 already deployed). ADR-FP-106. |
| 14 | **Recently Requested = queued-to-show only** — Discover rail must not show designs only added to / removed from a Working cart | Done (2026-07-21) | Owner product rule 2026-07-20 during #13. Gate: `lastAddedToShowAt` via `onShowAllocationCreated`. ADR-FP-107. Soft-deployed to `fresh-prints-dev` 2026-07-21 (`functions:onShowAllocationCreated`). |

**Active item:** none (Small Managed #1–**#14** Done).

**Just completed:** #14 CF soft-deploy + #12/#13 Function redeploy leftovers owner **PASS** 2026-07-21.

---

# Phase 1

## Foundation

Status:

```txt
Complete
```

Goal:

Establish the platform foundation.

---

## Objectives

Create:

* Firebase Project
* Firebase Authentication
* Firestore
* Firebase Storage
* Role System
* Permission System
* Application Shell
* Navigation
* Dashboard
* Shared Types
* Shared Services

---

## Deliverables

### Firebase Setup

Complete:

* Firebase Project
* Authentication
* Firestore
* Storage

---

### Authentication

Complete:

* Login Page
* Logout
* Session Handling
* Protected Routes

---

### User Roles

Implement:

```txt
owner
admin
helper
customer
```

---

### Permissions

Create:

```txt
permissionService.ts
```

---

### Application Shell

Create:

* Sidebar
* Header
* Page Layout
* Theme System

---

### Dashboard

Create:

* Dashboard Layout
* Placeholder Statistics
* Navigation Links

---

### Shared Foundations

Create:

* Types
* Services
* Error Handling
* Query Infrastructure

---

## Exit Criteria

Phase 1 is complete when:

* Login works
* Roles work
* Permissions work
* Dashboard exists
* Firestore connects successfully
* Storage connects successfully

No image functionality is required.

---

# Phase 2

## Design Library Foundation

Status:

```txt
Complete
```

Goal:

Create the design management system.

---

## Objectives

Build:

* Design Collection
* Design CRUD
* Category System
* Design Grid
* Design Details View

---

## Deliverables

### Design Library

Create:

* Design Grid
* Design Cards
* Design Details Panel

---

### Categories

Create:

* Category CRUD
* Category Filtering

---

### Search Foundation

Support:

* Title
* Tags
* Category

---

## Exit Criteria

Phase 2 complete when:

* Designs can be created
* Designs can be edited
* Categories work
* Search works

No ZIP importing yet.

---

# Phase 3

## Import System

Status:

```txt
Complete (3A–3C)
Active (3D)
```

Goal:

Automate design importing and production-ready metadata.

---

## Objectives

Build:

* ZIP Import
* File Validation
* DPI Validation
* Thumbnail Generation

---

## Deliverables

### ZIP Import

Support:

```txt
ZIP
 ↓
PNG Extraction
```

---

### Validation

Validate:

* File Type
* Dimensions
* DPI

---

### Thumbnail Generation

Generate:

* Thumbnail
* Preview

---

### Upload Workflow

Upload:

* Original
* Thumbnail
* Preview

---

## Exit Criteria

Phase 3 complete when:

* ZIP imports work
* Validation works
* Uploads work
* Records are created

### Phase 3D progress (Fresh Prints Studio)

**Status:** Implementation complete — **signed off** `docs/workflow/reviews/phase-3d-print-size-signoff.md` (2026-06-24, manual QA PASS WITH NOTES).

* **3D Steps 2–4, 6–7:** Print size math, import validation/persistence, Edit Design controls, Design Details display — **complete**
* **3D Step 5 (partial):** Import assessment UI — **complete**; staff confirm modal — **deferred**
* **3D Step 8:** Optional backfill — **deferred**
* **Follow-up UX (non-blocking):** Show equivalent print sizes at 300 / 150 / 72 DPI during import validation to reconcile with other software — deferred
* **Next:** Manual QA for Phase 4A; deploy Firestore indexes before production use

---

## Phase 4A — Search & Filter Enhancement (2026-06-24)

**Delivered:**

* Tag filter (server `array-contains`)
* AI review status filter (server for non-pending; client fallback for `pending` / legacy records) — **relocate to AI Review in Phase 4 cleanup**
* Pagination — load more (100 per page)
* Search includes description
* URL query params: `status`, `category`, `tag`, `aiReview`
* Clear filters control
* Composite Firestore indexes in `firestore.indexes.json` (deploy required)

**Cleanup (post-realignment):** Remove status and AI review filters from Design Library; default to approved catalog (`ready`); archived visibility toggle; simplify URL params.

**Deferred:** Date range filters (4B backlog)

---

## Phase 4 — Catalog Cleanup (2026-06-24)

**Delivered:**

* Design Library defaults to approved catalog (`status: ready`)
* Removed status and AI review filters from Design Library
* Archived visibility toggle (`archived=true` URL param)
* Searchable multi-select tag filter modal
* URL params: `search`, `category`, `tags`, `archived`
* Imports completion messaging and links point to AI Review
* Legacy `status=imported` library URLs redirect to AI Review

**Addendum (2026-06-24):** Show archived control is a toggle switch; Design Library was the default authenticated landing page (`/designs`) until superseded by ADR-FP-119.

**Addendum (2026-07-23; ADR-FP-119):** Authenticated Studio default landing is **Staff Inbox** (`/inbox`) — root, catch-all, post-login, and sidebar brand. Design Library remains a sidebar destination. Signoff: `docs/workflow/reviews/2026-07-23-studio-inbox-default-landing-signoff.md`.

**Addendum (2026-06-29):** Dev Dashboard page removed; **Dev Tools** sidebar button opens Electron DevTools in development builds (staff only).

**QA fix (2026-06-24):** Tag filter composite indexes extended; Edit Design status read-only; uniform design cards; archived metadata save preserves `archived`.

---

# Phase 4

## Catalog Search And Organization

Status:

```txt
Complete — signoff 2026-06-24 (docs/workflow/reviews/phase-4-signoff.md)
```

Goal:

Make the **approved design catalog** easy to search and browse. Design Library is not a workflow queue.

---

## Objectives

Build:

* Catalog search (title, description, tags)
* Category and tag filters
* Pagination
* Archived visibility toggle
* URL persistence for catalog filters
* AI Review navigation (sidebar, import redirects)
* Design Library limited to approved catalog (`ready`) by default

---

## Design Library scope

**In scope:**

* Search, category, tags, pagination, archived toggle
* Staff metadata editing

**Out of scope (moved to other phases):**

* AI review queue filters → Phase 5 AI Review page
* Import / operational status filters → Phase 5 AI Review page
* Print request or production queues → Phases 6–7

---

## Exit Criteria

Staff can efficiently browse and search the approved catalog. Non-catalog workflow filters removed from Design Library. Imports route to AI Review. Documentation reflects Fresh Prints Studio and Fresh Prints Portal as the only applications.

---

# Phase 5

## AI Processing And Catalog Approval

Status:

```txt
Complete through Phase 0 deploy gate; monitor and polish as needed
```

Goal:

Every imported design lands in **AI Processing** (`/ai-review`). Successful imports auto-start AI enrichment in the background (sequential). Staff review and approve before designs appear in Design Library.

Architecture plan: `docs/workflow/plans/phase-5-ai-review-architecture-plan.md`
Architecture review: `docs/workflow/reviews/phase-5-ai-review-architecture-review.md`

### Sub-phases (recommended)

| Sub-phase | Focus |
|-----------|--------|
| **5A** | Processing station — tabs, queue stats, workflow workspace (preview → pipeline → suggestions → catalog form); oldest-first queue; **no search/filter/sort** |
| **5B** | Staff-controlled AI pipeline (Processing tab starts direct Cloud Function execution; `aiSuggestions` + version fields) |
| **5C** | Approval workflow polish (already largely in 5A workspace) |
| **5D** | Promotion & audit (`catalogApprovalService` UI, re-open rejected, duplicate title warning) |
| **5E** | Polish & metrics (confidence badges, soft lock, re-run AI, sessionStorage optional) |

**5B** may run parallel with **5A**. Human checkpoint required before production AI provider setup.

---

## Objectives

Build:

* AI Processing station (`/ai-review`) — Processing, Needs Review, Rejected tabs; oldest-first queue
* Staff-controlled AI Processing after import (Phase 5B maintenance — no OpenAI call during import)
* AI title, description, category, tag suggestions with version tracking (Phase 5B)
* Staff review workspace (Approve & Next, Reject & Next, Skip, auto-advance)
* `catalogApprovalService` UI wiring
* Import completion routes to AI Processing (not Design Library)
* **Search and catalog filters remain in Design Library only**

---

## Deliverables

### AI Processing Queue

Support:

* **Processing** tab (awaiting AI) and **Needs review** tab (ready for staff)
* **Rejected** tab for audit and re-open
* Oldest-first queue order — no search, category filter, or sort dropdown
* Honest AI output placeholder until Phase 5B (no fabricated suggestions)
* Temporary form state in review workspace (no Firestore review drafts)
* Approve → `status: ready` (Design Library)
* Reject → `status: rejected`

### AI Enrichment

Generate:

* Titles
* Descriptions
* Tags
* Category suggestions

---

## Exit Criteria

New imports appear in AI Processing and auto-start AI in the background. Successful output moves to Needs Review. Staff approve in the processing workspace. Approved designs appear in Design Library only. Search/filter belongs in Design Library. No automatic catalog publish without staff action.

---

# Phase 6

## Customers And Print Requests

Status:

```txt
Complete — signed off and closed out 2026-07-06
```

Goal:

Staff create named print request lists from approved catalog designs for registered customers, guest customers, or internal use.

---

## Objectives

Build:

* Customer and guest customer records
* Print Request CRUD
* Print Request Items (design selections)
* Item-level production status (`pending`, `printed`, `done`)

---

## Deliverables

### Print Requests

Support:

* Create named request list
* Add designs from approved catalog
* Assign registered customer, guest customer, or internal list
* Track item status

### Implementation/signoff progress

Delivered and manually QA'd in Fresh Prints Studio:

* `/print-requests` staff route
* Print request list/detail workspace
* Internal, registered customer, and guest customer create modes
* Request item edit/remove controls
* Username-based transaction-safe customer request names (`sarahsmith-CR001`) and internal request names (`whatnot-IR001`)
* Standard request item quantity, requested-size, DPI feedback, duplicate, and confirm-remove controls
* Design Library request-selection mode with quantity selection
* Owner/admin customer-record creation path from Users for registered customer Print Requests
* Firestore rules for `customers`, `customerUsernames`, `counters`, `printRequests`, and `printRequestItems`
* Shared `PrintRequest`, `PrintRequestItem`, and `Customer` types
* Sticky Design Library filter dock for long catalog browsing

Closeout notes:

* Registered customer request testing has a corrected implementation path through owner/admin-created customer records in Users; authenticated QA passed in `docs/workflow/reviews/2026-06-29-customer-creation-provisioning-bug-test-report.md`.
* Customer records created in Phase 6 do not create Firebase Auth accounts, Portal login, or Studio access.
* Print Request query/index hardening is signed off in `docs/workflow/reviews/2026-07-03-print-request-query-index-hardening-signoff.md`.
* Print Request item sizing and username naming is signed off PASS WITH FOLLOW-UP NOTES in `docs/workflow/reviews/2026-07-04-print-request-item-sizing-and-username-naming-signoff.md`; follow-ups TD-016, TD-017, and TD-018 are addressed and signed off by `print-request-detail-autosave-and-name-locking` in `docs/workflow/reviews/2026-07-04-print-request-detail-autosave-and-name-locking-signoff.md`.
* Print Request oversized selection unblock is signed off PASS WITH FOLLOW-UP NOTES in `docs/workflow/reviews/2026-07-04-print-request-oversized-selection-unblock-signoff.md`; follow-ups TD-019, TD-020, and TD-021 are implemented and signed off by `print-request-item-preview-and-dpi-polish` for item thumbnail fit, item thumbnail lightbox, and accurate DPI display when requested dimensions are oversized.
* Print Request shared sizing and queue integrity is signed off **approved** (DEV) 2026-08-20: manual save is 200 DPI + 22″ only (ADR-FP-075 / ADR-FP-080 clarification); Past+Printing Finish reuse (ADR-FP-139); Studio Add Designs preserves existing items by ID. Signoff: `docs/workflow/reviews/2026-08-20-print-request-shared-sizing-and-queue-integrity-signoff.md`. Production PR / Functions deploy remain later.
* Studio `/print-requests` Customer vs Internal list split is signed off **approved** (DEV) 2026-08-21: discriminator `isInternal`; default Customer Requests; lifecycle tabs preserved; kind switcher matches Users-page segmented control. Composite index `isInternal + queueTab + updatedAt + __name__` on `fresh-prints-dev` only. Signoff: `docs/workflow/reviews/2026-08-21-studio-print-request-customer-internal-list-split-signoff.md`. Production index / Studio release remain later.
* The user confirmed on 2026-07-06 that all Phase 6 work is done and should be closed out.
* The user confirmed on 2026-07-06 that the Firestore rules checkpoint has already been deployed.

**Not in scope:** Payment, checkout, shipping, order fulfillment.

---

## Exit Criteria

Staff can build and manage print requests without mutating design catalog status.

---

# Phase 7

## Show Queue (combined Whatnot show + print run)

Status:

```txt
Combined model implemented (2026-07-05) after an initial split Upcoming Shows / Print Runs model
failed manual QA on 2026-07-05. A Whatnot show is now the print run — one combined workflow.
UI/flow polish (dark-theme readability, date-grouped show picker, whole-request attach, two-step
confirm removal, default capacity setting, same-monitor external links) implemented 2026-07-05
after a second manual QA pass. A third correction (real design/quantity split allocation flow,
allocated-quantity recalculation on removal, Working/Queued/Printed request tabs, Upcoming/Past show
tabs, queued-request edit lock) implemented 2026-07-05 after a third manual QA pass. A fourth
correction (Add to Show wording only mentions "remaining" once a split is underway, tab/detail
selection sync fix, new `editing` status for de-queued requests) implemented 2026-07-05 after a fourth
manual QA pass. A fifth correction (visual thumbnail-based split picker with live totals, wider
Add to Show modal, compact list-row show options, simplified split warning copy) implemented
2026-07-05 after a fifth manual QA pass. A sixth correction (split picker totals relabeled for
clarity, design card wording clarified, quantity inputs restyled to match the app, production-status
pill confirmed independent of selection) implemented 2026-07-05 after a sixth manual QA pass. A
seventh correction (split picker quantity inputs start blank instead of pre-filled) implemented
2026-07-05 after a seventh manual QA pass. An eighth correction (staged split allocation labels show
show date and time, not time only) implemented 2026-07-05 after an eighth manual QA pass. A ninth
correction (split warning explains both the split and pick-a-different-show paths; the split decision
area is now one bordered callout with a full-width action button) implemented 2026-07-05 after a ninth
manual QA pass. A tenth correction (split picker design cards drop the ambiguous "available to place"
line) implemented 2026-07-05 after a tenth manual QA pass. An eleventh correction (`Add to Show` is
hidden, not disabled, while the selected request is queue-locked) implemented 2026-07-05 after an
eleventh manual QA pass. A twelfth correction (green/yellow/red capacity progress bars, a derived
Open/Full/Over Max status pill computed live with no migration, and whole-card full/over-capacity
visual states) implemented 2026-07-05 after a twelfth manual QA pass. A thirteenth correction (a full
show skips the split-decision/picker path entirely — only staff override can add to it) implemented
2026-07-05 after a thirteenth manual QA pass. A final polish pass (queue-state badge label renamed to
"Working," Add to Show / queue-state pill flash fixes, internal-card notes display, and show-queue
link pills with a multi-show-aware removal flow) followed. **Signed off PASS on 2026-07-05** after
full authenticated manual QA passed — see
`docs/workflow/reviews/2026-07-05-print-runs-foundation-signoff.md`. Dev Firestore rules deploy
(`firebase deploy --only firestore:rules --project fresh-prints-dev`) was later completed by the
user, per confirmation on 2026-07-06. **Production-file export signed off 2026-07-07** — per-show
zip export, multiply-by-quantity zip export, and auto-nested gang sheet PNG export are implemented in
Studio; see `docs/workflow/reviews/2026-07-07-show-queue-export-and-production-files-signoff.md`.
**Phase 7 Studio MVP is complete.** Staff-assisted Whatnot import is built; automated live/hourly scheduled sync is **not planned** (user 2026-07-07:
Studio is not 24/7; revisit only for a future always-on hosted service if needed). Gang Sheet Builder
manual canvas is **post-MVP backlog** (want, not need).
```

Goal:

Track each Whatnot show as its own production run: schedule (Whatnot is the source of truth, matched
by stable show ID), print capacity, and attached Print Requests, all on one record. Export to
gangsheet in a later slice.

---

## Objectives

Implemented 2026-07-05:

* Single combined `upcomingShows` collection: each Whatnot show is its own production run
* Manual add flow parses the Whatnot show ID from a pasted URL (read-only, never typed) and requires
  a scheduled date/time
* `/show-queue` list/detail UI, sorted client-side (fixes a bug where shows without a schedule never
  appeared under a Firestore `orderBy` query)
* Staff-set optional `maxTotalQuantity` capacity per show, with a danger-confirmed override
* `showAllocations` collection: snapshot-plus-reference allocation of Print Request item quantities to
  a show, supporting a request being split across multiple shows when capacity requires it
* `Add to Show` primary action on the Print Request page; secondary `+ Add Print Request` on the show
  detail page
* Print Request queue/print badges (`not_queued`/`partially_queued`/`queued`/`partially_printed`/
  `printed`) derived live from allocations — no persisted status field to keep in sync
* Production status (`pending`/`queued`/`in_progress`/`printed`/`done`/`canceled`) lives only on
  `showAllocations`, never on `designs.status`
* Separate show-level `status` (Whatnot schedule/source health) and `productionStatus` (print
  production progress) fields — sync health is never mixed with production completion

UI/flow polish, implemented 2026-07-05 after a second manual QA pass:

* `Add to Show` and `+ Add Print Request` pickers use dark-theme-readable option cards and a compact
  date-grouped (calendar-style) show selector emphasizing date/time and capacity over show title
* `+ Add Print Request` attaches an entire Print Request in one action instead of one item at a time
* Removing a Print Request from a show requires a two-step confirm, matching the existing Print
  Request item removal pattern
* A Show Queue settings cog exposes a staff-configurable default max quantity for new shows
  (`settings/showQueue`, direct client read/write), applied only at show-creation time
* Intro/"How it works" copy removed from Print Requests and Show Queue for a more compact workspace;
  `Add to Show` moved to a prominent upper action area and disabled until the request has items
* Show Detail status pills align horizontally; Request Detail uses a bottom-right `Edit` button
  instead of a chevron toggle
* External links (the Whatnot show URL) open in an in-app window positioned on the same display as
  the app, since Electron cannot control the OS default browser's window placement

Split allocation, capacity accuracy, and lifecycle polish, implemented 2026-07-05 after a third
manual QA pass:

* Real split allocation flow: staff choose exactly which designs/quantities go to the first show,
  the app computes the remainder, and staff choose another show (or repeat) until the request is
  fully allocated or they cancel; a danger override can still force the full request onto one show
* Removing a Print Request from a show deletes every allocation for that request on that show in one
  operation and recomputes the show's `allocatedQuantity` from the remaining allocations, instead of
  incrementally subtracting — this also clears an over-capacity state caused by the removed request
* Removing a request from a show, and removing individual allocations, is blocked once the show's
  `productionStatus` is `printing`, `fully_printed`, `completed`, or `archived` (admin correction
  required beyond that point)
* A Print Request transitions `draft` → `active` on its first show allocation (so queued requests
  never misleadingly show `DRAFT`), and to `completed` once every unit has been allocated and printed
* Print Requests page has `Working` / `Queued` / `Printed` tabs, derived from show allocation totals
  (no new persisted queue-status field); Show Queue page has `Upcoming` / `Past` tabs derived from
  `scheduledStartAt` vs. now (display grouping only, never changes `productionStatus`)
* A queued request's items and detail become read-only until removed from its show(s)
* Show date/time displays (cards, detail, Add to Show) never show seconds; the parsed-URL field is
  labeled `Show ID`; the Show Queue settings cog sits left of `Add Show`; `Add to Show` spans the full
  action-row width; the Add to Show summary reads "Request has N designs with a total qty of M prints"

Add to Show wording, tab/detail selection, and status polish, implemented 2026-07-05 after a fourth
manual QA pass:

* The Add to Show modal only uses "remaining"/"still need a show" wording once staff have actually
  committed at least one show leg in the current session; a request that fully fits its first selected
  show shows only the plain summary and commits via the normal footer `Add to show` button
* The Print Requests detail panel stays in sync with the active `Working`/`Queued`/`Printed` tab: a
  request that moves to a different tab (e.g. just queued) no longer keeps showing in a tab it no
  longer belongs to; switching tabs, or a request moving tabs, resolves the selection to that tab's
  first request or clears to an empty state
* New `editing` `PrintRequestStatus` value: a request that was queued and then fully removed from
  every show now displays `Editing` (not a misleading `Active`), is fully editable again, and appears
  in `Working`; re-queuing it transitions it to `active` (shown with the derived `Queued` badge), never
  back to `draft`. Queue/tab grouping is still fully derived from `showAllocations` — no new
  `printQueueStatus` field was added

Visual split picker and modal layout polish, implemented 2026-07-05 after a fifth manual QA pass:

* The split-quantity picker (opened via "Choose designs for this show") is now a dedicated
  `SplitDesignPickerModal` showing each remaining design as a card with a full, uncropped thumbnail
  (contained fit, not cropped), title, requested/remaining quantity, and a quantity input
* A live totals strip shows "Selected for this show," "Show capacity," "Remaining after this show,"
  and "Request total," updating on every keystroke; per-design quantity is clamped to that design's
  remaining amount, and exceeding the show's overall capacity shows a warning and disables confirm
* The Add to Show modal and the split picker both widen to `modal-panel-lg` (42rem, already defined
  for Design Library — no new width tier or dependency) so several show options, capacity info, and
  the split flow fit comfortably without excessive scrolling
* Show options in the date-grouped picker render as compact horizontal list rows (date/time, capacity,
  status badge) instead of tall square cards, with an obvious selected state
* The split-needed warning simplified to "Only N of M prints can be added to this show. The remainder
  will need to be added to another show. Choose the prints to be added to this show." — no longer
  repeats the override explanation already given by the override checkbox
* Canceling the visual picker never commits anything; its selections are local component state until
  staff click its confirm button, and the full-fit/multi-show split/override flows are unchanged

Split picker wording and styling polish, implemented 2026-07-05 after a sixth manual QA pass:

* Split picker totals strip relabeled and reduced to three values: "Selected for this show,"
  "Available on this show" (live: show capacity minus the current selection, not the pre-picker
  capacity), and "Remaining for another show" — "Request total" was dropped as redundant with the
  plain-language summary shown one step earlier
* Design cards no longer say "Requested 25, 25 remaining"; they show "{quantity} requested,"
  "{alreadyAssigned} already assigned" (only when non-zero), and "{remaining} available to place"
* The picker's quantity inputs reuse the app's existing `.print-requests-number-input` styling (no
  native spinner arrows, dark-theme box/border/focus state matching the Print Request item card's
  quantity stepper) instead of unstyled browser number inputs
* Confirmed (no code change needed): the `OPEN`/etc. production-status pill color comes only from
  `show.productionStatus` via `getShowProductionStatusBadgeVariant()`; over-capacity coloring is a
  separate `.is-over-capacity` modifier driven by a different, capacity-only boolean — the two were
  already architecturally independent

Split picker blank-input correction, implemented 2026-07-05 after a seventh manual QA pass:

* The split picker's `Add to this show` quantity inputs now start blank (placeholder `0`) instead of
  being pre-filled up to the show's remaining capacity, so staff choose every quantity themselves
  rather than the app appearing to have already decided the split
* Blank inputs are treated as `0` for all totals/validation and cannot create allocations; the totals
  strip and capacity/remaining figures correctly start at their true pre-selection values (`0`
  selected, full show capacity available, full unallocated request quantity remaining)
* The assign button remains disabled until at least one quantity greater than `0` is entered; all
  existing per-design and show-capacity quantity validation is unchanged

Staged allocation label correction, implemented 2026-07-05 after an eighth manual QA pass:

* Staged split allocation summaries in the Add to Show modal (e.g. "8:00 PM: 25 prints") now show the
  show's date as well as its time (e.g. "Jul 5, 2026, 8:00 PM: 25 prints"), reusing the existing
  `formatShowDateTimeLabel()` already used for Show Queue/Show Detail displays instead of the
  time-only formatter — no seconds are shown, matching the existing formatter's behavior

Split warning copy and decision-area layout polish, implemented 2026-07-05 after a ninth manual QA pass:

* The split-needed warning now explains both available paths: "Only N of M prints can be added to
  this show. You can choose which prints to add here and place the rest on another show, or select a
  different show for the full request." — staff are no longer left thinking a split is the only option
* The warning, "Choose designs for this show" button, and staff override checkbox now sit inside one
  bordered callout (matching the split picker's totals-strip card treatment) instead of three loosely
  stacked elements; the action button spans the callout's full width, and the override row gets a
  top border/padding to visually separate it from the button above

Split picker design card copy correction, implemented 2026-07-05 after a tenth manual QA pass:

* Design cards in the split picker no longer show `{remaining} available to place`, which staff
  misread as show-capacity-relative rather than request-relative; cards now show only
  `{quantity} requested` plus `{alreadyAssigned} already assigned` once a prior split leg has touched
  that item — the totals strip above the card list already covers capacity and remaining-for-another-
  show information

`Add to Show` visibility correction, implemented 2026-07-05 after an eleventh manual QA pass:

* The Print Requests page's `Add to Show` action row is now hidden entirely (not shown disabled) while
  the selected request is queue-locked (`totalAllocatedQuantity > 0`) — most visibly on the `Queued`
  tab, where every request is locked by definition and the button previously served no purpose; the
  button still reappears once a request is fully removed from its show(s) and becomes `editing`

Capacity progress and status correction, implemented 2026-07-05 after a twelfth manual QA pass:

* Show Detail's Capacity card and every Add to Show / split-picker show option card now render a
  green (under 70% used) / yellow (70–89%) / red (90%+ or over capacity) progress bar via new
  `shared/utils/showCapacityDisplay.ts`, plus clear "N of M used" / "N spots left" text replacing the
  old "N remaining of M" / "N / M left" wording
* The status pill is now derived (`getDerivedShowStatusDisplay()`): production lifecycle states
  (`PRINTING`, `FULLY PRINTED`, `COMPLETED`, `ARCHIVED`, `CANCELED`) always take priority; otherwise
  `FULL`/`OVER MAX`/`OPEN` is computed live from `allocatedQuantity` vs. `maxTotalQuantity` — a show
  is never persisted as `full`, so every existing show displays correctly after a refresh with no
  migration, backfill, or delete/re-add
* Full and over-capacity shows get a whole-card warning/danger-tinted background and border (sidebar
  show card, Show Detail capacity card, and Add to Show option card), not just a red progress bar, so
  staff don't have to read numbers carefully to notice
* No Firestore rules or index changes were needed — this is a pure UI-derived display feature

Full-show decision-path correction, implemented 2026-07-05 after a thirteenth manual QA pass:

* When the selected show has zero remaining capacity (already full or over capacity), Add to Show no
  longer shows the split warning or a "Choose designs for this show" button — there is nothing to
  split into, so offering a picker was misleading; staff now see plain copy explaining the show is
  full and that they can either select a different show or use the staff override checkbox to force
  the whole remainder onto it anyway
* A show that still has *some* room continues to use the normal split-decision path (warning + choose
  designs + override) unchanged

Final polish pass, implemented 2026-07-05, signed off with the phase:

* The queue-state badge shown as "Not queued" is renamed to "Working" to match the tab name
* Fixed the Add to Show button and the detail-panel queue-state pill both flashing/disappearing when
  switching tabs or clicking between cards, by deriving both from the already-loaded, stable
  allocation-totals map instead of a per-selection value that briefly reset on every selection change
* Allocating/removing from a show now also reloads the print request itself and the list, so the
  detail panel and sidebar badge no longer show a stale status object (e.g. `editing` instead of the
  correct `active`) after a re-add
* Internal request card subtitles on the Print Requests page show notes (or "No notes") instead of a
  redundant "Internal" word already covered by a pill
* The Queued tab's detail panel shows a compact pill per show the request is queued to (quantity, show
  date/time, external-link icon, full show name on hover), linking to that show in `/show-queue`, plus
  a two-step-confirm "Remove from show queue" action (wording adapts when the request spans multiple
  shows) that removes every allocation and returns the request to the Working tab

**Signed off PASS on 2026-07-05** — see `docs/workflow/reviews/2026-07-05-print-runs-foundation-signoff.md`.

Still planned:

* Mark items printed / done via a dedicated production UI (service method exists; UI is minimal)

**Built (Phase 7):** Staff-assisted Whatnot import (Import Shows Electron flow + URL/card upsert into `upcomingShows`). That is the operational Whatnot sync staff use today.

**Not planned (user 2026-07-07; reconfirmed 2026-07-18):** Automated live/hourly **scheduled** Whatnot sync for Studio - Electron is not
always-on. Do not treat "live scheduled sync" as an open MVP gap. Revisit only if a future hosted backend needs
show-list sync for Portal.

**Post-MVP backlog (not blocking Phase 8):** Gang Sheet Builder manual canvas / standalone route —
nice-to-have after Portal; auto-nested export already covers production file needs.

**Signed off 2026-07-07** — production-file export (zip + gang sheet PNG):
`docs/workflow/reviews/2026-07-07-show-queue-export-and-production-files-signoff.md`

---

## Deliverables

### Show Queue (implemented 2026-07-05)

* Manual create/update of local show records, matched by `source + whatnotShowId`, never by date/time
* Show metadata: title, Whatnot URL/ID, scheduled start, schedule status, sync status/error, capacity,
  allocated quantity, production status, notes
* Missing/canceled shows are marked, never auto-deleted
* Capacity tracked as `maxTotalQuantity` vs. denormalized `allocatedQuantity`, with a staff danger
  override to exceed the max
* Print Requests attach via allocation records, supporting split-across-shows when needed

Still planned:

* Mark items printed / done via a dedicated production UI (service method exists; UI is minimal)

**Post-MVP backlog:** Gang Sheet Builder manual canvas (auto-nested export covers production needs).

**Signed off 2026-07-07** — zip export, multiply-by-qty export, and auto-nested gang sheet PNG export.
See `docs/workflow/reviews/2026-07-07-show-queue-export-and-production-files-signoff.md`.

**Not in scope:** Shipping, packing, parcel tracking.

---

## Exit Criteria

Show preparation and production file export occur within Fresh Prints. Production status lives on
show allocations, not designs. Phase 7 Studio MVP met 2026-07-07 (foundation, assisted Whatnot import,
production-file export). **Phase 8 Portal MVP complete in dev** (2026-07-08 closeout). **Phase 9A/9C complete in `fresh-prints-dev`**; remaining Phase 9 slices (AI Create My Design, design fee) are deferred.

---

# Phase 8

## Fresh Prints Portal

Status:

```txt
Complete (MVP — dev environment)
```

Signed off: `docs/workflow/reviews/2026-07-08-phase-8-portal-closeout-signoff.md`

Production App Hosting deploy to a live customer URL is a **separate** human checkpoint — not required for Phase 8 documentation closeout.

### Phase 8 fast-follow

**Customer-Provided Request Artwork** — **complete** on `fresh-prints-dev` (2026-07-12 parent signoff). Portal customers upload transparent PNG/WebP for their one working print request; Studio Customer Uploads intake may promote to AI Review. Separate from catalog until staff action. **Not** Phase 9 Custom Request Q&A (`customRequests`). Plan: `docs/workflow/plans/2026-07-11-portal-customer-artwork-upload-plan.md` (ADR-FP-073). Parent signoff: `docs/workflow/reviews/2026-07-12-portal-customer-artwork-upload-parent-signoff.md`.

**Portal Persistent Current Request** — **complete** (2026-07-13 signoff). Cart-style Current Request (lazy virtual empty), header basket + Upload Designs, drawer, catalog direct-add, `/requests/artwork`, Review Request (ADR-FP-076). Signoff: `docs/workflow/reviews/2026-07-12-portal-persistent-current-request-signoff.md`.

**Portal cart/detail UX polish batch** — **complete** (2026-07-19 signoff, PASS). Newest-first detail + cart; per-size cart lines; Clear + quota meta bar; mobile drawer scrollbar chrome hidden; duplicate preparing feedback + editable size/qty while pending. Signoff: `docs/workflow/reviews/2026-07-19-duplicate-preparing-feedback-signoff.md`.

**Catalog Donate Designs** — **complete** (2026-07-13 signoff). Portal `/donate` + Studio **Donated Designs** reuse the same upload pipeline with `purpose: catalog_donation` (ADR-FP-078). Does not attach to Current Request; listing consent required. Signoff: `docs/workflow/reviews/2026-07-13-portal-donate-designs-signoff.md`.

**Print request Working triage / clear** — **complete** (2026-07-13 signoff). Studio Working Active/Stale/Empty triage + search; Portal Clear request; empty stale archive callable (ADR-FP-079). Signoff: `docs/workflow/reviews/2026-07-13-print-request-working-triage-search-signoff.md`.

**Image quality sizing and halftone safeguards** — **complete** (2026-07-13 signoff, PASS WITH NOTES). ADR-FP-080: pixel-based sizing (`image-quality-v2`, 12″ one-pass upscale ≤6×, 10″ request default, 15″×16.5″ envelopes); human-only halftone (detector removed); extended-upscale staff visibility above 2×. Signoff: `docs/workflow/reviews/2026-07-13-image-quality-sizing-and-halftone-safeguards-signoff.md`.

**Portal Current Request empty-state + Your Stash polish** — **complete** (2026-07-13 signoff). Lazy virtual Current Request copy/CTAs; Your Stash drawer empty layout; Clear only in drawer; Close = X; catalog pixel seed fix for false attention. Signoff: `docs/workflow/reviews/2026-07-13-portal-current-request-empty-state-drawer-polish-signoff.md`.

- Sub-phases A–G + remediations r2–r7 — **complete** (owner PASS on r7)
- ADRs: FP-073 (uploads), FP-074 (library permission), FP-075 (200 DPI save floor), FP-076 (persistent Current Request), FP-078 (donate), FP-079 (working triage), FP-080 (image quality / human-only halftone)

**UX polish (cursor / categories / upload modal)** — **complete** (2026-07-13 signoff). Portal zoom-in lightbox cursor; wider category filter menus (Studio + Portal); artwork-quality modal width + 24h snooze. Signoff: `docs/workflow/reviews/2026-07-13-portal-studio-ux-polish-cursor-categories-upload-modal-signoff.md`.

**Add-to-show stay on detail + Portal polish batch** — **complete** (2026-07-13 signoff, PASS). Portal/Studio stay on request detail after queue/add; ShowPicker calendar stays mounted; Queued wait copy; optimistic first catalog add; discover `/` + library `/catalog`; sidebar edge-tab + account designs gallery. Signoff: `docs/workflow/reviews/2026-07-13-print-request-add-to-show-selection-bounce-signoff.md`.

**Studio import auto-start AI processing** — **complete** (2026-07-13 signoff, PASS). Auto advance default ON; stay on Imports; background sequential AI enqueue (no concurrent storm). Signoff: `docs/workflow/reviews/2026-07-13-studio-import-auto-start-ai-processing-signoff.md`.

**Portal Halftone filter toggle** — **complete** (2026-07-14 signoff, PASS). Standalone Halftone switch on catalog filter bar (canonical tag); Tags modal hides `halftone`; mobile tag sheet + Portal chrome polish in same PASS. Signoff: `docs/workflow/reviews/2026-07-14-portal-catalog-halftone-filter-toggle-signoff.md`.

**Portal Google auth (customers only)** — **complete** (2026-07-14 signoff, PASS). Email/password or Google on Portal; first Google login → `/complete-profile` username; Studio email-only; ADR-FP-081. Signoff: `docs/workflow/reviews/2026-07-14-portal-google-auth-customer-login-register-signoff.md`.

**Portal auth logos + condensed login/register** — **complete** (2026-07-14 signoff, PASS). Studio login toggle clearance; Portal logos; Google-first + email expand. Signoff: `docs/workflow/reviews/2026-07-14-portal-auth-logo-studio-login-overlap-signoff.md`.

**Portal auth busy overlay (login/register)** — **complete** (2026-07-14 signoff, PASS). Full-viewport signing-in / creating-account overlay while Google or email auth is busy. Signoff: `docs/workflow/reviews/2026-07-14-portal-auth-busy-overlay-signoff.md`.

**Portal catalog pagination** — **complete** (2026-07-14 signoff, PASS). Fast first page (40) + background hydrate for full search/filter; exact counts; Load more; bounded Discover home; index-build fallback. Signoff: `docs/workflow/reviews/2026-07-14-portal-catalog-pagination-signoff.md`.

**Portal design favorites** — **complete** (2026-07-14 signoff, PASS). Customer `favorites` subcollection; heart on cards/details; **My Favorites** nav + `/favorites`. Signoff: `docs/workflow/reviews/2026-07-14-portal-design-likes-favorites-signoff.md`. Amended by Most Liked / ADR-FP-083 (`favoriteCount` for ranking).

**Symmetric apps monorepo** — **complete** (2026-07-08). Already shipped; do not list as an open next task.

**Portal catalog image load caching** — **complete** (2026-07-14 signoff, PASS). Versioned download-URL cache + prune; favorites archived auto-prune banner. Signoff: `docs/workflow/reviews/2026-07-14-portal-catalog-image-load-caching-signoff.md`.

**Portal home Most Liked carousel** — **complete** (2026-07-14 signoff, PASS). Discover **Most Liked** via `favoriteCount` (Functions sync); Popular stays `requestCount`. ADR-FP-083. Signoff: `docs/workflow/reviews/2026-07-14-portal-home-most-liked-carousel-signoff.md`.

**Helper permission restrictions** — **complete** (2026-07-14 signoff, PASS). Helpers cannot Import Shows, open Dev Tools, or restore designs; keep archive + show manage. Dev Tools owner-only. ADR-FP-085. Signoff: `docs/workflow/reviews/2026-07-14-helper-permission-restrictions-signoff.md`.

**Owner Studio design asset purge** — **complete** (2026-07-14 signoff, PASS). Archive-first; owner single/bulk Delete images (keep thumbnail); purged hidden from Archived browse. ADR-FP-084. Signoff: `docs/workflow/reviews/2026-07-14-owner-studio-design-asset-purge-signoff.md`.

**Reject auto-archive + request-upload full-size cleanup** — **complete** (2026-07-14 signoff, PASS). Callables + Studio Retention maintenance UI. Donation exclusion's former immediate full-size purge was superseded 2026-08-01: exclusion now preserves upload assets and remains reversible; permanent cleanup uses the separately guarded Delete Upload flow. ADR-FP-086 amendment. Signoff: `docs/workflow/reviews/2026-07-14-reject-auto-archive-customer-upload-cleanup-signoff.md`.

**ADR-FP-086 promote purge + Portal account artwork** — **complete** (2026-07-14). Promote cool-off purge shipped; account UX revised: single gallery + Reusable modal tab; Favorites in Quick links; past-request Add / no longer in catalog. Signoff: `docs/workflow/reviews/2026-07-14-adr086-promote-purge-portal-account-artwork-signoff.md`. UX revision plan: `docs/workflow/plans/2026-07-14-portal-account-artwork-ux-revision-plan.md`.

**Studio/Portal perf + show-queue gates** — **complete** (2026-07-14 signoff, PASS). Promote AI returns without awaiting pipeline; Portal prefetch removed (on-demand URL memo); calendar query + session cache; coalesced inbox alert; hard block full/done/past adds; inbox Done-by + rules; Stash clears after queue-to-show. Signoff: `docs/workflow/reviews/2026-07-14-studio-portal-perf-queue-gates-signoff.md`.

**Portal halftone checkbox optimistic UI** — **complete** (2026-07-14 signoff, PASS). Instant toggle; background save. Signoff: `docs/workflow/reviews/2026-07-14-portal-halftone-checkbox-optimistic-signoff.md`.

**Suggested new tags policy settings** — **complete** (2026-07-14 signoff, PASS). Settings control `suggestedNewTagsPolicy` (Balanced default); Suggested-tag writing rename. Signoff: `docs/workflow/reviews/2026-07-14-suggested-new-tags-policy-settings-signoff.md`.

**Suggested-tag writing quality** — **complete** (2026-07-14 signoff, PASS). Author prompt v2 (richer aliases/preferredWhen); strip colliding catalog terms; AI Processing settings gear owner/admin only. Signoff: `docs/workflow/reviews/2026-07-14-suggested-tag-author-quality-signoff.md`.

**Import AI process-as-imported** — **complete** (2026-07-14 signoff, PASS). Bulk import enqueues each ready design for sequential AI while upload continues. Signoff: `docs/workflow/reviews/2026-07-14-import-ai-process-as-imported-signoff.md`.

**Next fast-follow:** Remaining Phase 9 deferred slices, or production Portal deploy - pick explicitly. Account linking = Firebase/Google console (not app work). **Queued (ADR-FP-086):** optional Cloud Scheduler for retention callables.

Goal:

Registered customers browse the approved catalog and manage print requests on **Fresh Prints Portal** — a mobile-first responsive web application (phones, tablets, desktop browsers).

---

## Objectives

Build:

* Customer registration and login (`role: customer` only)
* Catalog browse, search, filter
* Customer-created print requests
* Print request progress tracking

---

## Deliverables

### Customer Portal

Support:

* Browse approved designs
* **Discover landing + Design Library** (signed off 2026-07-11) — `/catalog` curated rails; `/catalog/library` search/filter; ADR-FP-072
* Create print requests
* Track request status
* **Show selection:** signed off 2026-07-08 — `@fresh-prints/show-picker` in Portal; `listPortalAllocatableShows` + `queuePortalPrintRequestToShow` callables (see `packages/show-picker/README.md`)

**Security:** Customer accounts use Fresh Prints Portal only. They do not access Fresh Prints Studio.

---

## Exit Criteria

Customers self-serve catalog browse, print request creation, progress tracking, and adding requests to a show's print run on the web portal.

**Met in dev** (2026-07-08) — see `docs/workflow/reviews/2026-07-08-portal-customer-show-selection-signoff.md` and Phase 8 closeout signoff.

---

# Phase 9

## Custom Designs — Etsy Recommendations First (Phase 9A)

Status:

```txt
9A + 9C complete on fresh-prints-dev; AI Create My Design + design fee still deferred (9A Open API + link-first ADR-FP-087l; scrape removed ADR-FP-087j)
```

Goal:

Phase 9 Custom Designs: Etsy recommendations (9A) and Assisted Creation / Custom Requests (9C) are the active product surface in `fresh-prints-dev` (owner PASS). Three-card Portal route: Help Me Find a Design + Assisted Creation live; Create My Design with AI still coming-soon.

### Phase 9A deliverables

* Custom Designs nav + route selection cards
* Short Etsy questionnaire → hybrid subject text + suggest dictionary → website search queries + Open API keywords
* **Link-first results:** Primary + Broader search link cards above Open API listing grid (ADR-FP-087l)
* Admin-managed Subject/Tone suggestion overlays (ADR-FP-087k)
* Studio **Custom Designs**: **Etsy** tab (saved searches) + **Suggestions** tab (pending queue + live lists) — owner **PASS** 2026-07-16
* Studio **View / Fetch API results** (`lastApiSearch` + `staffSearchEtsyRecommendationApiResults`) — owner **PASS** 2026-07-20 on `fresh-prints-dev`. Signoff: `docs/workflow/reviews/2026-07-20-studio-etsy-api-results-view-signoff.md`
* Minimal `etsyRecommendationRequests` lifecycle (submit / Done / Cancel)
* Signoff: `docs/workflow/reviews/2026-07-15-phase-9a-etsy-website-first-api-rip-signoff.md`; Studio closeout `docs/workflow/reviews/2026-07-16-studio-custom-designs-etsy-signoff.md`

### Deferred to later Phase 9 slices

* Create My Design with AI
* ~~Fresh Prints Assisted Creation~~ → **Phase 9C complete on `fresh-prints-dev`** (owner manual QA `PASS`, 2026-07-16; ADR-FP-088). Signoff: `docs/workflow/reviews/2026-07-16-phase-9c-assisted-creation-signoff.md`
* ~~Studio Message history (unread dropdown + acked history modal)~~ → owner manual QA `PASS` 2026-07-17. Signoff: `docs/workflow/reviews/2026-07-17-studio-message-history-signoff.md`
* ~~Portal duplicate → resize permissions (optimistic id race + item-only update)~~ → owner manual QA `PASS` 2026-07-17. Signoff: `docs/workflow/reviews/2026-07-17-portal-duplicate-resize-permissions-signoff.md` (optional `firestore.rules` harden deploy still pending `APPROVE DEV DEPLOY`)
* ~~Portal notification history modal (unread Alerts + read history; absorbed click-vanish/badge)~~ → owner `PASS` 2026-07-17. Signoff: `docs/workflow/reviews/2026-07-17-portal-notification-history-modal-signoff.md`
* ~~Assisted Messages Ctrl+Enter send (Portal + Studio)~~ → owner `PASS` 2026-07-17. Signoff: `docs/workflow/reviews/2026-07-17-assisted-messages-ctrl-enter-send-signoff.md`
* ~~Studio Messages deep-link scroll + mark-read-on-reply~~ → owner `PASS` 2026-07-17. Signoff: `docs/workflow/reviews/2026-07-17-studio-messages-deeplink-scroll-read-on-reply-signoff.md`
* ~~Portal notifications batch mark-read (+ Alerts chrome; Messages bubble flip/moderate width)~~ → owner `PASS` 2026-07-17. Signoff: `docs/workflow/reviews/2026-07-17-portal-notifications-batch-mark-read-signoff.md`
* ~~Portal notifications + Web Push~~ → owner `PASS` 2026-07-17 (A5 local smoke + B3 background OS toast). Signoff: `docs/workflow/reviews/2026-07-17-portal-notifications-web-push-signoff.md` (production push release still deferred)
* ~~Assisted approved proof download + Portal proof UX~~ → owner **PASS** 2026-07-17 (callable `customerGetAssistedCreationApprovedProofFile`; Overview 14-day; Notes dedupe; Approved labels). Signoff: `docs/workflow/reviews/2026-07-17-assisted-approved-proof-download-signoff.md`
* ~~Assisted customer cancel reason (Portal required reason + Studio Overview)~~ → owner **PASS** / signed off 2026-07-17. Signoff: `docs/workflow/reviews/2026-07-17-assisted-customer-cancel-reason-signoff.md`
* ~~Assisted terminal messaging closed (Portal + Studio composers)~~ → owner **PASS** / signed off 2026-07-17. Signoff: `docs/workflow/reviews/2026-07-17-assisted-terminal-messaging-closed-signoff.md`
* ~~Brevo transactional email provider (HTTP API + `BREVO_API_KEY`)~~ → owner **BREVO PASS** 2026-07-17 (Sent / Delivered / First opening). Signoff: `docs/workflow/reviews/2026-07-17-brevo-email-provider-signoff.md` (UX A/B absorbed/optional; production email release deferred)
* ~~Skeleton alone != Halloween AI tag~~ -> prompt + post-filter (ADR-FP-091); optional live smoke closed by owner **PASS all** 2026-07-17. Signoff: `docs/workflow/reviews/2026-07-17-skeleton-not-halloween-prompt-signoff.md` (ops: redeploy AI Functions if not yet on `fresh-prints-dev`)
* ~~Portal Past Requests terminal-only filter~~ → fixed 2026-07-16 (open statuses excluded; link hidden when zero terminals). Signoff: `docs/workflow/reviews/2026-07-16-terminal-only-assisted-past-requests-signoff.md`
* ~~Provider-agnostic proof-ready email notifications (Resend + Brevo)~~ → both adapters on `fresh-prints-dev`; owner may select Brevo in Settings (defaults remain Resend until switched)
* Assisted questionnaire request-type branching — deferred (not in current UX polish phase)
* Staff design-fee / Stripe for custom work
* ~~In-app listing scrape from Etsy website search~~ — **removed** (ADR-FP-087j; owner rejected scrape quality)

**Not in scope:** Checkout for normal print requests; product payment; shipping; production deploy of 9A until separately authorized.

---

## Exit Criteria (Phase 9 overall)

Custom design help is distinct from print requests. **Met in `fresh-prints-dev`:** Etsy recommendations (9A) and Assisted Creation / Custom Requests (9C), plus related proof/email/messaging polish. **Still open for full Phase 9:** Create My Design with AI; staff design-fee / Stripe; assisted questionnaire request-type branching.

---

# Phase 10

## Analytics And Popularity Tracking

Status:

```txt
Planned
```

Goal:

Track design popularity without changing catalog lifecycle.

---

## Objectives

Support:

* `requestCount`, `showAddCount`, `printCount` counters on designs
* `lastRequestedAt`, `lastAddedToShowAt`, `lastPrintedAt` timestamps
* Trend and popularity views

---

## Exit Criteria

Popularity metrics increment from print request and print run events. Counters are analytics only — designs never become queued or printed.

---

# Backlog

Potential future features:

* Saved Searches
* Collections
* Design Versioning
* Team Activity Feed
* Duplicate detection (AI)
* Automated print run suggestions
* Cloud Functions
* Web push notifications (Fresh Prints Portal PWA — optional)
* Public Design Sharing
* Date range filters (Phase 4B)
* Multi-select tag filter modal (Phase 4B)

Backlog items require approval before development.

---

# Out Of Scope

Do not build these without explicit approval:

* Ecommerce storefront / product checkout for catalog prints
* Shipping or parcel fulfillment
* Order payment for normal print requests
* Marketplace
* General payment processing (except optional custom design fee in Phase 9)
* Customer billing for catalog items
* Social Features
* Messaging System
* Custom Backend APIs
* Multi-Tenant Support
* Customer role access to Fresh Prints Studio
* Standalone native mobile applications (iOS, Android, React Native, Flutter, Xamarin, MAUI)

---

# Decision Framework

Before implementing a feature:

Ask:

1. Does it belong in the current phase?
2. Does it align with the roadmap?
3. Does it depend on unfinished work?
4. Does it increase technical debt?
5. Does it support the long-term vision?

If not, postpone it.

---

# Success Criteria

Fresh Prints succeeds when:

* The approved design catalog is effortless to search and maintain.
* Imported designs flow through AI Review before catalog visibility.
* Print requests and print runs replace spreadsheets and messages for show prep.
* Remote helpers can import, review, and build print plans without local production-folder access.
* Exporting to gangsheet is faster.
* AI reduces repetitive catalog enrichment.
* Customer portal (Fresh Prints Portal) separates cleanly from Fresh Prints Studio.
* The platform remains maintainable for years.

Every feature should move the project toward these goals.


