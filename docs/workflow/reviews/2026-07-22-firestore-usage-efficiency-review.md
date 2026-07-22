# Review: Firestore Usage Audit and Cost Reduction

| Field | Value |
|-------|-------|
| Date | 2026-07-22 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-07-22-firestore-usage-efficiency-plan.md |
| Verdict | **approved_with_changes** |

---

## Summary

The plan is evidence-backed: Portal/Studio/Functions inventories cite concrete services (full library hydrate, Staff Inbox unbounded listeners, duplicate sidebar/Assisted subscriptions, shell fan-out, count-via-page AI tabs, limit double-read). Wave A/B are appropriately narrow; high-risk Staff Inbox bounding, Design Library `loadAll`, Print Requests N+1, Functions progress coalescing, and rules changes are correctly deferred. Proceed to Implement only after **owner implementation approval**, with the required changes below.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Waves A/B in; Wave C deferred; product rules preserved |
| Architecture alignment | pass | Services/hooks; no component Firebase logic; no new packages |
| Security impact addressed | pass | No rule weaken; DEV tracer PII caution noted |
| Data model impact addressed | pass | None for A/B |
| Backend impact addressed | pass | Client/service first; index/deploy gates called out |
| Test strategy adequate | pass | Lint/typecheck/builds/unit + manual + tracer |
| Human checkpoints identified | pass | Implement approval, manual QA, index/deploy forbidden |
| Roadmap alignment | pass | Infra hardening; not Phase 9 expansion |
| Documentation plan | pass | BACKEND/TESTING/ADR if semantics change |
| No silent scope expansion | pass | Wave C explicit |

---

## Architecture Review

**Findings:**
- Consolidating Assisted and pending-count listeners via provider/shared hook matches existing shell patterns (`AssistedMessagesProvider`, `StaffInboxProvider`).
- Slimming Portal shell load (B2) must stay in `portalPrintRequestService` + hooks — not in UI components.
- Catalog deferred hydrate (B1) must preserve layering in `catalogService` / `useCatalogDesigns`.

**Required changes:**
- [x] During Implement: if B2 needs a feature constant/flag, keep it in service/hook config — not scattered UI.

---

## Security Review

**Findings:**
- Plan correctly excludes security-rule edits and production deploy.
- Count queries must reuse staff-authorized paths already used by list queries.
- Tracer must be DEV-gated and must not log auth tokens, customer PII payloads, or raw document dumps.

**Required changes:**
- [x] Tracer logs: keys + counts only (collection/path signature, not document bodies).

**Human approval needed before production:**
- [x] Any future rules/index/production deploy (out of this phase)

---

## Data Model Review

**Findings:**
- No schema/status changes in A/B. Counter triggers and rate-limit docs correctly retained.

**Required changes:**
- [ ] None

---

## Backend Review

**Findings:**
- Functions write coalescing deferred — correct (observability risk).
- A5 Processing `aiReviewStatus` server filter: confirm composite index exists before relying on it; if missing, stop for index human checkpoint rather than shipping a failing query.

**Required changes:**
- [x] Implement A5 only after verifying index coverage in `firestore.indexes.json` (or fall back / defer A5 with documented note).

---

## Testing Review

**Findings:**
- Manual checkpoint + before/after tracer is mandatory for this goal.
- Studio `tsc` may hit known TS5103 — document honestly if blocked; Vite build still required when Studio changes.

**Required changes:**
- [x] Create manual checkpoint doc before/at start of Test phase from acceptance list in owner prompt.
- [x] Unit-test shared query builders for AI counts vs inbox list filters (A4/A5).

---

## Documentation Review

**Findings:**
- Audit report embedded in plan is acceptable; update after implement/test.
- ADR only if B1/B2 change lasting product semantics of when data loads.

---

## Required Changes (approved_with_changes)

1. **Implementation gate:** Do not start Implement until the owner explicitly approves this review (human checkpoint).
2. **A5 index check:** Verify Processing-tab server filter against `firestore.indexes.json` before coding; if new index required, pause for human approval (do not deploy indexes silently).
3. **B4 optional:** Treat Discover pool trim as **opt-in** at implement time — default defer unless owner confirms rails may shrink.
4. **Tracer hygiene:** Count/key-only DEV logging; default off in production builds.
5. **B1 acceptance:** After deferred hydrate, library grid must still show first page immediately; full-set search/multi-tag must still work when engaged (manual + unit coverage of hydrate trigger conditions).
6. **B2 acceptance:** Header badge, Current Request drawer, and one-working-request flows must remain correct with slim chrome load (manual mandatory).
7. **Do not implement Wave C** (Staff Inbox bounds, Studio loadAll redesign, Print Requests N+1 rewrite, Functions progress coalesce, rules tweaks) without a revised plan + re-review.

---

## Blockers (if blocked)

_(none)_

---

## Verdict Rationale

**approved_with_changes** — Inventory and ranked drivers are credible and code-backed; proposed Wave A items are low-risk high-ROI; Wave B is valuable but needs careful UX preservation and an optional B4. High-risk operational listeners are correctly deferred. Owner must approve before Implement; no production deploy.

---

## Rejected optimization classes (review guardrails)

The following would be rejected if proposed without further approval:

- Breaking Staff Inbox / Show Queue realtime without explicit ops approval
- Speculative multi-route caching without invalidation
- Claiming write batching reduces billed write counts
- Moving Firestore into components
- Changing product rules (DPI, one working request, upload policy, etc.)
- New dependencies without justification
- Weakening security rules

---

## Next Step

**Await owner implementation approval.** On approval: set Human Checkpoint cleared, Implementation Status in progress, execute Wave A + approved Wave B per required changes; create manual checkpoint doc; stop again for manual QA after automated tests.
