# DEV Deploy Record — WS3 Configurable Gang-Sheet Pricing / Weight (Firestore Rules)

**Date:** 2026-09-01  
**Goal:** `pre-smart-profiling-print-request-and-gang-sheet-polish` (WS3 amendment)  
**Owner authorization:** DEV Firestore Rules deploy approved for Show Queue pricing/weight settings fields  
**Production:** **NOT AUTHORIZED / untouched**

---

## Git preflight

| Field | Value |
|-------|-------|
| Branch | `development` |
| Implementation SHA | `40fe7fd075058a0ccfc60ceafd997e6b64f23890` |
| `git rev-parse origin/development` | `40fe7fd075058a0ccfc60ceafd997e6b64f23890` |
| Local == origin | **PASS** |
| Prior SHA | `264ca13f` |
| Scoped commit | `feat: configurable gang-sheet pricing and weight tiers in Show Queue settings` |
| Unrelated local changes | **Preserved unstaged** (Portal print-request, show-designs, Studio imports, etc.) |

---

## Pre-deploy verification

| Check | Result |
|-------|--------|
| Formal Review | **approved** |
| Implementation Review | **approved** |
| Focused tests | **23/23 PASS** |
| Functions build | **PASS** (prior session) |
| Migration | **NONE** |
| Storage Rules | **Not changed / not deployed** |
| Firestore indexes | **Not deployed** |
| Functions | **Not deployed** |
| Hosting | **Not deployed** |

### Firestore Rules diff scope (committed @ `40fe7fd0`)

**Only** five new optional fields on `settings/showQueue` in `showQueueSettingsFieldsValid`:

- `gangSheetSectionPriceCutoffInches`
- `gangSheetSmallTierPriceUsd`
- `gangSheetSmallTierWeightOz`
- `gangSheetLargeTierPriceUsd`
- `gangSheetLargeTierWeightOz`

Existing `isOwnerOrAdmin()` write gate and staff read unchanged. No customer access broadened.

---

## Firebase deploy — `fresh-prints-dev`

| Field | Value |
|-------|-------|
| Command | `firebase deploy --only firestore:rules --project fresh-prints-dev` |
| Source | `firestore.rules` @ `40fe7fd0` |
| Exit code | **0** |
| Result | `firestore: released rules firestore.rules to cloud.firestore` |
| Compile warnings | Pre-existing unused-function warnings only; compile **successful** |

### Not deployed

- Functions
- Storage Rules
- Firestore indexes
- Hosting / App Hosting
- Production (`fresh-prints`)

---

## Post-deploy

| Item | Status |
|------|--------|
| Only `fresh-prints-dev` touched | **yes** |
| Production untouched | **yes** |
| Studio restart required | **yes** — `npm run dev:studio` on current `development` source |
| Settings value changes after deploy | Firestore only — **no further Firebase deploy** for tier edits |

---

## Owner WS3 QA

**WS3 PASS** — see `2026-09-01-pre-smart-profiling-ws3-owner-dev-qa-pass.md`.

Managed goal signoff remains **NOT AUTHORIZED** until remaining managed-goal source is committed.
