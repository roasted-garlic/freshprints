# Plan: Firestore Index Duplicate Remediation

| Field | Value |
|-------|-------|
| Date | 2026-07-30 |
| Parent goal | `production-release` (Goal #13) |
| Type | Narrow remediation amendment — not a new managed goal |
| Trigger | Firestore indexes deployment to `fresh-prints-prod` failed (exit 1, HTTP 409 "index already exists") on 2026-07-30 |

---

## 1. Problem

`firebase deploy --only firestore:indexes --project fresh-prints-prod` failed with exit code 1.
CLI error:

```
Error: Request to https://firestore.googleapis.com/v1/projects/fresh-prints-prod/databases/(default)/collectionGroups/customerUploads/indexes had HTTP Error: 409, index already exists with index ID = CICAgLiT6IEJ
```

The batch aborted partway through, leaving 50 of 66 local index definitions created on
`fresh-prints-prod`; 7 collection groups (`assistedCreationRequests`, `customerNotifications`,
`customerUploadBatches`, `customerUploadFinalizeLeases`, `etsyRecommendationRequests`,
`etsyRecommendationSuggestions`, `etsySuggestionRequests`) have zero indexes deployed.

## 2. Canonical Duplicate Audit (this pass)

Parsed `firestore.indexes.json` programmatically, constructing a deterministic structural
identity per index from `collectionGroup` + `queryScope` + the complete ordered `fields` array
(each field's `fieldPath`, `order`, `arrayConfig`, and any other property), independent of raw
JSON formatting or key order.

**Result:**
- Total definitions: **66**
- Unique structural definitions: **65**
- Duplicate groups: **exactly 1**

**The one duplicate group:**

```
collectionGroup=customerUploads|queryScope=COLLECTION|fields=[fieldPath=purpose,order=ASCENDING;fieldPath=catalogReviewStatus,order=ASCENDING]
```

Array positions (0-based): **44** and **50**.

Confirmed via direct `JSON.stringify` comparison: positions 44 and 50 are **byte-identical**
objects (`{"collectionGroup":"customerUploads","queryScope":"COLLECTION","fields":[{"fieldPath":"purpose","order":"ASCENDING"},{"fieldPath":"catalogReviewStatus","order":"ASCENDING"}]}`).

**No other duplicate exists anywhere in the file.** This matches the deployment failure exactly —
one duplicate group is sufficient to explain the single 409 encountered.

## 3. Legitimate Two-Field vs. Three-Field Pair — Confirmed Distinct

Array position 43 (`customerUploads`, `purpose` ASC + `catalogReviewStatus` ASC + `createdAt`
DESC) is a **three-field** index. Positions 44 and 50 are **two-field** (`purpose` ASC +
`catalogReviewStatus` ASC only). Confirmed via direct comparison that position 43 is *not*
byte-identical to 44 or 50 — it has an additional `createdAt DESCENDING` field. **The three-field
index is untouched by this remediation** and both the two-field and three-field indexes remain
valid, distinct, intentional index definitions after correction (per the historical caution — this
Plan does not conflate a legitimate prefix-extension index with a duplicate).

## 4. Provenance (Git History)

Only 18 commits in this repository's history ever touch `firestore.indexes.json`. Traced via
`git blame` on the exact line ranges of both duplicate blocks:

| Position | Lines | Introducing commit | Date | Commit message |
|---|---|---|---|---|
| 44 (keep) | 828–840 | `043f38a1adc4a62a727e5a4a1ee30fd4d1900c81` | 2026-07-13 | "Add Portal donate-designs uploads and Studio donated designs intake." |
| 50 (remove) | 912–924 | `cbba4ca858d76da5514389a67e187612761240fd` | 2026-07-14 | "Add design asset purge, helper permission gates, and Portal account artwork upgrades." |

`043f38a` (2026-07-13) introduced **both** the three-field index (position 43) and the two-field
index (position 44) together, in the same commit, as a deliberate pair — the donate-designs
workflow query coverage. This is the **original, reviewed definition**.

One day later, `cbba4ca` (2026-07-14) — an unrelated feature commit (design asset purge / helper
permission gates / Portal account artwork) — independently added an **identical** two-field
index. This is almost certainly accidental: the author needed a `purpose`+`catalogReviewStatus`
query for a different feature and added a new index definition without noticing one already
existed (Firestore composite indexes also serve prefix queries, so even the original two-field
index is arguably redundant with the three-field one for some query shapes — but that is a
separate, out-of-scope optimization question; this Plan only removes the exact duplicate, not any
index that is merely prefix-coverable).

A later pure-formatting commit, `0317a6db536b682ad0eb97ffa569b2be5c133ac6` (2026-07-22, "Ship
brand logos, AI analysis BG, title regression, and Portal show/calendar polish"), reformatted the
inner `fields` blocks of both positions from compact single-line to expanded multi-line style —
confirmed via diff to be a content-neutral reformat, not a structural change. It does not alter
this provenance conclusion.

**No signed-off feature references the `cbba4ca` copy as a distinct, intentionally-added index.**
`cbba4ca`'s own commit message covers three unrelated features; nothing in its diff or the
current `DATA_MODEL.md`/`BACKEND.md` documentation calls out a second `purpose+catalogReviewStatus`
index as intentional. Removing the `cbba4ca` copy (position 50) and keeping the `043f38a` copy
(position 44) is safe — a single composite index already serves every query that both identical
definitions would have served.

## 5. Remote State (read-only, captured this pass)

`firebase firestore:indexes --project fresh-prints-prod` — exit 0:

```json
{
  "indexes": [ /* 50 definitions */ ],
  "fieldOverrides": []
}
```

50 of 66 local definitions exist remotely, spanning `categories` (2), `customers` (1),
`customerUploads` (7), `designs` (26), `gangSheetItems` (1), `gangSheets` (1),
`printRequestItems` (3), `printRequests` (6), `showAllocations` (3). **7 collection groups have
zero remote indexes**: `assistedCreationRequests`, `customerNotifications`,
`customerUploadBatches`, `customerUploadFinalizeLeases`, `etsyRecommendationRequests`,
`etsyRecommendationSuggestions`, `etsySuggestionRequests`.

**This Plan does not delete, edit, or redeploy any of the 50 existing remote indexes.** They
remain exactly as-is; a future, separately-approved redeployment with the corrected file will
create the 15–16 remaining missing indexes without affecting the 50 already present (Firestore
`indexes:deploy` is additive/idempotent per-definition — it does not delete indexes absent from
the local file unless explicitly instructed to, and this Plan's future redeploy step will not
answer "yes" to any deletion prompt).

## 6. Exact Correction

Remove **only** the index definition at array position 50 (introduced by `cbba4ca`, lines
912–924 in the current file) — the later, redundant, byte-identical copy of the index already
present at position 44.

**Preserve exactly:**
- Position 43 (three-field `purpose+catalogReviewStatus+createdAt`) — untouched.
- Position 44 (two-field `purpose+catalogReviewStatus`, the original `043f38a` definition) —
  untouched, becomes the sole surviving copy.
- All other 63 index definitions — untouched, no reordering, no reformatting beyond the single
  block removed.
- `fieldOverrides: []` — untouched.

**Resulting file:** 65 unique composite index definitions, 0 duplicates, 0 field overrides.

## 7. Query Coverage Impact

None. Removing a byte-identical duplicate cannot remove query coverage — Firestore only needs one
copy of a given composite index to serve every query that index shape supports. No query in the
codebase (`packages/shared`, `functions/src`, `apps/portal`, `apps/studio`) references index
identity directly; queries are served by Firestore's automatic index-matching against whatever
composite indexes exist, and one copy of `purpose ASC + catalogReviewStatus ASC` on
`customerUploads` continues to serve exactly the same query shapes as two copies did.

## 8. Validator / Test Approach

Following this repository's existing established convention for config-alignment tests (see
`packages/shared/src/constants/storageRulesAlignment.test.ts`: a `.test.ts` file using
`node:test`/`node:assert/strict`, reading a repo-root config file directly, zero new
dependencies, run via `npx tsx --test`), add:

`packages/shared/src/constants/firestoreIndexesDuplicateValidation.test.ts`

This test:
1. Reads and JSON-parses `firestore.indexes.json` from the repo root — fails clearly on malformed
   JSON (via `JSON.parse` throwing, causing the test itself to fail with a clear stack trace).
2. Computes the same canonical structural identity used in this Plan's audit (collectionGroup +
   queryScope + ordered fields, each field's fieldPath/order/arrayConfig).
3. Asserts zero duplicate identities exist in the real `firestore.indexes.json` — failure output
   includes the exact collection group and field sequence of any duplicate found, and the array
   positions, so a future regression is immediately diagnosable without needing this Plan's manual
   audit process again.
4. Includes a fixture-based unit test proving the duplicate-detection logic itself works: a small
   inline fixture array containing one exact duplicate must be detected, and a
   two-field/three-field prefix pair (mirroring the exact positions-43/44 situation) must **not**
   be flagged as a duplicate — directly proving the historical-caution requirement ("do not
   conflate a legitimate prefix index with a duplicate") is enforced by the same logic protecting
   the real file.

No new npm dependency. No emulator, no network call, no credential — pure static analysis of a
JSON file, consistent with `storageRulesAlignment.test.ts`'s pattern.

## 9. Verification Commands (to run after implementation)

1. `node -e "JSON.parse(require('fs').readFileSync('firestore.indexes.json','utf8'))"` — JSON
   validity, exit 0 expected.
2. `npx tsx --test packages/shared/src/constants/firestoreIndexesDuplicateValidation.test.ts` —
   new validator test, exit 0 expected, all sub-assertions pass.
3. `npm run test:rules` — full Firestore/Storage Rules emulator suite (unaffected by an indexes
   file change, but re-run for full-suite confidence per the required verification list), 48/48
   expected.
4. `npm run lint` — exit 0 expected.
5. `git diff --check` — exit 0 expected.

## 10. Git Promotion Path

1. Implement the single-block removal and add the new test file on `development`.
2. Run all verification commands above.
3. Commit only `firestore.indexes.json`, the new test file, this Plan, its Formal Review, and
   directly related workflow-status documentation updates — no broad staging.
4. Push to `origin/development`.
5. Prepare (open, do not necessarily merge without separate authorization) a
   `development` → `production` pull request via the established protected-branch workflow.
6. **Do not merge `production` back into `development`** — this is a `development`-originated fix
   with no production-only content, so no back-merge is needed (the historical-caution note in
   the parent goal's PR #4 was a GitHub-suggested sync-back after a *previous* merge; this Plan
   does not require or request that here).

## 11. Remote Partial-Deployment Handling

The 50 already-created remote indexes are **left exactly as they are** by this Plan. This Plan
makes no Firebase deployment of any kind. A future, separately-approved redeployment attempt
(after this correction reaches `production` and its own new checkpoint is opened) will submit the
corrected 65-definition file; Firestore's index-deploy behavior creates any missing index and
leaves already-existing matching indexes untouched — no deletion, no `--force`, no manual Console
action is part of that future step's plan either, consistent with the parent goal's standing
production-safety rules.

## 12. Future Redeployment Checkpoint (explicitly deferred, not authorized by this Plan)

After this remediation PR is reviewed and merged to `production`:
1. Owner separately approves a new Firestore indexes deployment attempt.
2. Full pre-deploy safety sequence (branch/hash verification) repeats, per the parent goal's
   established pattern.
3. `firebase deploy --only firestore:indexes --project fresh-prints-prod` is re-run with the
   corrected file.
4. Every one of the 65 unique index definitions is verified `Enabled`/ready in Firebase Console
   before the Firestore-indexes deployment-order step (step 3 of 12) is considered complete.
5. Only then does the parent goal proceed to Secret Manager (step 4).

This Plan does not perform, and does not authorize, any part of that future checkpoint.

## 13. Explicit Non-Goals

- Does not retry the Firestore indexes deployment.
- Does not touch any of the 50 already-created remote indexes.
- Does not touch Firestore Rules or Storage Rules (both already correctly deployed).
- Does not configure Secret Manager, deploy Functions, configure App Hosting, touch DNS, create
  production data, invoke `rebuildCatalogSnapshots`, distribute Studio, or configure GA4/Search
  Console.
- Does not merge the resulting PR without a separate, explicit owner merge approval.
- Does not delete `master`.
