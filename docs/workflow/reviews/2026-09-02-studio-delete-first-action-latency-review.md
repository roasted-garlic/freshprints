# Review: Studio Delete / Dependency-Search First-Action Latency

| Field | Value |
|-------|-------|
| Date | 2026-09-02 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-09-02-studio-delete-first-action-latency-plan.md |
| Verdict | **approved** |

---

## Summary

The plan’s root-cause claim is **evidence-backed**, not speculative: Gen2 deletion callables are separate Cloud Run services with default scale-to-zero; DEV logs show AUTOSCALING + STARTUP probes and cold HTTP ~1.3–3.0s vs warm ~0.2–0.5s, including a **second** cold start on mutate after preview. Proposed v1 fixes (auth-gated ping warmup, dialog parallel mutate warm, safe query parallelization) preserve deletion safety and correctly defer `minInstances` to an owner decision. Implementation may proceed within plan scope only.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Audit → measured v1; no keep-warm/cron; no production |
| Architecture alignment | pass | Services + callables; warmup via `callTracedFunction` |
| Security impact addressed | pass | Ping must keep Auth + role gates; no skip checks |
| Data model impact addressed | pass | None |
| Backend impact addressed | pass | DEV Functions only; no Rules/indexes |
| Test strategy adequate | pass | Contract + Owner QA cold/warm matrix |
| Human checkpoints identified | pass | Owner QA; DEV deploy gate; minInstances deferred |
| Roadmap alignment | pass | Latency hardening; parked/deferred goals untouched |
| Documentation plan | pass | BACKEND.md note + workflow artifacts |
| No silent scope expansion | pass | Explicit out-of-scope list |

---

## Architecture Review

**Findings:**

- Shared pattern confirmed: Studio deletion dialogs → feature services → `callTracedFunction` → Gen2 `onCall` preview/mutate pairs (`previewPrintRequestDeletion` / `deleteEligiblePrintRequest`, and analogues).
- Client Firebase is eagerly initialized in `config/firebase.ts` — correctly rejected as primary cause.
- Each `onCall` export is its own Cloud Run service (`previewprintrequestdeletion` ≠ `deleteeligibleprintrequest`) — explains “preview then confirm both feel cold.”
- Staff Inbox completed-alert delete and Imports entity delete are correctly excluded from this infrastructure.

**Required changes:**

- [x] None

---

## Security Review

**Findings:**

- Dependency protection and TOCTOU recheck must remain on mutate paths.
- Ping/warmup must not introduce unauthenticated or role-bypassing endpoints.
- No Rules relaxation; no production secret/minInstances changes in v1.

**Required changes:**

- [x] None (enforce in Implement: ping uses same caller asserts as preview)

**Human approval needed before production:**

- [x] Entire goal remains production-forbidden; any later `minInstances` needs owner decision

---

## Data Model Review

**Findings:**

- No schema, status, or migration changes.

**Required changes:**

- [x] None

---

## Backend Review

**Findings:**

- Timing evidence from `fresh-prints-dev` Cloud Logging (HTTP latency + AUTOSCALING/STARTUP + `print-request-deletion-accounting` `durationMs`) verifies cold vs warm.
- Deletion function modules are lean (admin/caller/eligibility) — not AI/sharp-bloated; cold start is instance lifecycle, not mega-bundle.
- Sequential query parallelization is a valid secondary warm-path improvement; customer-upload already uses `Promise.all`.
- Plan correctly forbids automatic keep-warm/cron/`minInstances`.

**Required changes:**

- [x] None

---

## Testing Review

**Findings:**

- Automated correctness tests for ping + parallel query equivalence are required.
- Performance acceptance must not be CI-flake gated on network; Owner QA records cold/warm timings.
- Unauthorized delete remains a required case.

**Required changes:**

- [x] None

---

## Documentation Review

**Findings:**

- Handoff pack paths from the prompt are missing; plan correctly used repo docs.
- BACKEND.md note is appropriate; ADR only if minInstances later approved.

---

## Required Changes (if approved_with_changes)

N/A — verdict is **approved**.

Implement constraints (binding, not plan revisions):

1. Do not implement `minInstances`, cron warmers, or production deploys.
2. Do not skip or cache-away dependency checks for speed.
3. Strip or gate noisy temporary timing logs before signoff unless justified as durable DEV-only accounting.
4. If v1 misses acceptance after honest idle/cold measurement → stop with `[NEEDS OWNER DECISION]` for minInstances; do not expand scope silently.

---

## Blockers (if blocked)

None.

---

## Verdict Rationale

Root cause is verified against **current source** (separate Gen2 callables, eager client Firebase, query shapes) and **timing evidence** (Cloud Run cold vs warm latencies and instance start logs). The smallest safe fix class is client/runtime warmup + safe parallelization, not “probably cold start” hand-waving and not paid always-on infrastructure. Review therefore **approves** implementation of the plan’s v1 scope.

---

## Next Step

Implement approved scope on `development`. Stop before DEV Functions deploy until owner authorizes deploy. Then Test → Owner QA → Signoff → commit/push per owner command sequence. **Production remains NOT AUTHORIZED.**
