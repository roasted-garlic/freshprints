# Incident: Production Studio Storage `storage/unauthorized`

| Field | Value |
|-------|-------|
| Date | 2026-07-31 |
| Goal | `production-release` (Goal #13) |
| Phase | Phase G / Stage 1 — **blocked** on catalog fixture |
| Status | **CLOSED — Class D** — IAM applied; owner QA **PASS WITH NOTES** (2026-07-31). |
| Related | Plan `docs/workflow/plans/2026-07-31-production-studio-storage-unauthorized-and-bundled-brand-plan.md`; prior Formal Review preserved; amendment `docs/workflow/reviews/2026-07-31-production-storage-cross-service-permission-review-amendment.md`; checkpoint `docs/workflow/reviews/2026-07-31-production-storage-cross-service-permission-checkpoint.md` |

---

## Decisive root-cause update (2026-07-31, later)

Firebase Console → `fresh-prints-prod` → Storage → Rules shows:

> “Your rules make use of cross-service database calls, but your project is not configured to execute those calls.”

### Revised exact root cause

Production Cloud Storage Security Rules call `firestore.exists()` / `firestore.get()` on
`users/{request.auth.uid}` inside `isStaff()` / `isOwner()`. The production project **has not been
configured** with the required Storage↔Firestore **cross-service permission**, so those lookups cannot
execute. Rule predicates that depend on them evaluate as deny → client `storage/unauthorized` for
authenticated staff/owner writes (design originals + brand logo creates).

Public-read paths that do **not** need Firestore cross-service calls (e.g. generated catalog,
brand path validators without user lookup) continue to behave normally — consistent with earlier
probes.

### Revised remediation class

**Class D — Production Storage-to-Firestore cross-service permission enablement**

Expected action: Firebase Console Storage Rules **“Fix issue”** (enable cross-service permissions).
Do **not** modify or redeploy `storage.rules`, add custom claims, rebuild Studio, or change App Check
unless post-fix uploads still fail.

### IAM expectation (docs-backed; confirm in Console)

| Item | Value |
|------|-------|
| Role (Firebase docs) | **Firebase Rules Firestore Service Agent** (`roles/firebaserules.firestoreServiceAgent`) — see [Manage permissions for cross-service Cloud Storage Security Rules](https://firebase.google.com/docs/rules/manage-deploy#manage_permissions_for_cross-service) |
| Principal granted by “Fix issue” | **[NEEDS CONSOLE CONFIRMATION]** — record exact service account after the owner runs Fix issue / from IAM preview before clicking if shown |

### Approval phrase (stop here until granted)

`APPROVE PRODUCTION STORAGE CROSS-SERVICE PERMISSION ENABLEMENT`

**Granted 2026-07-31.** IAM applied (see checkpoint). Owner Studio QA **PASS WITH NOTES**
(2026-07-31): Console warning gone; design + brand uploads authorized; Design Library + brand
persist OK; brief catalog-image delay = publisher debounce/snapshot/refresh, not auth failure.
Incident closed.

### IAM result (recorded after enablement)

| Item | Value |
|------|-------|
| Role | `roles/firebaserules.firestoreServiceAgent` (Firebase Rules Firestore Service Agent) |
| Principal | `service-473623863375@gcp-sa-firebasestorage.iam.gserviceaccount.com` |
| Method | Cloud IAM `setIamPolicy` (Console Fix-issue equivalent) |
| Rules deploy | **No** |

### Post-fix verification (after Fix issue)

1. Console warning disappears
2. Record exact IAM principal + role granted (no credentials)
3. Fully close and reopen production Studio
4. Import one approved PNG &lt;150 MB
5. Upload one brand-logo PNG ≤2 MB
6. Both pass Storage authorization
7. Design completes Imports → AI Review → Design Library
8. Brand logo persists and displays
9. Confirm no Rules deploy / App Check / claims / Studio rebuild was required
10. Resume Playground/Network **only if** either upload still fails

Playground/Network diagnostic path from the earlier gate is **stopped** unless step 10 applies.

---

## Owner evidence (recorded accurately)

### Design import failure

- File: `Steph Running Now - V 1.png`
- Source size: ~41.41 MB (below 150 MB original-PNG rule ceiling)
- Validation: PASSED; post-trim ~7537×10794; local resolution Optimal
- Failure during upload: `You do not have permission to upload design files to Firebase Storage.`
- Mapped from Firebase `storage/unauthorized` / `storage/unauthenticated` in
  `apps/studio/src/renderer/src/features/imports/services/importUploadService.ts`

### Brand-logo surface failure

- Settings error text:
  `Firebase Storage: User does not have permission to access 'brand/studio/full/eebab5a8-c51a-44d3-962e-7e2f29508ec1.png'. (storage/unauthorized)`
- Path shape matches `brand/{studio|portal}/{full|collapsed}/{uuid}.png`

---

## Diagnosis summary

Treat both failures as **one authenticated Storage write incident** until proven otherwise.

**Brand path is not an existing public object read.** Production inventory shows:

- `settings/brandLogos` → **document not found**
- `brand/` prefix → **0 objects**
- Named object `brand/studio/full/eebab5a8-…png` → **No such object** (admin GCS metadata 404)

That UUID is the **new object path** generated by `uploadBytes` in
`brandLogoSettingsService.uploadAndFinalize` before `finalizeBrandLogoSlot`. The Settings UI
surfaces the raw Firebase Storage error when create is denied. There is no production uploaded
Studio logo to “read.”

**Design import** fails at the same authorization boundary: client create under
`originals/{designId}.png` (Firestore auto-id + `.png`), with explicit `contentType: image/png`.

---

## Workstream A — source `storage.rules`

| Item | Result |
|------|--------|
| SHA-256 | `e11cb3bf1cf316bd9ba77765f8a112b355ced2d7aef4e5a4b9ae4fb400c3c730` |
| `originals/{fileName}` | staff read/create/update/delete; create/update require canonical `[A-Za-z0-9_-]+\.png` + PNG + &lt;150 MB |
| `thumbnails` / `previews` | staff write; staff or ready-design public read for `{designId}.webp` |
| `brand/{appId}/{slotId}/{fileName}` | **public read** when app/slot/uuid.png valid; **owner** create (PNG ≤2 MB); update false; owner delete |
| Staff/owner lookup | `firestore.exists` + `firestore.get` on `users/{request.auth.uid}`; `isActive == true`; role checks |
| Catch-all | deny |

**Should the failing requests pass source rules (if Auth + user doc resolve)?**

| Request | Verdict |
|---------|---------|
| Owner create `originals/{autoId}.png` ~41 MB `image/png` | **Yes** (`isStaff` + canonical name + size/MIME) |
| Owner create `brand/studio/full/{uuid}.png` ≤2 MB `image/png` | **Yes** (`isOwner` + path validators) |
| Unauthenticated get of missing brand path | **Allow read evaluation** → object missing (404), not deny |
| Brand create &gt;2 MB | **No** (size predicate) — separate from design import |

---

## Workstream B — packaged Studio `v1.0.0-rc5`

Inspected: `apps/studio/release/0.0.0/win-unpacked/resources/app.asar` → extracted renderer bundle.

| Field | Packaged value (secrets redacted) |
|-------|-----------------------------------|
| `projectId` | `fresh-prints-prod` |
| `authDomain` | `fresh-prints-prod.firebaseapp.com` |
| `storageBucket` | `fresh-prints-prod.firebasestorage.app` |
| `appId` | `1:473623863375:web:524ec1a63f547e4d85ca3a` (suffix `…85ca3a`; same Web app as Portal) |
| Auth + Storage | Source `firebase.ts`: single `app`; `getAuth(app)` + `getStorage(app)` — same instance |
| App Check init | **None** in Studio/Portal client source |

No `fresh-prints-dev` bucket baked into `VITE_FIREBASE_*`. Occurrences of `fresh-prints-dev` in the
bundle are gate/exclusion strings, not active Firebase config.

---

## Workstream C — live production Storage

| Check | Result |
|-------|--------|
| Default bucket | `fresh-prints-prod.firebasestorage.app` (US-CENTRAL1) |
| Alternate app bucket | **None** (only GCF source/upload buckets besides default) |
| Studio target | Matches packaged `storageBucket` |
| App Check services list | Empty `{}` (v1 + v1beta) — **no Storage App Check enforcement configured** |
| Live Storage Rules release | `firebase.storage/fresh-prints-prod.firebasestorage.app` → ruleset `fbcb0ee4-732e-420f-afff-01041d2eee1b` |
| Live vs repo | **Byte-identical** (same SHA-256 as repo `storage.rules`) |
| Brand object | **Missing** |
| Partial import objects | `originals/`, `thumbnails/`, `previews/`, `brand/` all **empty** (0 objects) |
| CORS | Present for hosted.app + apex + www (unchanged this pass) |
| Firebase Storage service agent | Present on project IAM (`roles/firebasestorage.serviceAgent`) |

---

## Workstream D — public read vs authenticated write

| Probe (unauthenticated Firebase Storage REST metadata) | Result |
|--------------------------------------------------------|--------|
| `generated/catalog-reference/manifest.json` | **200** (public read works) |
| Missing `generated/portal-catalog/…` | **404** (public-read path, object absent) |
| Missing `brand/studio/full/{uuid}.png` | **404** (public-read path allowed; object absent) |
| Missing `originals/….png` | **403** (staff-only; anonymous denied) |

Owner Firestore profile (read-only): one user, `role=owner`, `isActive=true`, timestamps present
(prefix `7v3SLj…`). Note: document has no separate `id` string field; Storage Rules do not require it.

Firebase Rules `:test` API calls from this environment returned `INVALID_ARGUMENT` — **could not
authoritatively simulate owner create** via CLI. Console Rules Playground remains required.

---

## Hypothesis matrix

| # | Hypothesis | Evidence | Verdict |
|---|------------|----------|---------|
| 1 | Wrong packaged `storageBucket` | asar has `fresh-prints-prod.firebasestorage.app` | **Ruled out** |
| 2 | Dev Firebase app for Storage | projectId/bucket/appId are prod | **Ruled out** |
| 3 | Auth/Storage different app instances | `firebase.ts` single app | **Ruled out** (source + config) |
| 4 | Live Rules ≠ source | SHA match exact | **Ruled out** |
| 5 | Rules deployed to wrong project/bucket | Release name targets prod default bucket | **Ruled out** |
| 6 | App Check blocks Electron Storage | No client App Check; services empty; public Storage REST works without App Check token | **Ruled out** |
| 7 | Owner profile invisible to Rules | Doc exists with correct role/active | **Still possible** if `firestore.get` fails at evaluation despite doc existing |
| 8 | Stale/wrong-project Auth token | Owner uses Studio against prod Firestore successfully; token not decoded this pass | **Still possible** for Storage-only attachment failure |
| 9 | Brand object missing | Confirmed missing; settings doc absent | **Confirmed as state**; does **not** explain `unauthorized` (would be object-not-found for reads). Error is **write deny** |
| 10 | Path/filename mismatch | Brand UUID + `.png` matches; originals use Firestore auto-id + `.png` | **Ruled out** for reported design path pattern |
| 11 | MIME/size violate Rules | Design ~41 MB PNG under 150 MB with forced `image/png`; brand ≤2 MB still required | **Ruled out for design**; **still possible for brand** if uploaded file &gt;2 MB |
| 12 | CORS | Error is `storage/unauthorized`, Studio/Electron | **Ruled out** |
| 13 | Authenticated Storage **create** denied despite allow rules | Both owner writes fail; public paths behave; rules identical | **Confirmed symptom**; mechanism **still open** (7/8) |

---

## Exact root cause (honest)

**Confirmed:** Production Studio cannot perform **authenticated Storage creates** for catalog
originals or brand logos. Packaged Firebase config and live Storage Rules are correct and aligned.
The brand Settings error is a **failed upload**, not a failed public read of an existing logo.

**Not yet proven (blocking for remediation class selection):** whether the deny comes from

1. Storage Rules failing `isStaff()` / `isOwner()` because `firestore.exists`/`get` on
   `users/{uid}` does not succeed during Rules evaluation, or
2. The Electron client Storage request lacking a usable Firebase Auth context on the upload, or
3. (Brand-only) uploaded bytes exceeding the 2 MB brand predicate

Redeploying the identical `storage.rules` file is **not** a fix.

---

## What was not done

No Storage Rules deploy, App Check change, bucket change, Studio rebuild, DNS/domain/Auth/OAuth,
App Hosting rollout, CORS reapplication, snapshot rebuild, asset replacement, or runtime source edit.
