# Plan: Smart contextual print-request quota errors + block create when Cap A exhausted

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Author | Agent |
| Status | approved (implemented; awaiting owner manual QA) |
| Workflow | managed-phase |
| Related | ADR-FP-096, ADR-FP-099; Cap A/B show caps; portal split across shows |
| Parked prior | Portal split print request across shows (awaiting owner manual QA) |

---

## Goal

Replace the generic Cap A exhausted toast (`Try again after midnight Central`) with **situation-aware copy** that tells customers what to do next (add Current Request to a show vs come back tomorrow). When Cap A remaining is **0**, hard-block **creating** a new working print request and **adding** more prints, while still allowing queue/split, remove, qty-down, and browse. Cap B / show-capacity queue errors stay clear and action-oriented (pick another show). Soft-reload Portal; deploy Functions to `fresh-prints-dev` only.

---

## Background

Owner hit Cap A (50) with a **full Current Request** and had **not** queued to a show. The current message implies waiting until midnight, which is wrong: they should **Add to show** (and split across shows if Cap B / capacity requires it). Cap A is charged on add-to-request, not on queue (ADR-FP-096 / ADR-FP-099).

Today:

- Server Cap A reject: `resourceExhausted(dailyDesignAddsExhaustedMessage(limit))` with no `details.code` (`functions/src/lib/printRequestDailyDesignLimit.ts`).
- Portal surfaces `error.message` via `getCallableErrorMessage` (generic string pass-through).
- `createPortalPrintRequest` does **not** check Cap A; empty working requests can still be created when remaining is 0.
- Cap B / capacity queue errors are string-only `failed-precondition` (no structured codes).
- Banner exhausted copy is short (`Daily print limit reached`) with no next-step CTA.

---

## Product state matrix (authoritative)

Context signals (Portal + quota payload):

| Signal | Source |
|--------|--------|
| `remaining` / `used` / `limit` | `getPrintRequestDailyDesignQuota` |
| `workingPrintCount` | sum of Current Request item quantities |
| `hasWorkingItems` | `workingPrintCount > 0` |
| `likelyQueuedSomeToday` | `remaining === 0 && used > workingPrintCount` (queue does not refund Cap A; remove/clear does) |
| `maxPerShow` | live Cap B from same quota response |

### Cap A — customer tries to **add** more prints (or sees exhausted helper)

| # | Situation | Copy intent (no em dashes; live `limit` / `maxPerShow`) | Allowed | Blocked |
|---|-----------|----------------------------------------------------------|---------|---------|
| A1 | Cap A exhausted; working request has prints; nothing (or not all) queued yet (`hasWorkingItems` and not `likelyQueuedSomeToday`) | This is all you can put in your print request for today (`limit` prints). **Add it to a show** now. If one show cannot take everything, split across shows (each show up to `maxPerShow`). | Queue / split; remove; qty down; browse | Add / qty up / duplicate / new request |
| A2 | Cap A exhausted; already queued some; remainder still on Current Request (`hasWorkingItems` and `likelyQueuedSomeToday`) | You have used today’s print request budget (`limit`). Finish adding what’s left on Your Stash to another show (up to `maxPerShow` per show). You cannot add more prints until after midnight Central. | Queue / split remainder; remove; qty down; browse | Add / qty up / duplicate / new request |
| A3 | Cap A exhausted; Current Request empty (or no working request); today’s prints already on shows (`!hasWorkingItems`) | You have used today’s `limit` prints. You cannot add more or start a new print request until after midnight Central. | Browse; view past/queued requests | Create working request; Add / attach / assisted / duplicate / qty up |
| A4 | Cap A remaining &gt; 0 | Existing remaining banner / successful add paths unchanged | All normal add + queue flows | (n/a) |

**Notes**

- A1 and A2: midnight is **not** the primary CTA (may mention only as “cannot add more until…” in A2).
- A3: midnight / tomorrow **is** the primary CTA.
- Server fallback message when Portal context is unavailable: neutral Cap A string + code `DAILY_PRINT_LIMIT` (prefer A3-safe “come back after midnight” when creating; Portal upgrades on add/toast using local context).

### Cap B / show queue — customer tries to **queue**

