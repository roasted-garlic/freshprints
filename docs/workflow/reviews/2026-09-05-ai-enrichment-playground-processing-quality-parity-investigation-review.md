# Review: AI Enrichment Playground vs Processing Quality Parity Investigation

| Field | Value |
|-------|-------|
| Date | 2026-09-05 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-09-05-ai-enrichment-playground-processing-quality-parity-investigation-plan.md` |
| Evidence | `docs/workflow/reviews/_td034-playground-processing-parity-diag-results.json` |
| Verdict | **approved** (investigation complete) |
| Implementation authorized | **NO** this pass — corrective requires owner product decision |

---

## Summary

Playground and Processing share the same chat-completions shape, system prompt builder, user-prompt expander, model (`gemini-2.5-flash-lite`), and (in this controlled test) the same saved v37 Settings template + same preview WebP bytes.

**They do not share the post-provider title/description pipeline.**

- **Playground displays** normalized → `toCanonicalSimpleCatalogEnrichmentJson` (model title/description trimmed only).
- **Processing persists** `buildSimpleCatalogEnrichmentResult` → **`resolveLeanCatalogTitle`** + description scrub/synthesize → `aiSuggestions`.

Controlled DEV proof: **4/5** Playground STRONG visual titles become slogan+`Woman` when the Processing lean transform is applied; **5/5** Processing finals are THIN/AWKWARD slogan-first titles. Playground descriptions were **5/5 STRONG**; Processing finals mixed (and one run used synthesize fallback `A Woman with Cucumber design featuring …`).

**Root-cause class: E (multiple), dominated by Class B** — deterministic Processing post-processing degrades quality relative to Playground’s raw/canonical stage. Request parity is largely intact (not Class A primary). Not Class D alone for titles.

`FUCK → F***` is **model variance**, not enrichment-path application masking (`maskCensoredDesignText` uses `****` and is display-side).

---

## Required answers

| # | Question | Answer |
|---|----------|--------|
| 1 | Playground exact prompt source | Callable request-body `prompt` (Settings editor). Controlled runs used **persisted Settings** text (hash `80793d340d1745ed`, length 2106, v37 gap semantics present). |
| 2 | Processing exact prompt source | Firestore `settings/aiEnrichment.promptTemplate` via `loadCachedAiEnrichmentSettings` → `buildSimpleCatalogEnrichmentUserPrompt` |
| 3 | Resolved prompt texts equal? | **YES** in controlled runs (same saved template fed to Playground). Historical risk remains if editor ≠ saved text. |
| 4 | Category payload equal? | **YES** — both use `loadCachedActiveCategories` + same placeholder expansion |
| 5 | Model/provider equal? | **YES** — `google` / `gemini-2.5-flash-lite` |
| 6 | Generation options equal? | **YES** for material options — both chat/completions, `max_completion_tokens: 2500`, no temperature, no response_format; minor retry count 2 vs 3 |
| 7 | Response schema equal? | **YES** at provider (instruction JSON only); Playground projects via `toCanonical…`; Processing builds `DesignAiSuggestions` via lean rules |
| 8 | Image asset equal? | **YES** in controlled runs — Playground uploaded `previews/Y2IQuCgAPgnqrBIeJuap.webp` (sha `be3b85384d9cbeb4`); Processing uses same `previewPath` |
| 9 | Image transformations equal? | **Mostly YES** — both `prepareAiAnalysisImage` → 1024² WebP pad. Playground omits design `artworkBackgroundHex` (null on this design anyway). |
| 10 | Playground displayed pipeline stage | **Normalized + canonical JSON** (`normalizeSimpleCatalogEnrichment` → `toCanonicalSimpleCatalogEnrichmentJson`). **Not** lean-resolved. |
| 11 | Processing raw provider title | Not separately persisted; inferred from Playground-class model titles (e.g. `Pin-up Woman Holding Cucumber with Sarcastic Phrase`) |
| 12 | Processing parsed title | Same as raw after coerce/trim (`normalizeSimpleCatalogEnrichment`) |
| 13 | Processing normalized title | Same (no lean yet) |
| 14 | Processing final `aiSuggestions.title` | Lean-resolved — typically `When Life Gives You Cucumbers Go Fuck Yourself Woman` (+ optional Cucumber) |
| 15 | First title divergence boundary | **`resolveLeanCatalogTitle`** inside `buildSimpleCatalogEnrichmentResult` (`simpleCatalogEnrichmentResponse.ts`) — prefers `buildTitleFromReadableTextLines(lines, centralSubject)` when candidate lacks ≥2 token overlap with readable lines |
| 16–19 | Description stages | Raw/parsed often STRONG scene prose; scrub via `sanitizeCatalogDescription` + `stripOcrDumpFromDescription`; if empty → `synthesizeSemanticCatalogDescription`; final `aiSuggestions.description` |
| 20 | First description divergence | **`buildSimpleCatalogEnrichmentResult` description scrub/fallback** (secondary). Some thin finals also look like thin raw model prose (Class D component). |
| 21 | Title rewrite helper involved? | **YES** — `resolveLeanCatalogTitle` / `buildTitleFromReadableTextLines` |
| 22 | Description sanitizer involved? | **YES** — `sanitizeCatalogDescription` + `stripOcrDumpFromDescription` |
| 23 | Anti-OCR guard involved? | **YES** (description strip/synthesize; title OCR-dump rejects) — can empty rich copy into synth |
| 24 | Profanity sanitizer involved? | **NO** on enrichment write |
| 25 | `FUCK → F***` deterministic mutation? | **NO** in app enrichment path — model sometimes emits `F***` in title/description while `readableTextLines` keep `FUCK` |
| 26 | Unknown/display issue? | **NO** — Studio shows `aiSuggestions` / design title from Processing persistence; Playground shows different pipeline stage |
| 27 | Playground quality counts (5) | Titles: STRONG **4**, THIN/AWKWARD **1**; Descriptions: STRONG **5** |
| 28 | Processing-raw quality counts | Proxy via Playground raw (same request class): titles STRONG 4 / THIN 1; desc STRONG 5. Simulated lean on those raws: titles THIN **5** |
| 29 | Processing-final quality counts (5) | Titles: THIN/AWKWARD **5**; Descriptions: STRONG **1**, ACCEPTABLE **2**, THIN **2** |
| 30 | Root-cause class | **E** (multiple) — **primary Class B**; secondary Class D on description wording / `F***`; Class A not primary |
| 31 | Exact defect(s) | (1) Lean title rebuild replaces usable visual-first model titles with slogan + `centralSubject` when readable-token overlap &lt; 2. (2) Description scrub/synth can thin or replace scene prose. (3) Playground never applies these transforms, so staff preview ≠ Processing. |
| 32 | Recommended narrow corrective | **Owner choice:** **Option 1 (preferred quality):** Trust usable model titles under visual-first prompts — do not rebuild from readable lines when candidate is usable and not generic/OCR/description-like. **Option 2:** Soften slogan+subject append (`woman` already weak for no-text enricher; still appended via `centralSubject`). **Option 3 (preview-only):** Run Playground through `buildSimpleCatalogEnrichmentResult` so Settings preview matches Processing (does **not** fix catalog quality). |
| 33 | Prompt change required? | **NO** for primary fix |
| 34 | Schema change required? | **NO** |
| 35 | Normalizer change required? | **NO** (smart-profile-normalizer-v6 unchanged) |
| 36 | Provider change required? | **NO** |
| 37 | Studio UI change required? | **NO** for quality fix; optional if Option 3 only |
| 38 | Automation/evidence change required? | **NO** |
| 39 | Tests required | Contract: visual-subject model title preserved when readable lines present; slogan rebuild only when candidate unusable; description scrub does not synthesize when scene prose remains; Playground/Processing stage documentation test |
| 40 | Implementation risk | Medium for Option 1/2 — revisits historical lean/OCR title policy; needs targeted regression suite. Low for Option 3 but does not solve owner quality complaint. |
| 41 | Verdict | **approved** (investigation) |
| 42 | Implementation authorized? | **NO** — product decision required among Options 1–3 |

---

## Mechanical proof (local)

Owner-class titles fed to `resolveLeanCatalogTitle` with cucumber readable lines + `centralSubject: woman`:

| Input (Playground-class) | Output (Processing lean) |
|--------------------------|--------------------------|
| Retro Pin-Up Woman Holding Cucumber | When Life Gives You Cucumbers Go Fuck Yourself Woman |
| Pin-up Woman Holding Cucumber Sarcastic Saying | When Life Gives You Cucumbers Go Fuck Yourself Woman |
| … | … |

Cause: `titleSharesMeaningfulReadableTokens` requires **≥2** overlapping tokens; visual titles often share only `cucumber`/`cucumbers` mismatch or a single token → rebuild via `buildTitleFromReadableTextLines` + subject append.

---

## Call graph (Processing title/description)

```
provider JSON
 → normalizeSimpleCatalogEnrichment          // trim
 → buildSimpleCatalogEnrichmentResult
      → resolveLeanCatalogTitle              // ★ title divergence
      → sanitizeCatalogDescription
      → stripOcrDumpFromDescription
      → synthesizeSemanticCatalogDescription // if empty
 → … tags/rerank/category (title unchanged)
 → optional resolveCatalogDescription        // placeholder only
 → markAiSuccess → aiSuggestions
```

Playground stops after normalize + canonical JSON (no lean).

---

## Safety / sequencing

| Gate | Status |
|------|--------|
| catalogWorkflowMode | shadow |
| Autonomous | OFF |
| Auto-approve audit | **BLOCKED** until this dispositioned |
| Tag retirement | **BLOCKED** |
| WS6 | not started |
| Production / commit | none |

---

## Checklist

| Area | Status |
|------|--------|
| Request parity measured | pass |
| Stage-matched comparison | pass |
| Title rewrite identified | pass |
| Profanity path traced | pass |
| No silent implement | pass |
| Owner decision flagged | pass |

## Verdict

**approved** — investigation complete. **Do not implement** until owner selects corrective Option 1, 2, or 3 (or hybrid).
