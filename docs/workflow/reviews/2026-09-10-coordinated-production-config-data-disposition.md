# Coordinated Production Configuration and Data Disposition

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
