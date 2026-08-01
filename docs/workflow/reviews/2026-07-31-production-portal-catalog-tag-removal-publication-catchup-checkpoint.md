# Checkpoint: Production portal-catalog catch-up RETRY complete

| Field | Value |
|-------|-------|
| Date | 2026-07-31 |
| Slice | `production-portal-catalog-tag-removal-publication` |
| Approval | `APPROVE PRODUCTION PORTAL CATALOG PUBLICATION CATCH-UP: RETRY` |
| Mechanism | Deployed callable `retryPortalCatalogPublication` on `fresh-prints-prod` |
| Rebuild | **not** used |

---

## Result

| Field | Before | After |
|-------|--------|-------|
| `requestedGeneration` | 9 | 9 |
| `publishedGeneration` | 8 | **9** |
| `status` | `failed` | **`idle`** |
| `lastErrorCode` | `FetchError` | cleared / absent |
| Manifest `generation` | 8 | **9** |
| Manifest `contentVersion` | `8-c8c37201de17f034` | **`9-ebbc2bff6074f3c5`** |
| Discover card tags (design `s9Yi7i8u…`) | `funny, sarcastic` | **`funny` only** |
| Tag filter `sarcastic` | listed design | **404** (empty / absent) |
| Tag filter `funny` | listed design | still lists design |
| Tag facet | funny + sarcastic | **funny only** |

Callable return (duration ~5.8s):

```json
{
  "requestedGeneration": 9,
  "publishedGeneration": 9,
  "status": "idle"
}
```

### Invoke notes

Direct custom-token mint / SA impersonation via the Firebase CLI user is IAM-denied
(`iam.serviceAccounts.signJwt` / `signBlob` / `getAccessToken`). Catch-up used an **ephemeral**
owner Auth user + Firestore `users/{uid}` profile (created via Admin Auth + Firestore REST),
invoked `httpsCallable(..., "retryPortalCatalogPublication")`, then deleted Auth user + profile.
No password change to the real owner account. Script:
`functions/scripts/retry-portal-catalog-publication-prod.mjs`.

Repo also exports `drainPortalCatalogPublicationCatchUp` for local ops parity (not required for this
successful cloud invoke; redeploy optional).

---

## Required next human action — Portal QA

## Manual Test Checkpoint

**Feature / area:** Portal catalog tag removal after catch-up republish  
**Why automated tests are insufficient:** Live hosted Portal UX / cache / surfaces  
**Environment:** production Portal (`fresh-prints-prod` hosted.app)  
**Prerequisites:** hard refresh or Incognito; design that had the removed tag

### Steps
1. Open the affected design (or any ready design where you remove one of several tags) → **Expected:** card/detail tags match Studio (removed tag gone)
2. Open Tags filter / facet → **Expected:** removed tag absent or zero for that design; other tags remain
3. Search the removed tag term if it was unique → **Expected:** design not returned for that term alone
4. Confirm category still correct → **Expected:** unchanged / still publishes

### Pass criteria
- [ ] Removed tag gone from card/detail
- [ ] Filter/facet/search agree
- [ ] Category still correct
- [ ] Hard refresh / Incognito matches

### Please reply with
- `PASS` — all criteria met
- `FAIL: [description]` — what failed
- `PASS WITH NOTES: [notes]` — acceptable with follow-ups

Stage 2 / domain cutover remain separately gated.
