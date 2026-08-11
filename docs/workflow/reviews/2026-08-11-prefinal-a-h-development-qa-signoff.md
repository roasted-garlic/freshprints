# Signoff: Prefinal A–H development QA (`fresh-prints-dev`)

| Field | Value |
|-------|-------|
| Date | 2026-08-11 |
| Signoff by | Signoff Agent |
| Plan | `docs/workflow/plans/2026-08-11-prefinal-a-h-development-qa-integration-plan.md` |
| Amendment | `docs/workflow/plans/2026-08-11-portal-bulk-upload-preview-quota-amendment-plan.md` |
| Review | `docs/workflow/reviews/2026-08-11-prefinal-a-h-development-qa-integration-plan-review.md` |
| Test report | `docs/workflow/reviews/2026-08-11-prefinal-a-h-development-qa-checklist.md` |
| Final status | **approved_with_notes** |

---

## Summary

Owner completed Prefinal A–H local DEV QA against `fresh-prints-dev` on branch `qa/prefinal-a-h-dev` and replied **`DEV A-H QA: PASS`**.

During QA, owner-requested fixes were applied and re-verified (catalog mobile filters, Studio Algolia search refresh, Portal bulk-upload preview/quota, Studio OG static preview, intake badge cleanup). Production remains **untouched** and **blocked** pending a separate promote decision.

---

## Changes Delivered

### Behavior (A–H integrate + DEV deploy)
- Portal search `prefixLast` + URL race fixes (A+B)
- Global OG static image + immediate OG (C+D) — Storage Rules + Functions on DEV
- Staff-review timing for intake Pending (E)
- Donation day quota charge/refund semantics (F3) — Functions on DEV
- About/FAQ purchase wording (G)
- Studio Design Library intake query/perf (H)

### QA amendments (same branch / DEV)
- Portal catalog sticky search + mobile Filters sheet (full-height, collapsed category list)
- About first-visit modal desktop polish
- Studio managed search: refetch + consistency filter after tag edits
- Portal bulk upload: preview fetch throttle; charge-on-ready; remove/abandon restore quota; live quota refresh on Remove
- Studio social sharing: constrained static OG preview + pre-save Design Library preview
- Studio Uploaded/Donated intake: removed redundant Uploaded/Custom pills

### Documentation Updated
- `docs/architecture/DATA_MODEL.md` (donation charge-on-ready)
- Amendment plan + this signoff + checklist PASS record
- Workflow state + ChatGPT handoff CURRENT-STATE / recent work

---

## Tests

### Automated (integrate session)
- Focused suite **65/65** PASS
- Portal / Studio / Functions typecheck PASS
- `git diff --check` docs whitespace only (noted)

### Manual
| Test | Result | Approved by |
|------|--------|-------------|
| Prefinal A–H DEV QA checklist | **PASS** | owner (`DEV A-H QA: PASS`) |
| Catalog mobile Filters / sticky search | PASS (during QA) | owner |
| Studio Algolia stale tag search | PASS (after fix) | owner |
| Portal bulk upload + live quota on remove | PASS | owner |
| Studio static OG preview size + library pick preview | PASS | owner |

---

## Human Approvals Obtained

| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| DEV integrate + DEV deploy Prefinal A–H | obtained | 2026-08-11 | `APPROVE DEV INTEGRATION + DEV DEPLOY: PREFINAL A-H QA` |
| Owner DEV A–H QA | obtained | 2026-08-11 | `DEV A-H QA: PASS` |
| Production merge / App Hosting / Studio 1.0.3 | **not obtained** | — | Explicitly blocked |
| Permanent `development` merge | **not obtained** | — | Owner decision still required |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| QA amendments uncommitted / ahead of last integrate tip | Medium | Commit + push `qa/prefinal-a-h-dev` before any promote |
| Production promote not started | Expected | Separate owner phrase for merge/deploy/Studio package |
| `finalizeCustomerUpload` charge-on-ready already on DEV | Low | Include in any prod Functions wave |
| **Global OG Static letterbox (post-PASS defect)** | **Cleared on DEV** | Owner `DEV STATIC OG LETTERBOX QA: PASS` (2026-08-11). Signoff: `2026-08-11-prod-legacy-pending-and-og-static-letterbox-signoff.md`. Prod APPLY for legacy Pending and A–H promote remain separately gated. |

---

## Scope amendment (2026-08-11, post-PASS)

**Historical record:** Owner `DEV A-H QA: PASS` remains valid for the A–H scope exercised in that checklist (search, intake timing, quota, About/FAQ, Studio H, etc.), including Studio **preview** sizing for Static OG in Settings.

**Not covered by that PASS:** Crawler-facing Global OG Static Image letterbox parity on non-design URLs (`getPortalGlobalOpenGraph` → letterboxed `getPortalOgShareImage`). That defect was identified afterward and requires its own amended DEV acceptance (Facebook Scrape Again on `https://myprintrequest.dev/` for Design Library Static + Uploaded Static).

**Pre-prod:** Track B Static letterbox DEV blocker is **cleared** (`DEV STATIC OG LETTERBOX QA: PASS`). A–H production promotion and Track A prod APPLY remain **separately owner-gated**.

---

## Deferred Items (Roadmap)

- Production promotion of Prefinal A–H (+ QA amendments)
- Studio 1.0.3 package (blocked until promote path approved)
- Permanent `development` merge decision (owner)

---

## Open Blockers

- [x] None for **DEV QA closeout**
- [ ] Production promote still owner-gated (not a QA blocker)

---

## Verdict

**approved_with_notes** — Owner `DEV A-H QA: PASS` closes the Prefinal A–H development QA phase. Notes: QA amendments landed on the QA branch and must be committed before promote; production remains blocked.

---

## Workflow Complete

- [x] `.cursor/workflow/state.md` updated with `DONE: yes`
- [x] `ROADMAP.md` updated
- [x] **`references/project-chatgpt-handoff/CURRENT-STATE.md` updated**
- [x] `references/project-chatgpt-handoff/13-recent-completed-work.md` updated

**Verdict note (amended):** Historical `DEV A-H QA: PASS` stands for original A–H scope. Static Global OG letterbox was discovered afterward and later cleared on DEV (`DEV STATIC OG LETTERBOX QA: PASS`). A–H promote and Track A prod APPLY remain separately gated.

**Recommended next action for user:** Commit/push work on `qa/prefinal-a-h-dev`, then decide A–H production promote and/or Track A prod dry-run→APPLY with explicit phrases.
