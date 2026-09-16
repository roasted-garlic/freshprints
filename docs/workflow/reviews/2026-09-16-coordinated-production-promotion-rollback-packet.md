# Rollback packet: coordinated production promotion — 2026-09-16

This packet records read-only production anchors immediately before the
authorized candidate freeze and first production mutation. It contains no
credentials, tokens, secret values, or customer data.

## Git and release anchors

| Surface | Current anchor |
|---|---|
| Production branch | `840d596b058b3f7bef2dae886154aa667f9e2a57` (`v1.0.12`) |
| Development pre-freeze tip | `8f65225c5fb926b142902bfd636b467f7b63f984` |
| Required Studio fix | `37655dcd52760992cc2892e096bac30cbaa797ba` |
| Studio rollback | Published stable `v1.0.12`, target `840d596b058b3f7bef2dae886154aa667f9e2a57` |

The immutable production candidate SHA is recorded in the promotion PR and
post-merge verification after the final documentation commit.

## Firestore Rules and indexes

| Surface | Current anchor |
|---|---|
| Released Firestore Ruleset | `dbd35333-5156-4ebe-ae48-92cb7b829741` |
| Released Rules source SHA-256 | `4f75b79f137eec614826ee8f4f6209acd0641e0be49d3f68e102b2d85ed53d40` |
| Composite indexes | 94; all `READY` |
| Index action | None; semantic delta is zero |
| Storage Rules action | None; source is unchanged |

## Function rollback anchors

All six are ACTIVE in `us-central1` and use runtime service account
`473623863375-compute@developer.gserviceaccount.com`.

| Function | Revision | Source generation | Source hash label |
|---|---|---:|---|
| `getPortalAdminUpcomingShowQueueDashboard` | `getportaladminupcomingshowqueuedashboard-00001-hoc` | `1789309310794676` | `a6c9a1476adf0b5ae7bbde8a96b0cd2c07fcb266` |
| `unqueueStudioCustomerPrintRequestFromShow` | `unqueuestudiocustomerprintrequestfromshow-00001-nix` | `1789309310777088` | `a6c9a1476adf0b5ae7bbde8a96b0cd2c07fcb266` |
| `promoteStaffArtworkToAiReview` | `promotestaffartworktoaireview-00001-vew` | `1789309472327920` | `a6c9a1476adf0b5ae7bbde8a96b0cd2c07fcb266` |
| `reprocessReadyDesignWithAi` | `reprocessreadydesignwithai-00001-rod` | `1789309474315559` | `3d29cfde765c9d8d432f073ca3afa2a95203308b` |
| `enqueueAiEnrichment` | `enqueueaienrichment-00004-cob` | `1789309511577515` | `3d29cfde765c9d8d432f073ca3afa2a95203308b` |
| `completeStaffGangSheetAndOpenNext` | `completestaffgangsheetandopennext-00003-jex` | `1789309390573925` | `a6c9a1476adf0b5ae7bbde8a96b0cd2c07fcb266` |

The exact deployment allowlist is generated from the reviewed closure audit:
192 current exports / 186 production exports / 546 unique closure paths; 6
ADD, 52 UPDATE, 115 RETAIN LIVE VERSION, 10 EXCLUDE, and 9 NO ACTION. Only
the 58 ADD/UPDATE IDs may be passed to the Functions deploy command. No
deletion or invocation of reconciliation Apply is permitted.

## Portal App Hosting rollback anchor

| Surface | Current anchor |
|---|---|
| Backend | `fresh-prints-portal` in `fresh-prints-prod/us-central1` |
| Live revision | `fresh-prints-portal-build-2026-09-14-001` |
| Live rollout | `build-2026-09-14-001`, `SUCCEEDED` |
| Live source commit | `f1001332574b8891b2a59c14985e5c00cdbceb09` |
| Traffic | 100% to the live revision |
| Rollback | Restore the recorded live revision before the candidate rollout |

## AI, maintenance, and IAM preflight

- `settings/aiEnrichment`: `catalogWorkflowMode=shadow`,
  `catalogAutonomousLiveEnabled=false`, `visionModelId=gemini-2.5-flash-lite`.
  `semanticReviewPlaygroundEnabled` is absent and therefore remains at its
  documented OFF default. No setting change is part of this rollout.
- `settings/portalMaintenance`: exists with `enabled=false`.
- `settings/portalDevCustomerAccess`: absent (404); production customer access
  is not enabled by this setting.
- Read-only IAM policy for the production Compute runtime service account had
  no bindings. The reviewed Functions include `getSignedUrl` paths that use
  IAM Credentials `signBlob`; the only authorized IAM change is the exact
  self-binding of `roles/iam.serviceAccountTokenCreator` to that same runtime
  service account, if applied before the bounded Staff Artwork smoke. No other
  IAM grant is allowed.

