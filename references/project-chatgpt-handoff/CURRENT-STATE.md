# Fresh Prints - Current State Snapshot

## 2026-08-13 — Studio 1.0.4 published; repository consolidation closeout in progress

| Item | Value |
|------|-------|
| Managed goal | `repository-consolidation-closeout` (post Studio 1.0.4 P4) |
| Root cause (corrective) | Firestore Rules P4 authorization gap on derivative path persistence |
| Corrective | Narrow derivative completion Rules fast path + failure visibility + auto-AI guard + Option B owner safe-delete + Processing Delete UX + instant list reconcile; diagnostic banner OFF by default |
| Owner DEV QA | **PASS** |
| Development (pre-reconcile) | PR #69 @ `2119d4154c2c2e98cffa17d184012cc136cb3437` |
| Production tip / PRODUCTION_BEFORE | `e59205d7eccf0991e9a8a9b7be266cfeff831158` (PR #70) — **must not push/reset** |
| Production Firebase | **DEPLOYED** to `fresh-prints-prod`: `firestore:rules` + `functions:deleteEligibleUnapprovedDesign` |
| Studio 1.0.4 release | **370305556** **published** — tag `v1.0.4-e59205d`, commitish `e59205d7` |
| Owner dual-platform smoke | **PASS** (Windows + Mac arm64 + Mac x64) |
| Draft `369614747` | Historical anomaly / failed-smoke evidence — **do not restore** |
| Production fixtures (8 smoke) | **Already gone** (verified; cleanup APPLY idempotent) |
| Current work | Reconcile production lineage into development (`closeout/prod-into-development`) — **local only; push pending** |
| Phase 9 | **Parked** |
| Domain cutover | **Gated** until `APPROVE MYPRINTREQUEST.COM CUTOVER` |

### Diagnostic release cleanliness
Normal builds must **not** show the DIAGNOSTIC BUILD banner. Opt-in only via `VITE_FP_DERIVATIVE_LOCUS_DIAG=1` / intentional bake; default `PACKAGED_DERIVATIVE_LOCUS_DIAG=false`.

### Done
1. ~~Protected PR → `production`~~ **DONE** (PR #70 @ `e59205d7`)
2. ~~Prod Firebase deploy~~ **DONE**
3. ~~NEW 1.0.4 dual-platform draft + smokes~~ **DONE** — release `370305556`; smoke **PASS**
4. ~~Publish~~ **DONE** — `370305556` / `v1.0.4-e59205d`
5. ~~Fixture cleanup verify~~ **DONE** — already gone / idempotent

### Next
1. Finish overnight git consolidation (merge production → development lineage + unique docs evidence)
2. Authorize push/PR of closeout branch → `development` when ready
3. Keep Phase 9 parked; keep domain cutover gated

### Safety
- Do **not** push/reset `production` — PRODUCTION_BEFORE stays `e59205d7`
- Do **not** restore draft `369614747`
- Do **not** reopen Phase 9 or domain cutover without explicit owner phrases

