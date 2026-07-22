# Review: Assisted Creation proof preview hang

| Field | Value |
|-------|-------|
| Date | 2026-07-21 |
| Plan | `docs/workflow/plans/2026-07-21-assisted-creation-proof-preview-hang-plan.md` |
| Verdict | **approved** |
| Reviewer | Managing Agent (owner escalation mandate) |

---

## Summary

Plan correctly identifies the same hang class as the Studio reference-thumb hotfix: ADR-FP-110 moved proof previews to unbounded `getBytes` → blob; refs were fixed to signed-URL-first + timeouts; proofs were not. Portal StatusPanel conflates null URL with loading. Scope is client-only with ADR amend; Storage read rules already allow customer/staff. Soft-deploy is optional/confirm-only.

## Checklist

- [x] Scope clear and bounded
- [x] Architecture alignment (service owns Storage)
- [x] Security: signed TTL URLs OK; opaque names stay; no rule relax
- [x] Data model: none
- [x] Backend: verify-only unless drift
- [x] Test strategy + manual verify adequate
- [x] Human checkpoints: manual UI; soft-deploy gated
- [x] No silent scope expansion

## Required changes

None.

## Security notes

Prefer signed download URLs for `<img src>` (Firebase token TTL). Do not introduce permanent public ACLs. Keep object URL revoke on blob fallback.
