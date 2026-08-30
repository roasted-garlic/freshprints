# Gate I Owner Manual Sample — Results

| Field | Value |
|-------|--------|
| Date | 2026-08-26 |
| Job | `zFzAwEIwCXFWC8dce0f4` |
| Project | **fresh-prints-dev** |
| Pipeline | `catalog-enrich-v29` + `smart-profile-normalizer-v3` |
| Sample size | **25** |
| Recommendation | **NEEDS CORRECTIVE** |
| Slice 5 signoff | **blocked** until Gate I corrective |

---

## Job context (unchanged)

| Metric | Value |
|--------|------:|
| Eligible / processed / succeeded | 204 / 204 / 204 |
| Failed / skipped / anomalies | 0 / 0 / 0 |
| Remained Needs Review | 204 |
| Would-auto-approve | 113 |
| Verifier unresolved / hard-block | 91 |
| Ready Catalog | locked |
| Autonomous live | OFF |
| Production | untouched |

---

## Owner quality verdict totals

| Verdict | Count |
|---------|------:|
| PASS | 8 |
| PASS WITH NOTES | 14 |
| FAIL PROFILE | 3 |
| FAIL AUTOMATION | 1 |

Material false-positive unattended approval found → **NEEDS CORRECTIVE**.

Priority remains: **precision of unattended approval > approval rate**.

---

## Gate I summary metrics

| # | Metric | Count / note |
|---|--------|--------------|
| 1 | Sample size | 25 |
| 2 | Would-auto-approve reviewed | 12 |
| 3 | Unresolved/hard-block reviewed | 10 (+ 1 category-gap + 2 diversity) |
| 4 | Profile PASS | 8 |
| 5 | PASS WITH NOTES | 14 |
| 6 | FAIL PROFILE | 3 (`5NVU91SMRiecLkZqdrN8`, `8m0KgJEel8kLpYlmZpFb`, `9bR7JWSWwv94Ofb7byC3`) |
| 7 | Auto-approve true positives | 11 of 12 would-auto-approve stratum (PASS / PASS WITH NOTES) |
| 8 | Auto-approve false positives | **1** (`5NVU91SMRiecLkZqdrN8`) — **HIGH severity** |
| 9 | Unresolved correct blocks | Majority — subject/category evidence gaps + category-gap |
| 10 | Unresolved false / over-conservative blocks | At least 2 noted (`daisy` plural gap; generic species expansions) |
| 11 | Category errors | 1 material (`Floral & Nature` on fantasy/storybook) + notes on Holiday vs Funny/Lifestyle |
| 12 | Subject errors | Multiple constructed compounds + 2 material unsupported/noisy subject sets |
| 13 | Unsupported-concept errors | `person` without depicted person; speculative creature/`dog` identities |
| 14 | Title errors | None marked material in Gate I sample |
| 15 | visibleText errors | None marked material |
| 16 | Search Concepts quality issues | Minor noise (`pets`, `holiday duck`, `wife problem`, redundant humor) |
| 17 | Repeated systemic pattern | Artificial title/context subject compounds; category dominant-intent mismatch; minor object gaps over-blocking |

---

## Per-design owner verdicts (authoritative)

| # | Design ID | Stratum | Verdict |
|---|-----------|---------|---------|
| 1 | `0EHBrGD4wXNLnNNKij4N` | would-auto-approve | PASS WITH NOTES — `bee` sole subject too narrow |
| 2 | `1Ws0T9fivryest6IUSbt` | would-auto-approve | PASS — empty Subjects OK |
| 3 | `20fv9qb9gRLSB66nS3xp` | would-auto-approve | PASS — text-driven faith OK |
| 4 | `2Nj95YLaLk6763oTrRZw` | would-auto-approve | PASS WITH NOTES — `donald goofy` artificial compound |
| 5 | `2g9IrxIiuOGrUbZio4Qn` | would-auto-approve | PASS |
| 6 | `2iLdJzuKCON3U2VJ6w0o` | would-auto-approve | PASS WITH NOTES — search noise `pets` / `holiday duck` |
| 7 | `3QNubh7l7WahljYYfgYe` | would-auto-approve | PASS WITH NOTES — `coochie alligator` artificial |
| 8 | `4rG1uHbmqBtOevnDFon6` | would-auto-approve | PASS — empty Subjects OK |
| 9 | `51Oz02NfLY8vTruauW56` | would-auto-approve | PASS — Frankenstein's monster OK |
| 10 | `5Jype5Zc1b13XXSci5Kn` | would-auto-approve | PASS — schnauzer + dog OK |
| 11 | `5NVU91SMRiecLkZqdrN8` | would-auto-approve | **FAIL PROFILE + FAIL AUTOMATION** — Fantasy/storybook under Floral & Nature + shadow_would_auto_approve |
| 12 | `6zKWIvQyvwH5M19bCeYW` | would-auto-approve | PASS WITH NOTES — `problem skeleton`; `wife problem` noise |
| 13 | `03cbj1cIFH7Bavt38XBX` | verifier-unresolved | PASS WITH NOTES — conservative block appropriate; `person` generic |
| 14 | `1eOWMVHDvRKY0kwYWQet` | verifier-unresolved | PASS WITH NOTES — safe NR |
| 15 | `1scpUhx0KriTBC1IfFIW` | verifier-unresolved | PASS WITH NOTES — `bath skeleton`; safe NR |
| 16 | `2sgtK8BS0Cj8vlyPBmhm` | verifier-unresolved | PASS WITH NOTES — over-conservative `daisy` gap |
| 17 | `6fBRl87jaXyYYGlhapS9` | verifier-unresolved | PASS WITH NOTES — generic species expansions over-block |
| 18 | `7BjqFQIhkavo80sv5kCp` | verifier-unresolved | PASS WITH NOTES — `silhouette ram`; category weak vs zodiac intent; NR safe |
| 19 | `7bVlWMFwxECdfHH8VNPB` | verifier-unresolved | PASS WITH NOTES — `f-caw-f raven`; NR reasonable |
| 20 | `8m0KgJEel8kLpYlmZpFb` | verifier-unresolved | **FAIL PROFILE** (not FAIL AUTOMATION) — noisy unsupported subjects; verifier safe |
| 21 | `96v0PKuDVdDqYa8fLxS3` | verifier-unresolved | PASS WITH NOTES — `dress goose` / `pets`; conservative |
| 22 | `9bR7JWSWwv94Ofb7byC3` | verifier-unresolved | **FAIL PROFILE** (not FAIL AUTOMATION) — unsupported `person`; verifier safe |
| 23 | `mw5eiufjMAuOZPnOiMiP` | category-gap | PASS — category gap correctly unresolved |
| 24 | `RM2efpWulaku0MYyNJPt` | diversity | PASS WITH NOTES — Holiday vs Funny/Lifestyle certainty |
| 25 | `LSYQkCI1bFLODzYArrNR` | diversity | PASS — chimpanzee + cannabis/peace OK |

---

## Systemic findings (owner)

1. **Subject construction** — contextual title/slogan glue creates artificial compounds; must keep genuine specificity (highland cow, schnauzer, etc.).
2. **Unsupported subjects** — verifier correctly blocked some material cases; do not weaken.
3. **Category safety** — primary automation failure: fantasy/storybook → Floral & Nature would-auto-approve.
4. **Verifier conservatism** — minor decorative/object/generic-expansion gaps over-block; lower severity than false auto-approve.

---

## Follow-on

Corrective plan: `docs/workflow/plans/2026-08-26-slice-5-gate-i-corrective-plan.md`

Do **not** sign off Slice 5. Do **not** start Slice 6.
