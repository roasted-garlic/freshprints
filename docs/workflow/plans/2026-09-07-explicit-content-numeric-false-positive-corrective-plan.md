# Corrective Plan — Explicit Content Numeric False Positive

| Field | Value |
|---|---|
| Date | 2026-09-07 |
| Parent | `smart-catalog-intelligence-completion-and-legacy-tag-retirement` |
| Environment | DEV investigation evidence only |
| Phase | Investigation → Corrective Plan → Formal Review |
| Implementation | **Not authorized** |
| Settings mutation / provider calls / deployment / commit / push | **None** |

## Goal

Eliminate the deterministic false positive that classifies historical years `1559` and `1565` as Explicit Content, while preserving owner-configured vocabulary semantics, the existing B-light aliases, and the approved Pass 1 category-gap policy.

## Proven root cause

The compact matcher applies the leet map to every token before removing non-letters. Both numeric tokens reduce to `iss`:

| Source token | Leet/letter compact result | Active vocabulary term | Match mechanism |
|---|---|---|---|
| `1559` | `iss` (`1 → i`, `5 → s`, `5 → s`, `9` removed) | `piss` | `isSingleLetterHole("iss", "piss")` |
| `1565` | `iss` (`1 → i`, `5 → s`, `6` removed, `5 → s`) | `piss` | `isSingleLetterHole("iss", "piss")` |

This is not a literal vocabulary hit, alias-family hit, regex boundary hit, category-policy issue, or UI-only transformation. The classifier returns the exact numeric source tokens as `surfaceForm`; preview/provenance and Studio truthfully display those classifier-derived surfaces.

## Effective DEV vocabulary evidence

Read-only fetch of `fresh-prints-dev/settings/aiEnrichment` on 2026-09-07 returned 43 persisted terms:

`fuck`, `motherfucker`, `shit`, `bitch`, `cunt`, `ass`, `asshole`, `dumbass`, `jackass`, `bastard`, `douche`, `douchebag`, `dick`, `cock`, `pussy`, `twat`, `whore`, `slut`, `damn`, `dammit`, `goddamn`, `goddammit`, `crap`, `piss`, `wtf`, `stfu`, `fml`, `fucked`, `fucking`, `fucker`, `fuckers`, `motherfucking`, `shitty`, `shitting`, `bullshit`, `horseshit`, `dipshit`, `shithead`, `bitches`, `bitchy`, `damned`, `pissing`, `fucktard`.

`1559` and `1565` are not configured. The matching configured term is `piss`.

## Narrow corrective

Change only the compact/one-letter-hole path to reject a source candidate that contains no alphabetic character before leet normalization. Literal boundary matching remains unchanged.

This blocks pure numeric tokens from becoming artificial letter sequences while preserving:

- literal owner-configured numeric terms (for example, explicitly configured `1559`) through the literal boundary path;
- letter-containing obfuscations such as `f*ck`, `f_ck`, `f-u-c-k`, and `5h1t`;
- existing alias activation rules; and
- no fuzzy/edit-distance matching beyond the existing one-letter-hole behavior for eligible letter-containing forms.

## Required regression matrix

1. Fixture text: `THE FIRST CITY VISITS THE FIRST CITY. PENSACOLA 1559 ST. AUGUSTINE 1565 WE WERE BLOWN AWAY.` with the effective vocabulary.
   - Explicit detection: NO.
   - `1559` and `1565` absent from matches and censored terms.
   - `visibleText`/Smart Profile input remains unchanged.
2. Numeric matrix with `piss` active: `1776`, `1865`, `2001`, `2026`, representative arbitrary four-digit years, plus `1559` and `1565`.
   - No match for each.
3. Intentional numeric vocabulary compatibility: if owner vocabulary explicitly contains `1559`, literal `1559` still matches and is stored as the surface form.
4. Existing literal, separator, B-light, and one-letter-hole fixtures remain green.
5. Candidate → preview → pipeline projection test: no match produces no proposed censored terms; a real match retains classifier surface forms unchanged.

## Category policy verification

