# Coordinated Production Rules Manifest

Status: read-only M0 reconciliation rerun artifact. No Firestore or Storage Rules deployment was executed.

Rerun snapshot: `development` dirty at `04b9637470a16b0f4d4a1ba9f822fe9df7acca2d`. The signed-off
customer-upload follow-up child made no Rules changes; whole-file hashes and the inherited rule map
were re-read and are unchanged. No new permission bypass or hard-delete exposure was found.

## Whole-file inputs

| File | Production baseline SHA-256 | Candidate working-tree SHA-256 | Diff (added/deleted) |
|---|---|---|---:|
| `firestore.rules` | `cdd4a3154733cfdceea53be9a785e39e4ea526a27da5e1046a802e33557defad` | `7c9c4a0026c4655ddedb606c043429dbf04d7a4cfe7c02a7af61ee002140612b` | 79 / 14 |
| `storage.rules` | `39f17c0fbc25435eac4355ec2b5977a1aaecf3b340619b3d5f0b6d4ae22a3a36` | `d3260351cbf12e550dd3e5e89a1e217dc4b9a0c4e2d819221d6ec8fc5d946297` | 58 / 1 |

The candidate is the complete current file, not a patch fragment. Before M1, these hashes must be regenerated at the clean candidate SHA.

For scope accounting, the inherited accepted-candidate delta `origin/production → HEAD` is 558/81
lines in Firestore Rules and 14/4 in Storage Rules. The current maintenance slice `HEAD → working
tree` is 79/14 and 58/1 respectively (stage stats are not arithmetically additive because diff
hunks share context). The inherited lines were reviewed by rule block and map to
the accepted parent scope as follows; they are not silently treated as maintenance-only:

| Inherited rule block | Parent disposition |
|---|---|
| Print Request parking/editing/re-add, queue-tab and lifecycle mirror/event immutability | Accepted Show Queue and lifecycle-history slices; compatibility fields/readers preserved |
| Print Request item resize/upscale and artwork metadata/background/halftone/explicit-content validation | Accepted Portal/Studio editing and AI/catalog slices |
| Upcoming-show production recovery, capacity and DEV fixture validation | Accepted Show Queue/recovery scope; DEV fixture writes remain excluded from production |
| Lifecycle event collection and server-owned mirror fields | Accepted lifecycle ordering scope; direct client writes remain denied |
| Internal Gang Sheet, standard print sizes, AI trace, catalog reprocess, staff inbox suppression settings | Accepted settings/AI/catalog slices; conditional or deferred operations remain so |
| Customer identity audit/merge-preview/tombstone/hard-delete support collections | Accepted identity safety scope; destructive hard-delete callables remain excluded |
| Storage original-name/ZIP/source/assisted-image validation | Accepted upload/assisted-creation scope; staff/customer boundaries remain intact |

The remaining `HEAD → working tree` hunks are the maintenance resolver, private maintenance document
match, and customer mutation guards described below. This two-stage accounting covers the complete
whole-file drift; no unrelated hunk was identified in the Rules diff.

## Reviewed change map

| File | Candidate maintenance enforcement | Compatibility / safety finding |
|---|---|---|
| `firestore.rules` | Adds validated `settings/portalMaintenance` resolver; absent document is OFF; owner/admin read only and all direct writes denied. Customer profile, favorites, print requests/items, and notifications customer mutations call the resolver. | Staff branches remain available. Present malformed state fails closed. No hard-delete rule or callable exposure is present. |
| `storage.rules` | Adds the same validated resolver against Firestore. Customer ZIP/source and assisted-creation image create/update/delete paths call it. | Staff reads/actions remain available. Absent document is OFF; malformed state fails closed. No hard-delete Storage path is present. |

The Firestore customer-document update hunk only separates the customer branch (now guarded) from the existing staff branch; required-field, identity, and immutable-field checks remain in the staff branch. The favorites, print-request, print-request-item, notification, ZIP, source, and assisted-image hunks add the same customer mutation guard without broadening staff access.

## Required proofs

- `portalMaintenanceDataIsValid` requires a boolean `enabled` and bounds optional message/tester fields.
- `portalMaintenanceAllowsCustomerMutation` treats a missing document as allowed/OFF; enabled state permits only the configured authenticated customer.
- `settings/portalMaintenance` is private to owner/admin reads and rejects direct writes; callables remain the write boundary.
- `rg hardDelete|previewHardDelete firestore.rules storage.rules` returns no matches. Hard-delete Functions are excluded separately in the Function closure manifest and are not implied by Rules deployment.
- No index is required by these Rules changes; the index union is documented separately.
- No `--force`, deploy, data write, production activation, or DEV setting mutation occurred.

These are the exact whole-file candidate manifests for later review, not authorization to deploy them.

The child fields (`catalogExclusionReason`, follow-up status, timestamps, and opaque token) remain
server-authoritative in `customerUploads`; `customerNotifications` creation remains server-only and
the Portal client is read-state-only. The three follow-up callables do not require a Rules or
Storage Rules edit. Any later candidate SHA must repeat this whole-file comparison.
