# Formal Review — Explicit Content Numeric False Positive Corrective

| Field | Value |
|---|---|
| Plan | `docs/workflow/plans/2026-09-07-explicit-content-numeric-false-positive-corrective-plan.md` |
| Verdict | **approved_with_constraints — implementation requires owner authorization** |
| Implementation in this phase | **No** |

## Mechanical findings

1. The effective DEV vocabulary was read without mutation from `settings/aiEnrichment`; it contains `piss`, not `1559` or `1565`.
2. `classifyExplicitContentAutomation()` deterministically reproduces the reported input with vocabulary `['piss']`:
   - `artworkHit: true`
   - `censoredTerms: ['1559', '1565']`
   - matches `{ surfaceForm: '1559', matchedVocabularyTerm: 'piss' }` and `{ surfaceForm: '1565', matchedVocabularyTerm: 'piss' }`.
3. `compactForExplicitMatch()` maps the numeric inputs to `iss`; `compactMatchesTerm()` accepts `iss` as a single-letter-hole form of `piss`.
4. No separator normalization participates for these bare years. No B-light alias participates; `piss` is itself persisted. No literal regex/token-boundary hit participates.
5. The classifier itself produces the displayed years. `buildExplicitContentAutomationPreview()` copies classifier `censoredTerms` into `proposedCensoredTerms`; Studio renders that persisted preview. The display is truthful, not a presentation/provenance substitution bug.

## Blast radius

The defect is broader than these two dates but narrower than all numbers. Any digits-only token whose leet-plus-letter filtering becomes a one-letter-hole form of an active alphabetic term can false-positive. With `piss` active, `1559` and `1565` reproduce; the checked controls `1776`, `1865`, `2001`, `2026`, `1234`, and `9999` do not. The implementation must protect the entire pure-numeric class rather than special-case two years.

## Owner amendment — stronger heuristic audit

The amended review rejects the original numeric-only compact guard as insufficient. The current generic leet map is exactly: `@→a`, `$→s`, `0→o`, `1→i`, `!→i`, `*→''`, `3→e`, `4→a`, `5→s`, `7→t`. After mapping, current code removes separators (`[\s_\-./\\|]+`) and all remaining non-letters, then accepts equality or generic one-letter deletion/insertion similarity through `isSingleLetterHole`.

Mixed alphanumeric false positives are mechanically proven with the effective DEV vocabulary: `A55 → ass`, `P155 → piss`, `C0CK → cock`, `D1CK → dick`, and `5LUT → slut`. Generic leetspeak therefore cannot remain automatic.

The only exact-safe current mechanism is literal case-insensitive whole-token/phrase matching. B-light aliases are explicit and bounded: `fuck→fucked/fucking/fucker/fuckers`; `motherfucker→motherfucking`; `shit→shitty/shitting/bullshit/horseshit/dipshit/shithead`; `bitch→bitches/bitchy`; `damn→damned/dammit`; `goddamn→goddammit`; `crap→crappy`; `piss→pissed/pissing`; `ass→asshole/dumbass/jackass`; `douche→douchebag`.

Current tests depending on generic compact/hole inference are the `f*ck`, `f_ck`, `f-u-c-k`, and spaced-letter fixtures. They must be revised under the owner’s precision-first policy. No non-Explicit consumer imports the internal compact/hole helpers; only the shared classifier is used by candidate generation/persistence.

## Amended architecture / authority assessment

The precision-first proposal is compatible with ADR-FP-169/172/173:

- vocabulary remains owner-configured and deterministic;
- literal configured numeric terms retain intentional support;
- generic one-letter-hole, leetspeak, separator compaction, and punctuation/digit-deletion inference are retired;
- no fuzzy or approximate matching remains;
- no human Explicit authority, AI semantic judgment, tag dependency, or category-policy change occurs.

## Approval constraints

Implementation must:

1. add historical-years, boundary, missing-character, mixed-code, literal-numeric, real-profanity, and retained-alias regression coverage;
2. remove the generic compact/hole path rather than special-casing named years;
3. retain only literal boundaries and explicitly enumerated aliases;
4. update ADR-FP-169/172 and the affected release QA checkpoint truthfully; and
5. stop if any unexplained generic false-positive path remains.

## Required formal-review answers

| Question | Answer |
|---|---|
| Is one-letter-hole retired? | **Yes.** |
| Can pure numbers manufacture profanity? | **No in proposed contract.** Literal configured numbers still work. |
| Can mixed alphanumerics manufacture profanity through leetspeak? | **Yes currently; no in proposed contract because generic leetspeak is retired.** |
| Can larger unrelated words trigger substring matches? | **No; literal boundary matching remains.** |
| Are remaining non-literal aliases bounded? | **Yes; only explicit B-light entries.** |
| Does normal profanity detection work? | **Yes, through exact case-insensitive whole-token/phrase matching.** |
| Are human Explicit authority, category policy, and Pass 1/Pass 2 unchanged? | **Yes.** |

## Verdict

**approved_with_constraints.** The precision-first contract is approved: generic one-letter-hole, generic leetspeak, separator compaction, and generic punctuation/digit deletion are removed from proposed automatic Explicit matching. Literal whole-boundary matching and explicitly enumerated B-light aliases remain. Category gaps and the Pass 1 non-blocking semantic diagnostics remain out of scope and unchanged.

`[NEEDS OWNER AUTHORIZATION: IMPLEMENT PRECISION-FIRST EXPLICIT CONTENT FALSE-POSITIVE CORRECTIVE]`
