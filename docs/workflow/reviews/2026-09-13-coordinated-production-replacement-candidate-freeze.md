# Coordinated Production Replacement Candidate — Authoritative M1 Freeze

**Freeze date:** 2026-09-13
**Disposition:** `FROZEN` under explicit owner authorization
**Parent:** `coordinated-production-promotion-release-readiness`

## Frozen candidate

- Candidate SHA: `7b8462a0fe60e484a937a7c88fc37e7c938fff6d`
- Branch: `development`
- Commit: `chore(release): assemble coordinated production replacement candidate`
- `HEAD = origin/development`; ahead/behind `0/0`.
- Production baseline: `origin/production` `36165096f09bef6817adb5b11d496dbb1502b34b`.
- Portal rollback: build-003 immediate; build-002 secondary.
- Studio target: `1.0.10`; rollback `v1.0.9`; secondary rollback `v1.0.8`.

## Immutable evidence

Git-object manifests were re-audited at the frozen SHA, independent of the documentation-only
worktree changes:

- Functions: 186 current exports, 120 production-source exports, 530 closure paths; digest
  `22e56a4810c0714999f6793a350bb67c22215b0ec556179524948552812f9fbc`. Reviewed ADD/UPDATE/
  RETAIN/EXCLUDE/NO ACTION classifications remain preserved; hard-delete exports remain excluded.
- Final Firestore Rules SHA-256: `dc4fc83dcf36382aa7d2273dc4e35bd6e41b3da02b33e85a3bd21c710204d2ee`.
- Transition Firestore Rules SHA-256: `8a50d5bb85fa41fca82652582730940fb1a936cb0aae059a0b05e59099db9945`.
- Storage Rules SHA-256: `c537183f41d95ade7b6cdf80ea2cbb9241804d7a40c87b4185d3496070d9077a`.
- Transition config SHA-256: `c07e7c2772b6fcf94b14f42af211883f248952d28bddd6e40c9efe6c8aef0c03`.
- Production rollback snapshot: Firestore release `cloud.firestore`, ruleset
  `42adfbb5-9f5d-4d22-a07b-e38078aba074`, deployed source SHA
  `cdd4a3154733cfdceea53be9a785e39e4ea526a27da5e1046a802e33557defad`; Storage release
  `firebase.storage/fresh-prints-prod.firebasestorage.app`, ruleset
  `0c911fca-b6bf-48cd-83c8-e0622f334767`, deployed source SHA
  `69ca680a7018ed48a9b46dc9cefd239ed0b5ea94ef50c57c3b75a9689f108306`.
- Indexes: 95 candidate, 77 production, 18 additive, 0 removed/replaced, no `--force`; candidate
  SHA `2cdba89ad6092b0ebd234750ee5829520accff315b5e8fa642b144009e3fffae`.
- Portal: 747 Git-object inputs; digest
  `ca7f240987d8ddf118b51f069a180b6f13f06ea9ed70c44563f329c152e643b5`; zero mismatches.
- Studio: 1,145 Git-object inputs; digest
  `77b05f84745d1a38eeb830e656e015fc2a20c8f40b03ad77ba14a295514efb5f`; version `1.0.10`; zero
  mismatches.

## Authoritative Studio evidence

The prior wording that Studio full typecheck retained baseline errors is historical and superseded.
The closed corrective is authoritative: Studio TypeScript PASS with zero diagnostics,
baseline-aware release lint PASS, corrective suite 49/49 PASS, targeted validation 198/198 PASS,
Windows packaging PASS, macOS packaging PASS, and artifact verification PASS. Production-specific
environment QA remains deferred by design to the canonical stable release after GO and merge to
`production`.

## Config/data disposition and freeze contract

Maintenance remains absent/OFF; AI autonomy and Pass 2 are OFF. The production projection runner,
DRY RUN, VERIFY, APPLY/backfill, lifecycle mirror, queueTab work, and Algolia reconcile remain
unauthorized or conditional. The selected full eligible-design Smart Profile reprocess/backfill is
deferred to the later overnight operation. Legacy physical tag deletion and hard-delete/cleanup
remain deferred/excluded. Auth, secrets, settings, and production data are unchanged.

After this freeze, any runtime/config byte change (Portal, Studio, Functions, shared runtime, Rules,
indexes, package/lock files, build/release configuration, runner, mapper, synchronizer, or runtime
assets) invalidates the frozen tuple and requires a new candidate. Documentation-only workflow and
evidence updates may continue.

No production reads, deployment, publication, runner invocation, DRY RUN, VERIFY, APPLY/backfill,
maintenance activation, production merge, or production settings/data mutation occurred.

**Next owner checkpoint:** focused final production GO/NO-GO review for this frozen replacement
candidate. Do not repeat historical feature QA; reuse unaffected terminal evidence.
