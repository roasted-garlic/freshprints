# Amendment: Portal registration stuck — Auth inventory correction (2026-07-31)

| Field | Value |
|-------|-------|
| Date | 2026-07-31 |
| Type | Incident / Formal Review amendment (docs only) |
| Parent incident | `docs/workflow/reviews/2026-07-31-production-portal-registration-stuck-incident.md` |
| Parent plan | `docs/workflow/plans/2026-07-31-production-portal-registration-stuck-plan.md` |
| Parent review | `docs/workflow/reviews/2026-07-31-production-portal-registration-stuck-review.md` (**approved_with_changes** — still in force) |
| Verdict | **amendment recorded** — no implementation; Formal Review verdict unchanged |

---

## Why this amendment

Owner reported that the Response body previously considered for capture was **not** the failed
`accounts:lookup` (HTTP 400). It was a **successful** Identity Toolkit response:

- `kind: identitytoolkit#GetAccountInfoResponse`
- one Google-authenticated user
- `localId` prefix **`MXeK…`**
- `lastRefreshAt: 2026-07-31T20:06:27.801Z`
- email/provider details present — **not** copied into docs

Console still separately showed an `accounts:lookup` **HTTP 400**. That failed body’s
code/message remains **`[NEEDS OWNER RESPONSE CAPTURE]`**.

Discrepancy: prior incident recorded Auth-only orphan prefix **`Pl3ODnKm…`**, not `MXeK…`.

---

## Read-only re-inventory (fresh-prints-prod)

### Firebase Authentication (current)

| uidPrefix | Providers | Created (UTC) | Last sign-in (UTC) | Disabled | Notes |
|-----------|-----------|---------------|--------------------|----------|-------|
| `L3jjfWJG…` | `google.com` | 2026-07-31T20:10:37Z | 2026-07-31T20:10:37Z | false | **Current** Google Auth-only orphan |
| `7v3SLjRN…` | `password` | 2026-07-31T03:05:35Z | 2026-07-31T14:10:50Z | false | Owner (`users/{uid}` role `owner`) |

**Total Auth users listed:** 2.

### Prior prefixes vs current list

| Prefix | Exists now? |
|--------|-------------|
| `Pl3ODnKm…` (prior incident orphan) | **No** — 0 matches |
| `MXeK…` (successful GetAccountInfoResponse) | **No** — 0 matches |
| `L3jjfWJG…` (current Google user) | **Yes** |

Interpretation (evidence-backed, no deletion performed by agents):

- Prior `Pl3ODnKm…` classification was **correct at first diagnosis time**, then became **stale**
  (user no longer in Auth list). Cause of removal is **`[NEEDS OWNER CONFIRMATION]`** (e.g.
  Console delete) — agents did not delete/disable Auth users.
- Successful lookup for `MXeK…` at ~20:06:27Z proves Identity Toolkit **can** return
  `GetAccountInfoResponse` for at least one session; that user is **also gone** from the current
  Auth list.
- A **newer** Google Auth-only user `L3jjfWJG…` was created at 20:10:37Z (Portal HTTP activity
  around the same minute).

Do **not** treat multiple Google prefixes as one account. Likely **multiple Google sign-in /
registration attempts** (possibly different Google accounts or recreate-after-delete). Exact
account choice is **`[NEEDS OWNER CONFIRMATION]`**.

### Firestore provisioning per relevant UID

| uidPrefix | `users/{uid}` | `customers` by `userId` | `customerUsernames` |
|-----------|---------------|-------------------------|---------------------|
| `L3jjfWJG…` | **absent** | **0** | n/a |
| `7v3SLjRN…` (owner) | **present** (`role=owner`) | **0** (expected) | n/a |
| `Pl3ODnKm…` | n/a (Auth gone) | **0** historically at first diagnosis | **0** |
| `MXeK…` | n/a (Auth gone) | **0** after recheck | **0** |

**Collection totals (recheck):** `customers` = **0**; `customerUsernames` = **0**;
`users` with `role=customer` = **0**.

**No** Firestore profile/customer/username records were created after the prior diagnosis.

### `registerCustomer` logs (~20:06:27Z and all of 2026-07-31)

| Window | Result |
|--------|--------|
| `registercustomer` Cloud Run 19:55–20:20Z | **0** entries |
| `registercustomer` Cloud Run all day 2026-07-31 | **0** entries |

**`registerCustomer` was not invoked** during the latest attempt window (nor earlier today).

Portal App Hosting showed ordinary HTTP 200/304 traffic around 20:06 and 20:10 (no callable proof).

---

## Successful lookup — allowed use only

Preserve solely as:

> Identity Toolkit account lookup **can succeed** for at least one current Auth session
> (`GetAccountInfoResponse`, `localId` prefix `MXeK…`, `lastRefreshAt` 2026-07-31T20:06:27.801Z).

**Must not:**

- be treated as the HTTP 400 error body
- select API-key / Authorized Domain / OAuth / provider remediations
- clear the need to capture the **failed** 400 Response

---

## Revised partial-state classification

**Auth user only** (current Google uidPrefix `L3jjfWJG…`), with **historical Auth-only orphans**
(`Pl3ODnKm…`, `MXeK…`) no longer present in Auth.

Pattern: repeated Google Auth sessions without `registerCustomer` / Firestore provisioning.

---

## Root-cause statement — amendment

| Prior statement | Amendment |
|-----------------|-----------|
| Stable single orphan `Pl3ODnKm…` | **Stale.** That uid is gone; current orphan is `L3jjfWJG…`. |
| `accounts:lookup` always fails | **Too strong.** At least one successful `GetAccountInfoResponse` occurred; console still shows a separate **400**. |
| Callable never reached | **Still stands** for 2026-07-31 (no `registerCustomer` invocations). |
| Permanent-loading UX defect | **Still stands.** |
| Exact 400 body | **Still `[NEEDS OWNER RESPONSE CAPTURE]`** from the **red/failed** Network row only. |

Revised mechanism (docs-only):

1. Google sign-in can create Auth users.
2. Complete-profile provisioning still does not reach `registerCustomer`.
3. Browser shows both successful Identity Toolkit lookups **and** separate `accounts:lookup` 400s —
   the 400 must be captured from the failed request, not a 200/`GetAccountInfoResponse`.
4. Multiple Auth-only Google users have appeared and disappeared — inventory must be rechecked
   before any orphan-deletion approval.

---

## Formal Review impact

Parent Formal Review remains **`approved_with_changes`**. This amendment:

- updates inventory / orphan uid references
- does **not** approve implementation
- does **not** authorize Auth Console remediations from the successful response
- keeps Phase 0 owner capture of the **failed** 400 body as mandatory before Auth-config fixes

Plan orphan phrase should target **current** prefix only after a fresh read-only confirm at
implement/repair time (do not delete `Pl3ODnKm` / `MXeK` — they are already absent).

---

## Actions not taken

No Auth delete/disable, Firestore repair, retries, domain/API-key/OAuth changes, source changes,
deploys, branding, or Stage 2.
