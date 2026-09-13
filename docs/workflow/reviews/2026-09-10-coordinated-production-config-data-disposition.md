# Coordinated Production Configuration and Data Disposition

## Authoritative final parent M0 disposition — 2026-09-12

The final owner-authorized M0 reconciliation confirms a repository-only disposition. Production is
untouched: no reads, projection DRY RUN/VERIFY/APPLY, migration/backfill, cleanup, scheduler,
maintenance, setting, secret, Auth/identity, provider, or data operation occurred.

| Area | Final disposition |
|---|---|
| Maintenance | `settings/portalMaintenance` remains absent/OFF; any ON activation is a separate owner checkpoint. |
| AI / Pass 2 / Smart Profile | OFF/shadow/parked; no autonomy, vocabulary reset, taxonomy materialization, or reprocess. |
| Schedulers | Retention and other conditional schedules remain paused/not activated. |
| Projection population | Production-locked runner is present and tested; DRY RUN and pre-APPLY VERIFY are distinct from post-APPLY exact-equality VERIFY plus zero-diff DRY RUN. APPLY remains separately owner-gated and was not run. |
| Backfills/migrations | No Staff Artwork, portal projection, lifecycle mirror, queueTab, customer-upload, Auth/identity, hard-delete, or cleanup backfill. |
| Rules/indexes | Final and transition Rules plus additive index union are evidence only; no deploy. |
| Secrets/config/provider | No values read or changed; no Algolia/provider or release setting mutation. |

The additive dual-read cutover remains the reviewed sequence: transition Rules/config and projection
writers → index READY → dry-run/VERIFY → separately gated APPLY → exact-equality VERIFY → repeat
zero-diff dry-run → Portal projection-preferred reader with bounded fallback → final Rules tightening.
Maintenance and any overnight operations remain separately gated. This disposition is evidence for
the parent M0 and does not authorize production action.

## Authoritative post-pre-freeze-child M0 rerun — 2026-09-12

All prior no-mutation dispositions remain: Portal maintenance absent/OFF; AI autonomy shadow/OFF;
Pass 2 parked; retention scheduler paused; no Auth/provider, secret, env, Algolia, Smart Profile,
backfill, migration, cleanup, or production write was performed.

The Staff Artwork Portal projection introduces a mandatory production cutover prerequisite that
the older disposition omitted. Existing production `printRequestItems` must be projected and
verified before the new Portal can rely on `portalPrintRequestItems`. The current runner is
hardcoded to `fresh-prints-dev` and cannot be reused for production.

Before M1, an approved child must add a production-locked runner with dry-run default, explicit
production APPLY confirmation, bounded deterministic pagination, transaction re-read, shared
projection mapping, forbidden-field/privacy checks, full VERIFY, and repeat zero-diff proof. The
runner must exist and be tested before freeze; every later production APPLY/page/window remains an
independent owner checkpoint. Trigger-first ordering is required to cover concurrent writes.

No Assisted multi-proof migration is required. Final-artwork email continues to use existing
provider secrets and does not authorize a secret/config change. Studio next-version selection and
the transitional/final Rules configuration are unresolved parent-amendment inputs, not M0 writes.

## Authoritative post-Staff-Artwork M0 rerun — 2026-09-12

The earlier disposition remains historical. Current source/release review is at dirty
`development` `a76d8be218571e1260bdb983f86ee5cf86563e1b`; no setting, secret, Auth, scheduler,
backfill, migration, index, or production data operation occurred.

| Area | Current disposition |
|---|---|
| Portal maintenance | `settings/portalMaintenance` remains absent/OFF; the trusted resolver allows ordinary mutations when absent and fails closed on malformed enabled state. No initialization or activation. |
| AI / Smart Profile | Autonomy remains OFF/shadow; Pass 2 remains parked; no vocabulary reset, taxonomy materialization, catalog reprocess, or Smart Profile backfill. |
| Schedulers | `purgeExpiredCustomerUploadCatalogRetentionScheduled` is an ADD for later reviewed scheduling, but remains paused/not activated; no retention invocation occurred. Other scheduled exports are dispositioned as retain/no-action or conditional and were not activated. |
| Backfills / migrations | No Staff Artwork migration or backfill; no queueTab or lifecycle mirror backfill; no customer-upload rewrite; no Auth/identity merge, hard-delete, cleanup, or physical deletion. |
| Catalog / Algolia | No production rebuild, provider call, or secret/config change; any Algolia or catalog reprocess remains a separate reviewed operation. |
| Rules/indexes | Whole-file Rules and additive-only index union are evidence only; no deploy. |
| Secrets / env | No secret values read, changed, staged, or copied. Local env/build/debug files remain excluded. |

Staff Artwork AI Review promotion remains an explicit manual callable action, not an autonomous
workflow. Completed show/sheet deletion eligibility is a runtime safety check, not a cleanup job.
The next candidate must revalidate all of these dispositions at its clean SHA before any M1 freeze.

Status: read-only M0 disposition rerun. No production data operation, setting write, secret
rotation, index operation, or maintenance activation was executed.

Rerun snapshot: `development` dirty at `04b9637470a16b0f4d4a1ba9f822fe9df7acca2d`. The signed-off
customer-upload follow-up child adds no migration, backfill, Auth change, secret, or production
write. Its customer-upload fields are written only by the reviewed callables.

| Surface | Disposition for M1/M2 review | M0 action |
|---|---|---|
| `settings/portalMaintenance` | Keep absent unless the reviewed production sequence explicitly creates it; absent means validated OFF/public-safe. Owner/admin callable is the write boundary; do not initialize by hand. | No read/write operation |
| Maintenance activation | Separate human checkpoint after the full capability is deployed and verified. | Remains OFF/not activated |
| AI autonomy | `shadow`/OFF; no autonomous production activation. | No change |
| Semantic Review Pass 2 | Parked/OFF; playground-only, not an automatic catalog authority. | No apply/run |
| Indexed lifecycle reader | Conditional on production mirror coverage and compatibility evidence. Compatibility reader remains preferred until proven. | No migration or reader switch |
| `queueTab` mirror/backfill | Deferred; compatibility derivation avoids requiring a production backfill. The DEV-only backfill callable is not a production action. | No backfill |
| Lifecycle mirror backfill | Conditional only if an indexed reader is approved and a production-safe runner is reviewed. | No backfill |
| Algolia catalog | Conditional/read-only dry run; a full rebuild is disruptive and requires a separate reviewed operation. | No rebuild or secret change |
| Smart Profile/tag retirement | Conditional follow-up; no reprocess, reset, or taxonomy rewrite in this candidate preparation. | No operation |
| Standard print-size settings | Preserve existing production values; any owner change is a separate decision. | No reset/mutation |
| Auth metadata | Preserve current Auth users/providers and reverify at the later validation gate if needed. | No Auth operation |
| Secrets | Compare names/version metadata only; values are never copied into Git or this packet. | No rotation or exposure |
| Other settings | Preserve current production values; no broad settings normalization. | No mutation |

The maintenance contract is specifically absent document → OFF, not absent document → error. If a correctly deployed implementation ever violates that contract, it is an implementation defect and the release must stop for corrective work; no manual document creation is an acceptable workaround.

The owner’s overnight-window requirement for any separately approved production backfills is
preserved as a later execution-plan constraint. No backfill is scheduled or started in M0.
