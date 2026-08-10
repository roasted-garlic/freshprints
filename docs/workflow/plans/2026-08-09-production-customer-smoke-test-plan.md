# Plan: Production customer smoke test (Stage 2 readiness)

| Field | Value |
|-------|-------|
| Date | 2026-08-09 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | Goal #13 `production-release` Stage 2; `docs/standards/DEPLOYMENT.md` Steps 10–11 |
| Managed goal | `production-customer-smoke-test` |

---

## Goal

Run a **read-only / customer-safe** production smoke of the live Fresh Prints Portal to decide whether the app is ready for real customers on the **hosted.app** URL (domain cutover still deferred). Produce an explicit verdict: **READY FOR CUSTOMERS** / **READY WITH NOTES** / **BLOCKED**. If READY (or READY WITH NOTES that are non-blocking), prepare the next human checkpoint for **`APPROVE MYPRINTREQUEST.COM CUTOVER`** without executing cutover.

## Background

Repository closeout and Algolia production enable (Gates A–C) are complete. Live Portal traffic is **100%** on `build-2026-08-09-001` @ tip `f5c0bdb` with managed search ON (`Z1FVCM5QUX` / `portal_catalog_ready_prod`). Goal #13 Stage 2 (domain-independent hosted.app smoke + readiness) remains the next production-release gate per `DEPLOYMENT.md`. `myprintrequest.com` cutover is explicitly **out of scope** until after this readiness gate.

## Scope

### In Scope

- Automated HTTP / traffic / Functions presence checks against production (read-only).
- Owner manual QA of the critical customer journey on:
  `https://fresh-prints-portal--fresh-prints-prod.us-central1.hosted.app`
- Verify: Portal load, registration/login, catalog browse/search/filter, design details, Add to Request, Current Request, sizing/DPI, customer artwork upload, submit/add to show, My Print Requests / progress, basic mobile sanity, no obvious dev-project leakage or production errors.
- Document launch blockers vs notes (including known **TD-032** polish).
- Record verdict; if ready, draft next cutover-approval checkpoint phrase only.

### Out of Scope

- Any application code changes (defect → document → separate plan).
- Firebase deploys, App Hosting rollouts, Algolia reconcile/mutation.
- Rules / index changes, migrations, backfills.
- DNS / custom-domain / Authorized Domains / `MyPrintRequest.com` cutover.
- Reopening completed Gates 1–7 or Algolia A–C.

---

## Affected Areas

### Files / Modules (expected)

- Workflow artifacts only under `docs/workflow/plans/`, `docs/workflow/reviews/`
- `.cursor/workflow/state.md`, `references/project-chatgpt-handoff/CURRENT-STATE.md`
- Optional light roadmap note after verdict (no product behavior change)

### Architecture Impact

- [x] None (QA / docs only)

### Security Impact

- [x] Details: owner may use existing test/customer accounts; no secret values in chat; no production mutation by agent; privacy boundaries checked in manual QA (own requests only).

### Data Model Impact

- [x] None

### Backend Impact

- [x] Details: read-only observation of live Functions / App Hosting traffic; no deploy.

### UI / UX Impact

- [x] Details: manual owner QA of live Portal UX; no UI code changes.

### Migration Impact

- [x] None

---

## Approach

1. **Plan + Formal Review** (this docs-only phase) — approve QA-only scope.
2. **Automated read-only checks** (agent): hosted.app route HTTP 200s; traffic 100% on `build-2026-08-09-001`; Algolia app/index markers in client chunks (prod index, not `_dev`); HTML Firebase project `fresh-prints-prod`; key callable/trigger Functions listed; note `myprintrequest.com` remains pre-cutover (deep routes not expected to serve Portal).
3. **Owner manual QA checklist** — full customer journey on hosted.app only.
4. **Stop** for owner reply phrase.
5. On result: write smoke result + readiness verdict; update state/handoff; if READY / READY WITH NOTES (non-blocking), prepare cutover checkpoint doc/phrase **without** executing cutover.

---

## Test Strategy

### Automated

| Check | Command / method | Required |
|-------|------------------|----------|
| Typecheck / lint / unit / build | N/A — no code change | no |
| Hosted.app HTTP routes | `Invoke-WebRequest` against production URL | yes |
| App Hosting traffic | `gcloud run services describe …` | yes |
| Algolia bake-in (chunks) | Scan `/_next/static` for `Z1FVCM5QUX` + `portal_catalog_ready_prod` | yes |
| Dev leakage (HTML) | HTML must show `fresh-prints-prod`; no `.dev` host as active site meta | yes |
| Functions list (presence) | `firebase functions:list --project fresh-prints-prod` | yes |
| Custom domain deep routes | Observe only — **not** a Stage 2 pass/fail | note only |

### Manual

- [x] Full customer journey owner QA (see checklist doc)
- Environment: production Portal **hosted.app** (not custom domain)
- Use existing safe test/customer accounts; avoid destructive admin actions

---

## Human Checkpoints Anticipated

- [x] Manual UI/UX / customer-journey QA on production hosted.app
- [ ] Business readiness verdict confirmation after QA
- [ ] Later (not this phase): `APPROVE MYPRINTREQUEST.COM CUTOVER`

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Owner exercises write paths (submit request) on prod | Medium | Use known test account; prefer reversible / expected customer actions only |
| False FAIL on `myprintrequest.com` deep 404s | High if mis-scored | Score Stage 2 against hosted.app only; domain is separate gate |
| TD-032 treated as launch blocker | Low | Already deferred polish; note only unless worse |
| Auth / permission failures | High | Block readiness until fixed via separate plan |

---

## Rollback Plan

N/A — no production mutations in this phase. If QA finds blockers, verdict = **BLOCKED**; fix via new managed goal.

---

## Documentation Updates Required

- [ ] Other: smoke automated record, owner QA checklist, result/verdict after owner reply; state + CURRENT-STATE; optional ROADMAP Stage 2 note after verdict

---

## Open Questions

- [x] None blocking plan — owner QA supplies pass/fail evidence

---

## Approval

- Review doc: `docs/workflow/reviews/2026-08-09-production-customer-smoke-test-review.md`
- Verdict: pending
