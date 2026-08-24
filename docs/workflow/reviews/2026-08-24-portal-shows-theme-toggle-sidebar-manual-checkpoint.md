# Human Checkpoint

| Field | Value |
|-------|-------|
| Date | 2026-08-24 |
| Workflow | managed-phase / test / portal-shows-theme-toggle-sidebar |
| Reason | Manual visual QA that Upcoming Shows uses the sidebar theme toggle, not the floating header toggle |
| Status | **resolved** |
| Resolution | Owner `PASS` 2026-08-24 |

---

## What We Need From You

Open local Portal `/shows` and confirm the sun/moon control is in the **sidebar footer** (with Help / Follow / Login) and **not** in the top-right header.

---

## Context

Upcoming Shows shipped with the sidebar toggle hidden and `/shows` omitted from the app-shell route list, so the floating top-right toggle appeared. That is restored on `development` (uncommitted). Live production still has the old chrome until a later App Hosting rollout.

Plan: `docs/workflow/plans/2026-08-24-portal-shows-theme-toggle-sidebar-plan.md`

---

## Decision Required (if applicable)

None. Visual PASS/FAIL only.

**Your decision:** _pending_

---

## Manual Test Checkpoint

**Feature / area:** Portal Upcoming Shows theme selector placement
**Why automated tests are insufficient:** Placement is visual chrome; SSR does not always emit the client sidebar toggle.
**Environment:** local (`http://localhost:3100` — Portal already running)
**Prerequisites:** Dev server on port 3100; guest or signed-in is fine

### Steps
1. Open `http://localhost:3100/shows` → **Expected:** Compact sun/moon toggle in the **bottom of the left sidebar**, next to Login / Signup (or Sign out). **No** sun/moon pair in the top-right of the page.
2. Click a show day/slot and open a gallery URL `/shows/[showId]` → **Expected:** Same sidebar placement; still no top-right toggle.
3. Open `http://localhost:3100/catalog` → **Expected:** Theme toggle still in the sidebar footer (unchanged).
4. Open `http://localhost:3100/login` → **Expected:** Floating top-right theme toggle still present (auth pages are supposed to keep it).

### Pass criteria
- [ ] `/shows` theme selector is in the sidebar footer
- [ ] `/shows` has no top-right theme selector
- [ ] `/shows/[showId]` matches `/shows`
- [ ] `/catalog` still has the sidebar toggle
- [ ] `/login` still has the floating toggle

### Please reply with
- `PASS` — all criteria met
- `FAIL: [description]` — what failed
- `PASS WITH NOTES: [notes]` — acceptable with follow-ups

**Your result:** PASS

---

## Impact If Delayed

Signoff and the follow-up production Portal rollout wait on this visual check. Live production still shows the header toggle on `/shows`.

---

## Agent Actions While Paused

**Allowed:** Read docs, update checkpoint doc, answer clarifying questions

**Forbidden:** Implement, deploy, migrate, change secrets, expand scope, App Hosting, production PR unless owner asks

---

## Resolution Record

| Date | User response | Recorded in state | Follow-up |
|------|---------------|-------------------|-----------|
| 2026-08-24 | PASS | yes | Signoff then owner-requested production PR/rollout |

---

## Resume Checklist
- [x] User feedback recorded in `.cursor/workflow/state.md` Decision Log
- [x] `Human Checkpoint Required` set to `no`
- [x] Plan/review updated if scope changed
- [x] `Next Required Step` set for current phase
