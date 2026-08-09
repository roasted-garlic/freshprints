# Checkpoint: PR #40 production Rules deploy — preflight READY (NOT EXECUTED)

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Managed goal | `pr-40-prod-rules-deploy-preflight` |
| Parent | PR #40 remaining production gates |
| Phase | **PREP / TEST / CHECKPOINT ONLY** |
| Mutation | **NONE** — deploy commands prepared, not run |
| Formal Review | `docs/workflow/reviews/2026-08-08-pr-40-prod-rules-deploy-checkpoint-review.md` |
| Source tip | `origin/production` = `7e139685099f90eb1532771e927384316a432e87` |
| Rules blobs | tip FS `dc8d7906…` / tip ST `162f5167…` (match worktree) |

---

## 1. Production identity (re-verified this pass)

| Item | Value |
|------|-------|
| `origin/production` | `7e139685099f90eb1532771e927384316a432e87` |
| Live App Hosting build | **`build-2026-08-08-004`** READY |
| Live source SHA | **`7e139685099f90eb1532771e927384316a432e87`** |
| Traffic | **100%** |
| Auto-rollout | **`disabled: true`** (branch `production`) |
| Algolia | **OFF** (catalog HTML: 0 Algolia markers; 0 `fresh-prints-dev`) |
| Stage 4 Portal runtime | **LIVE** on build-004 |

---

## 2. Live Rules releases inspected

| Surface | Live ruleset ID | Content SHA256 | Released |
|---------|-----------------|----------------|----------|
| Firestore | `198d35a7-c309-4c0b-97e0-80e0458c0c01` | `1a3956dcf11c13736cb5568c50c3f37b721bf93ac17c9cbd89b703ea2d8f3272` | 2026-07-30 |
| Storage (`fresh-prints-prod.firebasestorage.app`) | `fbcb0ee4-732e-420f-afff-01041d2eee1b` | `e11cb3bf1cf316bd9ba77765f8a112b355ced2d7aef4e5a4b9ae4fb400c3c730` | 2026-07-30 |

Tip/worktree SHA256:

| File | SHA256 |
|------|--------|
| `firestore.rules` | `48c213109b35d55716322f22d3d3f0551d47e1b71580f09998b1caf83125a022` |
| `storage.rules` | `ac3a6830b4d48a9f7a49748da02accb228d6c28ad14bbb38debfa30f2708ada2` |

Live ≠ tip for both files.

---

## 3. Firestore Rules — exact semantic delta

| Change | Classification | Live | Tip (`origin/production`) |
|--------|----------------|------|---------------------------|
| `match /taxonomyMaterialization/{docId}` staff-read; client writes `false` | **Permission expansion (staff only)** + new path | Absent (default-deny) | Present |
| `isOptionalTimestamp(data, "readyAt")` in design field validation | **Write validation addition** (optional field type check) | Absent | Present |
| `match /snapshotPublicationState/{snapshotId} { allow read, write: if false; }` | **No-op / source cleanup** | Present (already deny-all) | Removed → default-deny (equivalent) |

**Not expanded to customers/guests:** `taxonomyMaterialization` remains staff-read only; client writes denied including staff (Admin/Functions write).

**Breakage assessment:**

| Surface | Risk from Firestore delta |
|---------|---------------------------|
| Portal ordinary browse | **None** — designs/categories/tags public helpers unchanged |
| Customer print requests | **None** — no PR match changes in delta |
| Customer uploads | **None** — Storage/customer-upload Firestore paths unchanged in this delta |
| Assisted Creation | **None** (Firestore) |
| Studio catalog | **None** until materialization exists; then staff can read derived docs |
| taxonomyMaterialization reads | **Enables** staff client reads after bootstrap (currently absent docs) |
| Generated Storage consumers | N/A (Firestore) |

---

## 4. Storage Rules — exact semantic delta

| Change | Classification | Live | Tip |
|--------|----------------|------|-----|
| `match /generated/portal-catalog/{allPaths=**}` `allow read: if true` | **Permission restriction** | Present | **Removed** → default-deny |
| `match /generated/catalog-reference/manifest.json` public read | **Permission restriction** | Present | **Removed** |
| `match /generated/catalog-reference/client/{fileName}` public read | **Permission restriction** | Present | **Removed** |
| `match /generated/catalog-reference/ai/{fileName}` deny | Unchanged intent | Present (`read, write: if false`) | Covered by default-deny (no dedicated match) |
| `isValidAssistedCreationProof` size | **Limit expansion** | `< 25 * 1024 * 1024` | `<= 80 * 1024 * 1024` |
| Customer upload 80 MB / ready design public derivatives | Unchanged | Present | Present |

**Assisted proof 25 → 80 MB:** **CONFIRMED**.

**Breakage assessment:**

| Surface | Risk from Storage delta |
|---------|-------------------------|
| Portal ordinary browse | **None** — Stage 4 live; catalog uses Firestore + ready design derivatives (still public via existing design derivative rules), not generated catalog JSON |
| Managed search/facets | Already fail-closed with Algolia OFF; **no generated fallback** |
| Customer print requests | **None** |
| Customer uploads | **None** (limits unchanged) |
| Assisted Creation proofs | **Expansion only** — owners/admins may upload larger proofs (aligned with shared constants) |
| Studio generated catalog readers | Any leftover client still hitting generated portal-catalog would **fail** — intended Stage 5 posture; Portal tip has **zero** `generated/portal-catalog` / `generated/catalog-reference` path references |
| Publishers still live | Writers use Admin SDK — **unaffected** by client Rules; waste continues until Function delete |

