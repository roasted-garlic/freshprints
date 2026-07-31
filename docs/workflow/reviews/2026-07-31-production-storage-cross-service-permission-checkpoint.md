# Checkpoint: Production Storage cross-service permission enablement

| Field | Value |
|-------|-------|
| Date | 2026-07-31 |
| Goal | `production-release` (Goal #13) |
| Approval | `APPROVE PRODUCTION STORAGE CROSS-SERVICE PERMISSION ENABLEMENT` |
| Plan | `docs/workflow/plans/2026-07-31-production-studio-storage-unauthorized-and-bundled-brand-plan.md` |
| Amendment review | `docs/workflow/reviews/2026-07-31-production-storage-cross-service-permission-review-amendment.md` |
| Status | **IAM grant applied** — owner Studio post-fix QA required |

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

## Owner post-fix QA (required)

1. Confirm Console Storage Rules cross-service warning is **gone** (refresh Rules page).
2. Fully **close and reopen** production Studio.
3. Import one approved PNG under 150 MB → Storage authorization must succeed.
4. Upload one brand-logo PNG ≤2 MB → Storage authorization must succeed.
5. Design completes Imports → AI Review → Design Library.
6. Brand logo persists and displays.
7. Reply `PASS` / `PASS WITH NOTES: …` / `FAIL: …`

Resume Playground/Network diagnosis **only if** either upload still fails.
