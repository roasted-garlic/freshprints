# Manual Test Checkpoint — Luna Phase 1 Owner Studio QA

| Field | Value |
|-------|-------|
| Date | 2026-09-05 |
| Goal | `restore-openai-gpt-5-6-luna-ai-enrichment` |
| Feature / area | Studio Settings, AI Playground, AI Processing / Reprocess, AI Review Smart Profile |
| Environment | **DEV** — `fresh-prints-dev` · Studio against DEV |
| Status | **OWNER QA: PASS** (2026-09-05) |
| Automated benchmark | Supporting evidence only — **not** owner approval |

## Why automated tests are insufficient

Owner must personally confirm Studio UI labels, Settings save, Playground, overrides, and **visual** enrichment quality across the three models on a familiar design. The agent benchmark JSON is not a substitute.

## Prerequisites

- [ ] Studio running against **fresh-prints-dev**
- [ ] Owner/admin login
- [ ] Autonomous remains OFF (do not enable)
- [ ] Current Default AI model should start as **Gemini 2.5 Flash-Lite** (`gemini-2.5-flash-lite`)
- [ ] Prefer a familiar imported / Needs Review design for comparison (suggestions below)

### Suggested comparison design (pick one familiar artwork)

| Design ID | Why useful |
|-----------|------------|
| `Y2IQuCgAPgnqrBIeJuap` | Cucumber / “Go Fuck Yourself” — known evidence-friction case |
| `8bGvOZVxkx54Am5rx1EW` | Teddy bear — simple control |
| Any other familiar Needs Review design you prefer | Same design for all three model runs |

**Important:** Use the **same design** for Gemini 2.5 → Gemini 3.1 → Luna comparison. Use the **Processing / Reprocess model override** (run-scoped) so you do not have to leave Luna as the global default.

---

## Walkthrough

### A. Settings — Default AI model options

1. Open **Settings → AI Enrichment** (or equivalent Default AI model control).  
   **Expected:** Default AI model picker lists at least:
   - Gemini 2.5 Flash-Lite  
   - Gemini 3.1 Flash-Lite  
   - GPT-5.6 Luna  

2. Confirm current selection is **Gemini 2.5 Flash-Lite** (or note what it shows).  
   **Expected:** Matches DEV default unless you previously changed it.

### B. Settings — save Default AI model

3. Change Default AI model to **GPT-5.6 Luna** → Save.  
   **Expected:** Saves successfully (no “model not allowed” error). UI shows Luna as default.

4. Change Default AI model to **Gemini 3.1 Flash-Lite** → Save.  
   **Expected:** Saves successfully; UI shows Gemini 3.1 as default.

5. Restore Default AI model to **Gemini 2.5 Flash-Lite** → Save.  
   **Expected:** Saves successfully; default is Gemini 2.5 again.  
   *(Leave it here unless you explicitly want a different lasting default.)*

### C. AI Playground — each model

6. Open **AI Playground** (Settings playground).  
   For **each** of Gemini 2.5, Gemini 3.1, and Luna:
   - Select that model  
   - Run against a small test image (or the playground’s usual flow)  
   **Expected:** Each run completes without auth/provider errors; result shows the selected model (and provider if shown).

### D. Processing / Reprocess — override is run-scoped

7. Open **AI Processing** or **AI Review** for an imported / Needs Review design.  
   **Expected:** Model override / re-run model control offers all three: Gemini 2.5, Gemini 3.1, GPT-5.6 Luna.

8. With Default AI model still **Gemini 2.5**, run enrichment with override **Gemini 3.1**.  
   **Expected:** That run’s provenance / AI suggestions model shows `gemini-3.1-flash-lite`. Settings Default AI model remains Gemini 2.5.

9. Same design (or another), override **GPT-5.6 Luna**.  
   **Expected:** Run shows `gpt-5.6-luna` / OpenAI. Settings Default remains Gemini 2.5.

### E. Normal enrichment through Luna (global default path)

10. Temporarily set Default AI model to **GPT-5.6 Luna** → Save.  
11. Enqueue / process a design **without** override (or clear override).  
    **Expected:** Completed run shows model **gpt-5.6-luna** (provider OpenAI if visible).  
12. Restore Default AI model to **Gemini 2.5 Flash-Lite** → Save.

### F. Normal enrichment through Gemini 3.1 (global default path)

13. Temporarily set Default AI model to **Gemini 3.1 Flash-Lite** → Save.  
14. Enqueue / process a design **without** override.  
    **Expected:** Completed run shows model **gemini-3.1-flash-lite**.  
15. Restore Default AI model to **Gemini 2.5 Flash-Lite** → Save.

### G. Same-design visual comparison (owner eyes)

On **one familiar design**, re-run (or override-run) with each model. After each run settles, in **AI Review / Smart Profile**, note:

| Field | Where to look (typical) |
|-------|-------------------------|
| Title | Form / suggestions |
| Description | Form / suggestions |
| Visible text | Smart Profile dimensions |
| Category | Smart Profile / category chips |
| Subjects | Smart Profile |
| Objects | Smart Profile |
| Search concepts | Smart Profile |
| Needs Review / evidence gaps | Shadow reasons / automation reason codes |
| Model / prompt (if shown) | Smart Profile footer / processing meta |

Record briefly (scratch notes OK):

| Model | Title (short) | Category | Subjects | Objects | Shadow / gap reasons |
|-------|---------------|----------|----------|---------|----------------------|
| Gemini 2.5 | | | | | |
| Gemini 3.1 | | | | | |
| Luna | | | | | |

Do **not** need to declare a winner here — just confirm you can see real outputs and that each run used the intended model.

Optional supporting read (not a substitute for Studio):  
`docs/workflow/reviews/2026-09-05-restore-openai-gpt-5-6-luna-ai-enrichment-model-benchmark-report.md`

---

## Pass criteria

- [ ] All three Default AI model options appear in Settings  
- [ ] Default AI model saves for Luna, Gemini 3.1, and restores to Gemini 2.5  
- [ ] Playground succeeds for all three models  
- [ ] Processing/Reprocess override lists all three and stays run-scoped  
- [ ] A normal (default-path) Luna enrichment actually used Luna  
- [ ] A normal (default-path) Gemini 3.1 enrichment actually used Gemini 3.1  
- [ ] Same familiar design compared visually across all three models in Studio  
- [ ] Final Default AI model left as owner intends (recommend **Gemini 2.5 Flash-Lite** unless you choose otherwise)  
- [ ] Autonomous still OFF  

---

## Please reply with exactly one of

```text
LUNA PHASE 1 OWNER QA: PASS
```

```text
LUNA PHASE 1 OWNER QA: PASS WITH NOTES: <notes>
```

```text
LUNA PHASE 1 OWNER QA: FAIL: <what failed>
```

Only after **PASS** or **PASS WITH NOTES** will FreshForge proceed to final Signoff.

---

## Out of scope during this checkpoint

Signoff close · commit/push · TD-034 implement · Autonomous · WS6 · Phase 2 registry · production · code changes unless you report a defect
