# Plan: Cap A / Cap B foolproof UX (per-request max = Cap B)

| Field | Value |
|-------|-------|
| Date | 2026-07-19 |
| Author | Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-19-cap-a-b-foolproof-per-request-max-review.md |

---

## Goal

Make Portal print limits foolproof for elderly users: one Current Request holds at most **Cap B** prints (typically 25); Cap A (typically 50) is the daily budget across requests. Fix the false **"Daily print limit reached"** when the request has ~26 prints (request-full mislabeled and/or Cap A optimistic remaining double-count).

## Background

Owner screenshot: Current Request shows **26 prints** while UI says **Daily print limit reached** and blocks Add. Cap A default is **50**; Cap B / show is **25**. Product model: one request ≈ one show; fill to 25 → Add to show → start another request (until daily 50).

Prior Cap B remove-first phase remains valid for queue overflow; this phase adds **per-request max enforcement** (same setting as Cap B) and corrects Cap A labeling/computation.

## Product model (authoritative)

| Cap | Meaning | Default / source |
|-----|---------|------------------|
| **Per Current Request max** | Hard max prints on one working request | **Same as Cap B** (`maxQuantityPerShowPerCustomer`, typically 25) |
| **Cap B** | Max prints one customer can have on one show | Settings (25) |
| **Cap A** | Max prints added to requests per day (Central midnight) | Settings (50) |

## Scope

### In Scope

- Server: reject add / qty-up / duplicate / upload-attach / assisted-add when `workingTotal + charge > maxQuantityPerShowPerCustomer`
- Structured error code `WORKING_REQUEST_PRINT_LIMIT` + customer copy (never "Daily print limit")
- Portal: disable Add with request-full vs daily-full distinction; banner/helpers two-line OK
- Fix Cap A optimistic remaining when working items hydrate after quota fetch (false remaining 0)
- Update help modal + Cap A exhausted copy for remove-first / second-request model (no "split across shows")
- Light DATA_MODEL / BACKEND note; deploy Functions to `fresh-prints-dev`; soft-reload Portal
- Scenario matrix + manual QA checklist

### Out of Scope

- Production deploy
- Changing Cap A/B Settings defaults or Studio Settings UI labels beyond clarity if needed
- Reintroducing Cap B choose-prints split
- Changing Cap A charge/refund rules (clear still refunds; queue still does not)

---

## Scenario matrix

| # | Scenario | Expected |
|---|----------|----------|
| S1 | Empty day, add up to 25 | OK |
| S2 | Try 26th print on same request | Blocked; **request-full** copy (N=Cap B); **not** "Daily print limit" |
| S3 | Queue 25 to show → new request → add another 25 | OK; Cap A used 50 |
| S4 | Try add on 3rd request when Cap A remaining 0 | Cap A daily / create block; empty → midnight Central |
| S5 | Qty down / remove | Cap A refunds; request room frees; Add re-enables if Cap A remaining > 0 |
| S6 | Clear request | Draft emptied; Cap A refunded (existing); do not break |
| S7 | Cap B Settings change live | Per-request max + queue Cap B use new value after quota refresh |
| S8 | Cap A remaining > 0 but request at 25 | Add disabled; request-full messaging (screenshot-class bug gone) |
| S9 | Cap A remaining wrongly showed 0 with 26 on request | Fixed by per-request gate + baseline hydrate fix |

## Copy samples (no Cap jargon, no em dashes)

**Request full (status):** `This request is full (25 prints)`

**Request full (helper):** `Add your Current Request to a show before adding more.`

**Request full (toast):** `This request already has the maximum of 25 prints. Add your Current Request to a show, then start another request if you still have prints left for today.`

**Cap A exhausted, request has items:** Keep situational Cap A CTAs (Add to show primary; not midnight-first).

**Cap A exhausted, empty request:** Midnight Central; cannot create/add.

---

## Affected Areas

### Files / Modules (expected)

