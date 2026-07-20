# Manual Test Checkpoint: #11 Portal OG / social sharing

| Field | Value |
|-------|-------|
| Date | 2026-07-20 |
| Feature | Portal share buttons, deep link, per-design OG, Studio global OG |
| Why automated tests are insufficient | UI share flows, modal open/close, Studio settings, crawler-facing OG |
| Environment | fresh-prints-dev · Portal `https://myprintrequest.dev` (and/or local `npm run dev:portal`) · Studio local soft-reload |
| Prerequisites | Owner Studio login; at least one **ready** catalog design |

---

## Studio settings path

**Studio → Settings → Social sharing** (owner tab)

Edit **Title** + **Description** → **Save social sharing**.

---

## Steps

### A. Share open / close (deep link)

1. Open a design details modal → **Share** (or use a known `/share/design/{id}` URL).  
   → **Expected:** After open, URL is `/catalog?designId=…` (or `/` with same query) and the **details modal is open**.
2. Close the modal.  
   → **Expected:** Modal stays closed; `designId` is removed from the URL; refresh does **not** reopen the modal.
3. Paste `/share/design/{id}` in a new tab while logged out, then sign in if prompted.  
   → **Expected:** Lands on catalog deep link with modal open (post-auth map).

### B. Card + modal share affordances

1. On catalog / home / favorites cards: confirm share **icon** sits in the title row and long titles **truncate** before the icon (no overlap).
2. Open details modal: confirm labeled **Share** control.
3. Share → **Expected:** native share sheet **or** “Link copied” toast; URL shape `/share/design/{id}`.

### C. Per-design OG

1. View page source or use [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) on `https://myprintrequest.dev/share/design/{READY_ID}`.  
   → **Expected:** `og:title` / `og:description` match the design; `og:image` is a design image when Admin signing works, else brand logo fallback.

### D. Global OG (Studio)

1. In Studio **Settings → Social sharing**, set a distinctive title + description → Save.
2. Soft-reload Portal if needed (hourly cache on meta; hard refresh / wait up to ~1h on hosted).
3. Check `https://myprintrequest.dev/login` (or `/`) source / debugger.  
   → **Expected:** `og:title` / `og:description` match Studio values; `og:image` is a **library** design image when Admin is available, else brand logo.

---

## Pass criteria

- [x] Share deep link opens modal; close stays closed
- [x] Card share icon + title truncate; modal Share works
- [x] Per-design share URL has design OG (or documented logo fallback)
- [x] Studio Social sharing saves; global OG reflects title/description

### Please reply with

- `PASS` — all criteria met  
- `FAIL: [description]`  
- `PASS WITH NOTES: [notes]`

---

## Owner feedback log

| Date | Result | Notes |
|------|--------|-------|
| 2026-07-20 | **FAIL** | Shared link lands on `/catalog?designId=Ab2dBnwdAmWG6ivXpzIC` but modal stays closed. In-app open/close URL sync OK. |
| 2026-07-20 | fix shipped (local) | `useCatalogDesignDeepLink`: clear stuck `loadingIdRef` on effect cleanup so Strict Mode / AuthGate remount retries open. |
| 2026-07-20 | **PASS** | Owner PASS. Deep-link remount fix included — cold `/catalog?designId=` opens modal; close clears param. |

### Re-verify (example id)

1. Logged in → hard navigate to `http://localhost:3100/catalog?designId=Ab2dBnwdAmWG6ivXpzIC`  
   → **Expected:** details modal opens.
2. Or open `http://localhost:3100/share/design/Ab2dBnwdAmWG6ivXpzIC`  
   → **Expected:** redirects to catalog deep link **and** modal opens.
3. Close modal → URL clears `designId`; refresh stays closed.
