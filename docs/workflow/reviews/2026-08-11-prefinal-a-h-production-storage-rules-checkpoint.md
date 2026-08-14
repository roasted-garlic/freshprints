# Checkpoint: Prefinal A–H + Track B — Production Storage Rules (static-og)

| Field | Value |
|-------|-------|
| Date | 2026-08-11 |
| Owner phrase | `APPROVE PROD DEPLOY: STORAGE RULES STATIC-OG` → `STORAGE RULES DEPLOY: DONE` |
| Status | **COMPLETE — VERIFY PASS** |
| Plan | `docs/workflow/plans/2026-08-11-prefinal-a-h-production-promotion-plan.md` |
| Project | **`fresh-prints-prod`** |
| Scope | **`storage` only** |

---

## Git / source identity

| Check | Result |
|-------|--------|
| `origin/production` | `c3a61bfe244b091e2d71bb58d6633b7e57ab67b2` (PR #57) |
| Freeze `3b7a978` contained | **yes** |
| `storage.rules` git blob | `58073e4004ca184cac5f726d5fea1105da6f1da2` |
| `storage.rules` SHA256 | `69ca680a7018ed48a9b46dc9cefd239ed0b5ea94ef50c57c3b75a9689f108306` |
| Diff vs pre-promote `913329c` | **+25 lines** static-og block only |

### Reviewed static-og predicates (unchanged)

- Path: `portal-social-meta/static-og/{fileName}`
- Filename: UUID + `.png` / `.jpg` / `.jpeg` / `.webp`
- Size: `> 0` and `≤ 5 MiB`
- MIME: `image/png` \| `image/jpeg` \| `image/webp`
- read: public if filename valid
- create: `isOwner()` + filename + upload validation
- update: deny
- delete: `isOwner()` + filename valid

---

## Predeploy (agent; earlier)

| Check | Result |
|-------|--------|
| Alignment `storageRulesAlignment.test.ts` | **PASS 7/7** |
| `npm run test:rules` | not run (no Java) |
| `git diff --check` on `storage.rules` | **pass** |
| Dry-run → `fresh-prints-prod` storage-only | **pass** |
| Agent live deploy | **hook-blocked** → owner CLI |

---

## Owner deployment

| Item | Value |
|------|-------|
| Executor | **Owner (manual CLI)** |
| Command | `firebase deploy --only storage --project fresh-prints-prod` |
| Owner report | `STORAGE RULES DEPLOY: DONE` |

---

## Post-deploy verification (agent; read-only) — **PASS**

### Storage Rules release (`fresh-prints-prod`)

| Item | Value |
|------|-------|
| Release | `firebase.storage/fresh-prints-prod.firebasestorage.app` |
| Live ruleset | **`0c911fca-b6bf-48cd-83c8-e0622f334767`** |
| Ruleset createTime | **2026-08-11T20:45:02Z** |
| Release updateTime | **2026-08-11T20:45:02.917649Z** |
| Prior known ruleset (PR #40 era) | `ccb8e2ea-74e6-4ed6-b1f8-e3cb3e386cd6` → **replaced** |
| Live content SHA256 | **`69ca680a7018ed48a9b46dc9cefd239ed0b5ea94ef50c57c3b75a9689f108306`** |
| Match production tip source | **YES (exact)** |
| `portal-social-meta/static-og` markers | **YES** |

### Firestore Rules (control — untouched this gate)

| Item | Value |
|------|-------|
| Live ruleset | `64bdaccc-291a-4a7d-8b49-25be6ba0fd64` |
| Release updateTime | `2026-08-10T19:40:23.907892Z` (**unchanged** by this Storage deploy) |

---

## Confirmations (this gate)

| Action | Occurred? |
|--------|-----------|
| Storage Rules live on prod | **Yes** — verified |
| Functions deploy | **No** |
| Firestore Rules deploy | **No** |
| Index deploy | **No** |
| App Hosting | **No** |
| Algolia mutation | **No** |
| Track A dry-run/APPLY | **No** |
| Studio 1.0.3 | **No** |

---

## STORAGE RULES GATE: **COMPLETE**

### Next owner phrase (ONE) — do not auto-run

```
APPROVE PROD DEPLOY: FUNCTIONS WAVE PREFINAL A-H + TRACK B
```
