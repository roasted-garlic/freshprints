# Fresh Prints - Current State Snapshot

## 2026-08-15 — Studio 1.0.6 managed goal SIGNOFF — approved_with_notes (STOP before dispatch)

| Item | Value |
|------|-------|
| Managed goal | `studio-mac-autoupdate-signing-and-searchable-category-picker` — **product DONE** |
| Target | Studio **1.0.6** |
| Signoff | **approved_with_notes** — `docs/workflow/reviews/2026-08-15-studio-1.0.6-managed-goal-signoff.md` |
| Test | **passed_with_notes** @ `0951075` — `docs/workflow/reviews/2026-08-15-studio-1.0.6-release-readiness-test-report.md` |
| Release source | **`9f945f3`** (`origin/production`; contains tested candidate; product tree match) |
| A2 | **DECLINED indefinitely** — ADR-FP-136 |
| Mac | Ad-hoc / `internal-unsigned`; manual install supported; auto-update **install** unsupported |
| Windows | Automatic updates unchanged / supported |
| Next | Owner phrase → release dispatch only (draft). **No** Firebase/Portal/DNS/A2/publish in that phrase |
| Owner phrase | `AUTHORIZE STUDIO 1.0.6 RELEASE DISPATCH: STABLE INTERNAL-UNSIGNED FROM PRODUCTION 9f945f3` |
| Forbidden | Dispatch without phrase; reopen A2; claim Mac auto-update install fixed |
| Phase 9 | **PARKED** |

---

## 2026-08-15 — Studio 1.0.6 FreshForge Test — passed_with_notes (A2 declined)

