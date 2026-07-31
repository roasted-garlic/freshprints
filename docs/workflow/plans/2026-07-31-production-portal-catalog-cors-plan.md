# Plan: Production Portal catalog unavailable — Storage CORS fix

| Field | Value |
|-------|-------|
| Date | 2026-07-31 |
| Author | Agent |
| Status | ready_for_review |
| Workflow | managed-phase (`production-release` Goal #13 amendment) |
| Related | `docs/workflow/plans/2026-07-30-production-release-plan.md`; `docs/workflow/setup/firebase-storage-cors.md` |

---

## Goal

Restore production Portal Discover so an empty ready-design catalog (0 designs, 18 categories,
1,122 approved tags) loads a normal empty state instead of
`Catalog discovery is temporarily unavailable.`, without republishing snapshots or changing
Portal/Functions application logic unless review finds that necessary.

## Background

Owner successfully invoked `rebuildCatalogSnapshots` once on `fresh-prints-prod`:

| Side | contentVersion | generation |
|------|----------------|------------|
| reference | `1163-7e03ee6c990f8eac` | 1163 |
| portal | `1-4f53cda18c2baa0c` | 1 |

Studio Design Library loads. Portal Discover still shows the unavailable message.

This matches the **exact prior `fresh-prints-dev` failure class** documented in workflow state
(2026-07-24): Node/curl reads succeed; browser `fetch` of Firebase Storage download URLs fails
without bucket CORS. Production CORS was explicitly deferred as its own checkpoint in
`docs/workflow/setup/firebase-storage-cors.md` and was never applied to
`gs://fresh-prints-prod.firebasestorage.app`.

### Phase 1 read-only diagnosis (evidence)

#### Live portal-catalog assets (anonymous `getDownloadURL` + fetch — Node, no CORS)

| Asset | Result |
|-------|--------|
| `generated/portal-catalog/manifest.json` | HTTP 200; schemaVersion **2**; contentVersion `1-4f53cda18c2baa0c`; generation **1**; `filters.tagFacetPath` present; `recent.pageCount` **0**; `search.existingShardKeys` `[]`; no `cardOverrides` |
| `…/v1-4f53cda18c2baa0c/discover.json` | HTTP 200; schemaVersion 1; `designs: []` |
| `…/filters/tags-facet.json` | HTTP 200; `tags: []` |
| `…/studio/ready-index.json` | HTTP 200; `designs: []` |
| recent page 0 | Not written (`pageCount: 0`) — Discover does not require it |
| `generated/catalog-reference/manifest.json` + client | HTTP 200; 18 categories, 1,122 tags |

Unauthenticated `?alt=media` **without** download token returns HTTP 403; tokenized /
`getDownloadURL` URLs return 200. That is normal Firebase Storage behavior and is **not** the
Portal failure mode (Portal uses `getDownloadURL` then `fetch`).

#### Portal consumer path

`useCatalogHomeDesigns` → `portalCatalogAssetService.listDiscoverDesigns()` →
`loadPortalManifest()` → `fetchJson(manifest.discoverPath)`. Any thrown error is replaced with
`Catalog discovery is temporarily unavailable.` Empty `designs: []` is valid and would render an
empty catalog if the fetch succeeded.

`NEXT_PUBLIC_USE_GENERATED_CATALOG_SNAPSHOTS` defaults to enabled unless explicitly `'false'`.
Deployed Portal chunk contains `return"false"!==…NEXT_PUBLIC_USE_GENERATED_CATALOG_SNAPSHOTS`
(flag **on**).

#### Deployed Portal configuration

| Check | Result |
|-------|--------|
| Serving URL | `https://fresh-prints-portal--fresh-prints-prod.us-central1.hosted.app` |
| `https://myprintrequest.com` | Still **Coming Soon** landing page (custom domain not attached — out of scope) |
| Embedded `projectId` | `fresh-prints-prod` |
| Embedded `storageBucket` | `fresh-prints-prod.firebasestorage.app` |
| Generated-catalog consumer | Present (`generated/portal-catalog/manifest.json`, unavailable copy, schema-v2 path) |
| App Hosting backend `updateTime` | `2026-07-31T02:55:07Z` (first successful rollout window; automatic rollouts disabled) |
| First rollout Git commit (workflow record) | `11ed4ef` (Turborepo App Hosting fix) |
| Current `origin/production` | `c644935` — **no Portal/shared catalog-path commits** between `11ed4ef` and `c644935` |

#### Storage Rules

Repo `storage.rules` already has `match /generated/portal-catalog/{allPaths=**} { allow read: if true; allow write: if false; }`. Anonymous `getDownloadURL` on production **succeeds**, proving production Rules already allow public reads. **No Rules change.**

#### CORS comparative proof (decisive)

Same `getDownloadURL` download URL pattern, GET with `Origin` header:

| Bucket | Origin | `Access-Control-Allow-Origin` on GET |
|--------|--------|--------------------------------------|
| `fresh-prints-dev.firebasestorage.app` | `https://myprintrequest.dev` | `https://myprintrequest.dev` |
| `fresh-prints-prod.firebasestorage.app` | `https://fresh-prints-portal--fresh-prints-prod.us-central1.hosted.app` | **missing (`null`)** |
| `fresh-prints-prod.firebasestorage.app` | `https://myprintrequest.com` | **missing (`null`)** |

Browser JS cannot read the Storage response body without ACAO → `fetch` throws → Portal maps to
unavailable. Node diagnosis does not see this (no CORS enforcement).

### Root-cause classification

**7. CORS or Storage URL construction error** — specifically **missing production Storage bucket CORS**
for Portal origins. Not (1)–(6), (8), or publisher empty-asset omission.

---

## Scope

### In Scope

- Document proven root cause
- Add a production Storage CORS config file (origins: live App Hosting URL + intended apex domain)
- Update `docs/workflow/setup/firebase-storage-cors.md` and `DEPLOYMENT.md` with production apply/verify commands
- Stop at an explicit human production CORS apply checkpoint
- Owner browser retest of Discover empty state after CORS apply

### Out of Scope

- Rerunning `rebuildCatalogSnapshots`
- Portal/Functions/Rules code changes (not required by evidence)
- App Hosting rollout (not required for this defect; no Portal catalog delta since first rollout)
- Custom-domain DNS/App Hosting domain attachment
- Importing designs; changing categories/tags
- Broad Firebase redeploy; IAM; service accounts

---

## Affected Areas

### Files / Modules (expected)

- `storage.cors.production.json` (new) — production bucket CORS document
- `docs/workflow/setup/firebase-storage-cors.md` — production section with exact bucket + commands
- `docs/standards/DEPLOYMENT.md` — note production CORS checkpoint status
- Optionally keep `storage.cors.json` as **dev-only** (unchanged origins)

### Architecture Impact

- [x] None (bucket CORS only; same public-read Storage Rules)

### Security Impact

- [x] Details: CORS only allows browser origins to **read response bodies** for objects already
  public per Storage Rules. No write methods. Does not grant access to
  `generated/catalog-reference/ai/**`. Origins limited to production Portal hosts.

### Data Model Impact

- [x] None

### Backend Impact

- [x] Details: GCS/Firebase Storage **bucket CORS configuration** on
  `gs://fresh-prints-prod.firebasestorage.app` only. No Functions, Rules, or App Hosting change.

### UI / UX Impact

- [x] Details: Discover empty state becomes visible; unavailable banner clears after CORS apply.
  Manual owner retest required.

### Migration Impact

- [x] None — no republish required; existing generation-1 assets are valid.

---

## Approach

1. Add `storage.cors.production.json`:

```json
[
  {
    "origin": [
      "https://fresh-prints-portal--fresh-prints-prod.us-central1.hosted.app",
      "https://myprintrequest.com",
      "https://www.myprintrequest.com"
    ],
    "method": ["GET", "HEAD"],
    "responseHeader": [
      "Content-Type",
      "Cache-Control",
      "ETag"
    ],
    "maxAgeSeconds": 3600
  }
]
```

   `www` is included preemptively for the intended production host pair; it does not widen object
   ACL. Localhost must **not** be added to the production bucket.

2. Update CORS setup doc with inspect / apply / verify commands targeting
   `gs://fresh-prints-prod.firebasestorage.app` and this file.

3. **STOP** for human approval. Owner (or agent with explicit approval) runs:

```bash
gcloud storage buckets describe gs://fresh-prints-prod.firebasestorage.app --format="default(cors_config)"
gcloud storage buckets update gs://fresh-prints-prod.firebasestorage.app --cors-file=storage.cors.production.json
gcloud storage buckets describe gs://fresh-prints-prod.firebasestorage.app --format="default(cors_config)"
```

4. Post-apply verification (agent or owner): GET tokenized manifest URL with
   `Origin: https://fresh-prints-portal--fresh-prints-prod.us-central1.hosted.app` must return
   `Access-Control-Allow-Origin` echoing that origin (same pattern as dev).

5. Owner retests Discover on the **hosted.app** URL (apex still Coming Soon until custom-domain work).

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Typecheck | n/a (docs/config only) | no |
| Lint | `npm run lint` if markdown/json touched under lint scope | yes if applicable |
| Unit tests | n/a for CORS-only | no |
| Build | n/a | no |
| `git diff --check` | yes | yes |
| Rules / Functions | not changed | no |

### Manual

- [ ] After CORS apply: open
  `https://fresh-prints-portal--fresh-prints-prod.us-central1.hosted.app` Discover/home
- [ ] Expect: page shell loads; empty catalog / no designs; **no** unavailable message
- [ ] DevTools Network: Storage `manifest.json` / `discover.json` GET succeed (not CORS-blocked)
- [ ] Console: no `Access-Control-Allow-Origin` errors for `firebasestorage.googleapis.com`

---

## Human Checkpoints Anticipated

- [x] Production bucket CORS apply (`APPROVE PRODUCTION STORAGE CORS`)
- [x] Owner Portal Discover retest after apply
- [ ] Custom domain (separate, out of scope)

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Wrong bucket updated | High | Exact `gs://fresh-prints-prod.firebasestorage.app` in commands; inspect before update |
| Over-broad CORS (PUT/POST) | Medium | Copy dev pattern: GET/HEAD only |
| Assuming apex domain is live | Low | Retest hosted.app; note Coming Soon on apex |
| Unnecessary republish | Low | Evidence shows assets valid; no rebuild |

---

## Rollback Plan

Re-apply previous CORS config (empty/`[]` if none) via the same `gcloud storage buckets update`
command with a saved pre-change describe output.

---

## Documentation Updates Required

- [x] `docs/workflow/setup/firebase-storage-cors.md`
- [x] `docs/standards/DEPLOYMENT.md` (checkpoint note)
- [ ] Other: this plan + review/signoff artifacts

---

## Open Questions

- [x] None blocking — root cause proven. Custom-domain attachment remains a later checkpoint.

---

## Deployment gates (this amendment)

| Action | Required? |
|--------|-----------|
| Functions deploy | **No** |
| Storage Rules deploy | **No** |
| App Hosting rollout | **No** (for this defect) |
| `rebuildCatalogSnapshots` | **No** |
| Production Storage CORS apply | **Yes** — human checkpoint |

---

## Approval

- Review doc: `docs/workflow/reviews/2026-07-31-production-portal-catalog-cors-review.md`
- Verdict: pending
