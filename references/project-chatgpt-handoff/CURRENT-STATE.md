# Fresh Prints — Current State Snapshot

**Last updated:** 2026-09-16

## CURRENT AUTHORITATIVE PHASE — SIGNOFF COMPLETE / IDLE — `studio-pre-release-pr-item-download-and-intake-navigation`

FreshForge is **IDLE**. The combined Plan and Formal Review were accepted, the approved
implementation is complete, automated Test passed, Owner DEV QA replied **PASS** on 2026-09-16,
and Signoff is complete with disposition **approved_with_notes**. The reviewed commit/push was
completed on the existing `development` branch.

- Plan: `docs/workflow/plans/2026-09-15-studio-pre-release-pr-item-download-and-intake-navigation-plan.md`
- Formal Review: `docs/workflow/reviews/2026-09-15-studio-pre-release-pr-item-download-and-intake-navigation-formal-review.md`
- Test report: `docs/workflow/reviews/2026-09-15-studio-pre-release-pr-item-download-and-intake-navigation-test-report.md`
- Owner QA checklist: `docs/workflow/reviews/2026-09-15-studio-pre-release-pr-item-download-and-intake-navigation-owner-dev-qa-checklist.md`
- Signoff: `docs/workflow/reviews/2026-09-16-studio-pre-release-pr-item-download-and-intake-navigation-signoff.md`
- Manifest: `docs/workflow/reviews/2026-09-pre-production-promotion-manifest.md`

Reviewed contract:
- **Workstream A:** Studio Print Request item Download uses the current saved item dimensions,
  fixed 300-DPI target, existing source-aware production resolver, and one new narrow single-PNG
  Electron save operation. Quantity, ZIP, gang-sheet cache, allocations, and lifecycle writes are
  excluded.
- **Workstream B:** Studio Uploaded Designs and Donated Designs map ArrowUp/ArrowDown to the
  existing Previous/Next callbacks through the current `CustomerUploadIntakeSection` rows. No
  wraparound, auto-load, visible Up/Down buttons, second ordering model, or Portal change.
- **Review conditions:** disable Download for dirty/invalid/saving/failed size drafts; resolve from
  the latest saved item snapshot; preserve enhanced fail-closed and private-source boundaries;
  surface non-fatal warnings and failures; keep vertical navigation opt-in to the intake lightbox.

Test gate: **passed_with_notes**. Focused coverage is **70/70** and export/gang-sheet/copy
regression coverage is **85/85**. Studio typecheck, targeted changed-file lint,
`npm run build:studio`, and `git diff --check` passed. The build had only non-fatal existing
bundler warnings and Windows electron-builder rename retries. Owner DEV QA is **PASS** with no
notes. No production deployment, Studio release, Functions/Rules deployment, schema/index/
migration change, or data mutation occurred. Functions, Rules/Storage Rules, schema/index/
migration, and data mutation remain out of scope.

Checkout remains `development`; the reviewed commit/push is complete. Production IAM/deploy, Portal
App Hosting, Studio release, and production promotion remain separately gated and unauthorized.

## Historical snapshot — Pre-release lifecycle / image parity / DEV hardening — SIGNOFF COMPLETE (DEV)

Managed goal: `pre-release-lifecycle-image-parity-and-dev-environment-hardening` is **CLOSED**.

Owner DEV QA **PASS WITH NOTES**: forward Internal Mark Complete → Printed PASS (production
historical Queued-on-completed sheets deferred then addressed in the goal above); Admin View Designs
honesty PASS; DEV banner/noindex PASS. Automated **76/76**. Signoff:
`docs/workflow/reviews/2026-09-15-pre-release-lifecycle-image-parity-and-dev-environment-hardening-signoff.md`.
