# Luna Phase 1 — Three-Model DEV Benchmark Report

| Field | Value |
|-------|-------|
| Date | 2026-09-05 |
| Project | `fresh-prints-dev` |
| Goal | `restore-openai-gpt-5-6-luna-ai-enrichment` |
| Script | `functions/scripts/luna-phase1-model-benchmark-dev.mjs` |
| Raw results | `docs/workflow/reviews/_luna-phase1-model-benchmark-dev-results.json` |
| Contract | `catalog-enrich-v34` / `smart-profile-normalizer-v6` / `smart-profile-v1` — **unchanged** |
| Method | Same 8 designs × 3 models via `rerunFromReview` + `visionModelIdOverride` only |
| Global default | Remained **`gemini-2.5-flash-lite`** throughout (verified mid-run + final) |
| Autonomous | **OFF** (`shadow` / live `false`) |

---

## 1. Benchmark design set

| ID | Label | Bucket |
|----|-------|--------|
| `Y2IQuCgAPgnqrBIeJuap` | Cucumber / woman subject gap | evidence friction (subject) |
| `03cbj1cIFH7Bavt38XBX` | MJ / hat object gap | evidence friction (object) |
| `1Ws0T9fivryest6IUSbt` | Cannabis leaves object gap | evidence friction (object) |
| `LYJcsxnfUyacRWtntEkd` | Highland cow / stars | evidence friction + category |
| `nff6PpkZF9TNitnpX2Mm` | Boston Terrier / flowers | evidence friction (object) |
| `Bilulhd5Hm7nwv1uZfbA` | Laundry Worker | control — occupation / text |
| `6fBRl87jaXyYYGlhapS9` | Looney Tunes collage | control — pop culture |
| `8bGvOZVxkx54Am5rx1EW` | Teddy bear with bow | control — uncomplicated |

---

## 2. Aggregate shadow / evidence outcomes

| Model | Provider | Gap runs | Would auto-approve (shadow) | Needs review | Est. total cost (8 runs) | Avg elapsed |
|-------|----------|----------|-----------------------------|--------------|--------------------------|-------------|
| `gemini-2.5-flash-lite` | google | **3 / 8** | **4 / 8** | 4 / 8 | ~$0.007 | ~3.9s |
| `gemini-3.1-flash-lite` | google | **3 / 8** | **5 / 8** | 3 / 8 | ~$0.021 | ~3.8s |
| `gpt-5.6-luna` | openai | **5 / 8** | **3 / 8** | 5 / 8 | ~$0.016 | ~6.2s |

All successful runs stamped `promptVersion=catalog-enrich-v34`, `normalizerVersion=smart-profile-normalizer-v6`. No provider routing mismatch (Gemini→google, Luna→openai).

**Note:** One Luna wait falsely timed out on laundry (`Bilulhd5Hm7nwv1uZfbA`) though enrichment completed; result recovered from Firestore (`recoveredFromFalseTimeout`).

---

## 3. Per-design comparison (material differences)

### `Y2IQuCgAPgnqrBIeJuap` — cucumber / woman

| | Gemini 2.5 | Gemini 3.1 | Luna |
|---|---|---|---|
| Title | Slogan + appended **Woman** | Slogan only | Slogan only |
| Description | Vintage/sarcastic theme (no “woman”) | **“A woman design featuring…”** | Food parody / lettering (no “woman”) |
| Subjects / objects | woman, cucumber | woman, cucumber | woman, cucumber |
| Evidence gaps | none | none | **`subjects:woman`** |
| Shadow | would auto-approve | would auto-approve | needs review |
| Quality | **Acceptable** (awkward title glue clears gap) | **Best** (natural desc support) | **Material miss** (same classic friction) |

### `03cbj1cIFH7Bavt38XBX` — MJ / hat

