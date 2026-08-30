# DEV Smoke Report — Deployed `enqueueAiEnrichment` v29 / normalizer-v3

| Field | Value |
|-------|--------|
| Date | 2026-08-25 |
| Project | fresh-prints-dev |
| Script | `functions/scripts/smoke-enqueue-v29-dev.mjs` |
| Raw results | `docs/workflow/reviews/_smoke-enqueue-v29-dev-results.json` |
| Verdict | **PASS** |

---

## Environment gates

| Check | Result |
|-------|--------|
| `catalogWorkflowMode` | `shadow` |
| `catalogAutonomousLiveEnabled` | **false** (OFF) |
| Path | Real **httpsCallable `enqueueAiEnrichment`** (Cloud Function revision 00080) |

## Fixtures (bounded; restored after)

| Design | Checks | Result |
|--------|--------|--------|
| Highland `yJm2VBRvecPNjx79aSnK` | prompt `catalog-enrich-v29`; normalizer `smart-profile-normalizer-v3`; subjects include **highland cow** | **PASS** (`["highland cow","cow"]`) |
| Jimothy `6x2LyTvG3ewIePeWHanV` | v29 + v3; raccoon present; **people** absent | **PASS** |

## Lifecycle / Autonomous

- Live Autonomous remained **OFF**
- Mode remained **shadow** (Highland automationDecision `shadow`; Jimothy landed `needs_review` during smoke only)
- Both designs **restored** to pre-smoke status / review / smartProfile snapshots (no lasting catalog demotion)

## Not done

- Bulk reprocess
- Production
- Slice 5 / 6
