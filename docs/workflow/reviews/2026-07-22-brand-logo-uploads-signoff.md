# Signoff: Brand logo uploads (Studio + Portal)

| Field | Value |
|-------|-------|
| Date | 2026-07-22 |
| Signoff by | Signoff Agent |
| Plan | docs/workflow/plans/2026-07-22-brand-logo-uploads-plan.md |
| Review | docs/workflow/reviews/2026-07-22-brand-logo-uploads-review.md |
| Test report | docs/workflow/reviews/2026-07-22-brand-logo-uploads-test-report.md |
| Manual checkpoint | docs/workflow/reviews/2026-07-22-brand-logo-uploads-manual-checkpoint.md |
| Final status | **approved_with_notes** |

---

## Summary

Owner-uploaded Studio and Portal brand logos (full + collapsed) from Studio Settings, with AR-locked display size boxes, Storage finalize callable, and runtime resolution in both apps. Soft-deployed to **fresh-prints-dev** only. Owner manual **PASS** 2026-07-22 after header/sidebar sizing and chrome fixes. Production Functions/rules/storage deploy intentionally **not** done.

---

## Changes Delivered

### Behavior
- Studio Settings → **Brand logos**: four PNG slots (Studio/Portal × full/collapsed); upload, clear, preview
- Firestore `settings/brandLogos` + Storage `brand/{app}/{slot}/…`; owner write via Storage create + `finalizeBrandLogoSlot` (Admin-derived metadata/URL)
- Display sizes via `updateBrandLogoDisplaySizes`: Portal header, Portal sidebar (expanded), Portal sidebar collapsed, Portal auth; Studio sidebar / collapsed / login — W×H aspect-locked; header and expanded sidebar are **separate** controls with matching **defaults** (height 52)
- Studio `AppLogo` + Portal `PortalLogo` prefer uploaded URL; fall back to bundled/`public` assets
- Soft-deployed to fresh-prints-dev: `finalizeBrandLogoSlot`, `updateBrandLogoDisplaySizes`, `getPortalGlobalOpenGraph`, Firestore + Storage rules
- Session polish (same goal): guest mobile header Login hide + bottom nav guest bar; logo flash fix (localStorage cache + hide until settings ready); sidebar height-only sizing (no letterbox under max-width / collapsed CSS clamps)
- Portal OG brand-logo mode prefers uploaded Portal full HTTPS URL when set

### Adjacent note (same session / branch; not in brand-logo plan)
- Studio Design Library `createdAt` desc enforcement (service fetch / loadAll / grid) — out-of-band QA fix while testing on `feature/brand-logo-uploads`

### Files Created (representative)
- `packages/shared/src/constants/brand/*` (+ tests)
- `functions/src/finalizeBrandLogoSlot.ts` (and related size-update callable wiring)
- Studio Brand logos Settings section + Portal brand logo service/hook
- Workflow plan, review, test report, manual checkpoint, this signoff

### Files Modified (representative)
- `firestore.rules`, `storage.rules`, Functions `index` / OG
- Studio settings + `AppLogo`; Portal `PortalLogo`, shell/header/sidebar CSS
- Docs: `DATA_MODEL.md`, `BACKEND.md`, `DEPLOYMENT.md`, `DECISIONS.md` (ADR-FP-114)

### Documentation Updated
- Architecture/data/backend/deploy docs + ADR-FP-114
- Workflow artifacts under `docs/workflow/`

---

## Tests

### Automated
- Brand logo helpers: 5/5 pass
- Storage rules alignment: 4/4 pass (includes brand path)
- Full monorepo typecheck / lint / build / emulator rules / E2E: not run (documented)

### Manual
| Test | Result | Approved by |
|------|--------|-------------|
| Studio + Portal brand logos, display sizes, guest chrome | **PASS** | human (2026-07-22) |

---

## Human Approvals Obtained
| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Implementation (isolated branch) | obtained | 2026-07-22 | Owner APPROVE IMPLEMENTATION |
| Soft-deploy fresh-prints-dev | obtained / performed | 2026-07-22 | Includes mid-session `updateBrandLogoDisplaySizes` after Save "internal" |
| Manual UI / UX | obtained | 2026-07-22 | Owner **PASS** |
| Production Functions / Firestore / Storage deploy | **not obtained / not performed** | | Separate gated follow-up |
| Database migration | not required | | Settings doc + Storage objects only |
| Business / policy | not required | | |
| Secrets / env | not required | | |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Production rules/Functions/Storage not deployed | medium | Owner must explicitly **APPROVE** production deploy when ready; until then prod still uses static logos / old rules |
| Soft-deploy is fresh-prints-dev only | low | Documented; re-run deploy command if another machine needs callables |
| Portal default preview placeholders / polish | low | If any Settings empty-state preview still looks generic, optional polish outside this signoff |
| Full typecheck/lint/build not re-run this slice | low | Focused unit tests + owner PASS; re-run before production merge if desired |
| Concurrent branch merge with other goals | low | Merge carefully vs shared Functions/rules/docs |

---

## Deferred Items (Roadmap)
- **Production** deploy of Functions (`finalizeBrandLogoSlot`, `updateBrandLogoDisplaySizes`, `getPortalGlobalOpenGraph` as needed), Firestore rules, Storage rules — human-gated
- Favicons / splash logos (explicitly out of plan scope)
- B4 / Wave C Firestore efficiency (parked elsewhere)

---

## Open Blockers
- [x] None for this goal (manual PASS recorded; production deploy is follow-up, not a blocker to signoff)

---

## Verdict

**approved_with_notes** — Owner manual PASS; automated focused tests passed; soft-deploy to fresh-prints-dev complete; production deploy and favicon/splash remain out of scope / gated.

---

## Workflow Complete
- [x] `.cursor/workflow/state.md` updated with `DONE: yes`
- [x] `ROADMAP.md` updated (active goal closed note)
- [x] `RISK_REGISTER.md` — not required (prod deploy already gated in plan/ADR)
- [x] `references/project-chatgpt-handoff/CURRENT-STATE.md` updated
- [x] `references/project-chatgpt-handoff/13-recent-completed-work.md` updated
- [x] Handoff `03`, `04`, `07`, `12` refreshed for brand logos / ADR-FP-114

**Recommended next action for user:** Merge or continue on `feature/brand-logo-uploads` as desired; when ready for live prod logos, reply **APPROVE** production deploy of Functions + Firestore/Storage rules (separate checkpoint). Await next managed goal otherwise.
