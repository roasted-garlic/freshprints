# Fresh Prints - Current State Snapshot

## 2026-08-13 — Studio 1.0.4 P4 corrective: clean production promotion prepared

| Item | Value |
|------|-------|
| Managed goal | `studio-1.0.4-ai-processing-preview-cleanup-corrective` |
| Root cause | Firestore Rules P4 authorization gap on derivative path persistence |
| Corrective | Narrow derivative completion Rules fast path + failure visibility + auto-AI guard + Option B owner safe-delete + Processing Delete UX + instant list reconcile; diagnostic banner OFF by default |
| Owner DEV QA | **PASS** |
| Development | **COMPLETE** — PR #69 merged @ `2119d4154c2c2e98cffa17d184012cc136cb3437` |
| Approved source commits | `5e0b072faab46e07a7011278e2c903f7513e77fa`, `9414aed4a5fefbd266648e3601e61af8ef363e10` |
| Production baseline | `c6e9235614b6816a98a71f998b47bd7fe18c371f` |
| Promote branch | `promote/studio-1.0.4-p4-corrective` (cherry-picks only; excludes unrelated development paths) |
| Production promotion | **PREPARED / PENDING** protected PR — not merged |
| Production Firebase | **PENDING** (`firestore:rules` + `functions:deleteEligibleUnapprovedDesign`) |
| NEW Studio 1.0.4 dual-platform draft | **PENDING** after backend promote — do **not** reuse `369614747` |
| Draft `369614747` | Failed-smoke evidence only; unpublished; untouched |
| Production fixtures (8 smoke) | Untouched |

### Diagnostic release cleanliness
Normal builds must **not** show the DIAGNOSTIC BUILD banner. Opt-in only via `VITE_FP_DERIVATIVE_LOCUS_DIAG=1` / intentional bake; default `PACKAGED_DERIVATIVE_LOCUS_DIAG=false`.

### Next
1. Protected PR → `production`
2. Separately authorized prod Firebase deploy
3. NEW 1.0.4 dual-platform draft + Windows/Mac smokes
4. Explicit publish authorization
5. Separate owner checkpoint for fixture cleanup after corrected Studio + Function exist