| # | Situation | Copy intent | Allowed | Blocked |
|---|-----------|-------------|---------|---------|
| B1 | This show’s Cap B full (`SHOW_CUSTOMER_LIMIT`) | You already have the max prints allowed for **this** show (`maxPerShow`). Pick **another** show for the rest. | Pick another show; reduce selection; leave remainder on Stash | Queue that overflow onto same show |
| B2 | Show capacity full (`SHOW_CAPACITY`) | This show does not have enough open spots. Pick another show or try later. | Pick another show; wait | Queue into full show |
| B3 | Cap A edge on queue (rare) | Cap A is **not** charged on queue. Do not invent a “can’t queue until tomorrow” Cap A error on the queue path unless a real server case appears. If add-path Cap A somehow surfaces mid-flow, map with matrix A*. | Queue within Cap B + capacity | (n/a Cap A on queue) |
| B4 | Allocation blocked (past show / not open / etc.) | Keep existing `formatShowAllocationBlockedMessage` strings; optional code `SHOW_ALLOCATION_BLOCKED` for mapping consistency. | Pick eligible show | Queue to blocked show |

### Hard gate (Cap A remaining === 0)

| Action | Behavior |
|--------|----------|
| Create new working print request | **Block** (server + client). Message = A3. |
| Add library / upload attach / assisted / duplicate / qty up | **Block** (server already rejects charge; client disable + A1/A2/A3 helper). |
| Queue / split remaining on existing working request | **Allow** |
| Remove / qty down (Cap A refund) | **Allow** |
| Browse catalog / favorites / donations | **Allow** |
| `ensureWorkingPrintRequestId` when a working request **already exists** | **Allow** (return existing id; do not create) |
| `resolveOrCreateWorkingPrintRequest` create branch when remaining === 0 | **Block** with `DAILY_PRINT_LIMIT` (A3) so empty requests are not spun up |

---

## Scope

### In Scope

1. Shared situation → copy helpers + error code constants (unit tested; no em dashes; no “Cap A/B” jargon in customer strings).
2. Functions: attach structured `details.code` on Cap A / Cap B / capacity rejects; Cap A charge keeps `resource-exhausted`; Cap B/capacity keep `failed-precondition` with codes.
3. Functions: Cap A remaining === 0 blocks **new** working-request create (`createPortalPrintRequest` and `resolveOrCreate` create path).
4. Portal: map callable errors + local context to matrix copy; replace generic toast/banner helper when exhausted.
5. Portal: disable Create / Add / qty-up / duplicate / upload-attach entry points when `remaining === 0`, with short helper text (A1 vs A3).
6. Soft-reload Portal; deploy touched Functions to `fresh-prints-dev` only.
7. Docs: BACKEND note on codes; short ADR or DECISIONS note; manual QA matrix.
8. Unit tests for copy matrix + create-gate helper.

### Out of Scope

- Production deploy
- Changing Cap A/B numeric defaults or charge/refund rules
- Studio staff queue UX
- New Cap C (shows-per-day)
- Redesigning the full quota help modal (may add one next-step sentence when exhausted; not a modal redesign)
- Exact “queued today” from `showAllocations` queries (heuristic `used > workingPrintCount` is enough; optional follow-up)

---

## Affected Areas

### Files / Modules (expected)

**Shared**

- `packages/shared/src/utils/printRequestDailyDesignLimit.ts` (+ test) — situational Cap A copy; keep banner short helpers; deprecate/narrow generic midnight-only exhausted message as server fallback
- `packages/shared/src/utils/printRequestPerShowCustomerCap.ts` (+ test) — Cap B copy polish if needed; code constant export
- `packages/shared/src/utils/portalShowQueueCapacity.ts` (+ test) — capacity code constant if needed
- New small module e.g. `packages/shared/src/utils/printRequestQuotaErrorCodes.ts` + `printRequestQuotaUserCopy.ts` (situation resolver + strings) — keep call sites thin
- Types: optional `PrintRequestQuotaErrorCode` union

**Functions**

- `functions/src/lib/printRequestDailyDesignLimit.ts` — `resourceExhausted(msg, { code: 'DAILY_PRINT_LIMIT', limit })`
- `functions/src/createPortalPrintRequest.ts` — Cap A gate before create
- `functions/src/lib/portalWorkingPrintRequest.ts` — Cap A gate on create branch of resolveOrCreate (or callers pass remaining / helper loads settings+counter)
- `functions/src/queuePortalPrintRequestToShow.ts` — attach `{ code: 'SHOW_CUSTOMER_LIMIT' | 'SHOW_CAPACITY' }` on Cap B / capacity throws
- Touch Cap A charge call sites only if they wrap errors (prefer central throw in `applyDailyDesignAddsChargeInTransaction`)

**Portal**

