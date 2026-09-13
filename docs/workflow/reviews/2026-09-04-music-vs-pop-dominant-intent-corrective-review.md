# Formal Review: Music & Bands vs Pop Culture dominant-intent corrective

| Field | Value |
|-------|-------|
| Date | 2026-09-04 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-09-04-music-vs-pop-dominant-intent-corrective-plan.md` |
| Parent | `smart-catalog-intelligence-completion-and-legacy-tag-retirement` |
| Trigger | Material Music-vs-Pop miss after otherwise-PASS v34 taxonomy canaries |
| Verdict | **approved_with_changes** |
| Runtime context | `catalog-enrich-v34` / `smart-profile-normalizer-v6` / `smart-profile-v1` · shadow · Autonomous OFF |

---

## Summary

Diagnostic is repo-grounded and decisive: for Ready design **`Wt5eILv4uyCnYNoJI8uZ`** (“Judas Priest Painkiller”), final **Pop Culture & Characters** is explained by **exact-match trust** of Gemini’s approved Pop name. The same Smart Profile signals **already score Music & Bands as the fallback winner** when exact match is absent. Live Music/Pop taxonomy descriptions are already reciprocal and adequate; taxonomy-only refinement cannot fix exact-match short-circuit. Recommended corrective is a **narrow Music-vs-Pop dominant-intent override** using durable Smart Profile dimensions (tag-retirement compatible), optionally plus a single prompt example. Formal Review **approves with required changes** before implement.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Resolver-first; no tag system expansion; no WS5 |
| Architecture alignment | pass | Matches Gemini → resolver → persist; SP is evidence not classifier |
| Security impact addressed | pass | Pure deterministic resolve; no Rules/auth change |
| Data model impact addressed | pass | No schema bump expected; optional professionsGroups wiring only |
| Backend impact addressed | pass | Functions redeploy later; DEV only |
| Test strategy adequate | pass | Unit + owner goldens + Pop/Faith protections |
| Human checkpoints identified | pass | Implement auth; optional Faith/Music crossover; post-deploy QA |
| Roadmap alignment | pass | Blocks premature WS4 closeout quality; enables safer automation |
| Documentation plan | pass | Plan + this review; ADR on implement |
| No silent scope expansion | pass | Explicit OUT list |
| Tag-retirement compatibility | pass | Plan rejects matchedTags-dependent designs |

---

## Architecture Review

**Findings:**

- Confirmed: `smart-profile-v1` is evidence/schema; category authority is resolver after model proposal (`aiEnrichmentCandidateCore` → `resolveThemeCategory`).
- `rawCategory` is transient only — correct; diagnostics must use replay + final fields.
- Existing dominant-intent overrides (humor / cannabis / astrology>pop) are the right pattern; Music-vs-Pop gap is real and analogous to astrology>generic Pop.
- Fallback scoring already prefers Music for this signal bag — proves evidence sufficiency without schema change.

**Required changes:**

- [x] Implement must treat **resolver Music-vs-Pop override as mandatory**; taxonomy-only or prompt-only must not be the sole fix.
- [x] Override must gate on **exact Pop Culture & Characters** (or Pop family predicate), not a global Music-always-wins table.
- [x] Do not hardcode Judas Priest / artist names.
- [x] Do not add matchedTags / alias / reranker dependency.

---

## Security Review

**Findings:** None material.

**Required changes:**

- [ ] None

**Human approval needed before production:**

- [x] Production deploy not in scope; DEV deploy requires separate owner auth after implement.

---

## Data Model Review

**Findings:** No `smart-profile-v1` schema change needed. `professionsGroups` already exists on parse/profile but is **not** passed into resolver input today.

**Required changes:**

- [x] If professionsGroups is used for the override, wire it through `buildThemeCategoryResolveInput` — still **not** a schema version bump.
- [x] Do **not** stop for `[NEEDS OWNER DECISION — SMART PROFILE SCHEMA CHANGE]` unless implement unexpectedly alters schema contracts.

---

## Options verdict

| Option | Review verdict |
|--------|----------------|
| A Taxonomy-description-only | **Reject as sole fix** — descriptions already correct |
| B Prompt-only | **Reject as sole fix** — exact match still wins |
| C Narrow Music-vs-Pop resolver safeguard | **Accept as required core** |
| D C + light prompt example | **Accept as optional enhancement** (implies **catalog-enrich-v35**) |

**Smallest reliable change:** **C** (resolver-only, stay on **v34** prompt). Optional **D** if owner wants belt-and-suspenders.

---

## Required changes before / during implement

1. **Mandatory:** Music-vs-Pop dominant-intent override in `resolveExactMatchWithDominantIntentOverride` using durable SP signals; thresholded; Pop-exact gated; no artist hardcodes.
2. **Mandatory:** Unit proof that Judas-shaped fixture → Music with `matchedTags: []`.
3. **Mandatory:** Pop goldens (Scooby / non-music fandom) stay Pop; Faith exact / faith-dominant not stolen.
4. **Mandatory:** Document tag-retirement compatibility in ADR/tests.
5. **Required product default unless owner overrides:** never Music-override a **Faith** exact match; block Music-from-Pop when faith/life-role dominant.
6. **Owner decision (non-blocking for implement start if default accepted):** Faith vs worship-band merchandise precedence — see open questions.
7. **If prompt example added:** bump to **catalog-enrich-v35** and update version constants / reprocess snapshot; otherwise leave prompt at v34 / normalizer v6 / schema v1.

---

## Test Review

**Findings:** Matrix covers failing case, Music competitive, Pop/Faith/Inspirational controls, and read-only extras. Instrument-centered Ready candidate remains scarce — acceptable.

**Required changes:**

- [x] Automated tests must not depend on live Firestore artist names in production rule logic.
- [x] Include regression that existing humor/cannabis/astrology overrides still fire.

---

## ADR-FP-163

Judas Priest Painkiller is correctly treated as **materially incorrect** (specific domain category exists; visible band/album identity; repeated independent music signals; Pop is broader generic). Do not route all ambiguity to Needs Review. Corrective supports safer unattended automation under ADR-FP-163.

---

## WS4 / WS5

| Item | Status |
|------|--------|
| WS4 | **PASS WITH NOTES** — keep open; v34 planned canaries PASS; this Music-vs-Pop miss is remaining taxonomy-quality diagnostic |
| WS5 | **BLOCKED** — do not start Autonomous |

---

## Human checkpoints

- Authorize Implement (resolver-only vs resolver+v35 prompt).
- Optional: `[NEEDS OWNER DECISION — FAITH VS MUSIC CROSSOVER]`.
- Post-deploy owner QA on Judas + Pop + Faith controls.
- No production / commit/push unless asked.

---

## Open questions

1. **[NEEDS OWNER DECISION — FAITH VS MUSIC CROSSOVER]** — Accept default (do not steal Faith exact / faith-dominant) or define worship-band merchandise precedence?
2. Resolver-only (v34) vs resolver + prompt example (v35)?

---

## Verdict

**approved_with_changes**

Implement is authorized only after owner acknowledges required changes (and optionally answers crossover / prompt-bump questions). Diagnostic pass: **no implementation**.
