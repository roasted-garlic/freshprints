## Current Goal
studio-mac-autoupdate-signing-and-searchable-category-picker

## Current Mode
managed-phase

## Phase
production-promotion — commit + development PR; STOP before production mutation

## Plan Status
complete — C-SHARED amendment (parent plan still covers A2)

## Review Status
A/B / C+D / C-SHARED reviews + signoff: approved_with_notes (C-SHARED)

## Implementation Status
partial — B + A1 + C + D + C-SHARED signed off; A2 credential-gated; prod promotion in progress

## Test Status
passed_with_notes — C-SHARED FreshForge Test 2026-08-15

## Signoff Status
approved_with_notes — C-SHARED

## Human Checkpoint Required
yes

## Human Checkpoint Reason
Signed-off dirty tree audited and being committed → feature→development PR. **STOP before** merging development→production and before any fresh-prints-prod Firebase deploy / Studio 1.0.6 publish. Authorization phrase required for production mutation.

## Allowed Actions
Commit signed-off tree; PR feature→development; merge to development if protected workflow allows; open development→production PR (do not merge); docs

## Forbidden Actions
Merge to production; Firebase prod deploy; Studio 1.0.6 dispatch/publish; force-push; App Hosting rollout; reopen C-SHARED/B/D/A1

## Next Required Step
After feature→development merge: open development→production PR; STOP for owner phrase `APPROVE PROD C-SHARED BACKEND PROMOTION: RULES+INDEXES+FUNCTIONS ALLOWLIST`

## DONE
no

## Last Completed Step
Dirty-tree audit complete — all paths classified as release-belonging; no unexplained files

## Dirty-tree classification (2026-08-15)
All dirty paths belong to categories 1–3. None in category 4 (unrelated/generated/local-only).

### 1 — C-SHARED correctives
Studio Internal Sheets / Print Requests / queueTab / Add modal / permissions / Rules / Functions (create/complete/sync/queueTab) / shared staffGangSheet / rules tests / DATA_MODEL / QA checklist updates / CSS helpers / export persist generatedAt / display rename

### 2 — Already-approved A1/B/D / 1.0.6 release-branch UX
AiReviewWorkspace + DesignFormFields Halftone→lightBlack artwork background (pre-QA UI tweak recorded in Decision Log)

### 3 — Workflow/docs for completed work
state.md, ROADMAP, DECISIONS, signoff, test report, production preflight

### 4 — Unrelated
(none)

## Plan
docs/workflow/plans/2026-08-14-studio-mac-autoupdate-signing-and-searchable-category-picker-plan.md

## Signoff (C-SHARED)
docs/workflow/reviews/2026-08-15-studio-1.0.6-workstream-c-shared-signoff.md

## Production promotion preflight
docs/workflow/reviews/2026-08-15-studio-1.0.6-c-shared-production-promotion-preflight.md

## Branch
feature/studio-1.0.6-mac-signing-and-searchable-category

## Target release
Studio 1.0.6 (publish held for A2)

## Decision Log
- 2026-08-15: Dirty-tree audit — all paths release-belonging; commit signed-off C-SHARED tip for promotion
- 2026-08-15: C-SHARED prod promotion preflight STOP; Signoff approved_with_notes; owner QA PASS
