# Review amendment: Production Storage cross-service permission (Class D)

| Field | Value |
|-------|-------|
| Date | 2026-07-31 |
| Reviewer | Review Agent |
| Prior Formal Review | `docs/workflow/reviews/2026-07-31-production-studio-storage-unauthorized-and-bundled-brand-review.md` (**preserved**; verdict `approved_with_changes` remains historical) |
| Plan (amended) | `docs/workflow/plans/2026-07-31-production-studio-storage-unauthorized-and-bundled-brand-plan.md` |
| Incident (updated) | `docs/workflow/reviews/2026-07-31-production-studio-storage-unauthorized-incident.md` |
| Verdict | **approved** — Class D Console cross-service enablement only |

---

## Relationship to prior Formal Review

The prior Formal Review correctly required an evidence gate before choosing remediation class A/B/C and
forbade redeploying identical Rules. It is **not rewritten**. This amendment **supersedes only the
remediation-class selection** after new Console evidence proved Class D.

---

## New decisive evidence

Firebase Console → production Storage → Rules displays:

> “Your rules make use of cross-service database calls, but your project is not configured to execute those calls.”

This matches Firebase documentation for Storage Rules that call `firestore.get()` /
`firestore.exists()` without the cross-service IAM grant
([Manage permissions for cross-service Cloud Storage Security Rules](https://firebase.google.com/docs/rules/manage-deploy#manage_permissions_for_cross-service)).

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Root cause evidence-backed | pass | Console warning is authoritative |
| Remediation minimal | pass | Console “Fix issue” / enable cross-service only |
| No silent Rules/source change | pass | Explicitly out of scope |
| Human checkpoint precise | pass | Dedicated approval phrase |
| Prior review preserved | pass | This file is an amendment, not a rewrite |
| Branding scope unchanged | pass | Mapping approved; implement still gated |

---

## Required changes

- [x] Reclassify remediation to **Class D — Storage↔Firestore cross-service permission enablement**
- [x] Stop Playground/Network diagnostic path unless post-fix uploads still fail
- [x] Record IAM principal/role from Console after Fix issue — do not invent if not shown
- [x] Owner QA checklist for design import + brand upload after enablement

---

## Approval phrase before IAM change

`APPROVE PRODUCTION STORAGE CROSS-SERVICE PERMISSION ENABLEMENT`

---

## Verdict rationale

**approved** for the narrow Class D Console enablement path after owner approval. No Studio rebuild,
Rules deploy, custom claims, App Check, CORS, or domain work.
