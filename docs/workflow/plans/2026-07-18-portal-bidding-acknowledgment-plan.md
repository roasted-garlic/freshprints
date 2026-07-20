# Plan: Portal bidding acknowledgment (signup + Add to Show)

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Author | Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-18-portal-bidding-acknowledgment-review.md |

---

## Goal

Require customers to acknowledge that show-queue designs are public / not reserved: (1) **before** email (or Google profile) registration creates Auth/Firestore records, and (2) **again** every time they queue a print request to a show. Persist versioned acknowledgments server-side so the queue callable cannot be bypassed without consent.

## Background

Owner wants clear bidding understanding copy (no em dashes), plural-aware when multiple designs, link to funkyfreshprints.com. Signup is educational and must gate account creation. Add to Show is the binding pre-queue consent and is required even if signup was already acknowledged.

Previous stash-attention phase parked awaiting owner QA; this is a new managed goal.

## Scope

### In Scope

- Shared copy helpers + version id constant (e.g. `portal-bidding-ack-v1`)
- Shared acknowledgment modal UI (checkbox required; Cancel dismisses without proceeding)
- **Signup / register:** Intercept RegisterForm submit → modal → only then Auth create + `registerCustomer`. Pass accepted version in signup payload; write `users/{uid}` signup acknowledgment on provision.
- **Google complete-profile:** Same modal before `registerCustomer` (Firestore user/customer create). Auth may already exist from Google; still do not call provision until acknowledged.
- **Add to Show:** Confirmation step/modal before `queuePortalPrintRequestToShow`; require `biddingAcknowledgmentAccepted: true` + version in callable payload; reject if missing; store audit on `printRequests` and update user `queue_to_show` acknowledgment.
- Unit tests for validation + plural copy
- Docs: DATA_MODEL, BACKEND (brief), DECISIONS if useful
- Soft-reload Portal; deploy affected Functions to `fresh-prints-dev` only
- Manual QA checklist

### Out of Scope

- Production deploy
- Studio Add to Show staff flow
- Changing show capacity / Cap B logic
- Requiring signup ack again on every login after already stored
- Blocking forever with client-only flags if server write fails mid-flight (show error; user can retry)

---

## Affected Areas

### Files / Modules (expected)

- `packages/shared/src/constants/portal/portalBiddingAcknowledgment.constants.ts` (new)
- `packages/shared/src/utils/portalBiddingAcknowledgmentCopy.ts` (new) + tests
- `packages/shared/src/types/portal/queuePortalPrintRequestToShow.types.ts`
- `packages/shared/src/types/auth/registerCustomer.types.ts`
- `packages/shared/src/types/user/user.types.ts` (+ PrintRequest type fields)
- `apps/portal/.../PortalBiddingAcknowledgmentModal.tsx` (new shared modal)
- `apps/portal/.../RegisterForm.tsx`, `CompleteProfileForm.tsx`
- `apps/portal/.../PortalQueueToShowModal.tsx` (+ optional confirmation step)
- `apps/portal/.../registerCustomerService.ts`, AuthProvider register/complete payloads
- `functions/src/registerCustomer.ts` + validation
- `functions/src/queuePortalPrintRequestToShow.ts` + validation + tests
- Docs as listed

### Architecture Impact

- [x] Details: UI → service → callable. No client writes to `users/{uid}` (rules remain deny). Acknowledgment stored via Admin SDK in existing callables.

### Security Impact

- [x] Details: Server rejects queue without accepted flag + known version. Signup stores only after client confirms (client can skip UI but then cannot claim signup ack without calling register with flag — register requires accepted+version when provisioning new customers). Do not trust client alone for queue.

### Data Model Impact

