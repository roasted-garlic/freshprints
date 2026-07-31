# Formal Review: Production Portal registration stuck plan

| Field | Value |
|-------|-------|
| Date | 2026-07-31 |
| Reviewer | Review Agent (independent pass) |
| Plan | `docs/workflow/plans/2026-07-31-production-portal-registration-stuck-plan.md` |
| Incident | `docs/workflow/reviews/2026-07-31-production-portal-registration-stuck-incident.md` |
| Verdict | **approved_with_changes** |

---

## Summary

The Plan correctly scopes a production Auth registration blocker after Stage 1, preserves
fixtures and Class D Storage closure, and separates client hang-prevention from evidence-gated
Auth configuration changes. Independent verification confirms repository paths, Auth-only orphan
state, deployed prod Firebase config, Authorized Domains including hosted.app, ACTIVE
`registerCustomer` with no 2026-07-31 invocations, and that the stuck overlay is owned by
`CompleteProfileForm`. Implementation must not start until the listed changes and Phase 1
approval phrase are satisfied; Auth Console / data actions remain separately gated.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Branding/Stage 2/Storage/fixtures excluded |
| Architecture alignment | pass | Service-layer callable retained |
| Security impact addressed | pass | Sanitized errors; no token logging; production Auth gates |
| Data model impact addressed | pass | Resume via existing `registerCustomer`; no schema change |
| Backend impact addressed | pass | Functions change only if evidence requires |
| Test strategy adequate | pass | Automated + hosted.app manual; hang cases included |
| Human checkpoints identified | pass | Separate phrases per action class |
| Roadmap alignment | pass | Goal #13 Phase G blocker before brand/Stage 2 |
| Documentation plan | pass | Incident + plan + state updates |
| No silent scope expansion | pass | No brand/fixture/Storage bundling |

---

## Architecture Review

**Findings:**

- Traced path matches Plan: Google popup → missing profile → `/complete-profile` →
  `completeCustomerProfile` → `registerCustomer`.
- Single Firebase app in `apps/portal/lib/firebase/client.ts` verified.
- Email register overlay uses different copy (“Signing you up…”); stuck strings are
  complete-profile only — Plan’s method classification is sound.

**Required changes:**

- [ ] None for architecture boundaries.

---

## Security Review

**Findings:**

- Read-only inventory correctly avoids tokens/secrets.
- Orphan delete gated — good.
- API-key / Authorized Domain changes must not proceed without captured error code (Plan Phase 0).

**Required changes:**

- [x] Before any Console Auth/API-key/domain change: record owner-captured
  `accounts:lookup` `error.message` on the incident doc.

**Human approval needed before production:**

- [x] App Hosting rollout
- [x] Any Auth user deletion
- [x] Any API-key / Authorized Domains / OAuth / Functions / Rules change (only if selected)

---

## Data Model Review

**Findings:**

- Classification **Auth user only** was correct at first diagnosis for `Pl3ODnKm…`.
- Inventory amendment (2026-07-31): that prefix and success-lookup `MXeK…` are **gone**; current
  orphan is `L3jjfWJG…`. See
  `…-production-portal-registration-stuck-inventory-amendment.md`.
- `registerCustomer` transaction model still supports resume without schema migration.

**Required changes:**

- [x] Any orphan-deletion approval must use a **fresh** Auth inventory prefix (not stale
  `Pl3ODnKm` / `MXeK`).

---

## Backend Review

**Findings:**

- `registerCustomer` ACTIVE at `us-central1`; no 2026-07-31 Cloud Run request logs — Plan’s
  “callable not reached” claim holds under available logging.
- Do not assume Functions misconfiguration until client Auth session works and invocations appear.

**Required changes:**

- [x] Implementation notes must treat “no Function deploy by default” as mandatory unless new
  evidence shows server-side failure after lookup succeeds.

---

## Test Review

**Findings:**

- Hang/timeout/terminal error coverage is required and present in Plan.
- Exact npm/pnpm script names should be resolved from `docs/standards/TESTING.md` /
  `apps/portal/package.json` at implement time (`[NEEDS REPO CHECK]` at implement, not a Plan block).

**Required changes:**

- [x] At implement: cite exact test commands in the test report (do not invent).

---

## Required changes before implementation

1. Owner pastes sanitized `accounts:lookup` error code/message into the incident (or a short
   checkpoint reply) before any Auth Console remediation is selected.
2. Phase 1 (loading-state / timeout / escape) may proceed only after
   `APPROVE PORTAL REGISTRATION LOADING-STATE FIX IMPLEMENTATION`.
3. Do not bundle branding, Stage 2, Storage, or fixture work.
4. Prefer orphan **resume** over deletion; deletion requires the exact deletion approval phrase.
5. No production deploy without `APPROVE PRODUCTION PORTAL APP HOSTING ROLLOUT`.

---

## Verdict rationale

**approved_with_changes** — Plan is evidence-aligned and safely sequenced. Changes above are
procedural gates, not a rewrite of the remediation strategy. **blocked** is not warranted:
enough is known to plan client resilience and orphan resume; remaining gap is the exact Identity
Toolkit message for Console-level Auth remediations only.
