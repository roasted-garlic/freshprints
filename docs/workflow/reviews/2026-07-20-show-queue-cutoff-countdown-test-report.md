# Test Report: Show queue cutoff + calendar countdown

| Field | Value |
|-------|-------|
| Date | 2026-07-20 |
| Tester | Test Agent |
| Plan | docs/workflow/plans/2026-07-20-show-queue-cutoff-countdown-plan.md |
| Implementation | Session: shared cutoff utils, Studio Show Queue setting, Functions enforce, Portal picker countdown |
| Overall | **passed** (automated passed; owner manual **PASS** 2026-07-20) |

---

## Summary

Shared cutoff unit tests passed (8/8 initially; **11/11** after countdown UX polish). Portal typecheck passed. Functions build + deploy to **fresh-prints-dev** succeeded (`listPortalAllocatableShows`, `queuePortalPrintRequestToShow`, `firestore:rules`). Studio full `tsc` blocked by pre-existing `ignoreDeprecations` tsconfig issue (unrelated). Owner manual QA **PASS** 2026-07-20 (including countdown layout/copy/mobile condense polish).

### UX polish (2026-07-20, post-implement)

Owner feedback: avoid separate “Add closes…” line; drop “You have”. Capacity row is **one flex row** — spots left, countdown right — with copy `{duration} to add designs to this show` / `No longer able to add designs to this show`, and success/warning/danger text colors by remaining time (>2h / ≤2h / ≤30m). Soft-reload Portal only; no Functions redeploy.

---

## Commands Run

| Check | Command | Exit Code | Result | Notes |
|-------|---------|-----------|--------|-------|
| Unit | `npx tsx --test packages/shared/src/utils/showQueueCutoff.test.ts` | 0 | pass | 8 tests |
| Typecheck Portal | `npm run typecheck --workspace @fresh-prints/portal` | 0 | pass | |
| Typecheck Studio | `npm run typecheck --workspace @fresh-prints/studio` | — | skip | No typecheck script; `tsc` fails on pre-existing tsconfig `ignoreDeprecations` |
| Functions build | `npm run build --prefix functions` | 0 | pass | After path fix for `loadPortalQueueCutoffHours` |
| Lint | — | — | skip | Not required for this slice |
| Deploy | `firebase deploy --only firestore:rules,functions:listPortalAllocatableShows,functions:queuePortalPrintRequestToShow --project fresh-prints-dev` | 0 | pass | Dev only |

---

## Failures (if any)

None in automated scope.

---

## Skipped Checks

| Check | Reason |
|-------|--------|
| Studio typecheck script | Missing; known tsconfig deprecation flag issue |
| E2E / full build | Manual UI checkpoint covers picker/settings |
| Production deploy | Out of scope |

---

## Manual Testing

| Test | Status | Notes |
|------|--------|-------|
| Studio cutoff setting | **PASS** | Owner 2026-07-20 |
| Portal countdown + closed shows | **PASS** | Owner 2026-07-20 (layout/copy/mobile polish included) |
| Server reject past cutoff | **PASS** | Covered by owner PASS |
| Studio staff still allocates | **PASS** | Covered by owner PASS |

### Manual Test Checkpoint

**Feature / area:** Show queue cutoff + Add-to-Show countdown  
**Why automated tests are insufficient:** Calendar layout, countdown copy, Studio settings UX, live Functions behavior  
**Environment:** local Studio + Portal against **fresh-prints-dev** (Functions/rules already deployed)  
**Prerequisites:** Staff login in Studio; customer login in Portal; at least one upcoming show with a known start time

### Steps

1. **Studio → Show Queue → Settings** → set **Portal add-to-show cutoff** to **5** (or another value) → Save.  
   → **Expected:** Saves without permission/rules error; reload modal shows saved value.
2. Note a show start time (e.g. 8:00 PM). With cutoff 5, adds should close at start−5h (e.g. 3:00 PM).  
3. **Portal** → Continuable request → **Add to Show**. Soft-reload Portal if needed.  
   → **Expected:** On the same row as spots: left = capacity (`200 spots left · …`), right = `2h 14m to add designs to this show` (or similar). Color: green when >2h left, warning ≤2h, danger ≤30m. Capacity bar + scroll-to-progress still work; **no giant banner / no second meta line**.
4. Pick a show that is already past cutoff (or temporarily set cutoff high, e.g. 72, so near shows close).  
   → **Expected:** Slot shows **CLOSED** badge; right meta = `No longer able to add designs to this show` (danger); not selectable; other shows still selectable.
5. If possible, attempt queue on a closed show (stale client).  
   → **Expected:** Server error: past add cutoff / choose another show.
6. **Studio** staff Add to Show on a Portal-closed show.  
   → **Expected:** Staff can still allocate (Portal-only gate).

### Pass criteria

- [x] Studio setting saves and reloads
- [x] Portal countdown is on the same row as spots (left/right), compact, colors by urgency; layout/scroll OK
- [x] Past-cutoff shows show `No longer able to add designs to this show` + CLOSED badge
- [x] Functions reject past-cutoff queue
- [x] Studio staff allocation still works after Portal cutoff

### Owner reply

- **PASS** — 2026-07-20 (including countdown layout/copy/mobile condense polish)

---

## Recommendations

None for CI beyond keeping shared cutoff unit tests.

---

## Signoff Readiness

- [x] Required automated checks pass OR failures documented
- [x] Manual tests completed (owner PASS)
- [x] Ready for signoff — see `2026-07-20-show-queue-cutoff-countdown-signoff.md`
