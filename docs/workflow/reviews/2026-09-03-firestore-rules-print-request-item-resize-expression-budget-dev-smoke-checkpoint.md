# Human Checkpoint: DEV Firestore Rules smoke — print request item resize expression budget

| Field | Value |
|-------|-------|
| Date | 2026-09-03 |
| Workflow | managed-phase / `firestore-rules-print-request-item-resize-expression-budget` |
| Reason | Owner DEV QA after `firestore:rules` deploy to `fresh-prints-dev` |
| Status | **resolved** |
| Resolution | **OWNER DEV RULES QA: PASS WITH NOTE** |

---

## What We Need From You

Run the Portal smoke below on **fresh-prints-dev** and reply with `OWNER DEV RULES QA: PASS` or `OWNER DEV RULES QA: FAIL — <symptom>`.

---

## Context

DEV Firestore Rules were deployed (Rules only). Customer item resize with unchanged interactive-upscale fields should now succeed. Automated suite remains **169/169**. Signoff is blocked until this QA.

**Deploy record**

| Item | Value |
|------|-------|
| Command | `firebase deploy --only firestore:rules --project fresh-prints-dev` |
| Exit code | 0 |
| Compile | `cloud.firestore: rules file firestore.rules compiled successfully` |
| Release | `firestore: released rules firestore.rules to cloud.firestore` |
| Project | `fresh-prints-dev` |
| Functions / Storage / indexes / migration | not deployed |

Implementation Review residual (do not expand scope): customer fast path does not fully re-type-check every unchanged exotic Admin-only malformed field. Unknown extra keys and `quantity: 0` still DENY.

---

## Manual Test Required

**Feature / area:** Portal Print Request item resize against deployed DEV Rules

**Environment:** Portal against **fresh-prints-dev** (disposable or safe existing customer request)

### Pass criteria (Owner result)

- [x] Interactive-upscale-present resize: PASS
- [x] Resize save persisted: PASS
- [x] Upscale state persisted after reload: PASS
- [x] Protected upscale metadata unchanged: PASS
- [x] No Firestore permission error: PASS
- [ ] Customer-upload resize: not separately reported (Rules goal accepted without blocking)

**Your result:** `OWNER DEV RULES QA: PASS WITH NOTE`

### Owner note (separate defect — not in this goal)

After a Library design was resized to 16″ wide and successfully upscaled, Portal initially displayed the correct ~300 DPI badge. After navigating away and returning, Upscale remained ON and saved enhanced state remained correct, but Portal displayed ~225 DPI. Studio continued to display ~300 DPI for the same saved item.

Interpretation: persisted data and Rules are correct; Portal rehydrates/recalculates the DPI badge using stale/original/pre-enhance image dimensions after reload.

**Follow-up:** `TD-033` in `docs/project/TECH_DEBT.md` — suggested phase `portal-interactive-upscale-dpi-badge-reload`. Do **not** fix inside this Rules goal.

---

## Impact If Delayed

Signoff, commit/push, and any further promotion stay blocked until owner authorizes Signoff.

---

## Agent Actions While Paused

**Allowed:** Read docs; await Signoff authorization

**Forbidden:** Additional deploy; commit/push unless owner requests; production; fixing TD-033 in this goal; Functions/Storage/indexes

---

## Resolution Record

| Date | User response | Recorded in state | Follow-up |
|------|---------------|-------------------|-----------|
| 2026-09-03 | OWNER DEV RULES QA: PASS WITH NOTE (upscale resize / persist / metadata / no permission error PASS; Portal DPI badge after reload wrong vs Studio) | yes | TD-033; await Signoff authorization |

---

## Resume Checklist

- [x] Owner QA recorded in `.cursor/workflow/state.md` Decision Log
- [x] Separate Portal DPI defect recorded as TD-033
- [ ] Await owner authorization for Signoff (do not start Signoff until authorized)
- [x] Do not fix TD-033 in this goal
