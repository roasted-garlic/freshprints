# Combined Manual QA — Amendment 9 P3 + P1 (morning checkpoint)

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Branch | `fix/post-launch-catalog-and-processing-stability` |
| P3 commit | `c3d3c45` |
| P1 commit | `dab3c44` |
| PR | #40 — must stay **open / unmerged** |
| Environment | `fresh-prints-dev` + local Studio |

---

## Prerequisites (owner)

1. Pull latest branch (`dab3c44` or newer).
2. **Deploy P3 Functions only** (P1 is Studio client — no Firebase deploy):

```bash
firebase deploy --only functions:enqueueAiEnrichment,functions:testAiEnrichmentPlayground,functions:testAiEnrichmentTagRerank,functions:updateAiEnrichmentSettings --project fresh-prints-dev
```

Approval phrase: `APPROVE DEV FUNCTIONS DEPLOY: AMENDMENT 9 P3`

3. Run local Studio against `fresh-prints-dev` (`npm run dev:studio`).
4. Optional Portal for P4 publication observation (`npm run dev:portal`).

---

## 45-design measurement procedure

1. Begin Studio Debug Firestore capture.
2. Record UTC start.
3. Import ~45 valid designs.
4. Allow/process AI normally (sequential queue).
5. Approve through AI Review.
6. Enter Design Library.
7. Stop capture; record UTC end.
8. Retrieve Cloud Logging attribution for the window.

### Report separately (do not combine)

| Layer | What to capture | Expected labels / notes |
|-------|-----------------|-------------------------|
| **A. Studio client reads** | Debug oneshot summary | P1: fewer per-design design-doc gets vs pre-P1; write-path gets now traced |
| **B. AI taxonomy Function reads** | `jsonPayload.event=~taxonomy-` | Warm instance: ~1 `taxonomy-cache-miss` + `taxonomy-load-success`; then hits/joins |
| **C. P4 catalog-publication reads** | publication accounting | ≤6 full pubs; ideally ~3; C+T+R bounded |
| **D. Other Function reads** | if material | Separate line items |
| **E. Console total** | Usage bucket | Approximate; do not force-equal A+B+C |

---

## PASS / FAIL targets

| Area | PASS | FAIL |
|------|------|------|
| **P0** | Zero successful-approval full inbox-page reloads; zero triple-tab count refreshes | Reloads/count storms return |
| **P3** | On one warm instance/cache window ≈ one full taxonomy load; hits/joins dominate | Full taxonomy load per design or many miss cycles within 15m |
| **P4** | ≤6 full pubs for ~45 approvals; min interval holds | Pub storm / unbounded C+T+R |
| **P1** | Per-design Studio design-doc oneshots demonstrably lower than pre-P1 (import ≈2, approve ≈2); linear | Duplicate same-purpose gets return; non-linear cost |

### Expected log events (P3)

- `taxonomy-cache-miss` / `taxonomy-cache-hit` / `taxonomy-cache-join-inflight` / `taxonomy-cache-expired`
- `taxonomy-load-success` / `taxonomy-load-failure`
- Sanitized: counts, TTL, elapsed ms, `runtimeInstanceId` — **no** category/tag names

---

## Measurement comparison table

| Contributor | Pre-P0/P4 evidence | Post-P4 evidence | Theoretical post-P3/P1 | Needs live measure |
|-------------|-------------------:|-----------------:|-----------------------:|:------------------:|
| Portal full pubs (45 batch) | ~25 pubs / ~28.7K C+T+R | **3 pubs / 3,436** | Same P4 bound | Confirm still ≤6 |
| AI taxonomy (warm instance) | ~3 outer-miss cycles / attributed ~3.4K (may overcount) | unchanged until P3 deploy | **≈1 × ~1,140** within 15m TTL | Yes after P3 deploy |
| Studio import design-doc oneshots / design | ~5 | ~5 | **~2** (I1+I4) | Yes with Debug |
| Studio approve design-doc oneshots / design | ~3 | ~3 (P0 removed list/count) | **~2** (A1+A3) | Yes with Debug |
| P0 inbox reload on approve | triangular list reloads | **0** list + **0** count | **0** | Spot-check |
| Remaining full pub C+T+R each | ~1.1K | ~1.1K | ~1.1K until search retirement | Note only |

---

## Remaining known Firestore-read contributors

1. Generated portal catalog publication C+T+R (~1.1K per full pub) — P4 bounds frequency; Stage 1b / search retirement removes permanently.
2. Cold Function instance taxonomy loads (one per instance) — inherent; not a global one-load guarantee.
3. Server `enqueueAiEnrichment` Admin design gets — out of P1/P3.
4. AI Review document listener snapshot updates — not oneshot P1.
5. Index-entry / Query Insights unknowns — still optional owner evidence.

---

## Explicit non-actions this morning unless separately approved

- No production deploy
- No Rules/index/migration
- No PR #40 merge
- No Stage 1b
- No snapshot cleanup / Function retirement
