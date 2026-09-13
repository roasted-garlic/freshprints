# DEV Deploy Record — Smart Profile Quality + Canonicalization (+ Import Background + Vocab Auto-Refresh)

| Field | Value |
|-------|-------|
| Date | 2026-08-25 |
| Project | **fresh-prints-dev** only |
| Branch | `development` |
| Status | **deployed** — initial vocab snapshot populated — **STOP for owner manual QA / calibration** |
| Console | https://console.firebase.google.com/project/fresh-prints-dev/overview |
| Allowlist | `2026-08-25-smart-profile-quality-canonicalization-and-import-background-dev-deploy-allowlist.md` |

---

## Preflight (executed before mutation)

| Check | Result |
|-------|--------|
| `firebase use` | **fresh-prints-dev** |
| Branch | `development` |
| Functions build | pass |
| Studio `tsc --noEmit` + Vite build | pass |
| `npm run lint` | pass |
| `git diff --check` | acceptable (CRLF warnings only) |
| Companion Functions required? | **No** — `enqueueAiEnrichment` → pipeline only; refresh module standalone (no playground/settings dep) |
| Exact allowlist recorded | `enqueueAiEnrichment`, `refreshSmartProfileVocabSnapshotCallable`, `refreshSmartProfileVocabSnapshotScheduled` |

## Deploy command

```bash
firebase deploy --only \
  functions:enqueueAiEnrichment,\
  functions:refreshSmartProfileVocabSnapshotCallable,\
  functions:refreshSmartProfileVocabSnapshotScheduled \
  --project fresh-prints-dev
```

Exit **0**. Deploy complete ~2026-08-25T16:07:40Z.

## Functions result (us-central1)

| Function | Op | State |
|----------|-----|-------|
| `enqueueAiEnrichment` | **updated** | ACTIVE |
| `refreshSmartProfileVocabSnapshotCallable` | **created** | ACTIVE |
| `refreshSmartProfileVocabSnapshotScheduled` | **created** | ACTIVE |

Scheduler job: `firebase-schedule-refreshSmartProfileVocabSnapshotScheduled-us-central1` — **every 6 hours**, timezone **America/Chicago**, **ENABLED**.

## Not deployed (confirmed)

- Firestore Rules
- Firestore indexes
- Algolia Functions
- `testAiEnrichmentPlayground`
- `updateAiEnrichmentSettings`
- Unrelated Functions
- **fresh-prints-prod** — `enqueueAiEnrichment` prod `updateTime` still `2026-08-12T15:50:12Z` (unchanged by this wave)

## Initial vocab snapshot (owner-authorized one-shot)

| Field | Value |
|-------|-------|
| Callable | `refreshSmartProfileVocabSnapshotCallable` |
| Auth path | Temp owner provisioned via CLI token (smoke pattern); cleaned up after |
| Result `ok` | true |
| `source` | **`firestore_sample`** |
| `refreshedAt` / `updatedAt` | `2026-08-25T16:13:12.527Z` |
| `sampleSize` (eligible smart-profile-v1 designs) | **56** |
| `sampleLimit` | 400 |
| `topN` | 40 |
| Manually curated seed? | **No** |

### Per-dimension retained value counts

| Dimension | Count | Empty? |
|-----------|------:|--------|
| subjects | 40 | no |
| objects | 40 | no |
| styles | 40 | no |
| themes | 40 | no |
| interests | 40 | no |
| colors | 27 | no |
| places | 7 | no |
| occasions | 6 | no |
| professionsGroups | 3 | no |

**Empty dimensions:** none (all listed dims have ≥1 value). Snapshot is useful for calibration; still **not** a substitute for the ~20–30 design calibration set.

## Smoke preparation (agent)

| Item | Status |
|------|--------|
| Enrichment reads `settings/aiSmartProfileVocab` via `loadSmartProfileVocabSnapshot` (not catalog scan) | Confirmed in source + contract tests |
| Novel terms preserved when unmatched | Unit/contract pass |
| Imports layout / session controls contracts | Pass (44 focused tests) |
| Background/halftone precedence + detector | Unit/contract pass |
| Live Studio Imports visual QA | **Owner** |
| Live background detector on real PNGs | **Owner** |
| Small DEV enrichment runs (v28 active, mode-safe landing) | **Owner** — do not treat as final calibration |
| ~20–30 design calibration set | **Still required** before refinement signoff |

## Hard limits respected

- No Slice 5 / Slice 6
- No `catalogAutonomousLiveEnabled`
- No production deploy
- No tag retirement / category auto-create
- No AI live halftone authority
- No manual vocab seeding
- No bulk catalog reprocessing

## Next

**STOP for owner manual QA / calibration.** Do **not** sign off this refinement yet. Do **not** start Slice 5.
