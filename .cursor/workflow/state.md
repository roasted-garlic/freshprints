# Current Goal
portal-how-to-faq - **DONE** (approved_with_notes 2026-07-23). Next queued: `portal-google-analytics` (pointer only; not started).

## Current Mode
managed-phase

## Phase
signoff

## Plan Status
complete

## Review Status
approved_with_changes

## Implementation Status
complete

## Test Status
passed_with_notes (manual PASS 2026-07-23; Studio typecheck pre-existing failure documented)

## Signoff Status
approved_with_notes

## Human Checkpoint Required
no

## Human Checkpoint Reason
(none)

## Allowed Actions
Idle / pointer only: prepare to plan `portal-google-analytics` when owner starts it. Read docs; update handoff if needed. No GA implementation until new goal + plan + review.

## Forbidden Actions
Start `portal-google-analytics` implementation without plan/review; production Firebase deploy; claim Studio typecheck passed; reopen how-to-faq scope without new phase.

## Next Required Step
When ready: start `portal-google-analytics` (Plan → Review → APPROVE IMPLEMENTATION). Do not implement GA until then.

## DONE
yes

## Last Completed Step
2026-07-23 - Owner **PASS** on portal-how-to-faq manual QA; signoff **approved_with_notes**; commit and push authorized. Seeded Studio FAQs on fresh-prints-dev; Coming soon videos; nav Help vs H1 FAQ and How To.

## Plan Path
- docs/workflow/plans/2026-07-22-portal-how-to-faq-plan.md

## Review Path
- docs/workflow/reviews/2026-07-22-portal-how-to-faq-review.md
- docs/workflow/reviews/2026-07-23-portal-faq-how-to-settings-review.md

## Test Report Path
- docs/workflow/reviews/2026-07-23-portal-how-to-faq-test-report.md

## Signoff Path
- docs/workflow/reviews/2026-07-23-portal-how-to-faq-signoff.md

## Prior Goal Signoff
- docs/workflow/reviews/2026-07-22-portal-seo-foundations-signoff.md (**approved_with_notes**)

## Manual Checkpoint Path
- docs/workflow/reviews/2026-07-23-portal-how-to-faq-manual-checkpoint.md (**PASS** owner 2026-07-23)

## Tests Run
- `npx tsx --test` portalHelpSettings + portalVideoEmbedUrl + portalHelpMeta + printRequestWorkingRequestMax → exit 0 (22 pass) [prior]
- `npm run typecheck --workspace @fresh-prints/portal` → exit 0 [prior]
- `DRY_RUN=1 npx tsx functions/scripts/seed-portal-help-faqs.ts` → exit 0 (parse + dash check)
- `npx tsx functions/scripts/seed-portal-help-faqs.ts` → exit 0; wrote `settings/portalHelp` on **fresh-prints-dev** (faqCount=8, videoCount=0)
- Manual QA → owner **PASS** 2026-07-23

## Files Created
- apps/portal/app/(app)/help/page.tsx
- apps/portal/features/help/portalHelpContent.ts
- apps/portal/features/help/components/PortalHelpPageContent.tsx
- apps/portal/features/help/components/PortalHelpFaqList.tsx
- apps/portal/features/help/components/PortalHelpVideoSection.tsx
- apps/portal/features/help/utils/portalVideoEmbedUrl.ts
- apps/portal/features/help/utils/portalVideoEmbedUrl.test.ts
- apps/portal/features/help/utils/portalHelpMeta.ts
- apps/portal/features/help/utils/portalHelpMeta.test.ts
- apps/portal/styles/help.css
- apps/studio/src/renderer/src/features/settings/services/portalHelpSettingsService.ts
- apps/studio/src/renderer/src/features/settings/hooks/usePortalHelpSettings.ts
- apps/studio/src/renderer/src/features/settings/components/PortalHelpSettingsSection.tsx
- packages/shared/src/constants/portal/portalHelpSettings.constants.ts
- packages/shared/src/constants/portal/portalHelpSettings.constants.test.ts
- functions/src/updatePortalHelpSettings.ts
- functions/scripts/seed-portal-help-faqs.ts
- docs/workflow/reviews/2026-07-23-portal-how-to-faq-test-report.md
- docs/workflow/reviews/2026-07-23-portal-how-to-faq-manual-checkpoint.md
- docs/workflow/reviews/2026-07-23-portal-faq-how-to-settings-review.md
- docs/workflow/reviews/2026-07-23-portal-how-to-faq-signoff.md