| | Gemini 2.5 | Gemini 3.1 | Luna |
|---|---|---|---|
| Identity | Michael Jackson | Michael Jackson | Generic **“man”** / “Dancing Performer” |
| Objects | hat → **gap** | **omitted** hat | hat; gap on **man** |
| Category | Music & Bands | Music & Bands | Music & Bands |
| Shadow | needs review | would auto-approve | needs review |
| Quality | **Acceptable** recognition; evidence miss | **Acceptable** (clears by omitting hat — less object specificity) | **Material miss** (identity + evidence) |

### `1Ws0T9fivryest6IUSbt` — cannabis leaves

| | Gemini 2.5 | Gemini 3.1 | Luna |
|---|---|---|---|
| Title / desc | Desc mentions cannabis leaves | Title “Cannabis **Leaf**”; objects “cannabis **leaves**” | Title “Cannabis **Leaves**” |
| Gaps | none | **`objects:cannabis leaves`** | none |
| Quality | **Best** | **Material miss** (Leaf vs leaves matching friction) | **Best** / Acceptable |

### `LYJcsxnfUyacRWtntEkd` — highland cow / stars

| | Gemini 2.5 | Gemini 3.1 | Luna |
|---|---|---|---|
| Subjects | cow only → **`subject_specificity_risk:cow`** | highland cow + cow | highland cow + cow |
| Objects | sunglasses, inner tube | + stars (supported in desc) | sunglasses, inner tube → **gap: inner tube** (desc says “pool float”) |
| Category | **Family** (weak) | **Cute & Whimsical** | Cute & Whimsical |
| Quality | Acceptable art; category/specificity miss | **Best** | Acceptable prose; evidence miss on synonym |

### `nff6PpkZF9TNitnpX2Mm` — Boston Terrier / flowers

All three: Needs Review with multiple floral/object (and some subject) gaps. Titles good; structured objects outrun descriptive corpus.

| Model | Quality |
|-------|---------|
| Gemini 2.5 | **Acceptable** (best floral detail in desc, still gaps) |
| Gemini 3.1 | Acceptable / thinner desc |
| Luna | Acceptable title (“Surrounded By Flowers”) but more gap codes |

### `Bilulhd5Hm7nwv1uZfbA` — laundry occupation (control)

All three: Occupations, would auto-approve, no gaps.

| Model | Quality |
|-------|---------|
| Gemini 2.5 | **Acceptable** (verbose repeating title) |
| Gemini 3.1 | Acceptable (repeated LAUNDRY in title) |
| Luna | **Best** (clean “Laundry Worker”) |

### `6fBRl87jaXyYYGlhapS9` — Looney Tunes (control)

All three: Pop Culture & Characters, Needs Review — dense subject lists without lexical support in short titles/descriptions. Gemini 2.5 nearly cleared (1 gap: rabbit); 3.1/Luna listed many unsupported character tokens.

| Model | Quality |
|-------|---------|
| Gemini 2.5 | **Best** among three (richer desc; fewest gaps) |
| Gemini 3.1 | Material miss on evidence density |
| Luna | Material miss on evidence density |

### `8bGvOZVxkx54Am5rx1EW` — teddy bear (control)

All three: Cute & Whimsical, would auto-approve, no gaps. **All Acceptable / Best-tie** for catalog usefulness.

---

## 4–5. Overall model strengths / weaknesses

### Gemini 2.5 Flash-Lite (baseline)

- **Strengths:** Lowest cost; often self-supports objects in description; strong on collage character naming; cheapest safe path.
- **Weaknesses:** Probabilistic — sometimes glues subject onto title awkwardly; still hits classic hat/flowers gaps; occasional specificity/category misses.

### Gemini 3.1 Flash-Lite

- **Strengths:** Highest safe would-approve rate in this sample (5/8); often clearer visual naming in short descriptions; cleared cucumber and MJ hat cases (hat via omission).
- **Weaknesses:** ~3× cost vs 2.5; thinner descriptions sometimes; can still create Leaf/leaves-style gaps; over-lists unsupported subjects on dense character art.

### gpt-5.6-luna

