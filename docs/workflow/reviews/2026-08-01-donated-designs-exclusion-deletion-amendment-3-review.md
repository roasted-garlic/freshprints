# Donated Designs exclusion/deletion Amendment 3 formal review

## Independent review

The requested complete-asset semantics were checked against the current shared `CustomerUpload` type, canonical Storage path helpers, finalize pipelines, batch schema, exclusion/restore callables, and trusted role authorization.

## Findings

- The current schema has four upload-owned Storage-path fields; no separate trimmed or normalized derivative path exists.
- A named authoritative field manifest is safer than scanning arbitrary document strings. A future unreviewed `*StoragePath` field must fail closed rather than be ignored or guessed.
- Canonical path parsing must bind the customer UID and upload ID, preventing shared/unrelated deletion.
- Deleting the Firestore document after partial Storage failure would destroy the trusted retry manifest and risk orphans. The document must remain until all confirmed objects are clean.
- Missing objects are safely idempotent and must not block remaining cleanup.
- A batch archive is shared by its batch and must never be deleted. Only the deleted upload's manifest entry/counters may be adjusted.
- Restore already authorizes all active owner/admin/helper roles without recording or checking the excluding actor, so actor-independent restoration requires tests rather than a permission redesign.

## Required implementation conditions

1. Preserve the trusted owner/admin delete and helper-denial boundary.
2. Fail closed on malformed, unrelated, batch, or unexpected persisted Storage-path fields.
3. Delete the upload document only after complete Storage cleanup.
4. Keep batch cleanup transactional with upload-document deletion and bounded to upload-specific metadata.
5. Do not deploy or perform production actions.

## Verdict

**APPROVED WITH CONDITIONS** — implementation may proceed within the conditions above.
