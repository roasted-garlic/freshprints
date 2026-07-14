# Review: Owner Studio archive-first design asset purge

| Field | Value |
|-------|-------|
| Date | 2026-07-14 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-07-14-owner-studio-design-asset-purge-plan.md |
| Verdict | **approved_with_changes** |

---

## Summary

Archive-first, owner-only single/bulk asset purge from the Archived library is a sound, bounded slice of the broader delete policy. History-safe keep-thumbnail + design doc matches prior product intent. Security must ensure purge fields and Storage deletes are not forgeable via existing staff design write rules.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Full hard-delete deferred |
| Architecture alignment | pass | Callable + Admin SDK; UI not boundary |
| Security impact addressed | pass | With required rules hardening below |
| Data model impact addressed | pass | Optional purge fields; status stays archived |
| Backend impact addressed | pass | New callable; no new secrets |
| Test strategy adequate | pass | Unit + typecheck + build + manual |
| Human checkpoints identified | pass | Manual UI; prod deploy later |
| Roadmap alignment | pass | Queued owner purge item |
| Documentation plan | pass | DATA_MODEL, SECURITY, ADR |
| No silent scope expansion | pass | Bulk archive / tombstone out |

---

## Architecture Review

**Findings:**
- Matches wipe-style owner callable pattern.
- Soft archive unchanged for staff; purge is a separate irreversible step.

**Required changes:**
- [x] None beyond security field write restriction below

---

## Security Review

**Findings:**
- Owner-only callable is correct; client `designs` delete stays denied.
- Staff may currently update design docs broadly — clients must **not** be able to set `assetsPurgedAt` / `assetsPurgedBy` or clear `originalPath`/`previewPath` as a fake purge. Restrict those fields in `firestore.rules` (or equivalent field-level deny) so only Admin SDK (callable) can write them.
- Do not treat Studio Storage client delete as the product purge path.

**Required changes:**
- [ ] Firestore rules: deny client writes to purge audit fields and purge path-clearing; Function owns those updates
- [ ] Bulk delete: require explicit confirmation string (or equivalent strong confirm) in addition to checkbox
- [ ] Cap `designIds.length` (recommend ≤ 25) server-side

**Human approval needed before production:**
- [x] Production Functions + rules deploy (separate gate)

---

## Data Model Review

**Findings:**
- Keeping `status: archived` + `assetsPurgedAt` is clear; hide purged from default Archived query.
- Restore must refuse when purged.

**Required changes:**
- [ ] None additional

---

## Backend Review

**Findings:**
- Per-id result reporting for bulk is required for partial failures.
- Active-queue warn+confirm with `confirmActiveQueue` is acceptable for this phase.

**Required changes:**
- [ ] None additional

---

## Testing Review

**Findings:**
- Manual matrix covers roles, bulk, queue warning, restore block — sufficient.

**Required changes:**
- [ ] None

---

## Documentation Review

**Findings:**
- ADR must record supersession of “purge from live.”
- SECURITY.md must document owner purge callable + rules.

---

## Required Changes (if approved_with_changes)

1. **Rules:** Clients cannot write `assetsPurgedAt` / `assetsPurgedBy` or perform purge-equivalent path clearing; only Admin SDK via callable.
2. **Bulk confirm:** Strong confirmation (typed phrase or equivalent) for bulk Delete.
3. **Batch cap:** Server reject if `designIds.length` exceeds agreed max (≤ 25).

---

## Blockers (if blocked)

None.

---

## Verdict Rationale

**approved_with_changes** — Product flow matches owner direction; implement the three security/UX constraints above without expanding to tombstone hard-delete.

---

## Next Step

Implement approved scope (including required changes).
