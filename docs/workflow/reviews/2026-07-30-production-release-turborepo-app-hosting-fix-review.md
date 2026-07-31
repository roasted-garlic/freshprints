# Formal Review: Minimal Turborepo Support for App Hosting (Goal #13 `production-release`)

| Field | Value |
|-------|-------|
| Date | 2026-07-30 |
| Plan reviewed | `docs/workflow/plans/2026-07-30-production-release-turborepo-app-hosting-fix-plan.md` |
| Verdict | **approved** |

---

## Review Method

Independently re-derived the root-cause chain rather than accepting the Plan's framing at face
value: confirmed `firebase.json`'s `apphosting[0].rootDir` is `./apps/portal`, confirmed the repo
has a single root `package-lock.json` and no `apps/portal/package-lock.json` (standard, correct
npm-workspace layout — not a defect to "fix" by adding a nested lock file), confirmed no
`turbo.json` or `turbo` dependency currently exists anywhere in the repo (this is a clean addition,
not a conflicting change). Confirmed the Plan's two-attempt failure record against the actual
background-task tool outputs in this session: attempt 1 (`9437d4b`) and attempt 2 (`35ef8e1`, with
the `buildCommand`/`runCommand` override) both failed with the byte-identical error string
`Missing dependency lock file at path '/workspace/apps/portal'`. The owner separately confirmed via
direct Cloud Build Console log inspection (not available to this Review directly) that detection
happens before `buildCommand` runs — this is owner-supplied ground truth from the actual failing
build, the strongest evidence available, and the Plan is correct not to re-derive it from
documentation alone.

## Findings

### Confirmed accurate

- The root-cause framing (npm workspaces lacks official App Hosting monorepo support; only
  Nx/Turborepo are documented) matches the Plan author's own cited research and is consistent with
  the observed failure being identical across both attempts regardless of the `buildCommand`
  override — if the override had any effect on the failure, the second attempt's error would have
  differed even if still failing. It didn't. This is strong corroborating evidence for the
  "detection happens before buildCommand" explanation, not just the owner's Console reading alone.
- `turbo.json`'s proposed `tasks` schema (not `pipeline`) is correct for current Turborepo — an
  `outputs`-only, single-`build`-task file is the minimum shape that does not invent unnecessary
  configuration (no `dev`, `lint`, `test` tasks fabricated for tasks this fix doesn't need).
- Keeping `rootDir: ./apps/portal` unchanged is correctly scoped — the Plan does not assume
  Turborepo mode requires repointing rootDir at the monorepo root, and cites the specific reason
  (Firebase's own stated requirement that Turborepo users must specify a target app directory).
- Removing the now-confirmed-ineffective `buildCommand`/`runCommand` override is correct cleanup —
  leaving a non-functional override in committed config would be misleading to future readers and
  keeps the disabled-framework-adapter tradeoff from lingering after it stopped serving any purpose.
- The Plan does not fabricate certainty about the fix working — §4's explicit flag of the known,
  *different* failure mode (firebase-tools #9562, transitive-dependency lockfile mismatches inside
  the actual `npm ci` step) is the right level of honesty. A Plan that promised "this will work" for
  an unofficially-documented interaction between npm workspaces and Turborepo detection would be
  overclaiming; this Plan correctly treats the next rollout as the real verification, not a
  formality.

### Minor gap (does not block approval)

The Plan's verification step 2 (`npx turbo run build --filter=@fresh-prints/portal`) will only work
correctly if the Portal's `package.json` `build` script name matches what turbo's task graph
expects and if `@fresh-prints/shared`/`@fresh-prints/show-picker` also expose compatible `build`
scripts for `dependsOn: ["^build"]` to resolve during implementation. This is a real implementation
detail, not a Plan defect — recommend Implementation confirm each workspace package's `build`
script exists and is meaningful (or explicitly scope `dependsOn` down if a dependency has no build
step) rather than assuming the naive `^build` dependency graph resolves cleanly on the first run.

### No blocking findings

No fabricated API, no invented Firebase mechanism, no scope creep into unrelated deployment-order
steps. The fix is narrowly scoped to exactly the failing mechanism, preserves the single
authoritative root lock file per explicit owner instruction, and does not touch application code,
already-deployed Functions, Rules, indexes, or secrets.

## Verdict Rationale

**Approved.** The root cause is owner-verified from the actual failing build (not guessed), the fix
follows Firebase's own documented Turborepo path rather than an unofficial workaround, the scope is
minimal and reversible (two new files/deps, one config cleanup), and the Plan is honest about
residual risk rather than promising a guaranteed fix. Implementation should proceed directly to the
verification suite in Plan §5, and must stop at the `development`→`production` PR checkpoint per
Plan §6 step 5 — no further App Hosting rollout attempt is authorized until that PR is confirmed
merged and the exact commit is re-verified.
