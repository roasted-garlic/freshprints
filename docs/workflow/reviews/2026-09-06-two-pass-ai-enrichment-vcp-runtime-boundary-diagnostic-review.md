# Formal Review: Remaining Pass 1 VCP Runtime Boundary

| Field | Value |
|---|---|
| Date | 2026-09-06 |
| Plan | `docs/workflow/plans/2026-09-06-two-pass-ai-enrichment-vcp-runtime-boundary-diagnostic-corrective-plan.md` |
| Verdict | **APPROVED FOR DIAGNOSTIC IMPLEMENTATION PLANNING — APPLICATION IMPLEMENTATION NOT AUTHORIZED** |

## Review finding

The prompt corrective was deployed and one authorized Y2 run still persisted no VCP. The prior
prompt-only root cause is therefore partial, not final.

The source path confirms the shared VCP helper executes for normal Processing, the Gemini adapter
has no structured-output schema, uses a 2500-token maximum, and shares the parser with Playground.
The response had 407 completion tokens and non-empty content. Existing logs do not capture the
finish reason, raw VCP key, parsed VCP validation, candidate VCP, or pre-write VCP. Thus the first
proven runtime failure is the **unobservable provider-response/parser boundary**, not persistence.
The exact category among provider omission, malformed response, or non-empty truncation cannot be
truthfully selected without the proposed bounded telemetry.

## Review of proposed corrective

The plan is narrow and preserves ADR-FP-182. It first adds non-sensitive DEV-only boundary
telemetry, then selects the smallest evidence-backed fix. It explicitly rejects speculative token
increases, fake/default VCP synthesis, parser weakening, provider changes as workaround, and
additional fixture processing.

The machine-enforcement requirement is preserved: the eventual fix must use a provider-supported
structured contract where available, or an exact measured parser/budget correction, and must fail
closed when no valid model-produced VCP exists.

## Required implementation evidence

The next Implementation Review must include the exact runtime values for prompt markers, raw key
presence, finish reason, parser result, candidate result, and persistence result, plus the exact
corrective selected from those values. It must prove Playground/Processing parity, Pass 2 remains
text/context-only and at most once, authority/lifecycle behavior is unchanged, and tag-AI remains
absent.

## Scope and safety

No Rules, indexes, migration, or backfill are required. No design mutation is authorized in this
phase. Future DEV deployment, if required, remains limited to the exact Functions bundling the
diagnostic/corrective modules. Semantic Reviewer and Autonomous remain OFF.

## Owner action required

Recommended exact authorization phrase:

> Authorize implementation of the reviewed DEV-only VCP runtime-boundary diagnostic and the
> evidence-selected narrow corrective. No Y2 retry, other fixture processing, deployment,
> Settings mutation, Semantic Reviewer enablement, Gate C, WS6, or production action is authorized
> by that phrase.
