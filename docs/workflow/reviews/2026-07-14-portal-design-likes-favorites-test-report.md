# Test Report: Portal design likes / favorites

| Field | Value |
|-------|-------|
| Date | 2026-07-14 |
| Goal | portal-design-likes-favorites |
| Plan | docs/workflow/plans/2026-07-14-portal-design-likes-favorites-plan.md |
| Status | pending_manual → **passed** (manual PASS recorded at signoff) |

---

## Automated Checks

| Check | Command | Exit | Result |
|-------|---------|------|--------|
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | 0 | pass |
| ESLint (favorites + nav) | `npx eslint apps/portal/features/favorites/**/*.{ts,tsx} …` | 0 | pass |
| Unit tests | `npx tsx --test apps/portal/features/favorites/utils/mapCustomerFavorite.test.ts` | 0 | pass (4) |
| Firestore rules harness | — | — | **N/A** — no project `@firebase/rules-unit-testing` suite for Firestore rules |
| Portal full build | skipped pending manual | — | deferred to signoff if needed |
| Studio | N/A | — | out of scope |

### Unit coverage

- `mapCustomerFavorite` valid map, doc-id fallback, reject incomplete docs
- `favoriteDocIdMatchesDesign` id consistency

---

## Manual Testing Required

Yes — UI heart controls, Liked page, AuthGate, and **dev Firestore rules deploy** before cloud device test.

See human checkpoint in workflow state / message to owner.

---

## Notes

- Rules changed in `firestore.rules` (`customers/{id}/favorites/{designId}`). Deploy to **fresh-prints-dev** (or use emulator) before expecting likes to persist against cloud.
- No design `favoriteCount` writes.
