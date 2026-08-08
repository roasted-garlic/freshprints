# Stage 5 Rules Deploy Record — `fresh-prints-dev`

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Owner authorization | **`APPROVE DEV RULES DEPLOY: STAGE 5`** |
| Project | **fresh-prints-dev** |
| Command | `npx firebase deploy --only firestore:rules,storage --project fresh-prints-dev` |
| Exit code | **0** |
| Result | **DEPLOYED** |

---

## What changed live

### Storage (`storage.rules`)
- Removed obsolete public-read matches for:
  - `generated/portal-catalog/**`
  - `generated/catalog-reference/manifest.json`
  - `generated/catalog-reference/client/**`
  - `generated/catalog-reference/ai/**` (was already deny)
- Client access to those paths now falls through to **default-deny**

### Firestore (`firestore.rules`)
- Removed explicit `snapshotPublicationState/{snapshotId}` match
- Access falls through to **default-deny** (collection already empty after Stage 5 Storage delete)

### Unchanged
- Design artwork / customer-upload / brand / other Storage paths
- Algolia Functions
- Production project (**not** deployed)

---

## CLI summary

```
Deploying to 'fresh-prints-dev'...
storage.rules compiled successfully
firestore.rules compiled successfully
storage: released rules storage.rules to firebase.storage
firestore: released rules firestore.rules to cloud.firestore
Deploy complete!
```

Firestore compiler emitted pre-existing unused-function / analyzer warnings only — compile succeeded.

---

## Prerequisites already complete

| Gate | Status |
|------|--------|
| Stage 5 source Implement | APPROVED |
| Storage delete | `STAGE 5 STORAGE DELETED: PASS` (verified empty) |
| Rules source narrowed | yes (repo) |

---

## Notes

- Emulator Rules unit suite was previously blocked locally (no Java). Source tests updated for Stage 5 deny semantics; live deploy does not substitute for that suite, but Rules compiled and released successfully.
- **No production Rules deploy.** Stage 6 / PR #40 merge still forbidden.

---

## Next

Owner smoke (optional but recommended before Signoff):

1. Portal Algolia ON — search/facets/browse
2. Algolia OFF — browse; search fail-closed; no Network to `generated/portal-catalog`
3. Spot-check Storage: guest cannot read former generated paths (expected deny)

Then Stage 5 Signoff workflow, or reply smoke result phrases if requested.

**Not authorized:** Stage 6, production Rules, PR merge.
