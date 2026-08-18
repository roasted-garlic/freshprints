# Signoff: Portal GA4 event transmission corrective

| Field | Value |
|-------|-------|
| Date | 2026-08-17 |
| Signoff by | Signoff Agent |
| Plan | docs/workflow/plans/2026-08-17-portal-ga4-event-transmission-corrective-plan.md |
| Review | docs/workflow/reviews/2026-08-17-portal-ga4-event-transmission-corrective-review.md |
| Test report | docs/workflow/reviews/2026-08-17-portal-ga4-event-transmission-corrective-test-report.md |
| Final status | **approved** |
| Scope | **Implement + Test + DEV transport QA only** — production PR / deploy **not** performed |

---

## Summary

`portal-ga4-event-transmission-corrective` **Implement/Test work is complete and signed off.** Production GA4 @ `124c6fa` queued `config` and manual `page_view` but emitted **zero** `g/collect`. Corrective adds the standard `gtag('js', new Date())` bootstrap to `PORTAL_GA4_STUB_SCRIPT` only. Owner **DEV transport QA: PASS** confirms real transport (`g/collect` 204) with exactly one `page_view` on load and one on client navigation, sanitized params, no duplicates.

**Missing `gtag('js', new Date())` is now experimentally confirmed as the production transport defect.** Loader-aware `scriptReady` fallback was **not** implemented and is **not** required. Controller, service, sanitizer, and host gate are **unchanged**.

Historical `portal-ga4-production-enablement` Signoff and `PROD GA4 QA: PASS` remain on record; **collection conclusion superseded** — tag presence alone was insufficient.

**Production PR has NOT been created.** Next: independent pre-production review → owner-authorized production PR → App Hosting rollout → **production transport QA** (`g/collect`, DebugView, Realtime).

---

## Changes Delivered

### Behavior

- Stub enqueues `gtag('js', new Date())` once per document before controller `config` / `page_view`.
- Restores GA4 hit transport without moving config, events, routing, or sanitization into the script layer.
- Host gate, `send_page_view: false`, ads flags, sanitizer rules unchanged.

### Files Modified (app — goal scope)

| File | Change |
|------|--------|
| `apps/portal/features/analytics/components/PortalAnalyticsScript.tsx` | `gtag('js', new Date())` in stub |
| `apps/portal/features/analytics/components/PortalAnalyticsScript.test.ts` | Bootstrap regression tests |

### Files Created (workflow)

| File |
|------|
| `docs/workflow/plans/2026-08-17-portal-ga4-event-transmission-corrective-plan.md` |
| `docs/workflow/reviews/2026-08-17-portal-ga4-event-transmission-corrective-review.md` |
| `docs/workflow/reviews/2026-08-17-portal-ga4-event-transmission-corrective-test-report.md` |
| `docs/workflow/reviews/2026-08-17-portal-ga4-event-transmission-corrective-dev-transport-qa.md` |
| `docs/workflow/reviews/2026-08-17-portal-ga4-event-transmission-corrective-signoff.md` (this file) |

### Unchanged

- `usePortalAnalyticsController.ts`, `portalAnalyticsService.ts`, `portalAnalyticsSanitizer.ts`, `portalAnalyticsHostGate.ts`, `portalAnalyticsConfig.ts`, `PortalAnalyticsBoundary.tsx`
- App Hosting, Secret Manager, GA4 production stream/settings

---

## Implementation reference

| Item | Value |
|------|-------|
| Dirty implement checkout | `fix/td-030-share-qty-parity` @ `6a75998b7b0b144a8f0fc9cd0e73913e56567b38` (**not** PR source) |
| Production candidate | `fix/portal-ga4-event-transmission` based on `origin/production` @ `124c6fa` |
| Live production (pre-fix) | `124c6fa4ad3c86defa8fd61c578b3efeaf6609bb` / `build-2026-08-17-002` |
| **Production PR** | **NOT created** |

---

## Tests

### Automated

| Check | Result |
|-------|--------|
| Analytics unit tests | **83/83 PASS** |
| Portal typecheck | **PASS** |
| Portal build | **PASS** |
| Corrective lint | **PASS** |
| git diff --check (corrective files) | **PASS** |

### Manual

| Test | Result | Approved by |
|------|--------|-------------|
| Owner DEV transport QA (`g/collect`) | **PASS** | owner 2026-08-17 |
| Production transport QA | **pending** | after future rollout |

### DEV transport evidence (summary)

- Local TEST stream only (ID not recorded in Git); EM OFF
- Initial load: `g/collect` 204, `en=page_view`, `dp=/`, `dt=Discover`, exactly one hit
- Client nav to Catalog: additional `g/collect` 204, `dp=/catalog`, `dt=Catalog`, `dr=/`, exactly one additional hit
- No duplicate page_view

---

## Human Approvals Obtained

| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Production deploy | **not obtained** | | Signoff scope excludes deploy |
| Production PR | **not created** | | Awaiting pre-production review |
| App Hosting rollout | **not performed** | | |
| Secret Manager / GA4 prod settings | **not modified** | | |
| Owner DEV transport QA | **obtained** | 2026-08-17 | PASS |

---

## Secrets / env hygiene

| Check | Result |
|-------|--------|
| Test Measurement ID in tracked source | **None** |
| `.env.local` committed | **No** (gitignored) |
| Host gate weakened | **No** |

---

## Risks & Known Issues

| Item | Severity | Mitigation |
|------|----------|------------|
| Dirty checkout / mixed branch | medium | Production PR from **clean branch** with analytics-only diff |
| Production transport unverified until rollout | high | Mandatory post-rollout `g/collect` + DebugView + Realtime QA |
| Historical enablement QA superseded | low | Documented; original Signoff preserved |

---

## Deferred Items (Roadmap)

- Production PR + independent pre-merge audit
- App Hosting rollout authorization
- Production transport QA on `https://myprintrequest.com`
- Final corrective production Signoff after prod QA

---

## Open Blockers

- [ ] Production PR not yet created (expected — next phase)
- [ ] Production transport QA pending post-rollout

---

## Verdict

**approved** — Implement/Test scope complete. Automated checks pass. Owner DEV transport QA **PASS**. Causal hypothesis confirmed. Loader fallback not required. **No production PR, merge, or deploy in this Signoff.**

---

## Workflow Complete (Implement/Test goal)

- [x] Test report updated with owner PASS
- [x] Signoff document created
- [x] `.cursor/workflow/state.md` updated
- [x] Handoff `CURRENT-STATE.md` + `13-recent-completed-work.md` updated

**STOP — await independent pre-production review before production PR.**

**Recommended next action:** Independent pre-production audit of corrective diff vs `origin/production` → production PR on clean branch → owner merge authorization → App Hosting rollout → production transport QA.
