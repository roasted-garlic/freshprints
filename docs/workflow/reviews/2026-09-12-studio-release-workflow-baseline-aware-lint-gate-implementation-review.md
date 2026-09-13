# Implementation Evidence — Studio release workflow baseline-aware lint gate

| Field | Value |
|---|---|
| Corrective child | `studio-release-workflow-baseline-aware-lint-gate` |
| Parent | `coordinated-production-promotion-release-readiness` |
| Date | 2026-09-12 |
| Implementation status | **COMPLETE — approved workflow/tooling scope only** |

## Implemented files

- `.github/workflows/studio-release.yml` — both Windows and macOS jobs now invoke the same helper;
  no direct `npm run lint` bypass remains.
- `.github/scripts/run-studio-release-lint.mjs` — invokes the whole-repository ESLint surface,
  normalizes deterministic diagnostic identities, compares against the reviewed baseline, and fails
  closed on process/parse/schema errors or new findings.
- `.github/scripts/studio-release-lint-baseline.json` — exactly 25 reviewed findings: 20 errors and
  5 warnings; sorted, normalized, schema-versioned, and timestamp-free.
- `.github/scripts/run-studio-release-lint.test.ts` — comparator, negative safety, normalization,
  process/parse failure, and no-auto-write tests.
- `.github/workflows/studio-release-signing-policy.test.ts` — both platform jobs are required to use
  the helper and direct lint bypass is rejected.

No Studio application/runtime source, Portal runtime, Functions runtime, Rules, Storage Rules,
indexes, package behavior, or coordinated feature scope changed.

## Safety properties

The helper retains whole-repository ESLint coverage and fails on any finding not in the checked-in
manifest. Removed baseline findings are reported as improvements without modifying the manifest.
The manifest has no update mode and cannot silently grow. Windows and macOS use the identical Node
helper and baseline. Existing prerelease/stable release, signing, artifact, and publication guards
remain unchanged.
