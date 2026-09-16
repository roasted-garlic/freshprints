# Fresh Prints — Current State Snapshot

**Last updated:** 2026-09-15

## CURRENT AUTHORITATIVE PHASE — CLOSED / IDLE — `portal-admin-staff-artwork-upload`

FreshForge is **IDLE**. Managed goal `portal-admin-staff-artwork-upload` is closed with Signoff
**approved_with_notes** after Owner DEV QA **PASS**.

The historical Owner DEV QA FAIL for Staff Artwork bulk Send to AI Review and the rejected
Ready-preserving Design Library lifecycle remain documented in the workflow artifacts. The final
corrective retests passed.

- Plan: `docs/workflow/plans/2026-09-15-portal-admin-staff-artwork-upload-plan.md`
- Formal Review: `docs/workflow/reviews/2026-09-15-portal-admin-staff-artwork-upload-formal-review.md`
- Manifest: `docs/workflow/reviews/2026-09-pre-production-promotion-manifest.md`
- Test report: `docs/workflow/reviews/2026-09-15-portal-admin-staff-artwork-upload-test-report.md`
- Owner QA checklist: `docs/workflow/reviews/2026-09-15-portal-admin-staff-artwork-upload-owner-dev-qa-checklist.md`

Final delivered contract:
- **Workstream A:** Portal Admin Staff Artwork Upload + Admin navigation; prior Portal no-op
  corrective remains complete and tested.
- **Workstream B:** Studio Design Library + Staff Artwork Multiple Select → Send to AI Review,
  using existing per-item boundaries, bounded sequential orchestration, and existing AI settings.
- **Design lifecycle:** `ready + approved` → normal `imported + pending` AI Processing/AI Review →
  normal approval → `ready + approved`; no simultaneous Design Library and AI Processing authority.
  Obsolete `aiReprocessState` query/display/eligibility special cases and `ready_reprocess` mode are
  removed; leftover markers are cleared by the demotion write.
- **Card interaction:** active Multiple Select makes the full eligible Design Library and Staff
  Artwork card toggle selection, suppresses normal details/preview behavior, exposes selected state,
  and restores normal click behavior immediately on exit.

Actual Staff Artwork evidence: bulk and single both call `promoteStaffArtworkToAiReview` with the
same `{ staffArtworkId }` payload. Historic DEV traces prove authenticated HTTP 400 responses but
did not retain request bodies or app-level details, so the exact historic ID is unavailable. The
proven server failure class is `failed-precondition` for active deletion blockers or invalid
Ready/production-path lifecycle. Five current DEV ready records with active references were
inspected read-only and are listed in the Test Report; none was mutated.

Test gate: **passed with notes** — latest Workstream B focused run is **86/86** (55 Studio-side,
31 Functions-side). Studio and Portal typechecks, Functions build, changed TypeScript lint, and
`git diff --check` passed. The exact changed Functions were deployed to `fresh-prints-dev` and are
ACTIVE:

- `promoteStaffArtworkToAiReview` — `promotestaffartworktoaireview-00008-daj`
- `reprocessReadyDesignWithAi` — `reprocessreadydesignwithai-00032-gab`
- `enqueueAiEnrichment` — `enqueueaienrichment-00127-vod`

Safe unauthenticated POST probes returned expected 401s for all three. No authenticated mutation
was attempted. The Portal production build remains noted as Windows `EPERM` on ignored generated
`apps/portal/.next/trace`; no workaround or Portal App Hosting publish was made. Broader
Studio-directory lint retains pre-existing errors in unmodified files; changed-file TypeScript
lint is clean.

Checkout: work on `development`. Corrective implementation, tests, exact DEV deployment, Owner DEV
QA PASS, Signoff, and durable documentation are complete. No production deployment, Portal App
Hosting, Studio release, Rules/Storage Rules deployment, migration, data mutation, or IAM change
occurred. FreshForge is IDLE pending a new goal or separately authorized production promotion.

## Historical snapshot — Pre-release lifecycle / image parity / DEV hardening — SIGNOFF COMPLETE (DEV)

Managed goal: `pre-release-lifecycle-image-parity-and-dev-environment-hardening` is **CLOSED**.

Owner DEV QA **PASS WITH NOTES**: forward Internal Mark Complete → Printed PASS (production
historical Queued-on-completed sheets deferred then addressed in the goal above); Admin View Designs
honesty PASS; DEV banner/noindex PASS. Automated **76/76**. Signoff:
`docs/workflow/reviews/2026-09-15-pre-release-lifecycle-image-parity-and-dev-environment-hardening-signoff.md`.
