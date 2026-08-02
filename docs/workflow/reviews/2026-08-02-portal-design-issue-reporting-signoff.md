# Signoff: Portal Design Issue Reporting

Date: 2026-08-02
Feature branch: `feature/portal-design-issue-reporting`
Source SHA at signoff: `c370ced7ad8a3247701d7e06f534155412017664`

## Verdict: PASS

Owner confirmed Portal and Studio owner QA passed against `fresh-prints-dev` per
`docs/workflow/reviews/2026-08-01-portal-design-issue-reporting-owner-qa-checklist.md` (all 24
items PASS, overall verdict PASS). QA was performed locally: Portal via `npm run dev:portal`
(`http://localhost:3100`), Studio via `npm run dev:studio`, both connected to `fresh-prints-dev`.

## Environment state confirmed at signoff

- Local Portal and Studio connect to `fresh-prints-dev`.
- Firestore Rules covering `designIssueReports` (+ intents/open-guards/daily-quota support
  collections) are live on `fresh-prints-dev` (deployed 2026-08-02, diff-audited against
  `origin/production`, Rules emulator suite 60/60 pass before and after).
- Reporting Functions `submitPortalDesignIssueReport` / `resolveDesignIssueReport` are ACTIVE on
  `fresh-prints-dev` (v2, callable, `us-central1`).
- Both `designIssueReports` composite indexes present on `fresh-prints-dev`.
- No development App Hosting backend exists or is required — permanent policy, see "Development
  and Production Portal Hosting Policy" in `docs/standards/DEPLOYMENT.md`.
- No unresolved release-blocking reporting defect is known.

## Final automated release gate (re-run 2026-08-02, this pass)

| Check | Command | Result |
|---|---|---|
| Firestore/Storage Rules emulator | `npm run test:rules` (portable JDK 21, `.local-jdk`) | 60/60 pass, exit 0 |
| Shared contract + submitter tests | `npx tsx --test packages/shared/src/designIssueReports/{designIssueReportContract,formatDesignIssueReportSubmitter}.test.ts` | 6/6 pass |
| Studio Firestore route containment + Functions validation | `npx tsx --test apps/studio/.../firestoreRouteContainment.test.ts functions/src/lib/designIssueReportValidation.test.ts` | 12/12 pass |
| Functions build | `cd functions && npm run build` | exit 0 |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | exit 0 |
| Portal production build | `npm run build:portal` | exit 0, 19 routes generated |
| Studio typecheck | `npx tsc` (apps/studio) | exit 0 |
| Repo lint | `npm run lint` | exit 0, 0 warnings |
| Whitespace | `git diff --check` | exit 0 |

## Scope note

This signoff covers Portal Design Issue Reporting only. Studio automatic updates
(`studio-automatic-updates` managed phase) is a separate, subsequent feature — its own Plan,
Review, implementation, and Signoff are tracked independently and are not part of this record.

## Next step

Promote `feature/portal-design-issue-reporting` to `production` via protected merge-commit PR
(no squash/rebase/direct-push). No production Firebase deployment occurs as part of this
promotion — production backend deployment is a separate, later coordinated step alongside the
Studio automatic-updates release.
