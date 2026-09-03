# DEV Deploy Record: Customer-specific temporary Print Request + Show quota override

| Field | Value |
|-------|-------|
| Date | 2026-09-02 |
| Goal | `customer-specific-temporary-print-request-and-show-quota-override` |
| Project | **fresh-prints-dev** |
| Owner authorization | DEV Functions + Firestore Rules + Studio/Portal local restart **AUTHORIZED** |
| Production | **NOT AUTHORIZED** / not touched |
| Status | **deployed** — STOP for Owner QA A–Q |
| Implementation Review | `docs/workflow/reviews/2026-09-02-customer-specific-temporary-print-request-and-show-quota-override-implementation-review.md` (**approved_with_notes**) |
| Test report | `docs/workflow/reviews/2026-09-02-customer-specific-temporary-print-request-and-show-quota-override-test-report.md` |

---

## Pre-deploy checks

| Check | Result |
|-------|--------|
| `firebase use` | **fresh-prints-dev** (current) |
| Explicit `--project` | `fresh-prints-dev` on every deploy command |
| Source baseline HEAD | `c050a0bfd02f53098e6c36697381a7657b661c5a` (= goal start / `origin/development`) |
| Working tree | **dirty / uncommitted** — quota-override implementation + workflow docs; `.worktrees/` present but unrelated to deploy packages |
| Post-review runtime drift | Studio UX moved override from User Info → **Edit Customer → Quota Override tab** (goal-scoped). Affected tests + Functions build **re-run before deploy** |
| Focused tests (re-run) | **33/33 PASS** (was 32; +1 contract for Edit-tab host) |
| Functions build | **exit 0** |
| Rules verification | Static alignment via `printRequestLimitSettingsRulesAlignment.test.ts` (in focused suite) **PASS**. Full `npm run test:rules` emulator suite **not** re-run (no dedicated quota-override rules unit file; deferred unless Owner requires) |
| Cap A / daily counters | No runtime path reintroduced for Portal quota; `printRequestDesignDailyLimits` only appears in account-deletion cleanup |
| Unrelated mixed runtime | **None** requiring `[NEEDS OWNER DECISION]` |

---

## Firestore Rules

### Command

```bash
firebase deploy --only firestore:rules --project fresh-prints-dev
```

| Result | Value |
|--------|-------|
| Exit | **0** |
| Compile | `firestore.rules` compiled successfully (pre-existing unused/invalid-name warnings only) |
| Release | `released rules firestore.rules to cloud.firestore` |
| Storage Rules | **NO** |
| Indexes | **NO** (indexes file was *read* by CLI; not deployed) |
| Migration | **NO** |

---

## Functions — exact allowlist

### Command

```bash
firebase deploy --only functions:updateCustomerPrintRequestQuotaOverride,functions:addPortalCatalogDesignToPrintRequest,functions:confirmCustomerUploadsAndAttachToRequest,functions:duplicatePortalPrintRequestItem,functions:updatePortalPrintRequestItemQuantity,functions:customerAddAssistedApprovedProofToPrintRequest,functions:queuePortalPrintRequestToShow --project fresh-prints-dev
```

| # | Function | Result |
|---|----------|--------|
| 1 | `updateCustomerPrintRequestQuotaOverride` | **Successful create** (new) |
| 2 | `addPortalCatalogDesignToPrintRequest` | Successful update |
| 3 | `confirmCustomerUploadsAndAttachToRequest` | Successful update |
| 4 | `duplicatePortalPrintRequestItem` | Successful update |
| 5 | `updatePortalPrintRequestItemQuantity` | Successful update |
| 6 | `customerAddAssistedApprovedProofToPrintRequest` | Successful update |
| 7 | `queuePortalPrintRequestToShow` | Successful update |

Exit: **0** — Deploy complete to `fresh-prints-dev`.

### Post-deploy list verification

`firebase functions:list --project fresh-prints-dev` shows all seven as callable v2 `us-central1` (nodejs20).

### Deploy warnings (non-blocking)

- Node.js 20 runtime deprecated (decommission 2026-10-30)
- Outdated `firebase-functions` package advisory

---

## Clients

| Client | Action | Result |
|--------|--------|--------|
| Studio | Stopped + `npm run dev:studio` | **http://localhost:5173** HTTP 200; `.env.local` → `fresh-prints-dev` |
| Portal | Stopped + `npm run dev:portal` | **http://localhost:3100** Ready; HTTP 200; `.env.local` → `fresh-prints-dev` |
| Portal App Hosting | **NOT** deployed | — |
| Studio publish | **NOT** published | — |

### Studio UI location (Owner note)

Quota override is under:

**Users → Customer → Edit customer → Quota Override tab**

(not User Info). Users list still shows clock-aware **Quota Override** badge when active.

---

## Safe smoke (agent)

| # | Check | Result |
|---|-------|--------|
| 1 | New owner callable exists in DEV | **YES** |
| 2 | Six Portal consumer Functions active | **YES** |
| 3 | Callable-not-found (list presence) | No missing names on allowlist |
| 4 | Rules permission regressions | Not fully exercised without auth matrix; Rules released successfully |
| 5 | Studio loads | HTTP 200 |
| 6 | Edit Customer / Quota Override surface | Present in source + HMR/restart (Owner to click through) |
| 7 | Portal loads | HTTP 200 on :3100 |
| 8–11 | Global settings + fixture effective limits | **Owner QA** (fixtures not auto-created) |
| 12 | Storage / indexes / migration | **NO** activity |

---

## Explicitly NOT done

- Production deploy
- Storage Rules
- Indexes deploy
- Migration
- Portal App Hosting
- Studio publish
- Commit / push
- Smart Profiling
- Batch-allocation
- Signoff

---

## Production inventory (later coordinated promotion)

| Area | Needed |
|------|--------|
| Shared | **YES** |
| Studio | **YES** |
| Portal | **YES** |
| Functions | **YES** (same 7-name allowlist) |
| Firestore Rules | **YES** |
| Storage Rules | **NO** |
| Indexes | **NO** |
| Migration | **NO** |

Production remains **NOT AUTHORIZED**.

---

## Follow-up (same day) — Internal Save fix

| Field | Value |
|-------|-------|
| Cause | Activity metadata `expiresAtMs: undefined` rejected by Firestore |
| Command | `firebase deploy --only functions:updateCustomerPrintRequestQuotaOverride --project fresh-prints-dev` |
| Result | Exit **0** — Successful update |
| Rules / other Functions | **NOT** redeployed |

Studio linked-quota UX polish is client-only (HMR/reload). See `...-linked-ux-implementation-review.md`.

## Owner QA / Signoff

| Field | Value |
|-------|-------|
| Owner QA | **PASS** (2026-09-02) — full A–Q incl. linked UX + Internal Save |
| Signoff | **approved** — `docs/workflow/reviews/2026-09-02-customer-specific-temporary-print-request-and-show-quota-override-signoff.md` |
| Final DEV | **APPROVED** |
| Production | **NOT AUTHORIZED** |
| FreshForge | **IDLE** |

## Next

Owner may authorize commit/push. Production promote later with inventory in signoff (include corrective callable). Do not auto-start Smart Profiling or batch-allocation.