For this fixture, `category_unresolved` routing to Needs Review remains expected when no exact approved active category resolves. Proposed out-of-catalog category names remain taxonomy-gap evidence only: no category creation, no tag restoration, and no category-policy modification.

`structured_evidence_gap:objects:*` and `subject_specificity_risk:*` remain non-blocking diagnostics under the approved Pass 1-only release policy; they are not the cause of this Explicit false positive.

## Scope and safety

No Firestore rules, indexes, migrations, settings changes, provider calls, Pass 2 changes, category changes, tags, Autonomous enablement, production action, commit, or push are in scope.

## Owner amendment — precision-first matcher contract

The original proposed pure-numeric compact-path guard is retained as a protection goal but is no longer sufficient. The owner has directed a precision-first contract: automatic Explicit matching may use only exact case-insensitive whole-token/whole-phrase vocabulary matches and explicitly enumerated aliases. It must not manufacture a match through generic similarity or normalization.

### Current matcher audit

| Mechanism | Current behavior | Classification | Amended disposition |
|---|---|---|---|
| Literal boundary | `(?<![A-Za-z0-9])term(?![A-Za-z0-9])`, case-insensitive | Exact safe normalization | Retain |
| B-light aliases | Explicit canonical-to-alias map, activated only when canonical is configured | Explicit enumerated alias | Retain and test directly |
| One-letter-hole | `isSingleLetterHole` accepts a compact candidate one character shorter than a term | Heuristic inference | **Retire** |
| Leetspeak map | `@→a`, `$→s`, `0→o`, `1→i`, `!→i`, `*→''`, `3→e`, `4→a`, `5→s`, `7→t` | Heuristic inference | **Retire from automatic matching** |
| Separator removal | Removes `[\\s_\\-./\\\\|]+` | Heuristic inference | **Retire from automatic matching** |
| Generic punctuation/digit deletion | Removes remaining `[^a-z]` after mapping | Heuristic inference | **Retire from automatic matching** |
| Repeated-character handling | None | N/A | No change |

No non-Explicit consumer imports the compact/hole helpers. The shared classifier is consumed by enrichment candidate generation; settings normalization is separate.

### Additional false-positive class

The effective 43-term DEV vocabulary proves generic leetspeak substitution alone can manufacture exact profanity matches from mixed alphanumeric source tokens:

| Source | Compact result | Matched active term |
|---|---|---|
| `A55` | `ass` | `ass` |
| `P155` | `piss` | `piss` |
| `C0CK` | `cock` | `cock` |
| `D1CK` | `dick` | `dick` |
| `5LUT` | `slut` | `slut` |

The amended corrective must address this whole class, not special-case examples.

### Amended smallest safe corrective

Remove the generic compact matcher from automatic Explicit classification: retire generic one-letter-hole, leetspeak substitution, separator compaction, and generic punctuation/digit deletion. Retain only literal boundary matching and the explicit B-light alias table.

An owner may explicitly configure a censored spelling such as `f*ck` if desired; current validation allows `*`, `_`, and `-`. Any future code alias must be individually enumerated and reviewed. A literal owner-configured numeric term remains valid (`1559` matches only when `1559` is configured).

### Amended regression matrix

In addition to the original numeric fixture:

1. Boundary controls for active `ass`: `ass`, `ASS!` match; `class`, `classic`, `passage`, and `assassin` do not.
2. Missing-first/middle/final-character variants for representative configured terms do not match unless exactly configured or enumerated as an alias.
3. Mixed-code controls: `A55`, `P155`, `C0CK`, `D1CK`, `5LUT`, and representative ordinary code-like tokens do not match unless literally configured.
4. Normal literal controls: lowercase, uppercase, surrounding punctuation, and normal phrase boundaries match.
5. Every retained B-light alias is exact, bounded, and independent of compact/hole logic.
6. Existing `f*ck`, `f_ck`, `f-u-c-k`, and spaced-letter compact fixtures are revised: they match only if explicitly configured or explicitly enumerated later.
7. Update ADR-FP-169/172 during implementation to record the precision-first contract without erasing history.
