# Automated record: Production customer smoke (read-only)

| Field | Value |
|-------|-------|
| Date | 2026-08-09 |
| Environment | Production Portal **hosted.app** |
| Live build | **`build-2026-08-09-001`** @ tip `f5c0bdb` |
| Project | `fresh-prints-prod` |
| Agent mutation | **None** |

---

## App Hosting traffic

| Check | Result |
|-------|--------|
| `latestReadyRevisionName` | `fresh-prints-portal-build-2026-08-09-001` |
| Percent traffic on that revision | **100%** |
| Other revisions | Tagged only (0% / no percent) — not serving |

---

## Hosted.app HTTP routes

Base: `https://fresh-prints-portal--fresh-prints-prod.us-central1.hosted.app`

| Path | Status | Notes |
|------|--------|-------|
| `/` | **200** | HTML includes `fresh-prints-prod`; no `fresh-prints-dev` in HTML; no errorish strings |
| `/catalog` | **200** | |
| `/catalog/library` | **200** | |
| `/login` | **200** | |
| `/register` | **200** | |
| `/custom-designs` | **200** | |
| `/requests` | **200** | Print requests surface |
| `/requests/artwork` | **200** | |
| `/favorites` | **200** | |
| `/help` | **200** | |
| `/dashboard` | **200** | |
| `/robots.txt` | **200** | Allow/Disallow sensible; Sitemap points at `https://myprintrequest.com/sitemap.xml` |
| `/sitemap.xml` | **200** | |
| `/discover` | **404** | Not a Portal route (expected) |
| `/my-requests` | **404** | Not a Portal route; use `/requests` (expected) |

---

## Algolia / project bake-in (client chunks)

| Check | Result |
|-------|--------|
| App ID `Z1FVCM5QUX` in client JS | **Present** (`/_next/static/chunks/9136-….js`) |
| Index `portal_catalog_ready_prod` | **Present** (same chunk) |
| Index `portal_catalog_ready_dev` | **Absent** in scanned chunks |
| HTML `fresh-prints-prod` | **Present** |
| HTML `fresh-prints-dev` | **Absent** |
| Layout JS string `fresh-prints-dev` | Present as **debug-command allowlist** (`["fresh-prints-dev"]`) — **not** Firebase project config leakage |

---

## Custom domain (observation only — not Stage 2 scoring)

Base: `https://myprintrequest.com`

| Check | Result |
|-------|--------|
| `/` | **200** — title **MyPrintRequest - Coming Soon** |
| `/catalog`, `/login`, `/register`, `/requests`, etc. | **404** |
| Interpretation | **Expected** pre-cutover. Do **not** treat as Portal failure. Cutover remains blocked until `APPROVE MYPRINTREQUEST.COM CUTOVER`. |

---

## Functions presence (list only; no invoke)

Listed on `fresh-prints-prod` (firebase functions:list):

- `createPortalPrintRequest` (callable)
- `queuePortalPrintRequestToShow` (callable)
- `registerCustomer` (callable)
- `syncPortalCatalogDesignToAlgolia` (Firestore written)
- `reconcilePortalCatalogAlgoliaIndex` (callable)
- `reconcilePortalCatalogAlgoliaIndexScheduled` (scheduled)

No agent invoke / reconcile / deploy performed.

---

## Automated verdict (partial)

| Criterion | Automated result |
|-----------|------------------|
| Portal loads (hosted.app) | **PASS** |
| No HTML prod→dev project leakage | **PASS** |
| Production search env baked in | **PASS** (chunk markers; UX still needs owner QA) |
| Critical auth/cart/upload/submit journey | **NOT PROVEN** — requires owner manual QA |
| Custom domain Portal | **N/A** — Coming Soon by design |

**Overall automated:** green for infrastructure/smoke shell. **Customer readiness verdict deferred** to owner QA.
