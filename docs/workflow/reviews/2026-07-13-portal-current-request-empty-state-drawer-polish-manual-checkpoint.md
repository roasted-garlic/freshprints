# Manual Checkpoint — Portal Current Request empty-state + drawer polish

| Field | Value |
|-------|-------|
| Date | 2026-07-13 |
| Goal | `portal-current-request-empty-state-drawer-polish` |
| Environment | Local Portal (`fresh-prints-dev` / emulators OK) |

## Why automated tests are insufficient

Empty-state copy, drawer chrome, and Clear placement need visual/UX judgment.

## Prerequisites

- Signed in as a Portal customer with **no** working request (or clear one first via cart drawer)
- Portal app running

## Manual Test Checkpoint

### Steps

1. Open **/requests** with zero history → **Expected:** “Your Current Request is ready”; primary **Browse designs**; secondary **Open Your Stash**; **no** Start request button.
2. Click **Open Your Stash** → **Expected:** right drawer titled **Your Stash** (subtitle Current Request); empty state with bag icon + “Your Stash is empty”; footer CTAs **Browse designs** + **Upload Designs**; header **X** closes (no text Close).
3. Browse catalog → **Add to request** on a design → **Expected:** working request created; badge updates; item appears in Stash; footer becomes **Review Request** only.
4. Open Stash with items → **Expected:** “Clear request” small text beside `N designs · N prints`; left sidebar has **no** Clear request.
5. Clear via confirm → **Expected:** returns to empty Stash layout with Browse/Upload CTAs.

### Pass criteria

- [x] Empty `/requests` matches cart-style Current Request (no Start required)
- [x] Drawer uses **Your Stash** (not Basket); empty layout has icon + dual CTAs
- [x] Clear only in Stash drawer, compact by summary
- [x] Close is an X
- [x] Sidebar has no Clear
- [x] Visual style stays Portal (not comic/neon reference)

### Owner result (2026-07-13)

**PASS**
