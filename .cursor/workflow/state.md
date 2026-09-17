## FreshForge State

| Field | Value |
|---|---|
| Status | **IN_PROGRESS — Portal show-rail hotfix production promotion** |
| DONE | **yes — Signoff approved; production promotion in progress** |
| Signoff Status | **approved** |
| Current Mode | managed-phase |
| Parent program | Pre-production reliability / safety |
| Current Goal | `portal-show-rails-design-description-parity` |
| Current Phase | **SIGNOFF COMPLETE — production promotion in progress** |
| Plan Status | **complete — exact rendering/data path and bounded files frozen** |
| Review Status | **approved** |
| Implementation Status | **complete — bounded Portal click-time hydration and regression contracts** |
| Test Status | **passed_with_notes — focused Portal contracts/typecheck/lint/build/diff pass; unrelated historical baseline failures recorded** |
| Human Checkpoint Required | **no — Owner DEV QA PASS received; owner pre-authorized the protected promotion and Portal App Hosting rollout** |
| Human Checkpoint Reason | Owner explicitly authorized commit/push, protected PR merge, Portal App Hosting rollout, and machine verification after the exact Owner DEV QA PASS. |
| Blocked | **no** |
| Allowed Actions | Commit/push development; create and merge the protected development→production PR; deploy only Portal App Hosting to fresh-prints-prod; machine-verify the hosted release and unchanged backend/Studio surfaces. |
| Forbidden Actions | Functions/Rules/Storage/index/IAM/Firebase/config/data changes; description regeneration; changing the public show-card contract; Studio release/deploy; Portal backend/config changes; force-push; secret changes; lint-baseline changes. |
| Last Completed Step | Owner DEV QA PASS and Signoff |
| Next Required Step | Commit/push development, protected production PR, Portal App Hosting rollout, and machine verification |
| Decision Log | 2026-09-16 — Started owner-requested goal `portal-show-rails-design-description-parity`. Investigation confirmed both affected homepage rails share the compact `PortalShowCatalogDesignCard` mapper, which omits `description`, while the normal catalog/deep-link path uses `catalogService.getReadyDesignsByIds` and includes the persisted description. Formal Review approved click-time existing-service hydration with no public DTO/backend change. Implementation now hydrates compact show-rail cards by ID before opening the shared modal, preserves empty descriptions, fails closed for unavailable designs, and ignores stale A→B responses. Automated gates passed and Owner DEV QA returned the exact phrase **Owner DEV QA: PASS**. Signoff is approved; authorized production promotion is in progress. Prior Studio v1.0.14 release remains healthy and independent. |
| Artifacts | Portal show-rail description parity Plan, Formal Review, Test Report, and Signoff; prior Studio hotfix/release artifacts |
| Files Created | `docs/workflow/plans/2026-09-16-portal-show-rails-design-description-parity-plan.md`; `docs/workflow/reviews/2026-09-16-portal-show-rails-design-description-parity-review.md`; `apps/portal/features/show-designs/utils/showDesignDetailsHydration.ts`; `apps/portal/features/show-designs/utils/showDesignDetailsHydration.test.ts` |
| Files Modified | `apps/portal/features/catalog/pages/CatalogHomePageContent.tsx`; `apps/portal/features/catalog/pages/CatalogHomePageContent.showRails.test.ts` |
| Tests Run | Hydration/show-rail contracts 17/17; adjacent Portal contracts 24/24; historical portalPrelaunchCensorUx 52/54 with two documented pre-existing failures; Portal typecheck, changed-source ESLint, production build, and git diff check PASS |
| Signoff | **approved** — Owner DEV QA PASS; commit/push and Portal-only production promotion authorized/in progress |
| Manifest | `docs/workflow/reviews/2026-09-pre-production-promotion-manifest.md` — prior cumulative release evidence; this Portal hotfix has no backend delta |
