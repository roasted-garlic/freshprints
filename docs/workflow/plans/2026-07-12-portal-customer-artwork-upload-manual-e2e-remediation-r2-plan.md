# Plan: Portal Customer Artwork Upload — Manual E2E Remediation Round 2

| Field | Value |
|-------|-------|
| Date | 2026-07-12 |
| Author | Agent |
| Status | ready_for_review |
| Workflow | managed-phase (remediation under `portal-customer-artwork-upload`) |
| Trigger | Manual E2E **FAIL** — 6 additional issues |
| Parent | `docs/workflow/plans/2026-07-11-portal-customer-artwork-upload-plan.md` |
| Prior remediation | `docs/workflow/plans/2026-07-12-portal-customer-artwork-upload-manual-e2e-remediation-plan.md` |

---

## Goal

Fix six manual-E2E findings: upload-item duplicate permissions, wipe UI crash, inbox sound replay, Portal upload speed/stage visibility, and Studio Customer Uploads action feedback + no full-page refresh — then return to manual checkpoint. Do **not** sign off G/parent until retest PASS.

---

## Investigation summary

| # | Root cause | Fix approach |
|---|------------|--------------|
| **1 Duplicate permissions** | Portal `addCustomerUploadPrintRequestItem` uses client `setDoc`. Sub-phase C intended Admin-only upload item create. Client rules (`customerCanCreateUploadPrintRequestItem`) are fragile (`printRequestId` link, `quantity is int`) and conflict with DATA_MODEL. Catalog duplicate path works via client. | New callable `duplicatePortalPrintRequestItem` (Admin SDK). Portal service routes upload (and optionally all) duplicates through it. Keep catalog client path working. Do not widen rules further; optionally leave remediation create rules for staff Studio duplicate only. |
| **2 Wipe blank page** | `TestDataResetPage` “Last wipe result” calls `lastResult.targets.join` / `Object.entries(lastResult.deleted)` without guards. Re-render after checkbox toggle throws → blank (no ErrorBoundary). | Guard result rendering; safe empty defaults; config sync assert; unit tests for toggle + malformed result. |
| **3 Inbox sound replay** | Sound dedupe is in-memory refs only. Ack hydrate can race before inbox subscriptions → baseline empty → all unchecked items “new” on reload. | Persist per-user sound delivery (`staffInboxAlertDeliveries` or equivalent) separate from `staffInboxAcks`. Skip sound if delivery exists for itemId (+ occurredAtMillis). Fix race by requiring subscription snapshot ready before baseline. |
| **4 Upload slow + no stages** | Bounded 3 workers already exist, but UI collapses stages; no Storage progress; no Firestore listener during finalize; ZIP is one blocking callable with serial server loop; double Storage hop + Sharp is inherent. | Client: `uploadBytesResumable` + progress %; richer per-file phases; subscribe to upload docs during finalize; keep max 3 finalize; completed files show Ready without waiting for siblings. Instrument timing logs (no image contents). ZIP: archive upload progress + extraction stage + per-file stages after extract. Measure before/after in test report. Do not weaken validation. |
| **5–6 Studio actions** | Every mutation calls `refresh()` with `isLoading=true`, which **unmounts** list/detail (“Loading…”). `actionBusyId` only disables buttons — no pending copy. | Keyed pending action state + immediate button labels/spinner; silent/local list update after success (no full-page loading); prefer `onSnapshot` for intake list; keep Open linked request as `navigate()` (already SPA). |

---

## Scope

### In scope
1. Callable + Portal wiring for upload-backed (and regression-safe catalog) duplicate  
2. Wipe page crash guards + tests (wipe workflow stays parked)  
3. Persistent inbox sound-delivery state + race fix  
4. Portal upload stage UI + progress + concurrency/pipeline UX (within existing limits)  
5–6. Studio Customer Uploads mutation UX + dynamic list/badge (no full remount)

### Out of scope
- Production deploy; wipe allowlist prod; unpark wipe track  
- AI prompt; Phase 9; weakening rules/limits/transparency  
- New npm dependencies  
- Guaranteeing fixed wall-clock times for Sharp/Cloud Functions  

---

## Architecture / security notes

- **Duplicate:** Component → Hook → Service → callable → Admin transaction. Enforce ownership, editable status, same `customerUploadId`, no Storage clone, no `requestCount` increment (existing trigger already skips upload).  
- **Sound:** Separate collection from Done acks; rules mirror staffInboxAcks (own docs only).  
- **Upload:** Keep `CUSTOMER_UPLOAD_MAX_CONCURRENT_FINALIZE = 3`; trusted finalize unchanged.  
- **Wipe:** UI-only hardening; no allowlist change.

---

## Test strategy

| Area | Checks |
|------|--------|
| Duplicate | Unit/rules/smoke: own upload dup OK; same uploadId; no new Storage; other customer denied; non-editable denied; catalog still works; no requestCount bump |
| Wipe | Toggle each target; customerUploads; select/clear/presets; malformed lastResult renders safely |
| Sound | New alert once; reload/restart no replay; count remains; ack clears count; second user independent |
| Portal upload | Stage transitions; progress; 3-wide finalize; sibling isolation; ZIP stages; refresh recovery |
| Studio intake | Immediate pending UI; no full-page loading; dynamic removal; badge; scroll/filter preserved |
| Builds | Portal typecheck/build; Studio vite build; Functions build; deploy changed resources to fresh-prints-dev |

---

## Human checkpoints

- Manual E2E retest (17-item checklist in user request)  
- No G/parent signoff until PASS  

---

## Acceptance criteria

- [ ] Upload duplicate works via callable without permission errors  
- [ ] Wipe targets never blank the page  
- [ ] Inbox sound does not replay on reload/restart for existing alerts  
- [ ] Portal shows per-file stages + upload progress; bounded parallel finalize  
- [ ] Studio Customer Uploads shows immediate action feedback; no full-page refresh  
- [ ] Deploy approved resources to fresh-prints-dev; smoke green  
- [ ] Return to manual checkpoint  

---

## Risks

| Risk | Mitigation |
|------|------------|
| Callable adds latency vs client write | Still faster than fail; UI pending state |
| Sound delivery growth | Prune with wipe targets / on ack |
| Upload “speed” still limited by Sharp | Document inherent cost; remove serialization UX gaps |

---

## FreshForge impact

Product + docs only; wipe remains parked.