| Item | Value |
|------|-------|
| Managed goal | `studio-mac-autoupdate-signing-and-searchable-category-picker` |
| Target | Studio **1.0.6** |
| Phase | **Signoff next** (Test complete) |
| Candidate SHA | `095107549069cddc18a754fa17f83047fe718472` (`origin/development`) |
| Production tip | `9f945f3` (PR #77; contains candidate; C-SHARED backend complete) |
| A2 | **DECLINED indefinitely** — ADR-FP-136; no paid Apple Program / `MAC_CSC_*` / notarization |
| Mac | Ad-hoc / `internal-unsigned`; auto-update **install** unsupported (open) |
| Windows | Automatic updates unchanged / supported |
| Test | `docs/workflow/reviews/2026-08-15-studio-1.0.6-release-readiness-test-report.md` → **passed_with_notes** |
| Automated | typecheck/lint/vite/functions + 148 focused tests exit 0 |
| Next | `Continue Workflow` → **Signoff only** |
| Forbidden | Dispatch/publish without Signoff + owner release phrase; reopen A2 |

---

## 2026-08-15 — Studio 1.0.6 C-SHARED Implement — Implementation Review approved_with_notes

| Item | Value |
|------|-------|
| Managed goal | `studio-mac-autoupdate-signing-and-searchable-category-picker` |
| Branch | `feature/studio-1.0.6-mac-signing-and-searchable-category` |
| Target | Studio **1.0.6** |
| C-SHARED | Shared Staff Gang Sheets implemented under Formal Review bindings |
| Impl review | `docs/workflow/reviews/2026-08-15-studio-1.0.6-workstream-c-shared-implementation-review.md` → **approved_with_notes** |
| Owner QA | `docs/workflow/reviews/2026-08-15-studio-1.0.6-workstream-c-shared-owner-qa-checklist.md` |
| Next | Owner-authorize DEV Rules/indexes/Functions redeploy → owner DEV QA → Test only after PASS |
| New callable | `createInitialStaffGangSheet` |
| Updated callable | `completeStaffGangSheetAndOpenNext` (shared N→N+1) |
| Forbidden | Test/Deploy without gates; production; reopen B/D |
| A2 | Still credential-gated |
| Phase 9 | **PARKED** |

---

## 2026-08-15 — Studio 1.0.6 C-SHARED Formal Review — approved_with_changes

| Item | Value |
|------|-------|
| Managed goal | `studio-mac-autoupdate-signing-and-searchable-category-picker` |
| Branch | `feature/studio-1.0.6-mac-signing-and-searchable-category` |
| Target | Studio **1.0.6** |
| Review | `docs/workflow/reviews/2026-08-15-studio-1.0.6-workstream-c-shared-staff-gang-sheets-plan-review.md` |
| Verdict | **approved_with_changes** |
| Next | `Continue Workflow` → **Implement** C-SHARED only (apply Review bindings) |
| Forbidden | Test/Deploy until implement + owner gates; reopen B/D; production |
| A2 | Still credential-gated |
| Phase 9 | **PARKED** |

---

## 2026-08-15 — Studio 1.0.6 Workstream C — Shared Staff Gang Sheets Plan amendment

| Item | Value |
|------|-------|
| Managed goal | `studio-mac-autoupdate-signing-and-searchable-category-picker` |
| Branch | `feature/studio-1.0.6-mac-signing-and-searchable-category` |
| Target | Studio **1.0.6** |
| Phase | **Plan amendment complete** — Formal **Review required** before implement |
| Plan | `docs/workflow/plans/2026-08-14-studio-mac-autoupdate-signing-and-searchable-category-picker-plan.md` (sections **C-SHARED-***) |
| C correction | Shared Staff Gang Sheets (no `assignedStaffUserId`); Studio label **Add to Show / Gang Sheet**; modal tabs Shows \| Staff Gang Sheet; eligibility **`studio_internal` only**; one Add Request; hide Staff timer **and** countdown; keep `upcomingShows`/`showAllocations` architecture |
| Next | `Continue Workflow` → **Review** C-SHARED amendment |
| Forbidden | Implement / Test / Deploy until Review approves |
| A2 | Still credential-gated (Apple + `MAC_CSC_*`) |
| Phase 9 | **PARKED** |

---

## 2026-08-15 — Studio 1.0.6 C+D Implement — Implementation Review approved_with_notes

| Item | Value |
|------|-------|
| Managed goal | `studio-mac-autoupdate-signing-and-searchable-category-picker` |
| Branch | `feature/studio-1.0.6-mac-signing-and-searchable-category` |
| C+D Implement | Staff Gang Sheets + AI Review left-rail background sync |
| Impl review | `docs/workflow/reviews/2026-08-15-studio-1.0.6-workstreams-c-d-implementation-review.md` → **approved_with_notes** |
| Callable | `completeStaffGangSheetAndOpenNext` (required — helper create blocked by Rules) |
| Index | `upcomingShows` source+assignedStaffUserId+productionStatus (not deployed) |
| Next | Owner DEV QA (authorize DEV Rules/Functions/indexes first if needed); A2 still credential-gated |
| Signoff | **not** complete |
| Phase 9 | **PARKED** |

---

## 2026-08-14 — Studio 1.0.6 C+D Review — approved_with_changes

| Item | Value |
|------|-------|
| Managed goal | `studio-mac-autoupdate-signing-and-searchable-category-picker` |
| C+D Review | `docs/workflow/reviews/2026-08-14-studio-1.0.6-workstreams-c-d-plan-amendment-review.md` |
| Verdict | **approved_with_changes** |
| Key C decisions | Optional `whatnotShowId` (no synthetic); ALLOW `studio_internal`+`studio_customer`; DENY `portal_customer`; Rules assignment; service TX; open-lane index only if queried |
| D | Approved — wire `artworkBackgroundHex` into left queue thumbs |
| A/B | Prior bindings unchanged |
| Next | `Continue Workflow` → Implement C/D (A2 still credential-gated; B DEV QA independent) |
| Phase 9 | **PARKED** |

---

## 2026-08-14 — Studio 1.0.6 Plan amended (C+D) — REVIEW PENDING

| Item | Value |
|------|-------|
| Managed goal | `studio-mac-autoupdate-signing-and-searchable-category-picker` |
| Plan | Amended: `docs/workflow/plans/2026-08-14-studio-mac-autoupdate-signing-and-searchable-category-picker-plan.md` |
| Target | Studio **1.0.6** (unchanged) |
| A | Mac signing — A1 done; A2 credential-gated; prior Review binding |
| B | Searchable Category — implemented; owner DEV QA pending |
| C | **Staff Gang Sheets** — Plan amendment only; reuse `upcomingShows`+`showAllocations`; Review required |
| D | **AI Review left-rail background sync** — Plan amendment only; renderer prop wiring; Review required |
| Next | `Continue Workflow` → Review C+D amendment (do not implement C/D yet) |
| Phase 9 | **PARKED** |

---

## 2026-08-14 — Studio Mac auto-update signing + searchable category picker — IMPLEMENT SLICE

| Item | Value |
|------|-------|
| Managed goal | `studio-mac-autoupdate-signing-and-searchable-category-picker` |
| Branch | `feature/studio-1.0.6-mac-signing-and-searchable-category` |
| Phase | **Implement authorized slice complete** — Implementation Review `approved_with_notes` |
| Studio version | **`1.0.6`** (package.json + finalize pin); Mac still ad-hoc until A2 |
| Workstream B | Searchable Category — **ready for owner DEV QA** |
| Workstream A1 | Install-phase updater error UX — **implemented / tested** |
| Workstream A2 | Developer ID signing — **blocked on Apple cert + `MAC_CSC_*` secrets** |
| Notarization | **Deferred** (unless secrets ready at A2 checkpoint) |
| QA checklist | `docs/workflow/reviews/2026-08-14-studio-searchable-category-picker-owner-qa-checklist.md` |
| Impl review | `docs/workflow/reviews/2026-08-14-studio-mac-autoupdate-signing-and-searchable-category-picker-implementation-review.md` |
| Next | Owner DEV QA → Apple signing checkpoint → A2 |
| Phase 9 | **PARKED** |

---

## 2026-08-15 — Studio AI Review reprocess local reconciliation — CLOSED

---

## 2026-08-15 — Studio AI Review reprocess local reconciliation — CLOSED

| Item | Value |
|------|-------|
| Managed goal | `studio-ai-review-reprocess-local-reconciliation` — **DONE** |
| Signoff | **approved** — `docs/workflow/reviews/2026-08-14-studio-ai-review-reprocess-local-reconciliation-signoff.md` |
| Owner | Manual QA **PASS**; confirmed fixed |
| Implementation | `81613fa5bb76e30858d5e98c32f5131524ca2838` |
| PR | **#75** merged (`development` → `production`) |
| Production tip | `da5304e8634315ab8be99dedfe6cca18213d067a` |
| Studio release | [`v1.0.5`](https://github.com/roasted-garlic/freshprints/releases/tag/v1.0.5) — workflow [31857034677](https://github.com/roasted-garlic/freshprints/actions/runs/31857034677) success |
| Behavior | Reprocess stays on Needs Review/Rejected; immediate local reconcile; no auto-navigate to Processing |
| Phase 9 | **PARKED** — untouched |
| Working branch | `development` @ `7ac1c4e…` tracking `origin/development` |

---

## 2026-08-14 — Studio Design Library archive/restore/companion — CLOSED

| Item | Value |
|------|-------|
| Managed goal | `studio-design-library-archive-restore-reconciliation` — **DONE** |
| Signoff | **approved** |
| Production SHA (1.0.4) | `061185c8b9f47d5a6bce56c4f280f1e823b7985c` |
| Studio release | **370746562** / [`v1.0.4`](https://github.com/roasted-garlic/freshprints/releases/tag/v1.0.4) |
| Phase 9 | **PARKED** |

---

## 2026-08-13 — Repository consolidation residual closeout (historical)

| Item | Value |
|------|-------|
| Phase 9 | **PARKED** |
| Signoff | `docs/workflow/reviews/2026-08-13-repository-consolidation-development-sync-and-cleanup-signoff.md` |
