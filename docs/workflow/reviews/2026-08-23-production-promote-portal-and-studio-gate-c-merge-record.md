# Gate C Merge Record — production-promote-portal-and-studio-2026-08-23

| Field | Value |
|-------|-------|
| Date | 2026-08-24 |
| PR | **#88** — https://github.com/roasted-garlic/freshprints/pull/88 |
| Owner merge authorization | `APPROVE PRODUCTION MERGE: production-promote-portal-and-studio-2026-08-23` |
| Status | **MERGED** — post-merge verification complete |

---

## Merge result

| Field | Value |
|-------|-------|
| Production merge SHA | **`94a1ed0009deab775d8b0c60be44ca931c0ad291`** |
| Merge parents | `27b0b4fb691c081ea1167f863f5fc45224a9c651` (prior production) + `00f0d2d1b3fd1d2acd63042b0d9dbd2a04c3fac1` (PR head / RC tip) |
| Subject | Merge pull request #88 from roasted-garlic/development |
| Method | Owner GitHub merge (agent `gh pr merge` was shell-guard blocked) |
| Force-push / direct production push | **None** |

---

## Pre-merge verification (historical)

| Check | Result |
|-------|--------|
| PR base | `production` @ `27b0b4f…` |
| PR head at final merge | `00f0d2d1b3fd1d2acd63042b0d9dbd2a04c3fac1` |
| Mergeable at open/verify | MERGEABLE / clean |

Post-open docs commits (`d760a74`, `00f0d2d`) were workflow-only; no unexpected runtime product delta beyond approved Gate B scope.

---

## Post-merge verification (2026-08-24)

| Check | Result |
|-------|--------|
| `git fetch origin` | done |
| `origin/production` | **`94a1ed0009deab775d8b0c60be44ca931c0ad291`** (matches owner-reported SHA) |
| RC `00f0d2d` ancestor of production | **yes** |
| Tree equality `00f0d2d^{tree}` == `94a1ed0^{tree}` | **yes** (`17637698e4411079fe508738b582fd0c2a0ce733`) |
| Studio version on production | **1.0.9** |
| Gate D Functions present on production tip | `completeStaffGangSheetAndOpenNext`, `convertCustomerPrintRequestToInternal`, `listPortalPublicShows`, `listPortalShowCatalogDesigns` |
| `firestore.rules` on production tip | present |
| Unexpected product files beyond RC | **none** (empty tree diff RC ↔ merge) |

### Development sync (ADR-FP-137)

| Check | Result |
|-------|--------|
| Local / `origin/development` tip | `00f0d2d1b3fd1d2acd63042b0d9dbd2a04c3fac1` |
| Working tree | clean |
| Content / tree vs production | **identical** to production merge tree |
| Git ancestry: production merge commit ⊂ development | **no** — expected with GitHub merge commits; historical production-only merge commits remain on `production` first-parent history |
| Back-merge `origin/production` → `development` | **not required** by ADR-FP-137 (trees already match; no force-push / rewrite) |

Gate D deploys from **production** SHA only — tree identity is sufficient.

---

## Gate D source (confirmed)

| Item | Value |
|------|-------|
| Exact production source SHA | **`94a1ed0009deab775d8b0c60be44ca931c0ad291`** |
| Project | `fresh-prints-prod` |
| Allowlist command (unchanged) | see below |

```bash
firebase deploy --only firestore:rules,functions:completeStaffGangSheetAndOpenNext,functions:convertCustomerPrintRequestToInternal,functions:listPortalPublicShows,functions:listPortalShowCatalogDesigns --project fresh-prints-prod
```

**Not executed** in this pass.

---

## Next human phrase

```text
APPROVE PRODUCTION FIREBASE DEPLOY: production-promote-portal-and-studio-2026-08-23
```
