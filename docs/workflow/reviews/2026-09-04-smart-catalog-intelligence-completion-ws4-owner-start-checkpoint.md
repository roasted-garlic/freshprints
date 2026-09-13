# Owner Checkpoint — WS4 Ready Catalog Start (DO NOT EXECUTE YET)

| Field | Value |
|-------|-------|
| Date | 2026-09-04 |
| Environment | **fresh-prints-dev** only |
| Target | Ready Catalog reprocess to **catalog-enrich-v33** / **smart-profile-normalizer-v6** / **smart-profile-v1** |
| Inventory | `docs/workflow/reviews/2026-09-04-smart-catalog-intelligence-completion-ws4-inventory-and-preview.md` |
| Mode | **shadow** · Autonomous **OFF** (must remain OFF) |

---

## Current scope (recalculated — do not use old 346)

| Metric | Count |
|--------|------:|
| Approved Ready eligible | **359** |
| Already exact v33/v6 | **0** |
| Refresh required | **359** |
| Still on v32/v6 (also refresh) | **13** |
| Staff-edited Smart Profiles | **4** |
| Preset-seeded | **13** |

---

## Preconditions before Start

1. Confirm still **shadow** + Autonomous **OFF**
2. Confirm **no** active `ready_catalog` or `ai_review_queue` job
3. Accept refresh scope **359** (all Ready approved; none already v33/v6)
4. Accept staff-edit / preset preservation contracts remain in force
5. Prefer optional bounded Ready canary (2–10 IDs) before full Start if desired

---

## Exact Start authorization (only when you mean it)

Reply with **both**:

1. Explicit Start authorization for WS4 Ready Catalog on **fresh-prints-dev**
2. Exact confirmation phrase:

### `REPROCESS READY CATALOG`

---

## Still forbidden until you authorize Start

- Calling `startCatalogReprocessJob` for Ready
- Autonomous enablement
- Tag / matchedTags retirement
- Algolia settings / Rules / Storage / index changes
- Migration / backfill outside Ready reprocess job
- Production

---

## After Start (future — not now)

Verify zero Ready demotions; approval/`readyAt` intact; staff edits preserved; sample v33/v6 provenance; then STOP before Autonomous.
