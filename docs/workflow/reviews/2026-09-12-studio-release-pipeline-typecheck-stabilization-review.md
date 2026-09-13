# Formal Review — Studio release pipeline typecheck stabilization

| Field | Value |
|---|---|
| Parent goal | `coordinated-production-promotion-release-readiness` |
| Corrective child | `studio-release-pipeline-typecheck-stabilization` |
| Plan | `docs/workflow/plans/2026-09-12-studio-release-pipeline-typecheck-stabilization-plan.md` |
| Date | 2026-09-12 |
| Verdict | **approved_with_changes — owner acceptance and implementation authorization required** |
| Scope | Complete existing Studio TypeScript/build baseline; no new product behavior |

## Review finding

The accepted lint corrective is working: 49/49 corrective tests pass, the deterministic baseline
reports `current=25 baseline=25 new=0 removed=0`, and both Windows/macOS workflow lint gates pass.
In run `34738737103`, both jobs then fail at the existing Studio `npx tsc` baseline before package
creation. A clean local check reports **29 diagnostics** across Studio runtime/shared boundaries,
unused declarations, and test fixtures. The platform jobs expose the same baseline; this is not a
Windows-only or macOS-only product defect.

## Reviewed consolidation decision

Proceed with one bounded child, `studio-release-pipeline-typecheck-stabilization`, rather than
opening one corrective per diagnostic. Inventory and resolve all 29 current diagnostics in one
reviewed implementation pass. TypeScript must remain a real release gate; a baseline-aware
TypeScript bypass is rejected.

The reviewed classifications are:

- runtime/shared contract alignment: sizing metadata, intake permission fields, trace metadata,
  lightbox nullability, browser byte-array input, and DOM listener typing;
- behavior-preserving unused declaration/import cleanup; and
- test-only fixture/import corrections, including the nine Firestore timestamp doubles.

No current item requires a product decision. If implementation discovers a behavior, permission,
architecture, persisted-data, or security change, that item must be isolated and returned for a new
decision rather than silently expanded into this child.

## Required implementation conditions

1. Re-run the complete typecheck before editing and confirm all 29 baseline diagnostics are
   accounted for; do not stop after the first error.
2. Preserve strict TypeScript compilation, `noUnusedLocals`, `noUnusedParameters`, and the actual
   release workflow typecheck gate.
3. Keep runtime changes narrow and contract-preserving. Do not weaken shared types with broad
   `any`/casts merely to silence the compiler.
4. Keep test fixes fixture-specific and preserve existing assertions.
5. Retain the accepted baseline-aware lint corrective and its 49/49 tests; do not alter its
   manifest to hide new findings.
6. Run the complete Studio validation pipeline after implementation, including both platform jobs
   through packaging, before corrective Signoff.
7. Record package names, SHA-256 hashes, provenance, version `1.0.10`, and the absence of stable
   release/tag publication if packaging succeeds.

## Scope guard

In scope are only the Studio TypeScript errors blocking packaging, shared-package types imported by
Studio, minimal adjacent tests, the accepted lint integration, and RC workflow validation. Out of
scope are new features, UI redesign, Portal behavior, Functions behavior, Rules/index changes,
Smart Profile work, production deployment, maintenance activation, candidate freeze, and stable
publication.

## Rules evidence

The Rules snapshot remains a separate read-only 403 service-disabled/no-quota-project blocker. No
IAM, API, quota, credential, or production configuration change is approved. The exact human
intervention remains: provide authorized read-only Rules API access with an enabled API and quota
project, or retrieve deployed release IDs/exports/hashes directly.

## Approval disposition

**Approved with the required changes above.** Owner acceptance and explicit implementation
authorization are required before any source edit, staging, commit, or push. If implementation
remains within this reviewed scope, proceed through Test and then consolidated corrective Signoff.

## Next owner checkpoint

**`OWNER ACCEPT CONSOLIDATED STUDIO RELEASE PIPELINE CORRECTIVE + AUTHORIZE IMPLEMENT`**