- [x] Details:
  - `users/{uid}.portalBiddingAcknowledgments.signup`: `{ acceptedAt, version, source: "signup" }`
  - `users/{uid}.portalBiddingAcknowledgments.lastQueueToShow`: `{ acceptedAt, version, source: "queue_to_show", printRequestId, upcomingShowId }`
  - `printRequests/{id}.showQueueBiddingAcknowledgment`: `{ accepted: true, acceptedAt, acceptedByUid, version, upcomingShowId }` written atomically when queued

### Backend Impact

- [x] Details: Extend `registerCustomer` + `queuePortalPrintRequestToShow`. No new callable required if both accept acknowledgment fields. No rules change if only Admin writes.

### UI / UX Impact

- [x] Details: Modal title **Add to Show Confirmation** for queue; signup uses same core body (singular default / educational). Primary disabled until checkbox. Cancel does not create account / does not queue. Link `funkyfreshprints.com` → https://funkyfreshprints.com.

### Migration Impact

- [x] None required. Missing fields = not acknowledged. Existing users signing up via Google complete-profile see modal once before provision. Existing customers who already have accounts do not see signup modal again (no re-gate on login). Queue always requires ack.

---

## Approach

1. Add shared version constant + plural-aware copy builders (singular when itemCount ≤ 1).
2. Build `PortalBiddingAcknowledgmentModal` with checkbox, Cancel, primary label prop (`Create account` / `Add to show` / `Continue`).
3. **RegisterForm:** validate passwords → open modal → on confirm call `register({ ..., biddingAcknowledgmentAccepted: true, biddingAcknowledgmentVersion })`. Cancel clears pending credentials only.
4. **CompleteProfileForm:** same intercept before `completeCustomerProfile`.
5. **registerCustomer:** require accepted+version for new provisions; write signup acknowledgment on user doc. Idempotent already-provisioned path: do not require re-ack.
6. **PortalQueueToShowModal:** after show selected, primary opens confirmation (or inline step). On confirm, call queue with acknowledgment fields. Cancel closes confirmation without queueing (keep show picker or close both — prefer return to picker).
7. **queuePortalPrintRequestToShow:** validate acknowledgment; reject missing/false/unknown version; write printRequest + user lastQueue fields in the same transaction as allocations.
8. Tests + docs + soft-reload + deploy to `fresh-prints-dev`.

### Signup ordering (owner clarification)

```
Fill form → Submit → Modal (checkbox) → Confirm → Auth create + registerCustomer(ack) → ready
                              ↓ Cancel
                         No Auth / no Firestore
```

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Unit (copy + queue validation + register validation) | `npx tsx --test` on new/updated tests | yes |
| Functions build | `npm --prefix functions run build` | yes |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | yes |
| Lint (touched) | as practical | yes if dirty |

### Manual

- [x] Details: See manual QA doc after implement — register cancel creates nothing; register confirm creates account with user ack; queue without check disabled; queue stores printRequest ack; signup ack does not skip queue modal.

---

## Human Checkpoints Anticipated

- [x] Manual UI/UX review
- [ ] Production deploy
- [x] Other: Dev Functions deploy to `fresh-prints-dev` (owner-approved in ask)

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Client calls register without UI | Low | Server requires ack fields on new provision |
| Client calls queue without ack | High | Server rejects |
| Copy version drift | Med | Single shared constant; reject unknown versions |
| Google Auth exists before profile | Low | Modal before `registerCustomer`; cancel leaves incomplete profile (existing flow) |

---

## Rollback Plan

Redeploy prior Function versions; soft-reload Portal to prior build. Stored ack fields are additive and harmless.

---

## Documentation Updates Required

- [x] DATA_MODEL.md
- [x] BACKEND.md
- [x] DECISIONS.md (short ADR)
- [ ] Other: workflow plan/review/test/manual QA/signoff

---

## Open Questions

- [x] None (timing clarified: modal before Auth/Firestore create on register submit)

---

## Approval

- Review doc: docs/workflow/reviews/2026-07-18-portal-bidding-acknowledgment-review.md
- Verdict: pending