- `apps/portal/features/print-requests/services/portalPrintRequestService.ts` — preserve Firebase `details` / code when mapping errors (today strips to `Error(message)` only)
- `apps/portal/features/print-requests/hooks/useAddDesignToRequestFlow.ts` — contextual errors; disable add/qty-up when remaining 0
- `apps/portal/features/print-requests/context/PortalPrintRequestContext.tsx` — expose Cap A remaining (or small hook) for disable gates; block ensure-create path client-side
- `apps/portal/features/print-requests/components/PortalPrintRequestDailyQuotaBanner.tsx` / `CurrentRequestDrawer.tsx` — exhausted next-step line
- `apps/portal/features/print-requests/components/PortalPrintRequestItemCard.tsx` — disable qty-up / duplicate when remaining 0
- Catalog / upload / assisted add entry points that call ensure+add — disable + helper when remaining 0
- `PortalQueueToShowModal.tsx` — map Cap B / capacity codes to B1/B2 copy if server message needs override (prefer improving shared server strings + codes)

**Docs**

- `docs/architecture/BACKEND.md` — error codes table
- `docs/project/DECISIONS.md` — short ADR (contextual Cap A UX + create gate)
- Manual QA in `docs/workflow/reviews/`

### Architecture Impact

- [x] Details: Presentation copy lives in shared utils; Portal maps `details.code` + local stash/quota context. Services keep throwing typed/callable errors; UI does not invent limits. No new backend provider.

### Security Impact

- [x] Details: Server remains source of truth for Cap A charge and create gate. Client disable is UX only. Do not trust client situation hints for enforcement. Structured `details` must not include PII.

### Data Model Impact

- [x] None (no schema change). Counter semantics unchanged.

### Backend Impact

- [x] Details: Callable error payloads gain `details.code` (+ limit/cap fields where useful). `createPortalPrintRequest` / resolveOrCreate create path read Cap A remaining. Deploy Cap A charge + create + queue Functions to `fresh-prints-dev`.

### UI / UX Impact

- [x] Details: Exhausted states show next-step CTAs; Add/Create disabled with helper. Manual QA required (owner matrix).

### Migration Impact

- [x] None
- Forward: deploy Functions before relying on codes; Portal falls back to message string / midnight copy if `details` missing (old Functions).
- Rollback: redeploy previous Functions; revert Portal; old generic midnight message returns.

---

## Approach

1. **Error codes (shared constants)**  
   `DAILY_PRINT_LIMIT` | `SHOW_CUSTOMER_LIMIT` | `SHOW_CAPACITY` | (optional) `SHOW_ALLOCATION_BLOCKED`.

2. **Copy helpers (shared)**  
   `resolveCapAExhaustedSituation({ remaining, used, workingPrintCount, limit, maxPerShow })` → `A1 | A2 | A3 | none`.  
   `formatCapAExhaustedUserMessage(situation, limits)` and short `formatCapAExhaustedHelperText(...)` for disabled controls.  
   Cap B / capacity: ensure B1/B2 strings emphasize **another show**; keep numbers live.

3. **Functions**  
   - Cap A charge throw includes `{ code: 'DAILY_PRINT_LIMIT', limit }`.  
   - Default server Cap A message: keep A3-safe midnight wording as fallback (empty-cart / create).  
   - Create gate: load settings + counter; if `remaining === 0`, `resourceExhausted` with `DAILY_PRINT_LIMIT` and A3 copy (do not create empty request).  
   - Queue: wrap Cap B / capacity `failedPrecondition` with details codes (Firebase v2 supports details on HttpsError; extend `failedPrecondition` helper if needed like `resourceExhausted`).

4. **Portal error mapping**  
   - Stop collapsing callable errors to bare `Error(message)` for print-request mutations; preserve `code` + `details`.  
   - On Cap A reject / disabled click: compute situation from live quota + `workingItems` → A1/A2/A3 string.  
   - On Cap B / capacity: prefer details.code → B1/B2; else existing message.

5. **Hard disable UX**  
   - Subscribe or cache Cap A remaining near print-request context (reuse `getDailyDesignQuota` / banner epoch).  
   - When `remaining === 0`: disable catalog Add, upload attach-to-request, assisted add-to-request, duplicate, qty +, and any explicit Create. Show A1 helper if stash has items, else A3.  
   - Do **not** disable Add to show / queue.

6. **Deploy + soft-reload**  
   - Deploy: at least `createPortalPrintRequest`, Cap A–charging callables (or shared lib if already bundled), `queuePortalPrintRequestToShow`, `getPrintRequestDailyDesignQuota` if response unchanged skip. Prefer deploying the Functions that import the changed lib.  
   - Soft-reload Portal `:3100`.  
   - `fresh-prints-dev` only.

