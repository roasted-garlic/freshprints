# Test Report: Studio internal-unsigned stable distribution policy

Date: 2026-08-03
Branch: `fix/studio-internal-unsigned-stable-policy` (based on `origin/development`)
Plan: `docs/workflow/plans/2026-08-03-studio-internal-unsigned-stable-policy-plan.md`
Formal Review: `docs/workflow/reviews/2026-08-03-studio-internal-unsigned-stable-policy-review.md`

## Product decision (owner-confirmed, directly, this session)

Fresh Prints Studio is internal-only, installed on owner-controlled staff computers. The owner
declined to purchase a code-signing certificate. An unsigned stable build is approved only through
an explicit internal-distribution path.

## Exact workflow change

`.github/workflows/studio-release.yml`:

1. Added a new `workflow_dispatch` input:
   ```yaml
   distribution_mode:
     description: "Stable distribution mode (ignored for prerelease, which always builds
       unsigned): 'signed' requires Windows signing credentials and is intended for any
       public/external distribution; 'internal-unsigned' is an explicit, owner-approved exception
       for internal-only staff installs and produces an unsigned executable"
     required: true
     type: choice
     options:
       - signed
       - internal-unsigned
     default: signed
   ```
2. Rewrote the `Configure optional Windows signing` step's decision logic (see below).

## Behavior by combination

| Release type | Distribution mode | Signing secrets | Outcome |
|---|---|---|---|
| stable | signed | missing | **fails closed** (unchanged from before this policy existed) |
| stable | signed | complete | signs, proceeds |
| stable | signed | partial (one only) | **fails closed** (unchanged) |
| stable | internal-unsigned | missing | **proceeds unsigned**, prints a prominent `Write-Warning` that the build is unsigned/internal-only/will trigger SmartScreen |
| stable | internal-unsigned | partial (one only) | **fails closed** — a broken cert config is never silently ignored just because the internal-unsigned mode was selected |
| stable | internal-unsigned | complete | signs anyway — having a working certificate is never discarded |
| prerelease | either value | any | **unaffected** — `distribution_mode` is ignored entirely; prerelease always builds unsigned, exactly as every beta build this session already proved |

`signed` remains the input's default value — an operator must actively select
`internal-unsigned`; nothing can silently drift into shipping unsigned.

## Production Firebase fail-closed result

Unaffected by this change — the `Configure Studio Firebase environment` step is independent of
signing and was not touched. Re-confirmed via source inspection: the step's missing-value guard
and lack of any `DEV_FIREBASE_*` fallback for `release_type: stable` are both present and
unchanged.

## Production branch/ref guard result

Unaffected — the `Guard stable release ref` and `Verify ref is reachable from production` steps
were not touched. Confirmed present and unchanged via source inspection.

## Signing-mode tests (new)

`.github/workflows/studio-release-signing-policy.test.ts` — a source-level regression guard (the
workflow YAML contains the expected input/structure) combined with a faithful TypeScript
reimplementation of the exact PowerShell decision logic, exercised with synthetic (never real)
credential values:

| Test | Result |
|---|---|
| Workflow declares `distribution_mode` choice input defaulting to `signed` | pass |
| stable + signed + missing credentials fails | pass |
| stable + signed + complete credentials reaches packaging | pass |
| stable + internal-unsigned + missing credentials is allowed | pass |
| stable + internal-unsigned + partial config still fails closed | pass |
| stable + internal-unsigned + full credentials present signs anyway | pass |
| Stable-ref guard unaffected (source-level confirmation) | pass |
| prerelease ignores `distribution_mode`, always unsigned | pass |
| No dev Firebase fallback exists for stable (unchanged) | pass |
| Unrecognized `distribution_mode` value falls through to the safe fail-closed branch | pass |

**10/10 pass.** All logic combinations independently re-verified locally in a live PowerShell
session with synthetic values before being committed as tests, matching each result exactly.

## Full verification results

| Check | Result |
|---|---|
| Root dependency install | exit 0 |
| Functions dependency install | exit 0 |
| Functions build | exit 0 |
| Repo lint | exit 0, 0 warnings |
| Portal typecheck | exit 0 |
| Portal production build | exit 0 |
| Studio typecheck | exit 0 |
| Updater/release-note/generator + new signing-policy tests | **49/49 pass** |
| Non-publishing Studio package build | exit 0 — produced `Fresh Prints-Windows-1.0.0-beta.5-Setup.exe` locally (unaffected by this workflow-only change, confirming no regression); not published |
| `git diff --check` | exit 0 |

## Documentation changes

- `docs/standards/DEPLOYMENT.md`: replaced the "Code signing" section with "Code signing and
  distribution mode" — documents the owner decision, both distribution modes, staff-facing
  SmartScreen/source-verification guidance, and the explicit statement that a future public
  release must return to `signed`.
- Plan: `docs/workflow/plans/2026-08-03-studio-internal-unsigned-stable-policy-plan.md`
- Formal Review: `docs/workflow/reviews/2026-08-03-studio-internal-unsigned-stable-policy-review.md`
  (verdict: **APPROVED**)
- This Test Report.

The Phase F production-prerequisites audit
(`docs/workflow/reviews/2026-08-03-studio-production-release-prerequisites-audit.md`) lives on a
separate, still-unmerged docs branch (`docs/production-portal-app-hosting-rollout`) — a superseding
note should be added there once both branches are merged into `development`, since that audit's
Windows-signing section predates this policy and should reference it rather than restate an
open question that is now resolved by owner decision.

## Files changed

- `.github/workflows/studio-release.yml`
- `.github/workflows/studio-release-signing-policy.test.ts` (new)
- `docs/standards/DEPLOYMENT.md`
- `docs/workflow/plans/2026-08-03-studio-internal-unsigned-stable-policy-plan.md` (new)
- `docs/workflow/reviews/2026-08-03-studio-internal-unsigned-stable-policy-review.md` (new)
- `docs/workflow/reviews/2026-08-03-studio-internal-unsigned-stable-policy-test-report.md` (this file)

## Confirmation

No stable build, no GitHub release, no Firebase deployment, no App Hosting rollout, no DNS/domain
action occurred. This pass changed only the release workflow's signing decision logic and
documentation.
