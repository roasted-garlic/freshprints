# Human Checkpoint

| Field | Value |
|-------|-------|
| Date | 2026-08-18 |
| Workflow | managed-phase / test / portal-design-engagement-analytics / Amendment 2 |
| Reason | Owner DEV QA for prefixed page titles + public catalog design IDs in GA4 (`g/collect`) |
| Status | **resolved** |
| Resolution | `DEV DESIGN ENGAGEMENT ANALYTICS QA: PASS` — 2026-08-18 |

---

## What We Need From You

On the existing TEST GA stream via **https://myprintrequest.dev**, prove Design Details and a valid share page send **prefixed page titles**, **actual public catalog IDs** in path/location/`content_id`, and that private IDs stay sanitized. Then reply with `DEV DESIGN ENGAGEMENT ANALYTICS QA: PASS`.

Do **not** treat this as authorization to sign off, commit analytics, or open a production PR.

---

## Context

Plan (amended): `docs/workflow/plans/2026-08-18-portal-design-engagement-analytics-plan.md`  
Amendment 2 Formal Review: **approved** — `docs/workflow/reviews/2026-08-18-portal-design-engagement-analytics-amendment-2-review.md`  
Owner public-ID decision: **ADR-FP-138**  
Automated Test: `docs/workflow/reviews/2026-08-18-portal-design-engagement-analytics-test-report.md` (109/109, typecheck, **`build:portal` pass**)

Show-clarity original: `5d042696ddbc7bce2bc40675e5cae82124e5dc04`. Layout follow-up: `3fe17d8644524afb973e4ce294764405dda95deb`.

Portal `next` on port 3100 was stopped so the production build could run. **Restart `npm run dev:portal` before this QA** if it is not already running.

**Do not** sign off from this message. **Do not** open a production PR.

---

## Local transport method

Use the already proven local-only TEST analytics setup (TEST Measurement ID in gitignored `apps/portal/.env.local`, `NEXT_PUBLIC_PORTAL_ORIGIN` as previously used to satisfy the production host gate). Open Portal through:

**https://myprintrequest.dev**

Chrome Incognito → DevTools Network → Preserve log → filter `collect`.

Never commit a Measurement ID. Never use the production ID for this QA.

---

## Manual Test Checkpoint

**Feature / area:** Amendment 2 — surface prefixes + public catalog design IDs  
**Why automated tests are insufficient:** GA4 `g/collect` payloads and Realtime Page Title / Page Path reporting need a human Network + GA4 check.  
**Environment:** local TEST stream via myprintrequest.dev  
**Prerequisites:** TEST stream enabled locally; public catalog design **School Is Important But Fishing Is Importanter** (or another known public catalog title). Note the actual public catalog design ID from the catalog model / share URL.

### Steps

1. Load a normal Portal page. → **Expected:** one navigation `page_view` (e.g. Discover / Catalog). Browser URL unchanged.
2. Open Design Details for **School Is Important But Fishing Is Importanter**. → **Expected:** **two** additional collects:
   - `en=page_view`
     - `dt` = `Modal: School Is Important But Fishing Is Importanter`
     - `dp` = `/catalog/design/{ACTUAL_ID}`
     - `dl` = `https://myprintrequest.dev/catalog/design/{ACTUAL_ID}`
   - `en=design_view`
     - `ep.design_title` = `School Is Important But Fishing Is Importanter` (no `Modal:`)
     - `ep.design_surface` = `modal`
     - `ep.content_id` = `{ACTUAL_ID}`
3. Confirm the **browser** URL stays on `/catalog` (or the parent route). No history push. Tab title need not change.
4. Favorite / quantity / preview lightbox while the same modal stays open. → **Expected:** zero additional `page_view` or `design_view`.
5. Swap still-open modal A → B. → **Expected:** one virtual `page_view` + one `design_view` for B only.
6. Close the modal. → **Expected:** **nothing**. No compensating `Catalog` `page_view`.
7. Reopen the same design later. → **Expected:** one **new** virtual `page_view` + one **new** `design_view`.
8. Open a valid `/share/design/{id}` for the same design. → **Expected:** exactly one `page_view`:
   - `dt` = `Share: School Is Important But Fishing Is Importanter`
   - `dp` = `/share/design/{ACTUAL_ID}`
   - `dl` = `https://myprintrequest.dev/share/design/{ACTUAL_ID}`
   plus one `design_view` / `share_page` with unprefixed `design_title` and `ep.content_id={ACTUAL_ID}`. Not `Shared Design` then a second titled hit. Physical route unchanged.
9. Open an invalid/not-found share URL. → **Expected:** one `Shared Design` `page_view` with `dp=/share/design/:id`; **no** `design_view`; **no** arbitrary route ID as `content_id`.
10. Inspect hits. → **Expected allowed:** public catalog design ID. **Expected absent:** request ID, customer ID, auth UID, customer upload ID, email, username, filename, `q`, `returnTo`. `/requests/:id` still templated if you open a request.

### Pass criteria

- [x] Modal open: exactly 1 virtual `page_view` + 1 `design_view`
- [x] Modal `dt` = `Modal: {canonical title}`
- [x] Modal `dp` / `dl` contain the **actual** public catalog ID
- [x] Modal `ep.design_title` is unprefixed; `ep.design_surface=modal`; `ep.content_id` = actual ID
- [x] Rerender / lightbox / favorite / qty: no duplicates
- [x] A → B: one pair for B
- [x] Close: zero events (no Catalog compensation)
- [x] Reopen: one new pair
- [x] Share: one `page_view` with `Share: {title}` and actual ID in path/location
- [x] Share `design_view`: unprefixed title, `share_page`, `content_id`
- [x] No generic Shared Design page_view before the titled share hit
- [x] Invalid share does not expose an arbitrary route ID
- [x] No request/customer/auth/upload IDs, `q`, or `returnTo`
- [x] GA4 Page Title card can show `Modal: …` and `Share: …`
- [x] GA4 Page Path can distinguish `/catalog/design/{id}` vs `/share/design/{id}`
- [x] TEST Measurement ID only

### Please reply with

- `DEV DESIGN ENGAGEMENT ANALYTICS QA: PASS`
- `FAIL: [description]`
- `PASS WITH NOTES: [notes]`

**Your result:** `DEV DESIGN ENGAGEMENT ANALYTICS QA: PASS`

---

## Impact If Delayed

Signoff, analytics commit, and the later batched production PR stay blocked. Live App Hosting is unchanged.

---

## Agent Actions While Paused

**Allowed:** Read docs, update this checkpoint after feedback

**Forbidden:** Signoff, commit unless asked, production PR, App Hosting, new branch/worktree, pop stashes, Phase 9, tag-alias

---

## Resolution Record

| Date | User response | Recorded in state | Follow-up |
|------|---------------|-------------------|-----------|
| 2026-08-18 | `DEV DESIGN ENGAGEMENT ANALYTICS QA: PASS` | yes | Signoff **approved**. Commit / production PR next; no merge / no App Hosting. |

---

## Resume Checklist

- [x] User feedback recorded in `.cursor/workflow/state.md` Decision Log
- [x] QA human checkpoint recorded as PASS
- [x] Signoff **approved** (owner authorized Continue Workflow)