7. **Manual QA** — owner matrix below.

---

## Proposed customer copy (draft; finalize in implement, unit-locked)

No em dashes. No “Cap A/B” labels.

**A1 (stash full / not queued):**  
“You’ve reached today’s limit of {limit} prints on your print request. Add Your Stash to a show now. If one show can’t take everything, split across shows (up to {maxPerShow} prints per show).”

**A2 (partially queued):**  
“You’ve used today’s {limit} print request budget. Add what’s left on Your Stash to another show (up to {maxPerShow} prints per show). You can’t add more prints until after midnight Central.”

**A3 (empty; all on shows / nothing left to queue):**  
“You’ve used today’s limit of {limit} prints. You can’t add more or start a new print request until after midnight Central.”

**B1:**  
“You’ve reached your limit of {maxPerShow} prints for this show. Choose another show for the rest.”

**B2:**  
Keep / align with `formatShowCapacityExceededMessage` (“This show is already full…” / not enough spots).

**Disabled Add helper (short):**  
A1/A2 → “Daily limit reached. Add Your Stash to a show.”  
A3 → “Daily limit reached. Try again after midnight Central.”

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Unit (shared copy + situation resolver + Cap B/capacity codes) | `node --test` on touched shared tests | yes |
| Unit (Functions create-gate / validation if extracted) | existing functions test runner for touched files | yes if new pure helpers |
| Portal typecheck | `apps/portal` typecheck script | yes |
| Lint | if configured for touched packages | yes if available |
| Build | not required for soft-reload path | no |
| E2E | none in scope | no |
| Backend/rules | no rules change expected | no (document if rules untouched) |

### Manual

Owner matrix on `fresh-prints-dev` (Settings Cap A 50 / Cap B 25 recommended):

1. **A1:** Fill Current Request to 50, do not queue → try Add → A1 copy; Add disabled; Add to show still works; queue 25 then 25.
2. **A2:** After queuing 25 with 25 left → try Add → A2 copy; queue remainder to show B.
3. **A3:** After fully queued (empty Stash), Cap A 0 → Create/Add blocked with A3; browse works.
4. **B1:** Cap B full on show A → message says pick another show.
5. **B2:** Capacity-full show → clear capacity message.
6. **Refund path:** Cap A 0 with items → qty down / remove frees remaining → Add re-enables.
7. **No em dashes** / no Cap jargon in customer-visible strings.

---

## Human Checkpoints Anticipated

- [x] Manual UI/UX review (owner QA matrix)
- [ ] Design approval (copy is product-plain; stop only if owner rejects wording)
- [ ] Business logic decision (matrix above is from owner brief; treat as approved intent)
- [ ] Production deploy — **out of scope**
- [ ] Database migration — none
- [ ] Auth / external service setup — none
- [ ] Secrets / env vars — none

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| `used > workingPrintCount` misclassifies A1 vs A2 after refunds/removes | medium | Refunds lower `used`; clear restores remaining. Heuristic only for copy; both A1/A2 push “add to show”. |
| Old Functions without `details.code` | low | Portal falls back to message string + local situation rewrite for Cap A |
| Client disable bypass | low | Server Cap A charge + create gate still enforce |
| `failedPrecondition` helper lacks details today | low | Extend helper like `resourceExhausted` |
| Scope creep into split UX | medium | Queue/split already shipped; this phase is copy + gates only |
| Empty request created then add fails | medium | Create gate on remaining === 0 |

See also: `.cursor/workflow/risk-checklist.md`

---

## Rollback Plan

1. Redeploy previous Functions revision on `fresh-prints-dev`.
2. Revert Portal soft-reload to prior commit / disable situational mapping.
3. No data migration to undo.

---

## Documentation Updates Required

- [ ] PROJECT_BRIEF.md
- [x] BACKEND.md (error codes + create gate)
- [ ] DATA_MODEL.md (only if we document codes there; prefer BACKEND)
- [x] DECISIONS.md (short ADR: contextual Cap A UX)
- [ ] TESTING.md (only if new test command)
- [ ] ROADMAP.md (optional one-line under caps polish)
- [x] Manual QA + review/signoff artifacts

---

## Open Questions

- [x] None blocking — owner brief defines situations; copy drafts may be tweaked at implement/QA without re-plan unless product intent changes.

---

## Approval

- Review doc: pending
- Verdict: pending
