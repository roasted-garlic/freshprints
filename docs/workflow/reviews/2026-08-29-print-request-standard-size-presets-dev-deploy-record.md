# DEV Deploy Record — Print Request Standard Size Presets

| Field | Value |
|-------|-------|
| Date | 2026-08-29 |
| Goal | `print-request-standard-size-presets` |
| Target | **fresh-prints-dev** |
| Production | **NOT deployed** |

---

## Pre-deploy verification

| Check | Result |
|-------|--------|
| Firestore rules emulator (`printRequestItemResize.rules.test.ts`) | **PASS** — 9/9 (includes `standardSizePresetKey` allow + invalid-type deny) |
| Full-repo `npm run lint` | **FAIL** — pre-existing unrelated errors (portal add-design flow, SettingsPage conditional-hooks pattern, staff-inbox, etc.) |
| Feature-file lint (scoped) | **PASS** — all changed TS/TSX files clean after moving label helpers to `standardPrintSizeLabels.ts` |
| Studio typecheck | **Pre-existing failures** — no errors matching feature file paths |
| Portal typecheck | **Pre-existing failures** — no errors matching feature file paths; `portalStandardPrintSizesService` trace order fix clean |

**Emulator note:** Required portable Java 21 JRE under `.tools/jre21-portable` (system Java absent).

---

## Commands executed

```bash
firebase deploy --only firestore:rules --project fresh-prints-dev
firebase deploy --only functions:updateStandardPrintSizesSettings,functions:duplicatePortalPrintRequestItem --project fresh-prints-dev
```

---

## Deploy results

| Resource | Result |
|----------|--------|
| Firestore Rules | **Success** — `firestore.rules` released (includes `settings/standardPrintSizes`, `printRequestItems.standardSizePresetKey`) |
| `updateStandardPrintSizesSettings` | **Success** — **created** (new callable, us-central1) |
| `duplicatePortalPrintRequestItem` | **Success** — **updated** (preset-key copy not previously on DEV; redeploy required) |

**Not deployed:** Storage rules, indexes, App Hosting, Portal prod, Studio release, other Functions, production.

---

## Post-deploy verification

| Item | Status |
|------|--------|
| Rules live on DEV | Confirmed via successful rules deploy |
| `updateStandardPrintSizesSettings` registered | Confirmed — create operation succeeded |
| `duplicatePortalPrintRequestItem` updated | Confirmed — update operation succeeded |
| `settings/standardPrintSizes` document | **Absent** (expected) — app resolves `DEFAULT_STANDARD_PRINT_SIZES_SETTINGS` until owner saves via Settings UI |
| Live callable smoke test | **Not run** — requires owner-authenticated Studio session (manual QA) |

---

## Correctives applied pre-deploy

- Extracted `resolveStandardPrintSizeCardLabel` to `standardPrintSizeLabels.ts` (eslint react-refresh warnings).

---

## Next gate

**Owner manual QA** — Studio + Portal local against `fresh-prints-dev`. Reply `PASS`, `PASS WITH NOTES: …`, or `FAIL: …`.

---

## Corrective redeploy — v1 catalog callable (2026-08-29)

| Field | Value |
|-------|-------|
| Authorization | Owner approved DEV-only redeploy |
| Scope | `updateStandardPrintSizesSettings` only |
| Reason | Deployed callable still validated pre-v1 six-placement structure; Save after Reset requires v1 parse |

### Command executed

```bash
firebase deploy --only functions:updateStandardPrintSizesSettings --project fresh-prints-dev
```

### Result

| Resource | Result |
|----------|--------|
| `updateStandardPrintSizesSettings` | **Success** — **updated** (Node.js 20, us-central1) |

Exit code: **0**. Functions build (`tsc`) passed in predeploy.

**Not deployed:** Firestore rules, other functions, production.

### Next gate

**Owner focused re-QA** — see `2026-08-29-print-request-standard-size-presets-focused-reqa-checkpoint.md`.
