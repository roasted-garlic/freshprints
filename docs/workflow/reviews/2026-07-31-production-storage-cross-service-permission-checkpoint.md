# Checkpoint: Production Storage cross-service permission enablement

| Field | Value |
|-------|-------|
| Date | 2026-07-31 |
| Goal | `production-release` (Goal #13) |
| Approval | `APPROVE PRODUCTION STORAGE CROSS-SERVICE PERMISSION ENABLEMENT` |
| Plan | `docs/workflow/plans/2026-07-31-production-studio-storage-unauthorized-and-bundled-brand-plan.md` |
| Amendment review | `docs/workflow/reviews/2026-07-31-production-storage-cross-service-permission-review-amendment.md` |
| Status | **PASS WITH NOTES** — Storage authorization restored; Class D closed |

---

## Action performed

Equivalent to Firebase Console Storage Rules **“Fix issue”** (cross-service enablement), applied via
Google Cloud IAM `setIamPolicy` after owner approval.

| Item | Value |
|------|-------|
| Project | `fresh-prints-prod` |
| Role | `roles/firebaserules.firestoreServiceAgent` (**Firebase Rules Firestore Service Agent**) |
| Principal | `serviceAccount:service-473623863375@gcp-sa-firebasestorage.iam.gserviceaccount.com` (Cloud Storage for Firebase service agent) |
| Method | IAM grant (API); **not** a Storage Rules deploy; `storage.rules` unchanged |
| Pre-state | Role binding **absent** |
| Post-state | Role binding **present** (verified via `getIamPolicy`) |

No credentials or tokens recorded.

---

## Not performed

- `storage.rules` edit or `firebase deploy --only storage`
- App Check changes
- Custom claims
- Studio rebuild
- CORS / DNS / domain / Auth / OAuth
- Brand asset replacement

---

## Owner post-fix QA — **PASS WITH NOTES** (2026-07-31)

| Check | Result |
|-------|--------|
| Console cross-service warning gone | yes |
| Studio fully restarted | yes |
| Catalog design upload authorized | yes |
| Brand-logo upload authorized | yes |
| Design: Imports → AI Review → Design Library | yes |
| Brand logo persisted and displayed | yes |
| Remaining upload/authorization failures | none |

**Notes:** Brief delay before the newly approved catalog image appeared — consistent with the
generated catalog publisher’s bounded 15-second debounce plus snapshot publication and client
refresh time. Not an authorization failure.

Playground/Network diagnosis **not resumed** (uploads succeeded).

---

## Follow-on (not part of this checkpoint)

- Stage 1B upcoming show + Stage 1C catalog fixture (owner Studio) — now unblocked
- Brand asset file replacement still gated on `APPROVE BUNDLED BRAND ASSET IMPLEMENTATION`
- Stage 2 hosted.app smoke still waits on Stage 1B/1C fixtures
