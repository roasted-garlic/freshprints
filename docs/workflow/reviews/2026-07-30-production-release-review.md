# Formal Review: `production-release` (Goal #13) Plan

| Field | Value |
|-------|-------|
| Date | 2026-07-30 |
| Reviewer | Review Agent (independent pass) |
| Plan reviewed | `docs/workflow/plans/2026-07-30-production-release-plan.md` |
| Verdict | **approved_with_notes** |

---

## Review Method

Cross-checked every factual claim in the Plan against the actual repository source read this pass
(`.firebaserc`, `firebase.json`, `storage.rules`, `apps/portal/apphosting.yaml`,
`apps/portal/.env.example`, `functions/.env.example`, `functions/.env.fresh-prints-dev`,
`docs/standards/DEPLOYMENT.md`, `docs/architecture/BACKEND.md`, `docs/architecture/ARCHITECTURE.md`,
`docs/architecture/DATA_MODEL.md`, `docs/standards/CODING_STANDARDS.md`,
`docs/standards/TESTING.md`, the Goal #12 closeout signoff, the Portal SEO signoff (+ reaffirmation),
the `portal-google-analytics` signoff checkpoint, `operationalWipeUiGate.ts`, and current
`.cursor/workflow/state.md` / `docs/project/ROADMAP.md`). Did not re-derive facts already
established and cited in the Plan; verified they are accurately cited, not fabricated.

---

## Findings

### Confirmed accurate

- No production Firebase project exists in `.firebaserc` — verified directly (single `default`
  alias, `fresh-prints-dev`). The Plan's "cold start, first-time launch" framing is correct, not
  assumed.
- `wipeOperationalTestData` / Test Data Reset dual-gate description matches
  `operationalWipeUiGate.ts` exactly — `import.meta.env.DEV && isOperationalWipeAllowedProjectId(...)`
  is a real, code-level, non-bypassable-by-config guarantee for production Studio builds. This is a
  materially stronger guarantee than "documented policy," and the Plan correctly characterizes it as
  such rather than treating it as a release-time task.
- `inventoryCatalogImageStorage` exclusion is correctly sourced to the Goal #12 signoff's own Risks
  table language, not invented by this Plan.
- GA4 inert-by-default claim is accurate: `portalAnalyticsConfig.ts:12` requires a non-empty,
  trimmed `NEXT_PUBLIC_GA_MEASUREMENT_ID`, and the host-gate file
  (`portalAnalyticsHostGate.ts`) restricts to `myprintrequest.com`. Fail-closed, confirmed by source
  read, not just by citing the signoff checkpoint's prose.
- `apphosting.yaml` genuinely contains only `runConfig` — no env block exists today, so the Plan is
  correct to flag env-var configuration mechanism as `[NEEDS REPO CHECK]` rather than assume a
  schema.
- Branch-strategy finding ("no CI/CD, no release-branch convention, direct-to-master") matches the
  git log provided in the session's gitStatus context (`02519a5`, `846dc07`, `63140a5`, `e048c29`,
  `679189e` all on `master`) and `TESTING.md`'s explicit `[TBD — document when CI is configured]`.
- Rollback section correctly declines to fabricate a specific App Hosting CLI rollback command,
  instead citing the one rollback pattern actually documented in this repo (Wave C's
  "redeploy the prior commit" pattern in `DEPLOYMENT.md`) and flagging the rest `[NEEDS REPO CHECK]`.
  This is the correct behavior per the task's explicit instruction not to invent deployment
  mechanisms.

### Minor gaps (do not block Plan approval — recommend addressing during Implementation)

1. **§3.4 Firestore Indexes** — the Plan explicitly did not read the full 1,177-line
   `firestore.indexes.json` and flagged that as a repo-check deferred to Implementation. This is a
   reasonable scoping decision for a Plan-phase document (reading 1,177 lines of index JSON to look
   for a hypothetical dev-volume-specific index has low expected value before there is even a
   production project to deploy to), but the Reviewer notes it explicitly so the omission is a
   recorded decision, not a silent gap.
2. **§3.1 Studio production distribution** — correctly identified as out of Firebase-deployment
   scope, but the Plan does not fully rule out that Studio's *build-time* Firebase config
   (`apps/studio` env/config resolution — not read in this pass) might need a production variant
   analogous to Portal's `.env.example`. Recommend Implementation confirm how Studio resolves its
   target Firebase project at build time before assuming "point a production build at project X" is
   a trivial config swap.
3. **§3.9 Password-reset / action URLs** — the Plan appropriately flags that no custom Firebase Auth
   email template was confirmed absent (repo cannot see Console state). This is correctly marked
   `[NEEDS REPO CHECK]` rather than asserted either way.
4. **Section 3.19 monitoring** — no error-tracking dependency was found in the files read this pass,
   but the Plan's dependency scan was not a full `package.json` audit (Studio/Portal/functions
   `package.json` files were not individually enumerated for a Sentry-like dependency). The
   `[NEEDS REPO CHECK]` flag is appropriate; recommend Implementation do one grep pass
   (`Sentry|@sentry|LogRocket|Bugsnag`) across all three `package.json` files before relying on
   "Firebase Console is the only monitoring surface" as a stated finding rather than a probable one.

### No blocking findings

No fabricated file path, API, branch, or deployment mechanism was found. No claim in the Plan
asserts a production configuration exists when it does not — every place where the repo is silent,
the Plan correctly emits `[NEEDS REPO CHECK]` or `[NEEDS OWNER INPUT]` rather than inventing an
answer. The Plan does not authorize, and this Review does not authorize, any implementation,
deployment, secret, or production action.

---

## Verdict Rationale

`approved_with_notes` rather than a clean `approved`: the Plan is factually sound and appropriately
conservative everywhere it lacks direct repo evidence, but four minor scoping gaps (above) should be
closed out as the *first* sub-steps of Implementation — not before Plan approval, since none of them
change the Plan's overall shape, sequencing, or human-checkpoint structure.

**This Review does not authorize implementation, deployment, secret configuration, or any
production action.** Per the task's explicit stop condition, work stops here pending owner review of
the Plan's flagged decisions.

---

## Recommendation

Owner should review:
1. The 12 `[NEEDS OWNER INPUT]` items in Plan §5, in particular #2 (exclude `wipeOperationalTestData`
   from production — Plan recommends yes), #8 (branch strategy — Plan recommends continuing current
   direct-to-master pattern), and #10 (GA4 Privacy Policy determination, which has been outstanding
   since the `portal-google-analytics` goal).
2. Confirm whether to proceed to Implementation (starting with production Firebase project
   creation, Plan §3.18 checkpoint 2) or request Plan revisions first.
