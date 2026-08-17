# Review: Portal GA4 production enablement

| Field | Value |
|-------|-------|
| Date | 2026-08-17 |
| Reviewer | Review Agent (Architecture, Security, Backend/App Hosting, Privacy-gate, Testing) |
| Plan | docs/workflow/plans/2026-08-17-portal-ga4-production-enablement-plan.md |
| Verdict | **approved_with_changes** |
| Goal | `portal-ga4-production-enablement` |

---

## Summary

The plan correctly treats this as production **enablement** of the already signed-off inert GA4 architecture, not a rewrite. Repo and live checks confirm the controller is present on `origin/production` (`f8acb26`) and currently inert (no YAML mapping, no Secret Manager secret, live HTML has no gtag). Human checkpoints A–D match DEPLOYMENT.md and the 2026-07-26 Owner Decisions. Implement must not start until git reconcilation is respected and Decision 7 is handled as a **collection blocker**, not a footnote.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Enablement only; cutover/TD-030/Functions/Ads/GTM out |
| Architecture alignment | pass | Reuses `features/analytics` + YAML/Secret Manager; no new library |
| Security impact addressed | pass | Public Measurement ID; production-only; sanitizer + EM off + 6c.4 hard gate |
| Data model impact addressed | pass | None |
| Backend impact addressed | pass | App Hosting secret + YAML BUILD/RUNTIME; no Functions/Rules |
| Test strategy adequate | pass | Regression unit tests + build + DebugView manual gate |
| Human checkpoints identified | pass | A property, B ID, C rollout, D QA; Decision 7 before B |
| Roadmap alignment | pass | Deferred `production-release` §3.6 / ROADMAP #5 live-ID leftover |
| Documentation plan | pass | DEPLOYMENT.md + workflow artifacts; no invented privacy ADR |
| No silent scope expansion | pass | Phase 10 / Ads / policy drafting excluded |

---

## Architecture Review

**Findings:**

- Current code matches the signed-off single-controller design: `layout.tsx` env-only config; `PortalAnalyticsBoundary` readiness handshake; `usePortalAnalyticsController` sole `gtag('config')` / `page_view` owner; `send_page_view: false`; advertising flags explicit `false`.
- Host gate remains `myprintrequest.com` / `www.` via `getPortalSiteOrigin` — independent of SEO indexing.
- Sanitizer still templates `/requests/:id` and `/share/design/:id`, drops `q` and `returnTo`.
- Plan correctly requires YAML mapping; Secret Manager alone will not inject `NEXT_PUBLIC_*` at Next.js build time.

**Required changes:**

- [x] Implement only from a branch based on `origin/production` (`f8acb26`). Do not mix the dirty `fix/td-030-share-qty-parity` tree or untracked cutover/Studio/tag-alias files into this goal’s commit/PR.
- [x] Treat Decision 6 as: EM OFF **before** first traffic → secret+YAML+authorized rollout → DebugView 6c.4. Do not wait to *set* the ID until after DebugView (circular). If 6c.4 BLOCKED, rollback immediately.

---

## Security Review

**Findings:**

- Measurement ID is public-by-design; still must not be committed, put in Firestore, or set on `fresh-prints-dev`.
- Historical Owner Decision 7 **blocks real production collection** until Privacy Policy / consent are reviewed. Formal Review of the 2026-07-26 plan (Finding 11) confirmed that. This review does **not** waive it and does **not** require drafting policy in-repo.
- 6c.4 remains two-outcome only: PASS or BLOCKED. No accepted raw automatic-event context.
- Enhanced Measurement must be fully OFF (Site search would leak `q` around the sanitizer).

**Required changes:**

- [x] Checkpoint B (`AUTHORIZE PROD GA4 MEASUREMENT ID`) is forbidden until owner records Decision 7 satisfaction **or** an explicit superseding product decision in chat/workflow state.

**Human approval needed before production:**

- [x] GA4 property/stream + Enhanced Measurement OFF
- [x] Decision 7 confirmation
- [x] Secret set + YAML
- [x] App Hosting rollout

---

## Data Model Review

**Findings:**

- No schema, status, or Firestore analytics events.

**Required changes:**

- [x] None

---

## Backend Review

**Findings:**

- Documented mechanism (`apphosting.yaml` `secret:` + `firebase apphosting:secrets:set`) is correct and matches Algolia/Firebase `NEXT_PUBLIC_*` pattern.
- BUILD + RUNTIME is required for Next.js inlining.
- Rollout command matches the TD-030 App Hosting record pattern.
- Rollback target `f8acb26` / `build-2026-08-17-001` is the current LIVE revision — correct as of this review.
- Agent must not deploy Functions/Rules/indexes/Algolia/Auth/DNS.

**Required changes:**

- [x] Create and grant the secret **before** merging YAML that references it, so an incidental App Hosting rebuild cannot fail on a missing secret.
- [x] Do not use Firebase Console env-only as the primary injection path.

---

## Testing Review

**Findings:**

- Existing analytics unit tests already cover sanitizer drops, host gate, inert config, controller de-dupe, thin script.
- Live verification cannot be automated here; DebugView checklist is the real gate.
- `npm run build:portal` is required because `NEXT_PUBLIC_*` is a build-time bake.

**Required changes:**

- [x] None beyond executing the plan’s automated + Checkpoint D manual lists honestly.

---

## Documentation Review

**Findings:**

- DEPLOYMENT.md still says GA4 unset — must update at Signoff/Implement, not by rewriting history of cutover.
- Cutover remains CLOSED; this plan does not reopen it.
- No GA4 ADR exists in DECISIONS.md; citing the 2026-07-26 Owner Decisions is correct unless Decision 7 is superseded.

---

## Required Changes (if approved_with_changes)

1. **Git:** No Implement commit until work is based on `origin/production`. Preserve all listed local modified/untracked files. Do not auto-FF `development`, reset, or stage unrelated paths.
2. **Decision 7:** Block Measurement ID apply (Checkpoint B) until owner confirms privacy/consent review **or** records a superseding decision. Do not draft a Privacy Policy in this goal.
3. **Secret-before-YAML-merge:** Secret exists + granted to `fresh-prints-portal` before merging the YAML mapping.
4. **6c.4:** After rollout, BLOCKED ⇒ rollback; no accepted residual leak on `first_visit` / `session_start` / `user_engagement`.
5. **No production mutation** until the matching owner phrase for that checkpoint.

---

## Blockers (if blocked)

None that stop **planning**. Implement/configure remains gated on the required changes and checkpoints above.

---

## Verdict Rationale

`approved_with_changes` rather than `approved` because (1) the working tree/`development` lag is a real mix-up risk after TD-030, and (2) Decision 7 is a historical production-collection blocker that this prompt must not quietly demote to a follow-up. Architecture, env mechanism, EM-off, and App Hosting sequencing are otherwise sound.

---

## Next Step

**Human checkpoint — do not enable GA4 yet.**

Owner must:

1. Confirm git reconcilation: leave current dirty branch as-is; later Implement from `origin/production`.
2. Complete **Checkpoint A** (create or confirm web stream for `https://myprintrequest.com`, Enhanced Measurement **fully OFF**).
3. Confirm **Decision 7** (privacy/consent for collection, or explicit supersede).

Then reply e.g. `GA4 STREAM READY` plus Decision 7 confirmation. Cursor will return Checkpoint B (exact secret/YAML steps) and still **not** mutate production until `AUTHORIZE PROD GA4 MEASUREMENT ID`.
