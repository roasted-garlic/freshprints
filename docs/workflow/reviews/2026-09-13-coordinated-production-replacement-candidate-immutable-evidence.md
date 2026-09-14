# Coordinated Production Replacement Candidate — Immutable Git-Object Evidence

**Date:** 2026-09-13
**Candidate SHA:** `7b8462a0fe60e484a937a7c88fc37e7c938fff6d`
**Branch:** `development`
**Remote:** `origin/development` at the same SHA; ahead/behind `0/0`
**Production baseline:** `origin/production` `36165096f09bef6817adb5b11d496dbb1502b34b`

This record was generated after the owner-authorized candidate commit/push. Manifests were read
from Git objects at the exact SHA, not from worktree bytes. The checked-out tree was clean during
manifest generation and all audits returned zero mismatches.

## Immutable byte evidence

| Scope | Result |
|---|---|
| Core manifest | 10/10 required members; `mismatches: []` |
| Portal input manifest | 747 files; sorted path + NUL + raw Git-object bytes + NUL digest `ca7f240987d8ddf118b51f069a180b6f13f06ea9ed70c44563f329c152e643b5`; audit 0 mismatches |
| Studio input manifest | 1,145 files; sorted path + NUL + raw Git-object bytes + NUL digest `77b05f84745d1a38eeb830e656e015fc2a20c8f40b03ad77ba14a295514efb5f`; audit 0 mismatches; `apps/studio/package.json` declares `1.0.10` |
| Function closure | 186 current exports / 120 production exports; 530 unique local closure paths; path/action topology unchanged from the accepted M0 evidence; digest `22e56a4810c0714999f6793a350bb67c22215b0ec556179524948552812f9fbc` |

## Candidate Rules/config and indexes

- `firestore.rules`: 127,614 bytes; SHA-256 `dc4fc83dcf36382aa7d2273dc4e35bd6e41b3da02b33e85a3bd21c710204d2ee`.
- `firestore.transition.rules`: 127,701 bytes; SHA-256 `8a50d5bb85fa41fca82652582730940fb1a936cb0aae059a0b05e59099db9945`.
- `storage.rules`: 13,157 bytes; SHA-256 `c537183f41d95ade7b6cdf80ea2cbb9241804d7a40c87b4185d3496070d9077a`.
- `firebase.transition.json`: 108 bytes; SHA-256 `c07e7c2772b6fcf94b14f42af211883f248952d28bddd6e40c9efe6c8aef0c03`.
- Index union: 95 current / 77 production; 18 additive; zero removals or replacements; no
  `--force`; current `firestore.indexes.json` SHA-256
  `2cdba89ad6092b0ebd234750ee5829520accff315b5e8fa642b144009e3fffae`.

Production rollback Rules identities and deployed source hashes remain the read-only snapshot in
`2026-09-13-coordinated-production-rules-rollback-snapshot.md`; no Rules API write or deployment
occurred.

## Validation and boundaries

Reused accepted evidence: focused validation **87/87 PASS**, Functions build PASS, Portal typecheck
PASS, targeted lint PASS, and `git diff --check` PASS (line-ending warnings only). Existing
limitations remain baseline/environment conditions, not newly introduced failures: Portal
`.next/trace` EPERM production-build environment issue; Firestore full Rules emulator expression
budget baseline; unrelated Studio full-typecheck baseline errors; unrelated whole-repository lint
errors/warnings; Studio packaging intentionally not run because it invokes installer-producing
tooling. Prior exact-SHA Studio workflow evidence remains valid for version `1.0.10`; canonical
production-configured QA is deferred to the stable production path after GO/merge.

No production reads, runner invocation, DRY RUN, VERIFY, APPLY/backfill, Rules or Functions
deployment, Portal or Studio publication, maintenance activation, settings/data mutation, staging,
merge, or freeze occurred. This evidence record and synchronized workflow state updates are
documentation-only post-candidate changes; runtime/config post-candidate delta is **0**.

**Next checkpoint:** `FREEZE REPLACEMENT CANDIDATE SHA 7b8462a0fe60e484a937a7c88fc37e7c938fff6d`
