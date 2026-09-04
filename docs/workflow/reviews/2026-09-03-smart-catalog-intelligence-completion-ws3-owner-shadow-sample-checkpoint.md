# Manual Test Checkpoint — WS3 Owner Shadow Sample

| Field | Value |
|-------|-------|
| Date | 2026-09-03 |
| Feature / area | Smart Catalog Intelligence Completion — **WS3 Shadow sample** |
| Job ID | `omLhRHLnpkyvhOc8yQp9` |
| Environment | **fresh-prints-dev** (Studio AI Review) |
| Why automated tests are insufficient | Shadow quality vs artwork requires human judgment |
| Lifecycle mutation for sampling | **NONE** — inspect only |

---

## How to review

For each design:

1. Open in Studio AI Review / design details.
2. Compare **artwork** to:
   - **AI suggested title** / **AI suggested description** (from enrichment suggestions — not only the import filename root title)
   - Smart Profile category + subjects/objects when shown
   - Automation outcome + exact reason codes below
3. Ask: would you be comfortable if Autonomous later published this as Ready based on this Shadow decision?

**Important:** Root `title` on imported designs often remains the import/filename string. Shadow scored **aiSuggestions**. Prefer AI suggested title/description when judging decision quality.

---

## Stratified sample (15)

### 1–3 — wouldAutoApprove (readable roots)

| ID | Root title | AI suggested title | Category | Outcome | Reasons | Why selected |
|----|------------|-------------------|----------|---------|---------|--------------|
| `7bVlWMFwxECdfHH8VNPB` | F Caw F-03 | F-caw-f Raven | Animals | wouldAutoApprove | `shadow_would_auto_approve` | Clean auto candidate |
| `At5hu7vLjWgduiyzZCfR` | I dont do matching shirtsW | I Don't Do Matching Shirts | Funny & Sarcastic | wouldAutoApprove | `shadow_would_auto_approve` | Text-led humor auto |
| `Bilulhd5Hm7nwv1uZfbA` | Laundry Worker Appreciation Week… | Laundry Worker Colorful Retro Text | Occupations | wouldAutoApprove | `shadow_would_auto_approve` | Occupation / typography |

**AI desc (short):** raven mid-caw + F-CAW-F; matching-shirts joke; LAUNDRY worker retro lettering.

### 4–5 — wouldAutoApprove (filename root — verify AI copy)

| ID | Root title | AI suggested title | Category | Outcome | Reasons | Why selected |
|----|------------|-------------------|----------|---------|---------|--------------|
| `03cbj1cIFH7Bavt38XBX` | (4) | Michael Jackson Dancing Silhouette | Pop Culture & Characters | wouldAutoApprove | `shadow_would_auto_approve` | Filename root; AI title must fit art |
| `6fBRl87jaXyYYGlhapS9` | 1 (52) | Looney Tunes Characters Collage | Pop Culture & Characters | wouldAutoApprove | `shadow_would_auto_approve` | Filename root; collage/characters |

### 6–7 — category-related Needs Review

| ID | Root title | AI suggested title | Category | Outcome | Reasons | Why selected |
|----|------------|-------------------|----------|---------|---------|--------------|
| `Dr8lcyPE8imTQlNESP8X` | (5) | Fairytale Castle Emerging From Open Book | Pop Culture & Characters | Needs Review (**hardBlocked**) | `category_gap_suggested` | Rare category-gap hard block |
| `nff6PpkZF9TNitnpX2Mm` | 343 Boston Terrier | Boston Terrier With Floral Bow Tie | Animals | Needs Review (**hardBlocked**) | `category_gap_suggested`, `structured_evidence_gap:objects:flowers` | Category gap + evidence |

### 8–9 — structured-evidence Needs Review

| ID | Root title | AI suggested title | Category | Outcome | Reasons | Why selected |
|----|------------|-------------------|----------|---------|---------|--------------|
| `0EHBrGD4wXNLnNNKij4N` | 2601895693 Spread The Hope… | Spread The Hope Find The Cure… Awareness | Awareness & Causes | Needs Review | `structured_evidence_gap:objects:ribbon`, `…:bee`, `…:heart` | Awareness / multi-object gaps |
| `1Ws0T9fivryest6IUSbt` | just_hit_it | Just Hit It Marijuana Leaves | Funny & Sarcastic | Needs Review | `structured_evidence_gap:objects:cannabis leaves` | Single-object evidence gap |

### 10 — subject-specificity

