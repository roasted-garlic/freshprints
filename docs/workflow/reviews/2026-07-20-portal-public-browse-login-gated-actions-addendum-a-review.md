# Review note: #13 Addendum A (guest chrome + guest donate)

| Field | Value |
|-------|-------|
| Date | 2026-07-20 |
| Plan | `docs/workflow/plans/2026-07-20-portal-public-browse-login-gated-actions-plan.md` (Addendum A) |
| Verdict | **owner-approved scope expansion** — proceed Implement |

## Summary

Owner requested guest chrome polish (A1–A3, A5) and **guest catalog donations** (A4), overriding the original binding default that `/donate` stays hard-auth. Security model keeps Admin/callable-owned Firestore writes and rejects public unauthenticated Storage writes; Firebase Anonymous Auth supplies a durable UID for paths + quotas with sentinel attribution (`uploaderType` / `customerId` / `createdBy` = `guest`).

## Security checklist

- [x] No client Firestore create/update of uploads
- [x] No `allow write` for `auth == null` on customer-upload Storage
- [x] Print-request purpose remains portal-customer only
- [x] Stricter guest donation daily finalize cap documented
- [x] Rules + Functions + Anonymous Auth enablement require **human deploy approval** (repo-only until then)
- [x] Residual spam risk (anon UID rotation; no App Check) recorded for SECURITY / RISK

## UI polish

A1–A3 / A5 are UX-only within public-browse shell; do not weaken catalog public-read predicates from base #13.

## Next step

Implement Addendum A in repo; update docs/ADR; run focused tests; stop for human deploy approval (Auth Anonymous + rules + functions).
