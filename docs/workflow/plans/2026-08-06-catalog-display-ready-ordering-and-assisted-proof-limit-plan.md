# Plan: Catalog mats, ready ordering, Assisted proof 80 MB

| Field | Value |
|---|---|
| Date | 2026-08-06 |
| Goal | `catalog-display-ready-ordering-and-assisted-proof-limit` |
| Branch | `fix/post-launch-catalog-and-processing-stability` |
| Starting HEAD | `2d2ecbb` (after `120337a`; mats/ordering already at `42f7b20`) |
| PR | #40 open/unmerged |
| Deploy this pass | **None** |

## Already shipped (A + B) — do not re-implement

| Workstream | Status | Evidence |
|---|---|---|
| A — Details thumbnail/lightbox mat | Done | `DesignDetailsModal` passes `artworkBackgroundHex`; Signoff `approved_with_notes` |
| B — Studio `readyAt` order | Already correct | No rewrite |
| B — Portal browse/category/tag `readyAt` | Done | `catalogService` / `useCatalogDesigns` default `readyAt` + completeness |

## Workstream C — proof enforcement inventory

| Layer | Exact path | Current | Required |
|---|---|---:|---|
| Shared constant | `packages/shared/.../assistedCreation.constants.ts` | 25 MB | **80 MB** |
| Studio proof upload | `assistedCreationRequestsService.uploadAndAttachProof` | uses constant (`> MAX` reject) | inherit 80 MB; copy “80 MB” |
| Studio final artwork upload | same service `uploadAndAttachFinalSource` | same constant (staff HR final) | inherit 80 MB (shared policy) |
| Trusted server proof | `functions/.../assistedCreationRequests.ts` | `> ASSISTED_CREATION_MAX_PROOF_BYTES` | inherit |
| Trusted server final | same file | same | inherit |
| Customer add-to-request | `customerAddAssistedApprovedProofToPrintRequest.ts` | same constant (size check) | inherit |
| Storage Rules | `storage.rules` `isValidAssistedCreationProof` | **`< 25 MB` (exclusive!)** | **`<= 80 MB`** inclusive |
| User copy | dynamic from constant | “25 MB” | “80 MB” |

Do **not** change: reference-image limits (40 MB), Customer Upload, Donated, catalog import, OG compose 25 MB.

## Implementation steps

1. Set `ASSISTED_CREATION_MAX_PROOF_BYTES = 80 * 1024 * 1024`.
2. Fix Rules: `size <= 80 * 1024 * 1024` (align inclusive convention).
3. Add Rules↔constant alignment test + boundary unit tests.
4. Confirm A/B tests still green; no mats/ordering rewrite.

## Future deploy surfaces (later owner action — not this pass)

- `storage.rules` to `fresh-prints-dev` / prod before 80 MB uploads succeed end-to-end
- Functions that import the shared constant (redeploy when runtime must pick up new bundle)
- Studio Electron build/release for client pre-check

## Out of scope

Amendment 9 P1/P3/P4, Phase 1B, snapshot publisher, Firebase deploy, PR merge.
