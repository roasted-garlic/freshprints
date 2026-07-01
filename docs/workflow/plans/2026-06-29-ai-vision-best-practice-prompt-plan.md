# AI Vision Best-Practice Prompt Plan

## Goal

Refactor the OpenAI catalog enrichment prompt contract so Fresh Prints follows current image-analysis best practices without changing the underlying AI pipeline transport or queue behavior.

## Scope

In scope:

* keep the current OpenAI Chat Completions transport and retry flow
* improve the system and user prompts for image analysis
* make the prompt explicitly separate observed image content from derived catalog metadata
* reinforce structured JSON output and anti-hallucination OCR rules
* bump the OpenAI prompt version for auditability
* update affected tests and durable docs that reference the prompt version

Out of scope:

* Responses API migration
* renderer UI changes
* queue behavior changes
* Firebase, Firestore, rules, indexes, or deploys

## Implementation Steps

1. Inspect the current OpenAI prompt builder and provider wiring.
2. Rewrite the prompt contract around explicit image-analysis stages and stricter observed-vs-inferred rules.
3. Bump the prompt version and update tests/docs that surface it.
4. Run targeted AI-function tests plus project lint, typecheck, build, and `git diff --check`.

## Risks

* Prompt changes can improve quality but also shift output distribution, so versioning must be explicit.
* Switching endpoint transports would be higher risk; do not do that in this slice.
