# AI Processing Playground-Pattern Deltas Review

| Field | Value |
|-------|-------|
| Date | 2026-06-29 |
| Plan | `docs/workflow/plans/2026-06-29-ai-processing-playground-pattern-deltas-plan.md` |
| Status | approved |

## Review Decision

Approved for implementation.

## Approval Reason

The revised plan correctly targets only the missing AI Processing deltas and does not rebuild or change the AI Playground. It acknowledges that `ai-processing-direct-run` and prompt v17 single-call processing are already signed off locally, so implementation must not duplicate that work.

## Implementation Guardrails

- Keep the AI Playground unchanged as a one-off testing tool.
- Use the Playground only as the reference for the OpenAI image request pattern.
- Implement only:
  1. AI Processing `promptTemplate` support in Settings.
  2. Server-side `{{excluded_tags}}` replacement before the OpenAI call.
  3. Live AI Processing contract change from five-field v17 to four fields: `description`, `category`, `title`, `tags`.
  4. AI Processing tag cap reduction from 10 to 8.
  5. Processing tab settings icon beside Auto advance.
  6. On-the-fly model and reasoning overrides for manual processing.
  7. Model/reasoning snapshot when Auto advance starts.
  8. Re-run from Needs Review and Rejected resets the design back to Processing instead of running AI in place.
  9. Remove or disconnect in-place review re-run overlay/session path from the live flow.
  10. Tests and docs for the changed workflow.
- Do not duplicate the already signed-off direct callable execution work.
- Do not reintroduce Firestore-trigger round trips.
- Do not add extra OpenAI calls, quality retries, OCR retries, model escalation, or `response_format` complexity.
- Do not touch AI Playground unless a tiny shared helper extraction is absolutely necessary; if touched, Playground UI and behavior must remain identical.
- Do not deploy Firebase Functions or any production resource without explicit human approval.

## Required Verification

Run focused tests for the AI prompt/settings/re-run behavior plus project lint/type/build checks where feasible. Document any failures honestly in the test report.