---

## 5. Stage 4 dependency verification

| Proof | Result |
|-------|--------|
| Live build = tip SHA | **YES** |
| `portalCatalogAssetService` Stage 4 stub (throws; no Storage fetch) | **YES** on tip |
| `useCatalogDesigns` / `catalogService` fail-closed without generated fallback | **YES** |
| `git grep` tip Portal for `generated/portal-catalog` / `generated/catalog-reference` | **No matches** |
| Algolia OFF | **YES** |

**Prerequisite SATISFIED:** removing generated public reads is safe for live Portal consumers.

---

## 6. Test results

### A. `npm run test:rules` (authoritative emulator suite)

```text
JAVA_HOME=%USERPROFILE%\.local-jdk\jdk-21.0.11+10
npm run test:rules
```

| Result | Detail |
|--------|--------|
| Exit code | **0** |
| Tests | **59/59 pass** |
| Includes | Stage 5 generated deny, taxonomyMaterialization RC7, snapshotPublicationState default-deny, print-request / timer / design-issue suites |

### B. Alignment (PR #40–relevant)

```text
npx tsx --test packages/shared/src/constants/storageRulesAlignment.test.ts packages/shared/src/constants/taxonomyMaterializationRulesAlignment.test.ts
```

| Result | Detail |
|--------|--------|
| Exit code | **0** |
| Tests | **8/8 pass** (proof 80 MB alignment + taxonomyMaterialization + no generated Storage matches) |

### C. Note — unrelated alignment flake

```text
npx tsx --test packages/shared/src/constants/firestoreRulesPublicCatalogAlignment.test.ts
```

Exit **1**: over-broad regex falsely flags `allow read: if true` on later `settings/brandLogos` / `portalHelp` after `upcomingShows`. Tip `upcomingShows` is **`allow read: if isStaff()`** (verified). Live has the same public settings reads. **Not a PR #40 Rules delta defect; not a deploy blocker.** Do not “fix” Rules for this in this gate.

### D. `git diff --check`

```text
git diff --check origin/production -- firestore.rules storage.rules
```

Exit **0**.

---

## 7. Deployment granularity recommendation

**Recommend Option B — two separate explicit deployments.**

| Order | Deploy | Why |
|------:|--------|-----|
| 1 | Firestore Rules only | Mostly additive + write validation; enables staff materialization reads; matches historical prod convention (2026-07-30 FS then Storage) |
| 2 | Storage Rules only | Higher blast radius (public-read removal + proof limit); isolate rollback |

**Do not** use a single combined `firestore:rules,storage` for the first production Rules push after this long gap — separate checkpoints improve rollback isolation.

---

## 8. Prepared commands (NOT EXECUTED)

### Gate 1 — Firestore only

```bash
firebase deploy --only firestore:rules --project fresh-prints-prod --non-interactive
```

### Gate 2 — Storage only (after Gate 1 verified)

```bash
firebase deploy --only storage --project fresh-prints-prod --non-interactive
```

**Working tree requirement:** deploy from a clean checkout of `origin/production` @ `7e139685099f90eb1532771e927384316a432e87` (or tip if advanced with no Rules drift).

---

## 9. Rollback procedure

| If | Action |
|----|--------|
| Firestore deploy bad | Redeploy previous ruleset content: release tied to `198d35a7-c309-4c0b-97e0-80e0458c0c01` (restore pre-tip `firestore.rules` from that SHA / Console ruleset history) |
| Storage deploy bad | Redeploy previous ruleset `fbcb0ee4-732e-420f-afff-01041d2eee1b` |
| Prefer | Keep Gate 1 and Gate 2 separate so Storage rollback does not require reverting Firestore |

Post-deploy verify (after owner executes):

1. Releases API shows new ruleset IDs ≠ July 30 IDs
2. Tip markers present: `taxonomyMaterialization`; no generated public matches; proof `80 * 1024 * 1024`
3. Portal smoke: `/` `/catalog` 200; Algolia still OFF
4. Spot-check: guest cannot read `generated/portal-catalog/**` (expect permission denied)

---

## 10. Sequencing amendment

Algolia is an **OPTIONAL parallel lane**, not a prerequisite for Rules/taxonomy production parity.

See amended:

- `docs/workflow/plans/2026-08-08-pr-40-remaining-production-gates-plan.md`
- Reconciliation note in Formal Review of this checkpoint

**Immediate next owner phrase (ONE):**

### `APPROVE PROD FIRESTORE RULES DEPLOY: PR40 REMAINING`

(Storage follows under a **separate** later phrase after Gate 1 verify.)

---

## 11. Confirmations

- NO production Rules deploy
- NO Functions deploy/delete
- NO taxonomy bootstrap
- NO Algolia configuration/enable
- NO index deploy / backfill
- NO Storage cleanup
- NO App Hosting rollout
- NO Studio release

**STOP.**
