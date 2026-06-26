# Review — AI Catalog Title Quality + Batch Processing Reliability

**Date:** 2026-06-25  
**Plan:** `docs/workflow/plans/ai-title-batch-reliability-plan.md`  
**Status:** **approved_with_changes**

---

## Summary

Plan correctly diagnoses Problem A (generic title acceptance when `visibleText` empty) and Problem B (unbounded parallel Firestore triggers + no OpenAI retry + silent enqueue failures). Proposed minimal fix set is appropriate for scope.

---

## Architecture

| Check | Result |
|-------|--------|
| Title logic stays server-side | Pass |
| Client does not write AI fields | Pass |
| Reuses existing callable + trigger pattern | Pass |
| No import pipeline redesign | Pass |

**Note:** `maxInstances: 1` serializes all AI work globally — acceptable for ~61-design batches per SLA math; document if staff run multiple batches concurrently.

---

## Security Agent Perspective

| Check | Result |
|-------|--------|
| OPENAI_API_KEY server-only | Pass (unchanged) |
| Callable auth (`assertStaffCaller`) | Pass — extend stale recovery / bulk retry with owner/admin gates |
| No client bypass of pipeline | Pass — enqueue still goes through callable |
| Retry does not expose API key to client | Pass |
| Rate-limit / retry could increase API spend | Flag — **human checkpoint** for OpenAI spend before deploy |

**Required:** Bulk "Retry all failed" and stale force re-queue must use same permission model as existing `rerunRejected` (owner/admin) or `assertStaffCaller` minimum.

---

## Data Model

| Check | Result |
|-------|--------|
| Schema changes | None required |
| New `errorCode` values | Document in `DATA_MODEL.md` or `aiProcessing.types.ts` if adding enums |
| `promptVersion` v7 | New designs only; existing keep v6 until re-run — correct |

---

## Test Strategy

| Check | Result |
|-------|--------|
| `catalogTitleRules` unit tests | Required — adequate if all acceptance cases covered |
| Functions build | Required |
| Manual 20+ batch + Cloud Logs | Required human checkpoint |

---

## Conditions for Implementation

1. Implement **generic title rejection** + **description fallback** — not prompt-only fix.
2. Add **`maxInstances: 1`**, **`timeoutSeconds: 180`**, **`memory: 512MiB`** on `onDesignAiEnrichmentQueued`.
3. **OpenAI retry:** exactly 2 retries on 429/5xx/network with backoff.
4. **Stale recovery:** allow re-enqueue when active stage older than 10 minutes (fixes stuck PENDING).
5. **Surface enqueue failures** in batch import summary (not console-only).
6. Run Cloud Logging correlation during manual QA; record in test report.
7. **Do not deploy functions** without human approval (signoff note).

---

## Verdict

**approved_with_changes** — proceed to implement per plan and conditions above. Human checkpoints: OpenAI spend/concurrency confirmation, functions deploy, manual batch QA with Cloud Logs.