| ID | Root title | AI suggested title | Category | Outcome | Reasons | Why selected |
|----|------------|-------------------|----------|---------|---------|--------------|
| `LYJcsxnfUyacRWtntEkd` | cow summer vibes front | Highland Cow Relaxing In Inner Tube With Sunglasses | Animals | Needs Review | `subject_specificity_risk:cow` | Only specificity hard case in batch |

### 11 — text-heavy

| ID | Root title | AI suggested title | Category | Outcome | Reasons | Why selected |
|----|------------|-------------------|----------|---------|---------|--------------|
| `1eOWMVHDvRKY0kwYWQet` | FD_M_CT58_PNG | Father Protector Hero Acrostic With Star Wars Icons | Family | Needs Review | multiple `structured_evidence_gap` subjects/objects (bb-8, vader, x-wing, …) | Dense visibleText + many gaps |

### 12 — document / background-text style

| ID | Root title | AI suggested title | Category | Outcome | Reasons | Why selected |
|----|------------|-------------------|----------|---------|---------|--------------|
| `7BjqFQIhkavo80sv5kCp` | 4-01 | Aries Lively Versatile… Ram | Pop Culture & Characters | Needs Review | `structured_evidence_gap:objects:stars` | Multi-word trait list / zodiac text |

### 13 — outlier (many hard reasons)

| ID | Root title | AI suggested title | Category | Outcome | Reasons | Why selected |
|----|------------|-------------------|----------|---------|---------|--------------|
| `E2fVUzTL8Smx0gXaGqUZ` | FD_M_ALL02_PNG | I Am Their Father Darth Vader Star Wars | Pop Culture & Characters | Needs Review | 10 evidence-gap codes (yoda, fett, death star, …) | Max hard-reason outlier |

### 14–15 — additional Needs Review

| ID | Root title | AI suggested title | Category | Outcome | Reasons | Why selected |
|----|------------|-------------------|----------|---------|---------|--------------|
| `1scpUhx0KriTBC1IfFIW` | PNG 4 | Skeleton Live Laugh Toaster Bath | Funny & Sarcastic | Needs Review | skull / bathtub / bubbles / stars gaps | Extra evidence-gap fill |
| `2g9IrxIiuOGrUbZio4Qn` | 2 (12) | Colorful Flamingo With Tropical Flowers | Floral & Nature | Needs Review | `structured_evidence_gap:objects:leaves` | Extra evidence-gap fill |

Full structured rows: `2026-09-03-smart-catalog-intelligence-completion-ws3-analysis-raw.json` → `sample`.

**Not present in this 165-set:** verifier cases; import-preset designs; staff-edited dimension keys.

---

## Pass criteria

- [ ] wouldAutoApprove samples: AI title/description fit artwork; comfortable as future Ready
- [ ] Needs Review samples: reason codes make sense vs artwork (not clearly wrong)
- [ ] No sign of staff/preset wipe or unexpected Ready
- [ ] No desire to unlock Autonomous or Start Ready from this sample alone

---

## Please reply with

- `OWNER WS3 SHADOW SAMPLE: PASS`
- `OWNER WS3 SHADOW SAMPLE: PASS WITH NOTES — …`
- `OWNER WS3 SHADOW SAMPLE: FAIL — <design + problem>`

---

## Owner response (recorded 2026-09-03)

**`OWNER WS3 SHADOW SAMPLE: PASS WITH NOTES`**

- 12/15 acceptable for future Auto Approve as generated; enrichment quality generally good.
- Remaining issue: **category dominant-intent selection** (not title/description/Smart Profile quality).
- #1 Funny & Sarcastic > Animals (F-CAW-F joke).
- #6 Books & Reading after owner-added category — positive.
- #9 Cannabis & 420 > Funny (cache timing must be verified).
- #12 Astrology & Zodiac (existing) missed — genuine calibration.
- #13 Pop Culture > Family — positive.

**WS4 Start remains forbidden.** Follow-on: Plan + Formal Review for category dominant-intent calibration:

- Plan: `docs/workflow/plans/2026-09-03-category-dominant-intent-calibration-plan.md`
- Review: `docs/workflow/reviews/2026-09-03-category-dominant-intent-calibration-review.md` (**approved_with_changes**)
- Implementation Review: `docs/workflow/reviews/2026-09-03-category-dominant-intent-calibration-implementation-review.md` (source implemented; **DEV deploy pending**; Gate A live #9 + four-design canary not run)

---

## After your reply

- **PASS / PASS WITH NOTES** → WS3 sample gate closed; category calibration corrective before WS4.
- **FAIL** → stop; no WS4; may open calibration follow-up.
- Do **not** treat this checkpoint as WS3 Signoff, Autonomous enablement, or WS4 authorization.
