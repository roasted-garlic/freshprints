# Formal Review — Smart Catalog Autonomous title-authority corrective

> **Scope note:** This review approved the narrower first title-authority closure. The second-soak
> over-preservation failure supersedes its legacy retention/inference rule and requires the separate
> follow-up plan and review before another deployment.

Date: 2026-09-14
Plan: `docs/workflow/plans/2026-09-14-smart-catalog-autonomous-title-authority-corrective-plan.md`
Review scope: `fresh-prints-dev` only

## Verdict

**APPROVED WITH CHANGES — implement the bounded title-authority provenance gate.**

The live DEV evidence proves the prior persistence omission is substantially corrected but a
separate title-only failure remains. Four source-less filename-like roots reached Ready while
description/category/Smart Profile/publication were valid. The resolver selected those roots
because it had no durable authority signal and its narrow legacy detector did not recognize the
observed shapes. The selected title was then used both before the decision and at persistence;
there is no evidence of a later transaction overwrite.

## Required review conditions

1. Add an allowlisted, optional `catalogTitleSource` field and stamp it at all current create,
   import, promotion, staff-edit, approval, and AI-write boundaries. Do not infer staff authority
   from title text alone.
2. Keep legacy inference narrow and explicit. Source metadata and a differing staff editor may
   establish legacy authority; source-less incomplete legacy roots remain untrusted so the AI
   candidate can replace filename/basename fallbacks. Do not broaden regexes into a generic title
   classifier.
3. The final decision and the atomic Ready write must use the same resolved title. Needs Review
   must not write a new AI title/source, and malformed candidate output remains a hard blocker.
4. Preserve the first corrective's description/category, Smart Profile, publication, health
   counters, stale-attempt guard, and Shadow no-write behavior.
5. Tests must cover all listed live fixtures plus staff/trusted-import protection and both queue and
   reprocess paths. Source parity and read-only DEV evidence are required before the second soak.

## Explicit non-goals

No provider/model/prompt change, catalog repair/backfill, production mutation, production deploy,
production re-enable, Algolia rebuild, or broad historical migration is approved by this review.
The provenance field is optional for legacy records; no direct data backfill is authorized.

## Owner gates

The first soak remains failed/incomplete and cannot advance to Owner QA. Before any deployment or
rerun, the owner must use the authenticated DEV Studio control and read back `shadow`, live
`false`, Pass 2 OFF. After a passing second DEV soak and adversarial review, stop at the exact
Owner QA checkpoint; production remains Shadow/live false pending separate authorization.
