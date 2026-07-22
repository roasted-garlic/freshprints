# Signoff: #13 Portal public browse + login-gated actions (Addendum A)

| Field | Value |
|-------|-------|
| Date | 2026-07-20 |
| Signoff by | Signoff Agent |
| Plan | `docs/workflow/plans/2026-07-20-portal-public-browse-login-gated-actions-plan.md` (+ Addendum A) |
| Review | `docs/workflow/reviews/2026-07-20-portal-public-browse-login-gated-actions-review.md`, `…-addendum-a-review.md` |
| Test report | `docs/workflow/reviews/2026-07-20-portal-public-browse-login-gated-actions-test-report.md` |
| Manual QA | `docs/workflow/reviews/2026-07-20-portal-public-browse-login-gated-actions-manual-checkpoint.md` |
| Final status | **approved_with_notes** |

---

## Summary

Owner **PASS** (2026-07-20) closed the manual UI QA for Small Managed **#13**: public catalog browse without sign-in, guest chrome, in-shell dimmed auth overlay on gated routes, and login/register styling. Implement is complete in-repo (base #13 + Addendum A guest donate via Anonymous Auth + callables). Signoff is **approved_with_notes** because cloud guest browse/donate still needs Anonymous Auth enablement and Firestore/Storage rules + Functions deploy to `fresh-prints-dev` (not executed; no production).

---

## Changes Delivered

### Behavior
- Guests may view `/` and `/catalog/**` without signing in
- Mutation-primary routes stay gated; guests remain in app shell with dimmed overlay (Sign in / Register / Browse designs) — not bare `/login-required` as primary nav
- `/login` + `/register` share login-required card styling; Browse designs → catalog
- Guest chrome: Sign in / Register; Current Request hidden unless fully signed in
- Guest catalog donations (Addendum A): Anonymous Auth session + `guest` attribution sentinels; print-request uploads remain portal-customer only
- Firestore/Storage **public read** predicates for ready catalog (in repo; deploy deferred)

### Documentation Updated
- Plan + reviews + ADR-FP-106 (public browse / guest donate)
- ROADMAP #13 → Done (with deploy follow-up notes)
- Manual checkpoint + test report + this signoff

---

## Tests

### Automated
- Portal typecheck — **pass** (exit 0)
- Focused auth / rules-alignment units — **pass** (13 base; Addendum A focused **23 pass** per Decision Log)

### Manual
| Test | Result | Approved by |
|------|--------|-------------|
| Public browse + overlay + login/signup chrome + related guest UX | **PASS** | owner 2026-07-20 |
| Post-signoff polish (logout modal closes; header Login icon; guest hide Add to request; copy) | **PASS** | owner 2026-07-20 |
| Guest donate E2E / cloud rules probes | **superseded** | Guest donate retired; login-required donate product **PASS** 2026-07-21 |
| Login-required donate (registered) | **PASS** | owner 2026-07-21 (“works great; login gate fine”) |

---

## Human Approvals Obtained

| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Production deploy | not required | | Dev-only phase |
| Design / UX (guest chrome + overlay) | obtained | 2026-07-20 | Owner PASS |
| Anonymous Auth enable (console) | **pending follow-up** | | `fresh-prints-dev` |
| Rules + Functions deploy (`fresh-prints-dev`) | **PASS** (accepted live) | 2026-07-21 | Owner: live given #14 already deployed |
| Database migration | N/A | | |
| Secrets / env | N/A | | |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Public catalog rules / guest donate not live until deploy | medium | Owner enable Anonymous Auth + approve rules/Functions to `fresh-prints-dev`; then smoke guest donate |
| Anonymous Auth spam / UID rotation | low | Documented residual; App Check follow-up |
| #14 Recently Requested CF not deployed | medium (separate) | Deploy `onShowAllocationCreated` (+ indexes) — does not block #13 UI closeout |

---

## Deferred Items (Roadmap / follow-ups)

1. ~~Enable Firebase **Anonymous** Auth on `fresh-prints-dev`~~ — **no longer required** for donate (login-required amendment; ADR-FP-106)
2. Soft-deploy donation-path Functions — product donate **PASS** 2026-07-21; Function redeploy leftover **PASS** 2026-07-21 (owner: live given #14 already deployed)
3. Optional: public catalog permission probes after rules deploy (if rules not yet live)
4. **#14** (parallel): deploy `onShowAllocationCreated` for Recently Requested rail — still open
5. ~~Then default next backlog: **#12**~~ — **#12 Done** 2026-07-21 (proof-line soft-signoff)

---

## Open Blockers

- [x] None for workflow closeout (UI checkpoint resolved; deploy explicitly deferred)

---

## Verdict

**approved_with_notes** — Repo implementation + automated checks + owner UI **PASS** complete #13 for workflow purposes. Cloud guest browse/donate and #14 CF remain owner deploy follow-ups (no deploy this session).

---

## Workflow Complete

- [x] `.cursor/workflow/state.md` updated with `DONE: yes`
- [x] `ROADMAP.md` updated (#13 Done)
- [x] `references/project-chatgpt-handoff/CURRENT-STATE.md` updated
- [x] `references/project-chatgpt-handoff/13-recent-completed-work.md` updated
- [x] `03-roadmap-and-phases.md` / ADR note as applicable

**Recommended next action for user:** Enable Anonymous Auth on `fresh-prints-dev`, approve rules/Functions deploy (and optionally #14 `onShowAllocationCreated`), smoke guest donate — then start **#12** when ready.