## Files Modified
- apps/portal/features/auth/utils/portalPublicBrowsePath.ts (+ test)
- apps/portal/features/brand/portalSearchIndexing.ts (+ test)
- apps/portal/app/sitemap.ts
- apps/portal/features/navigation/components/PortalSidebar.tsx
- apps/portal/app/layout.tsx
- apps/portal/app/providers.tsx (hide floating theme picker on `/help`)
- apps/portal/features/auth/components/AuthGate.tsx (comment)
- apps/portal/features/help/hooks/usePortalHelpContent.ts (FAQ fallback; videos empty → Coming soon)
- apps/portal/features/help/portalHelpContent.ts (real FAQ copy; buy-yourself FAQ; no em dashes in Q/A; no video dummies)
- apps/portal/features/help/components/PortalHelpPageContent.tsx
- apps/portal/features/help/components/PortalHelpVideoSection.tsx
- apps/portal/styles/help.css
- apps/studio/src/renderer/src/features/settings/pages/SettingsPage.tsx
- apps/studio/src/renderer/src/features/settings/components/PortalHelpSettingsSection.tsx (hints + collapsible)
- apps/studio/src/renderer/src/features/settings/hooks/usePortalHelpSettings.ts (save returns boolean)
- apps/studio/src/renderer/src/styles/components/settings.css
- packages/shared/src/utils/printRequestWorkingRequestMax.ts (+ Whatnot in limits modal)
- packages/shared/src/utils/printRequestWorkingRequestMax.test.ts
- packages/shared/src/constants/portal/portalHelpSettings.constants.ts (intro)
- firestore.rules
- functions/src/index.ts
- docs/architecture/ARCHITECTURE.md
- docs/architecture/DATA_MODEL.md
- docs/architecture/BACKEND.md
- docs/standards/DEPLOYMENT.md
- docs/project/ROADMAP.md
- docs/project/DECISIONS.md (ADR-FP-117, ADR-FP-118)
- docs/workflow/plans/2026-07-22-portal-how-to-faq-plan.md (addendum)
- docs/workflow/reviews/2026-07-23-portal-how-to-faq-manual-checkpoint.md
- docs/workflow/reviews/2026-07-23-portal-how-to-faq-test-report.md

## Parked Work
(none — owner **PASS** 2026-07-23 on mobile header badge polish + toast-under-banner. Follow-up 2026-07-23: bell badge hides at 0; cart badge remains always visible incl. 0.)

## Queued Goals (owner 2026-07-22)
1. portal-seo-foundations - **DONE** (approved_with_notes)
2. portal-how-to-faq - **DONE** (approved_with_notes 2026-07-23)
3. portal-google-analytics - queued (next)
4. production-release - queued

