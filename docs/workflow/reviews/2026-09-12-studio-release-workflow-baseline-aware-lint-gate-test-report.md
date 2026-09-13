# Test Report — Studio release workflow baseline-aware lint gate

| Field | Value |
|---|---|
| Corrective child | `studio-release-workflow-baseline-aware-lint-gate` |
| Date | 2026-09-12 |
| Result | **AUTOMATED VALIDATION PASS** |

## Results

| Check | Result |
|---|---|
| Comparator + workflow policy + release helper tests | **49/49 PASS** (`npx tsx --test ...`) |
| Baseline manifest | **25 findings: 20 errors / 5 warnings** |
| Real baseline-aware lint runner | **PASS** — `current=25 baseline=25 new=0 removed=0` |
| Targeted lint | **PASS** — both changed TypeScript test files with `--no-ignore` and `--max-warnings 0` |
| Helper syntax | **PASS** — `node --check .github/scripts/run-studio-release-lint.mjs` |
| `git diff --check` | **PASS** — line-ending conversion warnings only |

## Negative safety evidence

The 49-test run explicitly proved:

- a new error fails;
- a new warning fails;
- moved and changed-message diagnostics fail as new;
- removing one baseline finding passes and reports an improvement;
- malformed ESLint JSON fails closed;
- simulated ESLint process failure fails closed; and
- the manifest remains byte-identical after comparison.

The direct `npm run lint` command still reports the same documented 20 errors / 5 warnings; the
baseline-aware release gate passes only because those exact findings are reviewed and listed.

## Required RC packaging boundary (superseded by temporary RC validation below)

The real repository-supported Studio prerelease workflow was **NOT RUN after implementation**. The
corrective workflow/helper changes are local and uncommitted, while the owner explicitly forbids a
commit/push before corrective Signoff and parent M0 reconciliation. Dispatching `development` or the
former SHA would validate the old source, not this implementation. No Windows or macOS package,
artifact name, hash, provenance, install, launch, or update evidence exists yet.

Consequently, Studio 1.0.10 install/launch and `v1.0.9 → 1.0.10` update validation remain pending;
Owner QA will be required for local installer/update interaction once valid RC artifacts exist.

## Rules evidence

Read-only Firestore and Storage Rules API access remains blocked with 403
service-disabled/no-quota-project. No IAM, quota, credential, or production configuration change
was attempted.

## Temporary remote RC validation

| Field | Result |
|---|---|
| Validation branch | `rc/studio-release-lint-gate-validation` |
| Validation SHA | `b8d8d80cc1cab5bdb2aed1889730205e0a8046f3` |
| Workflow run | [34738737103](https://github.com/roasted-garlic/freshprints/actions/runs/34738737103) |
| Version / mode | Studio `1.0.10`; `prerelease`; `internal-unsigned` |
| Windows lint gate | **PASS**; proceeded to build |
| macOS lint gate | **PASS**; proceeded to build |
| Windows packaging | **BLOCKED — existing Studio TypeScript baseline** at `npx tsc`; no installer |
| macOS packaging | **BLOCKED — existing Studio TypeScript baseline** at `npx tsc`; no installer |
| Artifact names/hashes/provenance | None produced |
| Stable release/tag/publication | **NONE**; finalize skipped; no release mutation |

The failing diagnostics are the documented unrelated Studio typecheck baseline (including
`PersistedArtworkUpscalePassCount`, customer-upload row fields, trace metadata, Staff Artwork null
typing, shared `Select` event overloads, and existing shared test typing). The approved corrective
files are not application/runtime source. This is classification **B — existing baseline**, not a
corrective regression and not a reason to weaken the release gate. No automatic patch was attempted.

## Production boundary

Production state/data/configuration was untouched. No production runner, DRY RUN, VERIFY,
APPLY/backfill, deployment, publication, maintenance activation, settings/Auth/secrets mutation,
staging, commit, push, or production merge occurred.
