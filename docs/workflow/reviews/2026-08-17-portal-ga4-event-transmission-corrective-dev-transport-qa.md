# Owner DEV Transport QA — Portal GA4 event transmission corrective

**Goal:** `portal-ga4-event-transmission-corrective`  
**Purpose:** Prove real GA4 **transport** (`g/collect` requests) before any production PR.  
**Blocking:** Signoff and production PR are forbidden until this completes.

---

## Before you start — rules

| Rule | Why |
|------|-----|
| Use a **TEST** GA4 Measurement ID only | Never use the production Measurement ID locally |
| Do **not** commit the test ID | Keep it in `apps/portal/.env.local` only (gitignored) |
| Do **not** set GA on `fresh-prints-dev` | No Firebase/App Hosting env changes |
| Do **not** weaken the host gate in source | Host simulation uses env + hosts file only |
| Revert hosts file and env after testing | See Cleanup at end |

---

## Part A — Create a TEST GA4 Measurement ID (one-time)

1. Open [Google Analytics](https://analytics.google.com/) (use a test property or create one).
2. **Admin** → **Data streams** → **Add stream** → **Web**.
3. Name it e.g. `Fresh Prints Portal — LOCAL TRANSPORT TEST`.
4. Copy the **Measurement ID** (format `G-XXXXXXXXXX`).  
   This is your **TEST ID** for this procedure only.

---

## Part B — Local env (not committed)

1. Open `apps/portal/.env.local` in a text editor (create from `apps/portal/.env.example` if missing).
2. **Add or temporarily set** these two lines (use your **TEST** ID):

```env
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
NEXT_PUBLIC_PORTAL_ORIGIN=https://myprintrequest.com
```

3. Save the file. Confirm it is **not** tracked by Git (`apps/portal/.env.local` is gitignored).

**Why `NEXT_PUBLIC_PORTAL_ORIGIN`?** Analytics enables only when the resolved origin hostname is `myprintrequest.com`. Local dev defaults to `localhost`, which keeps analytics inert. Setting this env var simulates the production host **without changing source code**.

**Do not** add the production Measurement ID.

---

## Part C — Windows hosts file (simulate production hostname)

1. Open **Notepad as Administrator**.
2. File → Open → `C:\Windows\System32\drivers\etc\hosts`
3. Add these lines at the end:

```text
127.0.0.1 myprintrequest.com
127.0.0.1 www.myprintrequest.com
```

4. Save and close.

5. Verify in PowerShell:

```powershell
ping myprintrequest.com
```

You should see replies from `127.0.0.1`.

---

## Part D — HTTPS required?

**No.** Local Portal dev uses **HTTP** on port **3100**.

- Open: **`http://myprintrequest.com:3100`** (note `http`, not `https`, and include `:3100`).
- Google’s `gtag.js` and `g/collect` use HTTPS to Google’s servers; that works from an HTTP page.
- Do **not** set up local HTTPS unless you have another reason; it is not required for this QA.

---

## Part E — Start the Portal locally

From the repository root:

```powershell
cd C:\coding\fresh-prints
npm run dev:portal
```

Wait until you see Next.js ready on port **3100**.

In Chrome, open a **new Incognito** window (fewer extensions/ad-blockers):

**`http://myprintrequest.com:3100`**

---

## Part F — Chrome DevTools Network steps

1. Press **F12** (Developer Tools).
2. Open the **Network** tab.
3. Check **Preserve log**.
4. In the filter box, type: **`collect`**
5. Hard-refresh the page: **Ctrl+Shift+R**.

### How to identify real GA4 collect requests

Valid hits look like:

- `https://www.google-analytics.com/g/collect?...`
- or `https://region1.google-analytics.com/g/collect?...`
- (regional variants are OK)

**Not sufficient:**

- `googletagmanager.com/gtag/js?id=...` — loader only, not a hit
- Tag Assistant “tag found” without collect requests

If the filter shows **zero** `g/collect` after 10 seconds, note **FAIL** (see criteria below).

---

## Part G — Verify exactly one `page_view` on initial load

1. With Network filtered to `collect`, load **`http://myprintrequest.com:3100/`** once.
2. Click each `g/collect` row → **Payload** or **Query String Parameters**.
3. Find the event name:
   - Parameter **`en`** = `page_view`, **or**
   - Parameter **`ep.event_name`** = `page_view` (GA4 encoding varies slightly by hit type)

**Pass for this step:** Exactly **one** collect request whose primary event is **`page_view`** for the initial load (config may share or precede; count distinct page_view hits = **1**).

Optional cross-check: Console → run:

```javascript
JSON.stringify(window.dataLayer?.map(e => Array.isArray(e) ? Array.from(e).slice(0,2) : e))
```

You should see a `js` entry **before** `config` and `page_view`.

---

## Part H — Verify one `page_view` after client-side navigation

1. Keep DevTools open with **Preserve log** and **`collect`** filter.
2. Click **Catalog** in the Portal nav (client-side route to `/catalog`) — do **not** full page reload.
3. Wait up to 10 seconds.

**Pass for this step:** Exactly **one additional** `g/collect` with **`page_view`** for the navigation (total **2** page_view hits: initial + catalog).

---

## Part I — Inspect transmitted location / path / referrer

On each `g/collect` request, inspect query parameters (names may appear as `dl`, `dp`, `dt`, `dr` or inside encoded `ep.*`):

| Parameter | Expected (sanitized) |
|-----------|----------------------|
| Page location (`dl` / page_location) | `http://myprintrequest.com:3100/...` with **no** raw request/design IDs |
| Page path (`dp` / page_path) | Templated paths e.g. `/`, `/catalog`, `/requests/:id` — **not** `/requests/abc123` |
| Page referrer (`dr` / page_referrer) | Previous **sanitized** path or absent on first hit |
| Search `q` | **Absent** |
| `returnTo` | **Absent** |

**Sanity route (optional but recommended):** Navigate to a share URL pattern in the app if available, or manually go to a known sanitized route. Confirm path templates, not raw IDs.

---

## Part J — PASS criteria (reply with `PASS` only if all met)

- [ ] At least one `g/collect` (or regional equivalent) within **10s** of initial load
- [ ] Exactly **one** `page_view` collect on initial load
- [ ] Exactly **one additional** `page_view` collect after client-side nav to `/catalog`
- [ ] `dataLayer` contains `js` bootstrap before `config` / `page_view`
- [ ] No raw request ID, design ID, `q`, or `returnTo` in hit parameters
- [ ] Test used **TEST** Measurement ID only (not production ID)

---

## Part K — FAIL criteria

| Condition | Result | Next action |
|-----------|--------|-------------|
| Zero `g/collect` after 10s on load | **FAIL** | Record in workflow; Implement **loader-aware `scriptReady`** fallback per Formal Review; re-run this QA |
| More than one `page_view` on initial load | **FAIL** | Do not production PR; investigate duplicate firing |
| No `page_view` on client navigation | **FAIL** | Do not production PR |
| Raw IDs, `q`, or `returnTo` in collect params | **BLOCKED** | Immediate rollback if ever seen in production; fix sanitizer scope |
| Production Measurement ID used locally | **INVALID TEST** | Re-run with TEST ID only |

Reply format:

- `PASS` — all criteria met
- `FAIL: [description]` — what failed
- `PASS WITH NOTES: [notes]` — acceptable with documented follow-ups

---

## Part L — Cleanup / revert (do immediately after testing)

### 1. Revert Windows hosts file

1. Notepad **as Administrator** → open `C:\Windows\System32\drivers\etc\hosts`
2. **Remove** the two lines:

```text
127.0.0.1 myprintrequest.com
127.0.0.1 www.myprintrequest.com
```

3. Save.

Verify: `ping myprintrequest.com` should no longer resolve to `127.0.0.1` (or use your normal DNS).

### 2. Remove temporary env vars

In `apps/portal/.env.local`:

- **Delete** or comment out:
  - `NEXT_PUBLIC_GA_MEASUREMENT_ID=...`
  - `NEXT_PUBLIC_PORTAL_ORIGIN=https://myprintrequest.com` (restore previous value if you had one)

Save. Restart dev server if still running.

### 3. Confirm analytics inert again locally

Open `http://localhost:3100` — Network filter `collect` should show **zero** GA4 collect (host gate + no ID).

### 4. Do not commit

Ensure `git status` does not show `.env.local` or hosts changes.

---

## After owner QA

Record result in workflow state Decision Log and update the test report manual section. Then:

- **PASS** → proceed to Signoff (dev/test), then production PR planning on a **clean branch**
- **FAIL (no collect)** → loader-aware fallback Implement + re-test
- **BLOCKED (raw leak)** → stop; sanitizer investigation (out of expected scope for bootstrap-only fix)
