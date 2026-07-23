# Signoff: Portal FAQ and How To

| Field | Value |
|-------|-------|
| Date | 2026-07-23 |
| Signoff by | Signoff Agent |
| Plan | docs/workflow/plans/2026-07-22-portal-how-to-faq-plan.md |
| Review | docs/workflow/reviews/2026-07-22-portal-how-to-faq-review.md; docs/workflow/reviews/2026-07-23-portal-faq-how-to-settings-review.md |
| Test report | docs/workflow/reviews/2026-07-23-portal-how-to-faq-test-report.md |
| Manual QA | docs/workflow/reviews/2026-07-23-portal-how-to-faq-manual-checkpoint.md |
| Final status | **approved_with_notes** |

---

## Summary

Delivered public Portal `/help` (**FAQ and How To**) with Studio Settings CMS for live FAQs and How To videos (Firestore `settings/portalHelp`, ADR-FP-117 / ADR-FP-118). Nav label **Help**; page H1 / SEO title **FAQ and How To**. Real customer FAQ copy (buy-yourself + Whatnot where relevant; no em dashes); empty videos → **Coming soon**. Seeded 8 FAQs to `fresh-prints-dev`. Owner manual QA **PASS** 2026-07-23; commit and push authorized. Next queued goal: `portal-google-analytics` (not started).

---

## Changes Delivered

### Behavior

- **Public `/help`:** Guest-browsable under Portal shell; accordion FAQs; How To video embeds (YouTube/Vimeo) or **Coming soon** when `videos` empty.
- **Nav vs title:** Sidebar/nav **Help**; H1 and document title **FAQ and How To**.
- **Studio CMS:** Settings → **FAQ and How To**; owner/admin save via `updatePortalHelpSettings`; collapsible editors (collapsed by default / after Save).
- **Fallbacks:** Empty FAQ list → bundled defaults; empty videos → Coming soon (never dummy video slots).
- **Copy:** Dedicated buy-yourself FAQ; Whatnot in limits modal and relevant FAQs; no em dashes in Q/A.
- **UX:** Floating theme picker hidden on `/help`.
- **Dev seed:** `functions/scripts/seed-portal-help-faqs.ts` wrote `settings/portalHelp` on **fresh-prints-dev** (8 FAQs, `videos: []`).

### Files Created (representative)

- `apps/portal/app/(app)/help/` + `features/help/` + `styles/help.css`
- Studio `PortalHelpSettingsSection` / hook / service
- `packages/shared` portal help constants + video embed URL helpers
- `functions/src/updatePortalHelpSettings.ts` + `functions/scripts/seed-portal-help-faqs.ts`
- Workflow plan / reviews / test / manual / this signoff

### Files Modified (representative)

- Portal sidebar, public browse path, providers (theme picker), limits modal copy
- Studio Settings page + settings CSS
- `firestore.rules`, `functions/src/index.ts`
- ARCHITECTURE / DATA_MODEL / BACKEND / DEPLOYMENT / ROADMAP / DECISIONS (ADR-FP-117, ADR-FP-118)

### Documentation Updated

- ADR-FP-117 / ADR-FP-118; ROADMAP item 2 → Done
- Manual checkpoint **PASS**; this signoff **approved_with_notes**
- Handoff `CURRENT-STATE.md` + `13-recent-completed-work.md` (+ roadmap handoff as needed)

---

## Tests

### Automated

- Unit (portalHelpSettings + portalVideoEmbedUrl + portalHelpMeta + printRequestWorkingRequestMax): pass (prior session)
- Portal typecheck: pass (prior)
- Seed dry-run + live seed to `fresh-prints-dev`: exit 0
- Studio typecheck: pre-existing tsconfig failure documented (not claimed pass)

### Manual

| Test | Result | Approved by |
|------|--------|-------------|
| Portal `/help` guest + signed-in UX | **PASS** | Owner 2026-07-23 |
| Nav **Help** vs H1 **FAQ and How To** | **PASS** | Owner 2026-07-23 |
| FAQ copy / buy-yourself / no em dashes | **PASS** | Owner 2026-07-23 |
| Coming soon videos | **PASS** | Owner 2026-07-23 |
| Studio seeded FAQs + edit propagates | **PASS** | Owner 2026-07-23 |
| Limits modal Whatnot | **PASS** | Owner 2026-07-23 |

---

## Human Approvals Obtained

| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Production deploy | not required | 2026-07-23 | Dev seed + soft-deploy only; no production Firebase |
| Database migration | N/A | | Doc write to `settings/portalHelp` on dev |
| Design / UX | obtained | 2026-07-23 | Owner PASS (commit and push) |
| Business / policy | obtained | 2026-07-23 | FAQ / buy-yourself / Whatnot copy via owner follow-ups |
| Secrets / env | not required | | |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| How To videos still **Coming soon** until owner adds real URLs | low | Studio CMS ready; add videos when available |
| Production `settings/portalHelp` not seeded | medium | Seed / publish at `production-release` |
| Studio typecheck pre-existing failure | low | Documented; do not claim fixed |
| SEO foundations work may still be uncommitted alongside this goal | low | Commit scoped to FAQ/How To; leave unrelated dirty files unstaged |

---

## Deferred Items (Roadmap)

- `portal-google-analytics` (next queued; **not started**)
- `production-release`
- Real How To video URLs when ready

---

## Open Blockers

- [x] None

---

## Verdict

**approved_with_notes** — Owner **PASS** closes manual QA. Automated Portal checks passed earlier; Studio typecheck pre-existing failure noted. Notes: videos Coming soon until CMS content; production seed deferred; no GA / no production deploy in this phase.

---

## Workflow Complete

- [x] `.cursor/workflow/state.md` updated with `DONE: yes`
- [x] `ROADMAP.md` updated
- [x] `RISK_REGISTER.md` updated if needed — no new register entry required
- [x] `references/project-chatgpt-handoff/CURRENT-STATE.md` updated
- [x] `references/project-chatgpt-handoff/13-recent-completed-work.md` updated

**Recommended next action for user:** When ready, start `portal-google-analytics` (plan → review → APPROVE IMPLEMENTATION). Do not start until intentionally queued.