- **Strengths:** Correct OpenAI routing; clean occupation titles; good cannabis leaf title self-support; solid teddy-bear control; usable catalog tone.
- **Weaknesses:** **Did not reduce TD-034 friction overall** (5/8 gap runs); cucumber still blocked on `woman`; MJ identity regression (“man”); synonym gaps (`inner tube` vs “pool float”); denser unsupported subject lists on Looney Tunes; higher latency.

---

## 6. Hallucination / material recognition failures

- **Luna on MJ:** Failed to name Michael Jackson; generic “man” / “Dancing Performer” — material recognition miss.
- **No gross invented categories** observed (Funny & Sarcastic / Music / Cannabis / Occupations / Pop Culture / Cute stayed plausible).
- **Gemini 2.5 Family** on highland cow is a category miss vs Cute & Whimsical.

---

## 7. Category differences (material)

| Design | 2.5 | 3.1 | Luna |
|--------|-----|-----|------|
| Highland cow | Family | Cute & Whimsical | Cute & Whimsical |
| Boston Terrier | Cute & Whimsical | Animals | Animals |

Others agreed across models.

---

## 8. Smart Profile / evidence differences

- Same validators for all runs.
- Friction patterns: (a) structured token not mentioned in title/desc/visibleText; (b) near-synonym mismatch (pool float vs inner tube; Leaf vs leaves); (c) omitting objects clears gaps but loses facet specificity (3.1 hat).
- Prompt/normalizer versions identical — differences are **model emission**, not pipeline versioning.

---

## 9. Latency / cost

| Model | Approx avg latency | Sample total est. cost |
|-------|--------------------|------------------------|
| Gemini 2.5 | ~3.9s | ~$0.007 |
| Gemini 3.1 | ~3.8s | ~$0.021 |
| Luna | ~6.2s | ~$0.016 |

---

## 10. TD-034 disposition recommendation

| Question | Answer |
|----------|--------|
| Does Luna materially reduce visual-object lexical evidence friction? | **No** — more gap runs than either Gemini in this sample; cucumber still blocked. |
| Does Gemini 3.1 materially reduce it? | **Partially** — higher safe approve rate; some clears via better copy **or** by omitting unsupported objects. Not a full TD-034 cure. |
| Remaining issue primarily? | **Mixture** — model self-support quality **and** evidence-layer lexical/normalization matching (plurals, synonyms). |
| TD-034 next? | **Return later as a narrowly scoped corrective** (prompt self-consistency and/or narrow matching). Do **not** close as immaterial. Do **not** keep indefinitely parked solely waiting for another model. **Do not implement in this Luna goal.** |

**Recommended parked status update:** `PARKED → READY FOR SEPARATE CORRECTIVE PLAN` after Luna Signoff (owner may unpark evidence-friction plan when ready).

---

## 11. Recommended DEV default

Keep **`gemini-2.5-flash-lite`** as DEV global default unless owner explicitly wants Luna or 3.1 for calibration.

- Luna is **ready as a selectable additive model**, not a proven better default for evidence/approval rate.
- Gemini 3.1 is a reasonable optional default if owner prioritizes slightly higher safe approve rate and accepts cost.

---

## 12. Luna Phase 1 Signoff readiness

**YES — ready for owner Signoff** of Luna Phase 1 dual-provider restoration (with notes):

- DEV deploy + prior DEV QA PASS WITH NOTES stand
- Benchmark confirms provider routing and production contract parity across three models
- Notes: TD-034 remains open for a later corrective; Luna not promoted as default by this benchmark; one false wait timeout recovered; disposable Luna QA fixtures may still exist for optional cleanup

---

## 13. Final persisted DEV `visionModelId`

**`gemini-2.5-flash-lite`**

---

## 14. Untouched confirmations

| Item | Status |
|------|--------|
| Production | untouched |
| Autonomous | OFF |
| WS6 | not started |
| Phase 2 registry | untouched |
| Rules / indexes / migrations | untouched |
| Prompt / normalizer / evidence validators | unchanged |
| TD-034 implementation | not done |
| Commit / push | none |
