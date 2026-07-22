# Signoff: Firestore Usage Audit and Cost Reduction

| Field | Value |
|-------|-------|
| Date | 2026-07-22 |
| Signoff by | Signoff Agent |
| Plan | docs/workflow/plans/2026-07-22-firestore-usage-efficiency-plan.md |
| Review | docs/workflow/reviews/2026-07-22-firestore-usage-efficiency-review.md |
| Test report | docs/workflow/reviews/2026-07-22-firestore-usage-efficiency-test-report.md |
| Manual checkpoint | docs/workflow/reviews/2026-07-22-firestore-usage-efficiency-manual-checkpoint.md |
| Final status | **approved_with_notes** |

---

## Summary

Evidence-based Firestore read reductions for Studio and Portal: duplicate listener consolidation, AI Review count aggregations + Processing server filter (existing index only), Portal library deferred hydrate, slim shell print-request load, bounded account gallery, and a DEV-only usage tracer. B4 Discover trim and Wave C remain deferred. No production, rules, Functions, or index deploys.

---

## Changes Delivered

### Behavior
- Studio Sidebar: one pending-upload listener drives both badges
- Assisted recent list + update acks: ref-counted shared subscriptions
- Portal working-request limit: live listener without 45s `getDoc` poll
- AI Review tab counts: `getCountFromServer`; Processing applies `aiReviewStatus == pending` server-side
- Portal Library: first page + server load-more; full hydrate only for search / multi-tag
- Portal shell: continuable requests for chrome; full history on `/requests` and `/dashboard`
- Account artwork gallery: recent 150 by `createdAt`, then confirmed filter
- DEV tracer: count/key only, disabled by default (`FP_FIRESTORE_TRACE`)

### Files Created
- `packages/shared/src/utils/firestoreUsageTrace.ts` (+ test)
- `apps/studio/.../firebase/utils/createSharedFirestoreSubscription.ts` (+ test)
- `apps/portal/.../catalog/utils/catalogNeedsFullClientHydrate.ts` (+ test)
- `apps/studio/.../ai-review/utils/aiReviewTabCountQuery.test.ts`
- Workflow plan, review, test report, manual checkpoint, signoff

### Files Modified
- Studio: pending upload hook, Sidebar, assisted request/ack services, `designService`, `useAiReviewTabCounts`
- Portal: limit hook, `useCatalogDesigns`, `portalPrintRequestService`, `useMyPrintRequests`, `customerUploadService`
- Plan audit section updated with implemented vs deferred list

### Documentation Updated
- Workflow artifacts only; no product rule changes; no BACKEND ADR required for this pass

---

## Tests

### Automated
- Focused unit tests: 27/27 pass
- Portal typecheck: pass
- Studio Vite build: pass
- Studio `tsc`: fail documented (pre-existing TS5103)
- Portal `next build`: fail documented (EPERM on `.next/trace`)
- Lint: pre-existing failures; new unused-import fixed
- Functions build: skipped (no Functions changes)

### Manual
| Test | Result | Approved by |
|------|--------|-------------|
| Studio + Portal QA script + tracer remount check | PASS | human (2026-07-22) |

---

## Human Approvals Obtained
| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Production deploy | not required / not performed | | Explicitly out of scope |
| Database migration | not required | | |
| Firestore indexes / rules / Functions deploy | not performed | | A5 used existing index only |
| Design / UX | obtained | 2026-07-22 | Manual PASS |
| Business / policy | not required | | Product rules unchanged |
| Secrets / env | not required | | |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Staff Inbox unbounded always-on listeners | medium | Wave C deferred |
| Studio Design Library `loadAll` | medium | Wave C deferred |
| Portal `next build` not re-verified this session | low | Re-run when `.next` unlocked |
| No Firebase console billing delta claimed | low | Tracer + code evidence only |

---

## Deferred Items (Roadmap)
- B4 Discover pool trim (owner deferred)
- Wave C: Staff Inbox bounds, Studio loadAll redesign, Print Requests N+1, Functions progress coalesce, rules `exists`+`get` cleanup

---

## Open Blockers
- [x] None

---

## Verdict

**approved_with_notes** — Owner manual PASS; automated gates passed with documented environment/pre-existing notes; B4/Wave C and all deploys intentionally out of scope.

---

## Workflow Complete
- [x] `.cursor/workflow/state.md` updated with `DONE: yes`
- [x] Deferred items recorded (no ROADMAP phase advancement)
- [ ] `RISK_REGISTER.md` — not required (deferred work already in plan)
- [x] `references/project-chatgpt-handoff/` — **not present** in this workspace (N/A)

**Recommended next action for user:** Start a new managed goal when ready; optionally re-run `npm run build:portal` when no Next process locks `.next`.
