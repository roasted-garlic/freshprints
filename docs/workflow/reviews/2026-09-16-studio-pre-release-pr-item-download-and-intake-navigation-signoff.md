# Signoff: Studio Pre-Release Print Request Download and Intake Navigation

| Field | Value |
|---|---|
| Date | 2026-09-16 |
| Goal | `studio-pre-release-pr-item-download-and-intake-navigation` |
| Plan | `docs/workflow/plans/2026-09-15-studio-pre-release-pr-item-download-and-intake-navigation-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-09-15-studio-pre-release-pr-item-download-and-intake-navigation-formal-review.md` |
| Test Report | `docs/workflow/reviews/2026-09-15-studio-pre-release-pr-item-download-and-intake-navigation-test-report.md` |
| Owner DEV QA | **PASS — 2026-09-16; no notes or failures supplied** |
| Final disposition | **approved_with_notes** |
| Production status | No production release, deployment, migration, data mutation, IAM, secret, or external-service action occurred. |

## Scope completed

- Studio Print Request cards support independent per-item PNG download using the latest saved
  dimensions, the existing source-aware production resolver, and a narrow native save operation.
- Download validation and UI states preserve the reviewed dirty/saving/failed-size, enhanced
  fail-closed, quantity, and private-source boundaries. Success notices are dismissible and timed.
- Uploaded Designs and Donated Designs move the active loaded list selection with ArrowUp/ArrowDown,
  without wraparound or auto-load-more, while editable and lightbox/modal guards remain intact.
- Durable architecture, backend, workflow, and testing documentation was updated, along with the
  cumulative promotion manifest and project handoff package.

## Evidence

- Focused tests: **70/70 PASS**.
- Export/gang-sheet/copy regressions: **85/85 PASS**.
- Studio TypeScript: **PASS**.
- Targeted changed-file ESLint: **PASS** with `--max-warnings 0`.
- `npm run build:studio`: **PASS**; existing non-fatal Vite warnings and Windows
  electron-builder rename retries were documented in the Test Report.
- `git diff --check`: **PASS**; only existing LF/CRLF normalization warnings were reported.
- Manual Owner DEV QA: **PASS**, covering native PNG dimensions/save behavior, saved-size changes,
  source/quantity handling, dismissible notice behavior, Uploaded/Donated list selection, modal
  guards, boundaries, and no unrelated/Portal behavior change.

## Promotion boundary

The cumulative manifest records **Studio release REQUIRED** for later separately authorized
production promotion. Portal App Hosting, Functions, Firestore Rules, Storage Rules, indexes,
migrations/backfills, and production data mutation are **NONE from this goal**. This Signoff does
not authorize any production action.

## Final approval

The reviewed Plan → Review → Implement → Test → Owner DEV QA → Signoff chain is complete. The goal
is **DONE** in the current `development` checkout, and the reviewed commit/push was completed on
the existing `development` branch. FreshForge is **IDLE** pending owner direction.
