# Signoff: Customer Account Identity Management — WS1

| Field | Value |
|-------|-------|
| Date | 2026-08-28 |
| Signoff by | Managing Agent |
| Plan | `docs/workflow/plans/2026-08-28-customer-account-identity-management-and-audit-plan.md` |
| Kickoff amendment | `docs/workflow/plans/2026-08-28-customer-identity-ws1-kickoff-amendment.md` |
| Implementation review | `docs/workflow/reviews/2026-08-28-customer-identity-management-ws1-implementation-review.md` |
| Final status | **approved** |

---

## Summary

WS1 delivers Studio customer identity management foundations on **`fresh-prints-dev`**: reversible disable/restore, history-free hard delete with preview (dev-gated), dedicated Change Username UX, identity snapshot propagation fixes, Portal session handling for disabled accounts, unified Portal-editable Print Request contract, Studio duplicate Customer CR prevention, and customer directory Active / Disabled / Closed tabs. Owner DEV QA **PASS** after five corrective passes. **WS2–WS4 not started.** Production, Studio publish, and Portal App Hosting **not authorized**.

---

## Corrective history (succinct)

| Pass | Trigger | Outcome |
|------|---------|---------|
| **#1** | Initial owner DEV QA FAIL | Propagation Firestore write fix; hard-delete subcollection path fix; Firestore `customerRequiredFieldsValid` WS1 field whitelist; restore `users.isDeleted` reconciliation; Studio disable visibility mapper fix. DEV deploy: `updateCustomer`, preview/hard delete, restore + **Rules**. |
| **#2** | Disable/login/preview failures | Shared customer identity field mapper; fail-closed Auth on disable/restore; Portal bootstrap overlay fix; disabled/tombstone session block; hard-delete preview CORS/invoker fix. DEV deploy: four identity callables. |
| **#3** | UX polish | Re-enable success styling; directory Active/Disabled/Closed tabs; Google disabled-login banner; tombstone Re-enable guard; gang-sheet modal viewport scroll. **Client-only** — no deploy. |
| **#4** | Portal PR integrity + mid-session disable | Portal-editable PR contract (`portal_customer` only); explicit working-request selection; disabled-session sign-out before permission overlay; Studio duplicate-CR guard + customer picker exclusion; `printRequests` index. DEV deploy: three Portal working-request Functions + **index**. |
| **#5** | Studio Print Requests runtime error | Missing `isPrintRequestOrigin` import in `printRequestService.ts`. **Client-only** — local Studio reload. |

---

## Changes delivered (WS1 scope)

### Behavior

- Owner/admin **Change username** via dedicated modal (`updateCustomer`; ADR-FP-071 name immutability preserved)
- **Disable Account** / **Re-enable Account** (reversible; distinct from tombstone)
- **Delete Account Permanently** — history-free hard delete with preview + checksum (owner-only; **`fresh-prints-dev` only** on Apply)
- **Active / Disabled / Closed** customer directory tabs with truthful counts
- Portal: blocked login messaging (email + Google); mid-session disable signs out cleanly
- Portal: only `portal_customer` continuable requests are Portal-editable; explicit selection for mutations
- Studio: prevents second Customer CR when draft/editing CR exists; excludes those customers from Create Customer Request picker
- Append-only `customerActivityEvents` for WS1 operations (not lifecycle source of truth)

### DEV deploys (fresh-prints-dev only)

| Artifact | Record |
|----------|--------|
| WS1 identity callables + Rules | `docs/workflow/reviews/2026-08-28-customer-identity-ws1-dev-deploy.md` |
| Corrective #1 Functions + Rules | `docs/workflow/reviews/2026-08-28-customer-identity-ws1-qa-corrective-dev-deploy.md` |
| Corrective #2 identity callables | `docs/workflow/reviews/2026-08-28-customer-identity-ws1-qa-corrective-2-dev-deploy.md` |
| Corrective #4 Portal Functions + index | `docs/workflow/reviews/2026-08-28-customer-identity-ws1-qa-corrective-4-dev-deploy.md` |

---

## Tests

### Automated

| Area | Result |
|------|--------|
| WS1 + corrective unit/contract tests | **pass** (identity eligibility, propagation, Portal editability, Studio contracts) |
| Functions build | **pass** |
| Full Studio/Portal `tsc` | Pre-existing unrelated failures documented in implementation reviews |

### Manual — owner DEV QA

| Result | **PASS** (2026-08-28) |

Owner confirmed (representative checklist):

- Active / Disabled / Closed directory tabs; normal row styling for Disabled/Closed
- Re-enable uses positive/success styling; tombstoned customers lack Re-enable/Restore
- Disabled email/password and Google login show clear blocked-account messages
- Mid-session disable: clean sign-out; no Firestore permission overlay
- Username change functional; historical Print Request names immutable; propagation does not alter `requestOrigin` / `isInternal` / `customerId`
- Portal: only `portal_customer` continuable requests editable; `studio_customer` drafts not offered; multi-draft explicit selection; add/increment/decrement/remove target selected request
- Studio: no second Customer CR when draft/editing exists; customer with open CR excluded from picker; Disabled/Closed excluded from picker
- Gang-sheet results modal viewport-bounded with internal scroll
- Print Requests page loads; Customer and Internal Requests tabs load (corrective #5)

---

## Human approvals obtained

| Approval | Status | Notes |
|----------|--------|-------|
| Owner DEV QA | **PASS** | 2026-08-28 |
| DEV Functions/Rules/index deploy | obtained (dev only) | Not production |
| Production deploy | **not authorized** | |
| Studio publish | **not authorized** | |
| Portal App Hosting | **not authorized** | Corrective #3–#5 client changes local reload on dev |

---

## Risks and known issues

| Item | Severity | Mitigation |
|------|----------|------------|
| WS1 runtime on production | Medium | Explicit promotion gate; no prod deploy in this signoff |
| Legacy duplicate Portal/Studio drafts in dev data | Low | Not repaired/merged per scope; WS2/WS3 reserved |
| Full Studio `tsc` debt | Low | Pre-existing; unrelated modules |
| Portal typecheck (`portalShowDiscoveryContent.ts`) | Low | Pre-existing; unrelated |

---

## Deferred (roadmap — not WS1)

- **WS2** — Duplicate resolution preview + username transfer (ADR-FP-153)
- **WS3** — Account merge (ADR-FP-152)
- **WS4** — Customer activity cards / PR-grouped audit UI
- Production promotion of WS1 callables, Rules, index, Studio, Portal hosting

---

## Open blockers

- [x] None

---

## Verdict

**APPROVED** — WS1 complete on `fresh-prints-dev` with owner QA PASS. FreshForge returns to **IDLE**. Do not start WS2 without a new managed phase.

---

## Workflow complete

- [x] `.cursor/workflow/state.md` updated — `DONE: yes`, IDLE
- [x] `docs/project/ROADMAP.md` banner added
- [x] `references/project-chatgpt-handoff/CURRENT-STATE.md` updated
- [x] `references/project-chatgpt-handoff/13-recent-completed-work.md` updated
- [x] `references/project-chatgpt-handoff/03-roadmap-and-phases.md` banner added

**Recommended next action:** Owner authorizes production promotion and/or starts WS2 managed phase when ready.
