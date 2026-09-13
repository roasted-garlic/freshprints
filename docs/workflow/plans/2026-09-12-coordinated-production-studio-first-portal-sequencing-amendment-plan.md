# Coordinated production Studio-first sequencing amendment

| Field | Value |
|---|---|
| Parent goal | `coordinated-production-promotion-release-readiness` |
| Date | 2026-09-12 |
| Scope | Documentation-only production rollout order amendment |
| Candidate | `ff533c835508e65bb3cfd9d2739f72bafe1fc895` remains frozen |
| Status | Owner-directed; no runtime/config change and no production action |

## Goal

Amend the coordinated rollout order so the production Studio `1.0.10` maintenance control and
monitoring surface is live before Portal rollout, while production maintenance remains absent/OFF.
This does not alter application behavior, package metadata, Rules, indexes, Functions, or the
frozen candidate.

## Authority and compatibility

The accepted parent Formal Review already establishes that Studio-before-Portal is technically
compatible after backend/Rules deployment, because Studio maintenance Settings does not depend on
the Portal bundle. The prior review recommended Portal first only as a default coordination choice.
The owner has now explicitly selected Studio first. This amendment records that order and keeps the
review’s requirement that maintenance remain OFF until the new Portal is live and smoke-tested.

## Revised production order

1. Frozen RC PASS and production GO.
2. Additive indexes; wait for required indexes READY.
3. Projection synchronizer/refresh Functions from the explicit allowlist.
4. Transition Firestore Rules.
5. Publish Studio `1.0.10`; verify package/source SHA and production compatibility.
6. Verify packaged Studio startup, Settings, catalog, requests, User Info, and maintenance controls.
7. Keep maintenance absent/OFF.
8. Deploy the dual-read Portal candidate.
9. Run Portal normal-mode smoke.
10. Declare `FULL MAINTENANCE CAPABILITY READY` while OFF.
11. Run production projection DRY RUN and pre-APPLY VERIFY.
12. Obtain separate owner APPLY authorization; run bounded APPLY, exact VERIFY, and zero-diff DRY RUN.
13. Run convergence/smoke and obtain separate final-Rules boundary authorization.
14. Deploy final Firestore Rules and run post-final smoke.
15. At a later owner checkpoint, optionally enable maintenance for selected overnight catalog
    operations, verify, and turn it OFF.

## Safety boundaries

- Do not turn maintenance ON before the new Portal is live and smoke-tested.
- Do not place old Portal clients behind maintenance enforcement without the reviewed experience.
- Do not execute any step in this Plan as part of Plan/Review.
- Studio stable publication, Portal publication, Rules/Functions/index deployment, projection
  operations, and maintenance activation remain separately owner-gated.
