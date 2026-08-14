# Fresh Prints - Current State Snapshot

## 2026-08-13 — Studio 1.0.4 P4 corrective integrated toward development

| Item | Value |
|------|-------|
| Managed goal | `studio-1.0.4-ai-processing-preview-cleanup-corrective` |
| Root cause | Firestore Rules P4 authorization gap on derivative path persistence (`processing→imported` + canonical thumb/preview fell through expensive `designRequiredFieldsValid`) |
| Corrective | Narrow derivative completion Rules fast path + failure visibility + auto-AI handoff guard + Option B owner-only safe delete |
| Corrective branch | `fix/studio-1.0.4-ai-preview-cleanup-corrective` |
| Corrective HEAD | `9414aed4a5fefbd266648e3601e61af8ef363e10` (includes post-`5e0b072` QA UX: Processing Delete, instant list remove, diag OFF) |
| Prior frozen product commit | `5e0b072faab46e07a7011278e2c903f7513e77fa` |
| Owner DEV QA | **PASS** — import→derivatives→auto AI; permanent delete; immediate list remove; diagnostic banner OFF |
| DEV Firebase | `firestore:rules` + `functions:deleteEligibleUnapprovedDesign` deployed on **`fresh-prints-dev`** |
| Development | Integration branch `integrate/studio-1.0.4-corrective-into-development` (from `origin/development` @ `0605c6c`) — land via PR (direct push to `development` blocked) |
| Production | **NOT YET PROMOTED** for this corrective |
| Production fixtures (8 smoke) | Untouched — separate owner checkpoint after prod Function + corrected Studio |
| Draft `369614747` | Failed-smoke evidence only; **unpublished**; **untouched**; must **not** reuse — NEW dual-platform 1.0.4 draft required after prod |

### Required next phase
1. Land corrective on `origin/development`
2. Production promotion diff audit
3. Protected production PR (development lineage or clean promotion branch if unrelated drift)
4. Separately authorized production Firebase: `firestore:rules` + `functions:deleteEligibleUnapprovedDesign`
5. NEW Studio 1.0.4 dual-platform draft (not 369614747)
6. Windows + Mac arm64 + Mac x64 Big Sur smoke
7. Explicit publish authorization

### Diagnostic release cleanliness
Normal DEV/prod builds must **not** show:  
`DIAGNOSTIC BUILD — Firebase project fresh-prints-dev — derivative locus logging on — not a release candidate`  
Gated instrumentation may remain only if OFF by default (`PACKAGED_DERIVATIVE_LOCUS_DIAG=false`; no `VITE_FP_DERIVATIVE_LOCUS_DIAG=1`).

### Checkpoints
- `docs/workflow/reviews/2026-08-13-studio-1.0.4-p4-dev-qa-checkpoint.md`
- `docs/workflow/reviews/2026-08-13-studio-1.0.4-option-b-ui-discoverability-checkpoint.md`
- `docs/workflow/reviews/2026-08-13-studio-1.0.4-p4-derivative-completion-implementation-review.md`

---

## Prior: 2026-08-11 — Prefinal A–H + Track B Git promote (historical)

PR #57 merged to production; Storage Rules phrase was the prior Firebase gate. Superseded for current active work by the Studio 1.0.4 P4 corrective above — production Storage Rules / Track A remain separately gated historical items, not this corrective’s deploy matrix.
