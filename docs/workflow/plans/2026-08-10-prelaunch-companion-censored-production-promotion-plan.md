# Plan: Production promotion — prelaunch companions + censored content

| Field | Value |
|-------|-------|
| Date | 2026-08-10 |
| Author | Agent |
| Status | **owner_approved — executing** (`APPROVE PROD PROMOTE: PRELAUNCH COMPANION CENSORED` 2026-08-10) |
| Workflow | managed-phase / production promotion gate |
| Related | Signoff `docs/workflow/reviews/2026-08-10-prelaunch-companion-designs-and-censored-content-signoff.md` |
| Checkpoint | `docs/workflow/reviews/2026-08-10-prelaunch-companion-censored-production-promotion-checkpoint.md` |

---

## Goal

Ship the completed, DEV-QA’d `prelaunch-companion-designs-and-censored-content` goal (plus reconciled amendments) to **fresh-prints-prod** / production Portal App Hosting / production Studio package — **without** myprintrequest.com cutover, DNS, Auth domain changes, Coming Soon removal, or Algolia index mutation.

---

## Current source (promote-from)

| Item | Value |
|------|-------|
| Branch | `development` |
| Last committed HEAD | `e6e37cd827cc6d2a6169bc9864632a6c7ca47821` (`docs(workflow): sign off final release artifact recovery`) |
| Upstream | `origin/development` @ same tip |
| Production tip (live reference) | `origin/production` @ `f5c0bdb7f37d0d7fab589fbe31a6a76963e456a0` |
| **Critical** | Goal code is still **uncommitted working tree + untracked files** on `development`. There is **no promote-ready git SHA yet**. |

### Pre-promotion git gate (required before any prod deploy)

1. Owner/agent commits the reconciled tree on `development` (explicit owner commit request).  
2. Push `origin/development`.  
3. Open/merge PR `development` → `production` per repo release process (or owner-approved equivalent).  
4. Record the **exact production tip SHA** after merge — that SHA is the only authorized build source for App Hosting / Studio package.

Until step 4, treat promote-from as: **`development` working tree as of 2026-08-10 signoff** (not a SHA).

---

## Feature inclusion confirmation

| Capability | Included in this promotion? |
|------------|------------------------------|
| Pairwise companion links (`companionLinks` + `companionDesignIds`) | **YES** |
| Needs Companion (`companionSetIncomplete` unlinked-only queue) | **YES** |
| Censored / Uncensored preference + list/details UX | **YES** |
| `artworkPlacement` Studio editor + Portal badge | **YES** |
| Post-add Matching Designs filtering / non-nested modal | **YES** |
| **Featured Tags** (`tags.isFeatured` + Studio toggle + Portal pills) | **YES** (2026-08-10 amendment) |
| Help About panel + How To hidden until videos | **YES** (reconciled polish) |
| Staff text censoring (`censoredTerms`) | **YES** (2026-08-10 amendment; DEV QA PASS WITH NOTES) |
| Design Details Current Request qty controls | **YES** (2026-08-10 corrective) |
| AI Review remove “No companion set” | **YES** (2026-08-10) |
| Approve Rules expression-budget hotfix | **YES** (2026-08-10; `DEV APPROVE RULES QA: PASS`) |
| Algolia catalog search default-ON semantics | **YES** (code/docs; **no** index schema/reconcile) |
| Global OG excludes explicit designs | **YES** (`getPortalGlobalOpenGraph`) |
| myprintrequest.com / Coming Soon / DNS / OAuth | **NO** |

---

## Deployable artifact matrix (from actual final diff)

