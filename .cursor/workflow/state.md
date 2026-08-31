## FreshForge State

| Field | Value |
|-------|-------|
| Status | **ACTIVE** |
| DONE | **no** |
| Active goal | `print-request-11-inch-default-15-inch-upscale-and-legacy-art-upscale` |
| Phase | **Test — Owner DEV QA production export parity re-test (post Storage deploy)** |
| WS-TOGGLE Interactive Owner DEV QA | **PASS** |
| WS-TOGGLE Export Parity Owner DEV QA | **pending re-test** (prior FAIL: Storage rules; corrective deployed 2026-08-31) |
| Corrective SHA | `9c9f7f0eb4e41bdd20802c42337c7179f94dfc90` |
| Export parity SHA | `c84ec449a688f1ffac53cc22a75525a9315ec8c3` |
| DEV Deploy | **2026-08-31** — Storage rules + `setPrintRequestItemArtworkEnhanceMode` → `fresh-prints-dev` (both exit 0) |
| Test Status | **passed_with_notes** — 49/49 pre-deploy (2026-08-31) |
| Human Checkpoint Required | **yes** — Owner re-test Tests A–F |
| Production | **NOT AUTHORIZED** |
| Smart Profiling | **NOT STARTED** |
| Signoff | **not authorized** |
| Last updated | 2026-08-31 |
| Last Completed Step | DEV Storage + Function deploy for interactive original read fix |

---

## Allowed Actions

- Owner manual DEV QA re-test (Tests A–F)
- Studio reload if not already on `development` @ `9c9f7f0e`

## Forbidden Actions

- Production deploy
- Signoff until export parity owner QA PASS
- Smart Profiling

---

## Next Required Step

Owner re-test gang sheet + ZIP on batch with design `ltn0gzs2YGXPADqCejr8` / allocation `d3MNZand4pj7P1pprcbA`. Deploy record: `docs/workflow/reviews/2026-08-31-ws-toggle-interactive-storage-access-dev-deploy-record.md`
