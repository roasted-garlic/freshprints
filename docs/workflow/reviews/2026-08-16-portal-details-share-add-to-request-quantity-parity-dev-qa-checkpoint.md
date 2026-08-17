# Human Checkpoint

| Field | Value |
|-------|-------|
| Date | 2026-08-16 |
| Workflow | managed-phase / test / `portal-details-share-add-to-request-quantity-parity` |
| Reason | Owner DEV QA for TD-030 Design Details and `/share/design/{id}` quantity-control parity |
| Status | **resolved** — owner `DEV TD-030 QA: PASS` |
| Resolution | PASS after DEV data repair. Signoff approved. Production PR pending owner pre-merge audit. |

---

## What We Need From You

**Hard-refresh** localhost Portal (`http://localhost:3100`) as customer `roasted_garlic`, then re-run the full TD-030 QA checklist below.

DEV data repair archived Studio request `roasted_garlic-CR001` (`XlqFwbSoO0ZlAXMiDk8N`). You should now have **no** continuable Working Request until the first successful Add creates a new `portal_customer` draft.

Reply with `DEV TD-030 QA: PASS` / `FAIL: …` / `PASS WITH NOTES: …`.

Repair record: `docs/workflow/reviews/2026-08-16-portal-details-share-add-to-request-quantity-parity-dev-data-repair.md`

---

## Context

Formal Review **approved**. Share page reuses `CatalogRequestQuantityControls`. Prior FAIL was DEV account data (`studio_customer` editing request), not a share-only mutation bug. Production / cutover untouched. No Function origin relax. No TD-030 app-code change for this repair.

---

## Decision Required (if applicable)

None. Manual retest.

---

## Manual Test Required

**Feature / area:** Portal Design Details + `/share/design/{id}` Add-to-request → Working Request quantity controls (TD-030)

**Environment:** local (`npm run dev:portal` → `http://localhost:3100`) against `fresh-prints-dev`

**Prerequisites:**
- Login as `roasted_garlic` (same DEV customer)
- Hard refresh after data repair
- At least one public catalog design

### Steps
0. Hard refresh Portal. Confirm Current Request is empty (or virtual empty) before first add. → **Expected:** no “cannot be edited from the portal” on Discover Add.
1. Login as a customer. → **Expected:** authenticated Portal session.
2. Open a Discover/catalog design card; Add a design not in the request. → **Expected:** add persists; qty controls work (parity baseline). Refresh still shows the item.
3. Open Design Details for a design **not** in the Working Request. → **Expected:** “Add to request”.
4. Click Add. → **Expected:** CTA becomes the standard qty control **without** closing/reopening the modal.
5. Change quantity, close the modal, reopen Details. → **Expected:** quantity persists.
6. Open `/share/design/{id}` for a design **not** in the request. → **Expected:** “Add to request”.
7. Click Add. → **Expected:** CTA immediately becomes the standard qty control. **No** “cannot be edited from the portal.”
8. Change quantity, refresh the shared page. → **Expected:** quantity reconstructs correctly.
9. Open a shared design **already** in the request. → **Expected:** qty controls appear immediately.
10. Open the same share URL logged out. → **Expected:** public page still works; request action remains “Sign in to add to a request”.
11. Watch the console. → **Expected:** no obvious errors.
12. Confirm share title/description/preview still render. → **Expected:** SSR/OG/page rendering not broken.

### Pass criteria
- [ ] Discover Add persists (no cannot-edit warning)
- [ ] Discover/catalog card qty behavior unchanged
- [ ] Design Details: Add → immediate qty controls; already-in-request shows qty immediately; reopen reconstructs qty
- [ ] Share page: Add → immediate qty controls; already-in-request shows qty immediately; refresh reconstructs qty
- [ ] Guest share remains public and login-gated for request actions
- [ ] No design lifecycle change observed
- [ ] Share metadata/page rendering intact
- [ ] No obvious console errors

### Please reply with
- `DEV TD-030 QA: PASS` — all criteria met
- `DEV TD-030 QA: FAIL: [description]` — what failed
- `DEV TD-030 QA: PASS WITH NOTES: [notes]` — acceptable with follow-ups

**Your result:** `DEV TD-030 QA: PASS` (2026-08-16)

---

## Production promotion (later — not this checkpoint)

```
AUTHORIZE PROD APP HOSTING ROLLOUT: TD-030 QTY PARITY
```

Target: `fresh-prints-portal` on `fresh-prints-prod`. No DNS/cutover. Do not send until after DEV QA + signoff.

---

## Impact If Delayed

TD-030 stays open. Live `myprintrequest.com` still has the original Add-stays-Add share defect until a later rollout.

---

## Agent Actions While Paused

**Allowed:** Read docs; update checkpoint; answer clarifying questions

**Forbidden:** Signoff without PASS; close TD-030; production App Hosting; reopen cutover; relax Function origin checks

---

## Resolution Record

| Date | User response | Recorded in state | Follow-up |
|------|---------------|-------------------|-----------|
| 2026-08-16 | `DEV TD-030 QA: FAIL` — qty + cannot-edit; empty after refresh | yes | Investigation |
| 2026-08-16 | `DEV TD-030 DISCOVER DISCRIMINATOR: FAILS SAME WAY` | yes | DEV data repair |
| 2026-08-16 | `DEV TD-030 QA: PASS` | yes | Signoff; production PR (no merge) |

---

## Resume Checklist
- [x] User feedback recorded in `.cursor/workflow/state.md` Decision Log
- [ ] `Human Checkpoint Required` set to `no` (clears after PASS)
- [x] Discriminator recorded
- [x] DEV data repair recorded
- [ ] Signoff only after PASS / PASS WITH NOTES
- [ ] TD-030 closed only if **both** Details and share meet parity