- `packages/shared/src/utils/printRequestWorkingRequestMax.ts` (+ tests)
- `packages/shared/src/utils/printRequestQuotaUserCopy.ts` (+ tests; Cap A A1 split wording)
- `packages/shared/src/utils/printRequestDailyDesignLimit.ts` (help modal + banner helpers)
- `packages/shared/src/constants/printRequest/printRequestQuotaErrorCodes.constants.ts`
- `functions/src/lib/printRequestWorkingRequestMax.ts` (assert helper)
- Charge callables: `addPortalCatalogDesignToPrintRequest`, `updatePortalPrintRequestItemQuantity`, `duplicatePortalPrintRequestItem`, `confirmCustomerUploadsAndAttachToRequest`, `customerAddAssistedApprovedProofToPrintRequest`
- Portal: `usePortalCapAQuotaState`, banner, drawer, add-flow, error mapper, cards/modals that show exhausted helper
- Docs: `DATA_MODEL.md`, `BACKEND.md`

### Architecture Impact

- [x] Details: Shared pure helpers; Functions assert before Cap A charge; Portal gates from same max.

### Security Impact

- [x] Details: Server authoritative; client disable is UX only.

### Data Model Impact

- [x] Details: Doc-only. No new fields; per-request max reuses Cap B setting.

### Backend Impact

- [x] Details: New error code on add paths; deploy callables to `fresh-prints-dev`.

### UI / UX Impact

- [x] Details: Banner/helpers distinguish request full vs daily full; Add disabled accordingly.

### Migration Impact

- [x] None

---

## Approach

1. Shared: `wouldExceedWorkingRequestPrintMax`, messages, error code.
2. Functions: sum item quantities in txn; reject before Cap A charge when over max.
3. Portal Cap A hook: `isRequestFull`, `canAddPrints = CapA remaining > 0 && !isRequestFull`; fix baseline sync so optimistic remaining does not subtract hydrated cart from already-charged server remaining.
4. Wire copy into banner, add-flow prechecks, `mapPortalPrintRequestCallableError`.
5. Update help modal for "one request ≈ one show" model.
6. Unit tests; deploy Functions; soft-reload Portal; manual QA.

## Root cause notes (screenshot)

1. **No per-request max** allowed 26+ on one request while Cap B is 25.
2. **Optimistic Cap A:** quota fetch can baseline `workingPrintCount=0` while items still loading, then hydration applies delta `+26` against server remaining that already includes those prints → false `remaining=0` → **"Daily print limit reached"**.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Unit shared | `npx tsx --test packages/shared/src/utils/printRequestWorkingRequestMax.test.ts packages/shared/src/utils/printRequestQuotaUserCopy.test.ts packages/shared/src/utils/printRequestDailyDesignLimit.test.ts` | yes |
| Functions unit (if helper tests) | matching `functions` test paths | yes if present |

### Manual

See `docs/workflow/reviews/2026-07-19-cap-a-b-foolproof-per-request-max-manual-qa.md` (created in implement/test). Soft-reload Portal; Cap A 50 / Cap B 25; screenshot bug + 25+25 two shows.

---

## Human Checkpoints Anticipated

- [x] Manual UI QA after soft-reload + Functions deploy (`fresh-prints-dev` only)
- [ ] Production deploy (out of scope)

---

## Risks and Rollback

| Risk | Mitigation |
|------|------------|
| Existing oversized requests (> Cap B) cannot add more | Expected; queue still remove-first; qty-down/remove frees room |
| Deploy miss leaves server without gate | Deploy marker + manual QA against live callable |
| False Cap A remaining after hydrate fix | Unit-style reasoning + refresh after mutations |

**Rollback:** Redeploy prior Functions revision; revert Portal shared copy/gates.

---

## Open Questions

None blocking. Clear refunds Cap A (existing) — preserve.

---

## Decision Log (planning)

- 2026-07-19 - Per-request max = Cap B setting value (not a separate Settings field).
- 2026-07-19 - Prior Cap B remove-first queue behavior stays; this phase adds create/add gate.
- 2026-07-19 - Supersedes pending Cap B remove-first manual QA as active goal; park that checkpoint under related follow-up if still needed for queue-only.
