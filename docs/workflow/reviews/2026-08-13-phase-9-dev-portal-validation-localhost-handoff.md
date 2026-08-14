# Checkpoint — DEV Portal validation (App Hosting STOP; localhost handoff)

| Field | Value |
|-------|-------|
| Date | 2026-08-13 |
| Goal | `phase-9-custom-request-results-and-routing-remediation` |
| Authorization received | `AUTHORIZE DEV PORTAL VALIDATION` |
| Branch | `fix/phase9-results-and-discover-remediation` |
| Worktree HEAD (git commit) | `975f6400262a86600c4662f39480c6f55e20b0c1` |
| Working tree | Contains reviewed Portal implementation (**uncommitted** relative to HEAD) |
| Result | **STOP — no App Hosting deploy performed** |

---

## Why App Hosting was not deployed

Repo-authoritative policy in `docs/standards/DEPLOYMENT.md` (2026-08-02, owner-confirmed, binding):

> **`fresh-prints-dev` must not have a Firebase App Hosting backend.**  
> Portal development runs on **localhost only** (`npm run dev:portal`), connecting to real `fresh-prints-dev`.  
> `firebase deploy --only apphosting --project fresh-prints-dev` is **superseded / not authorized**.

Verified just now:

```text
firebase apphosting:backends:list --project fresh-prints-dev
→ empty table (expected)
```

Exact repo-authoritative DEV Portal validation mechanism:

| Mechanism | Status |
|-----------|--------|
| Firebase App Hosting on `fresh-prints-dev` | **Prohibited** |
| Local Portal → `fresh-prints-dev` | **Authoritative** (`npm run dev:portal`) |
| Optional remote browser access | Cloudflare tunnel → `localhost:3100` (see `docs/workflow/setup/portal-cloudflared-tunnel-setup.md`); named host often `https://myprintrequest.dev` |

Deploying production App Hosting (`fresh-prints-prod`) was **not** authorized and was not performed.

Per owner gate: *If the required DEV deployment mechanism would affect anything outside Portal App Hosting, STOP and report before deploying.* — The requested mechanism does not exist under policy; proceeding with localhost DEV validation instead.

---

## Pre-rollout verification (completed)

| Check | Result |
|-------|--------|
| Branch | `fix/phase9-results-and-discover-remediation` |
| Base ancestor | `975f640…` is ancestor of branch tip (branch tip == base commit; changes are WIP in tree) |
| Reviewed implementation present in tree | Yes (Portal catalog + Etsy files) |
| `apps/portal/.env.local` project | `fresh-prints-dev` |
| Algolia index | `portal_catalog_ready_dev` (DEV only; no prod index mutation) |
| Functions deploy | **Not performed** |
| Rules deploy | **Not performed** |
| Indexes deploy | **Not performed** |
| Studio drafts | Untouched |

---

## Localhost DEV Portal (prepared)

- Worktree: `C:\coding\fresh-prints-wt-phase9-remediation`
- Command: `npm run dev:portal`
- URL: **http://localhost:3100**
- Backend: **fresh-prints-dev**
- Algolia: existing DEV index only (read/search via Portal config; no Admin/index mutation in this goal)

Optional phone/remote: with Portal running, `npm run tunnel:portal` or named tunnel per setup doc → use returned URL / `https://myprintrequest.dev` if already configured.

---

## Deploy confirmations (requested return fields)

1. **Deployed source SHA** — N/A App Hosting. Served source = worktree with reviewed changes on top of `975f640…` (commit when ready for PR).
2. **App Hosting rollout/build id** — **None** (not deployed; policy).
3. **Backend** — `fresh-prints-dev` (confirmed via `.env.local`).
4. **Functions deployed** — **No**.
5. **Rules deployed** — **No**.
6. **Indexes deployed** — **No**.
7. **Algolia mutation** — **No** (Portal uses DEV search-only config).
8. **URL to test** — **http://localhost:3100** (primary). Optional tunnel / `https://myprintrequest.dev` if owner starts tunnel.
9. **Manual QA** — checklist below / `docs/workflow/reviews/2026-08-13-phase-9-etsy-assisted-discover-manual-qa-checkpoint.md`
10. **Owner reply** — `PASS` / `FAIL: …` / `PASS WITH NOTES: …`

---

## Manual QA checklist (copy)

### Etsy
1. Help Me Find a Design → results → lifecycle notice “One active search at a time.”
2. **Mark as satisfied** → choose path; status `completed`.
3. New search → **Cancel this search** → `cancelled`; quieter than primary.
4. Purchase → Upload → `/requests/artwork`.

### Discover
1. Category with ~10 ready → rail shows up to 10.
2. Category with >25 ready → rail ≤25; View All full.
3. Recently Requested with 2 eligible → “2 designs”, 2 cards, no Load more.
4. Most Liked → no zero-favorite membership.
5. Popular / New This Week / browse / search / tags → no regression.

### Assisted
- Drawer / cancel / proof unchanged.

---

## Next

STOP for owner manual QA. Do not PR / production / Signoff until QA returned.

If owner explicitly reverses DEV App Hosting policy, that requires a separate Plan/Review — not this authorization.