| Artifact | Required? | Why |
|----------|-----------|-----|
| **Firestore Rules** | **YES** | Companion/Placement/censor fields + **`tags.isFeatured` allowlist** |
| **Firestore indexes** | **YES** | Prior `companionSetId+status` (if kept) **+** `tags`: `status` + `isFeatured` (Featured Tags Portal query) |
| **Firebase Functions** | **YES (scoped)** | Only `getPortalGlobalOpenGraph` (+ its test) changed — filter explicit designs out of generic OG library rotation. **Do not** unfiltered full Functions deploy |
| **Portal App Hosting** | **YES** | Catalog/censor/companion/help/Algolia-flag/**Featured Tags** UX |
| **Studio production package/release** | **YES** | Companions, Placement, Needs Companion, Tag Management Featured, Select portal menu |
| **Storage Rules** | **NO** | No Storage rules diff in this goal |
| **Algolia reconcile / schema / secrets mutation** | **NO** | Featured Tags are Firestore taxonomy metadata only — **not** Algolia attributes. Confirm kill-switch ≠ `false` |
| **Data migration / backfill job** | **NO** | Optional staff toggle Featured; no automated backfill |
| **myprintrequest.com / DNS / Auth Authorized Domains** | **NO** | Separate cutover |

---

## Exact files / components being promoted

### Backend / shared

- `firestore.rules`
- `firestore.indexes.json`
- `functions/src/getPortalGlobalOpenGraph.ts`
- `functions/src/getPortalGlobalOpenGraph.test.ts`
- `package.json` (`test:rules` script expands companion suites — build tooling only)
- `packages/shared/src/constants/design/artworkPlacement.constants.ts` (+ test)
- `packages/shared/src/constants/portal/portalHelpSettings.constants.ts`
- `tests/firebase/companionLinks.rules.test.ts`
- `tests/firebase/companionSets.rules.test.ts`
- `tests/firebase/companionUnlinkMarkNeeds.rules.test.ts`
- `tests/firebase/designCatalogApprovalExpressionBudget.rules.test.ts`
- `tests/firebase/designCatalogApprovalSequential.rules.test.ts`

### Portal (`apps/portal`)

- Catalog: censor preference context/hooks/services; card/thumbnail/details/lightbox/filter bar; Matching Designs section; Companion suggestion modal; `catalogService` companions/explicit; pages Home/Library/Share  
- Print requests: `useAddDesignToRequestFlow` (+ post-add filter util); working items hook wiring as in tree  
- Help: `PortalHelpAboutPanel`, page content, `help.css`, help constants  
- Algolia: `portalAlgoliaCatalogFlags.ts` (+ test), `.env.example`, `apphosting.yaml` comments  
- Styles: `catalog.css`  
- Providers wiring for explicit preference  

### Studio (`apps/studio`)

- `CompanionSetPanel`, `CompanionLinkPickerModal`, `companionSetService`, helpers/constants/types  
- `artworkPlacement` constants/mapper/form fields/Edit + Details modals  
- Design Library filters (Needs Companion), search helpers  
- Firestore collection constants/service for `companionLinks`  
- AI Review form/inbox types for explicit/companion as in tree  
- Shared `Select` + `inputs.css` (portaled menu)  
- `design-library.css`

### Docs (ship with tip; not runtime)

- DATA_MODEL / BACKEND / DEPLOYMENT / DECISIONS / ROADMAP  
- All `docs/workflow/plans|reviews/2026-08-09*` and `2026-08-10*` goal artifacts  

---

## Required commands (production — **do not run until owner phrase**)

> Always pass `--project fresh-prints-prod` explicitly. Never `firebase use production` as the sole targeting method.

### 0. Git (preflight)

```bash
# After commit on development + PR merge to production:
git fetch origin
git rev-parse origin/production   # record PROMOTE_SHA
git checkout production
git pull
# Verify working tree clean and matches PROMOTE_SHA
```

### 1. Firestore Rules

```bash
firebase deploy --only firestore:rules --project fresh-prints-prod
```

### 2. Firestore indexes

```bash
firebase deploy --only firestore:indexes --project fresh-prints-prod
# Wait until Console shows new composite ENABLED before relying on any query that needs it
```

### 3. Scoped Functions

```bash
firebase deploy --only functions:getPortalGlobalOpenGraph --project fresh-prints-prod
```

### 4. Portal App Hosting

```bash
# Prefer repo’s documented App Hosting rollout for backend fresh-prints-portal
# (typically merge-to-production auto-rollout and/or)
firebase deploy --only apphosting --project fresh-prints-prod
```

Confirm App Hosting secrets already include Algolia search-only trio; ensure  
`NEXT_PUBLIC_USE_ALGOLIA_CATALOG_SEARCH` is **not** the literal `false` (default-ON if unset/`true`).  
**Do not** set new Algolia secrets unless preflight finds them missing.

### 5. Studio production package

Follow existing Studio release workflow (packaged Windows build from `PROMOTE_SHA`, channel `stable` per `DEPLOYMENT.md` / prior release records). Installer/update publish only after Portal backend steps that Studio depends on (Rules at minimum) are live.

---

## Deployment order

1. **Commit + merge** → record `PROMOTE_SHA`  
2. **Firestore Rules** (`fresh-prints-prod`)  
3. **Firestore indexes** (can parallel with Rules; wait for ENABLED)  
4. **Function** `getPortalGlobalOpenGraph`  
5. **Portal App Hosting** rollout from `production` tip  
6. **Studio** production package/release  
7. **Smoke** (hosted.app + Studio prod against prod)  
8. **STOP** — do **not** cut over myprintrequest.com  

---

## Smoke-test order (post-promote)

**Environment:** production Portal hosted.app + production Studio → `fresh-prints-prod`  
**Not:** myprintrequest.com

### A. Portal (hosted.app)

1. Browse Design Library unfiltered (Firestore path)  
2. Typed search (Algolia) — expect results, not “temporarily unavailable”  
3. Censored toggle: default censored blur; Uncensored reveals preference behavior  
4. Open design with companions → Matching Designs shows **direct** ready neighbors only  
5. Add design with companion → Matching Designs modal; add companion from modal → no nested modal / no duplicate toast; already-in-request companions excluded  
6. Placement badge visible when set; unspecified → no badge  
7. `/help` → About panel present; How To hidden if no videos  
8. Share a non-explicit page OG sample if practical — generic OG must not rotate explicit artwork  

### B. Studio (prod package)

1. Needs Companion filter queue (unlinked-only)  
2. Companion Designs: link / unlink pairwise; Placement Select (menu not clipped)  
3. Mark / clear Needs Companion  
4. AI Review / Edit Design: Explicit + Placement fields as shipped  

### Pass recording

Owner replies on checkpoint doc:  
`PROD COMPANION CENSORED PROMOTE SMOKE: PASS` / `FAIL: …` / `PASS WITH NOTES: …`

---

## Rollback approach

| Layer | Rollback |
|-------|----------|
| App Hosting | Roll back to previous App Hosting release (pre-`PROMOTE_SHA` build) |
| Studio | Reinstall / ship prior stable package |
| Functions | Redeploy prior `getPortalGlobalOpenGraph` revision from pre-promote SHA |
| Firestore Rules | `firebase deploy --only firestore:rules` from pre-promote SHA |
| Indexes | New composite can remain (harmless) or be left; indexes are not casually deleted mid-incident |
| Data | No destructive migration — leftover `companionLinks` / denorm fields are additive; old clients that ignore new fields remain safe if rolled back carefully (new Rules may still allow new fields) |

**Note:** Rolling back Portal/Studio without Rules rollback may leave Rules ahead of clients (usually OK). Rolling back Rules while new clients are live may break companion/Placement writes — prefer paired rollback.

---

## Migration / backfill

| Action | Required? |
|--------|-----------|
| Automated clique → pairwise migration | **NO** (explicitly out of scope historically) |
| Backfill `artworkPlacement` | **NO** (optional; absent = Unspecified) |
| Backfill `companionDesignIds` | **NO** — created on staff link |
| Staff re-link companions in prod | **Optional** for catalog completeness |
| Delete legacy `companionSets` docs | **NO** for this ship |

---

## Algolia

| Action | Required? |
|--------|-----------|
| Index schema change | **NO** |
| Reconcile / clear / upsert | **NO** |
| New Secret Manager secrets | **NO** if Gate C-enable already LIVE |
| Confirm kill-switch not `false` | **YES** (read-only preflight at App Hosting) |
| Code default-ON | Ships with Portal tip |

---

## Explicit non-goals (forbidden this checkpoint)

- Deploy / mutate without owner phrase  
- myprintrequest.com, DNS, Auth Authorized Domains, OAuth client changes  
- Remove Coming Soon  
- Algolia admin reconcile  
- Unfiltered `firebase deploy --only functions`  
- Production data wipe / destructive migration  

---

## Owner approval phrases (suggested)

```text
APPROVE PROD PROMOTE: PRELAUNCH COMPANION CENSORED
```

Optional phased:

```text
APPROVE PROD FIRESTORE RULES+INDEXES: PRELAUNCH COMPANION CENSORED
APPROVE PROD FUNCTION: getPortalGlobalOpenGraph
APPROVE PROD APP HOSTING: PRELAUNCH COMPANION CENSORED
APPROVE PROD STUDIO PACKAGE: PRELAUNCH COMPANION CENSORED
```

---

## FreshForge impact

N/A (Fresh Prints product promotion; starter surface unchanged except workflow docs in this repo).