## Decision Log
- 2026-07-23 - Owner: hide notification bell badge when unread count is 0; cart badge stays always visible (incl. 0).
- 2026-07-23 - Owner **PASS** on header cart/bell corner badges + Request label + toast-under-banner. Bell badge always shows (incl. 0, muted empty) with same orientation as cart (`translate(40%, -30%)` on circular action).
- 2026-07-23 - Owner toast polish: position portal toasts below sticky header stack (header + quota banner) using measured `--portal-sticky-top-offset` (not safe-area top over logo bar). Undo/dismiss unchanged.
- 2026-07-23 - Owner badge/label follow-up: cart badge always visible (incl. 0); corner badges `translate(40%, -30%)` on circular button; header cart label → **Request**.
- 2026-07-23 - Owner follow-up: count chips still crowded logo. Switched cart/notification counts to absolute corner badges (Studio-style bubble); keep right action cluster.
- 2026-07-23 - Owner-directed UI polish (not GA): mobile `/help` header logo overlapping bell. Recommendation: do not move bell left of logo; keep right action cluster and constrain logo via equal side grid tracks. Implemented in PortalAppHeader + shell.css.
- 2026-07-22 - Owner PASS on portal-seo-foundations manual QA; signoff approved_with_notes.
- 2026-07-22 - Started portal-how-to-faq; plan ready; review approved_with_changes; stop for APPROVE IMPLEMENTATION.
- 2026-07-22 - Plan defaults if unanswered: path `/help`, nav label Help, typed TS content module, YouTube+Vimeo embeds, `[TBD]` placeholder copy allowed for layout QA.
- 2026-07-23 - Owner **APPROVE IMPLEMENTATION** for portal-how-to-faq (defaults unchanged).
- 2026-07-23 - Implementation complete; automated unit+typecheck passed; build blocked by concurrent `.next` lock; manual QA checkpoint opened.
- 2026-07-23 - Owner scope expansion: Studio Settings for dynamic FAQ/How To; title **FAQ and How To**; ADR-FP-118 amends ADR-FP-117; review approved_with_changes; implement without separate pause.
- 2026-07-23 - Background agent for Studio UI hit monthly usage limit; parent finished Studio Settings section + docs; unit 17/17 + Portal typecheck passed; manual QA refreshed.
- 2026-07-23 - Owner feedback during manual QA: clearer header/subheader/description hierarchy on `/help` (not GA). Design polish applied in-scope; re-QA required before signoff.
- 2026-07-23 - Owner: How To videos still reads as FAQ continuation; added section divider + spacing before How To. Human checkpoint open for re-QA.
- 2026-07-23 - Owner clarification: Portal **nav link = Help**; page H1 / SEO title remain **FAQ and How To** (path `/help`). ADR-FP-118 amended; sidebar + checkpoint updated. No GA.
- 2026-07-23 - Owner UX overrides: (1) Portal empty FAQ/video lists → bundled dummy content (not blank UI); partial Studio content keeps non-empty list. (2) Studio FAQ/video editors collapsible, collapsed by default + after Save. ADR-FP-118 / ARCHITECTURE / DATA_MODEL soft-amended. Checkpoint left open for re-QA.
- 2026-07-23 - Owner follow-up (implement during open checkpoint): (1) Replace `[TBD]` FAQ defaults with real customer copy; Whatnot only where relevant. (2) Empty videos → Coming soon (never dummy video slots); FAQ empty still → bundled FAQs. (3) Request and Show Limits modal mentions Whatnot shows. (4) Hide floating theme picker on `/help`. Soft-amend ADR-FP-118 / docs; refresh manual checkpoint; leave open for PASS / FAIL / PASS WITH NOTES. Note: if Firestore already has non-empty old `[TBD]` FAQs, clear list + Save or replace copy in Studio (no seed-from-defaults button).
- 2026-07-23 - Owner follow-up #2: (A) Remove em dashes from FAQ Q/A; buy-yourself dedicated FAQ + weaves in print-request/submit/limits. (B) Update bundled `portalHelpContent.ts` and **seed** same list to Firestore `settings/portalHelp` on **fresh-prints-dev** (`faqs`×8, `videos: []`) via `functions/scripts/seed-portal-help-faqs.ts` (Firebase CLI OAuth + Firestore REST). Seed **succeeded**. Soft-amend ADR-FP-118 + DATA_MODEL; refresh manual checkpoint (verify Studio saved items + edit propagates + buy-yourself + no em dashes). No production.
- 2026-07-23 - Owner **PASS** on portal-how-to-faq manual QA ("I think we can PASS commit and push"); signoff **approved_with_notes**; human checkpoint cleared. Next queued: `portal-google-analytics` (not started).

