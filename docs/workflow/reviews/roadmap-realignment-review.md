# Review: Roadmap Realignment — Fresh Prints Workflow Scope Correction

| Field | Value |
|-------|-------|
| Date | 2026-06-24 |
| Reviewer | Planning Agent |
| Plan | `docs/workflow/plans/customer-print-request-and-print-run-architecture-plan.md` |
| Verdict | **approved_with_changes** |
| Type | Documentation-only realignment |

---

## Summary

Manual workflow review clarified that Fresh Prints is a **design catalog and print planning platform**, not ecommerce, shipping, fulfillment, or order payment software. Roadmap phases 5–10, workflow docs, and entity naming were updated to reflect:

* Design Library = approved catalog browse only
* AI Review = import enrichment queue
* Print Request / Print Run = production planning (not orders)
* Custom Request = separate future Q&A + Etsy referral workflow

Phase 4A implementation remains largely valid; specific filters should be relocated in a future cleanup phase.

---

## What changed

### Business model clarification

| Old assumption | Corrected model |
|----------------|-----------------|
| Customer Requests = general demand capture with fulfill workflow | **Print Requests** (catalog selections) separate from **Custom Requests** (Q&A + Etsy) |
| Show Queue = production inventory | **Print Run** = upcoming show / batch planning; not shipping |
| Design status includes `queued` / `printed` | Production status on **Print Request Items** / **Print Run Items** only |
| Design Library shows all lifecycle states | Design Library defaults to **approved catalog** (`ready`) |
| AI review filters belong in Design Library | AI Review is a **dedicated work queue page** (Phase 5) |
| Phase 5 = Customer Requests | Phase 5 = **AI Review and Catalog Approval** |
| Phase 7 = AI Features | AI enrichment moves **earlier** (Phase 5); old Phase 7 AI slot repurposed |
| Phase 8 = Pensacola Production | Pensacola export becomes sub-work of Print Runs; not a top-level "fulfillment" phase |
| Phase 9 = Customer Website | Customer portal moves to **Phase 8**; Custom Requests **Phase 9** |
| Payment / checkout implied in requests | **Only** optional custom design fee ($5–$10) in Custom Request phase |
| Customer role in desktop app | Customers use **web portal only**; staff use desktop admin |

### Documentation updated

| Document | Change |
|----------|--------|
| `docs/project/ROADMAP.md` | Phases 4–10 redefined; vision and success criteria realigned |
| `docs/WORKFLOWS.md` | Design lifecycle, AI Review, Print Request, Print Run, Custom Request workflows |
| `docs/architecture/DATA_MODEL.md` | New entity targets; popularity counters; legacy collection mapping |
| `docs/architecture/ARCHITECTURE.md` | Desktop vs portal responsibilities clarified |
| `docs/project/PROJECT_BRIEF.md` | Vision, personas, non-goals updated |
| `docs/workflow/plans/customer-print-request-and-print-run-architecture-plan.md` | New architecture plan |

### Workflow state

Phase 4A manual QA may complete under prior scope. **Do not begin Phase 5 implementation** until this realignment is acknowledged. Next planned work: Phase 4 cleanup (docs + optional UI filter removal) then Phase 5 AI Review.

---

## What remains valid from Phase 4A

| Deliverable | Status | Notes |
|-------------|--------|-------|
| Text search (title, description, tags client-side) | **Keep** | Core catalog discovery |
| Category filter | **Keep** | Catalog organization |
| Tag filter (`array-contains`) | **Keep** | Catalog organization |
| Pagination (load more, 100/page) | **Keep** | Scale requirement |
| URL query param persistence | **Keep** | Adjust param set when filters removed |
| Clear filters control | **Keep** | UX baseline |
| Composite Firestore indexes | **Keep with review** | Some indexes exist only for AI-review + status combos used by library filters |
| Unit tests (`designLibrarySearch.test.ts`) | **Keep** | Extend when filter set changes |
| Automated lint / typecheck | **Keep** | No regression |

---

## What needs cleanup (future implementation — not this session)

| Item | Priority | Target phase |
|------|----------|--------------|
| Remove **status filter** from Design Library (except archived visibility toggle) | High | Phase 4 cleanup |
| Remove **AI review filter** from Design Library | High | Phase 4 cleanup |
| Default Design Library query to `status: ready` | High | Phase 4 cleanup |
| Route imports link to **AI Review** instead of `status=imported` library filter | Medium | Phase 5 |
| Add **AI Review** sidebar nav and page shell | High | Phase 5 |
| URL params: drop `status`, `aiReview`; keep `category`, `tag`, `search`, `archived` | Medium | Phase 4 cleanup |
| Prune unused Firestore composite indexes after filter removal | Low | After cleanup + deploy review |
| Rename `showQueues` → `printRuns` in types/docs | Medium | Phase 6–7 |
| Introduce `printRequests` / `printRequestItems` collections | High | Phase 6 |
| Deprecate `customerRequests` naming for Custom Requests | Medium | Phase 9 |
| Add popularity counter fields to `Design` | Low | Phase 10 |
| Update `ImportsPage` "View in library" link target | Medium | Phase 5 |

---

## Phase 4A impact assessment

### Still fits clarified workflow

Search, category filter, tag filter, pagination, and URL persistence are core **catalog discovery** capabilities. They align with the simplified Design Library purpose.

### Misaligned with clarified workflow (relocate, do not delete logic yet)

| Phase 4A feature | Issue | Resolution |
|------------------|-------|------------|
| Status filter (`imported`, `processing`, `rejected`, etc.) | Treats library as operational queue | Move to AI Review page; library shows `ready` + archived toggle |
| AI review status filter | Belongs on review queue, not catalog | Move to AI Review page |
| `status=imported` deep link from Imports | Sends staff to library instead of AI Review | Change link target in Phase 5 |
| Indexes: `aiReviewStatus + status`, `tags + aiReviewStatus + status` | Optimized for library filter combos | Retain until filter removal; prune after cleanup |

### Firestore index deploy note

Terminal output shows an orphan index `(tags,CONTAINS) (status,ASCENDING)` in Firebase not present in local `firestore.indexes.json`. **Do not delete** without confirming no production query depends on it. After Phase 4 cleanup, reconcile indexes with actual query matrix.

---

## Risks of continuing old roadmap

| Risk | Severity | If unaddressed |
|------|----------|----------------|
| Phase 5 built as "Customer Requests" with order/fulfill semantics | **High** | Wrong data model, customer confusion, scope creep into ecommerce |
| Design Library remains import/review queue | **High** | Staff cannot distinguish catalog from pipeline work |
| Phase 6 Show Queue writes `design.status = queued` | **High** | Breaks concurrent production model (partially mitigated by Phase 3D Step 6) |
| Customer accounts in desktop app | **Medium** | Security boundary violation |
| Pensacola phase framed as fulfillment | **Medium** | Wrong UX expectations (shipping, packing) |
| Payment features for print requests | **High** | Explicit non-goal; only custom design fee allowed |

---

## Recommended next phase

### Immediate (documentation — this realignment)

1. Acknowledge this review and architecture plan.
2. Complete Phase 4A manual QA if not done — note filter relocation as follow-up.
3. Sign off Phase 4A with **PASS WITH NOTES**: filters to be simplified per realignment.

### Next implementation phase

**Phase 4 cleanup** (small, scoped):

* Default library to approved catalog
* Remove status and AI review filters from Design Library UI
* Add archived visibility toggle
* Update URL param schema
* Update Imports completion link to point at future AI Review route (or interim doc note)

Then **Phase 5: AI Review and Catalog Approval**:

* AI Review page and queue
* Wire `catalogApprovalService` to UI
* AI enrichment pipeline (title, description, category, tags)
* Approval/rejection workflow

**Do not start Phase 6 (Print Requests)** until Phase 5 approval path is working.

---

## Updated phase sequence

| Phase | Name | Status |
|-------|------|--------|
| 1–3 | Foundation, Design Library, Import | Complete |
| 3D | Print size, AI review foundation, catalog status separation | Complete |
| **4** | Catalog Search and Organization cleanup | In progress (4A done; cleanup pending) |
| **5** | AI Review and Catalog Approval | Planned |
| **6** | Customers and Print Requests | Planned |
| **7** | Print Runs / Upcoming Shows | Planned |
| **8** | Customer-Facing Web Portal | Planned |
| **9** | Custom Request Q&A and Etsy Referral | Planned |
| **10** | Analytics and Popularity Tracking | Planned |

Mobile support remains backlog / future beyond Phase 10.

---

## Open decisions

See architecture plan §12. Highest priority for human input:

1. **OD-5** — Confirm Design Library hard-defaults to `ready` only (recommended: yes).
2. **OD-6** — AI Review as dedicated sidebar item (recommended: yes).
3. **OD-7** — Firestore index deploy during Phase 4A: deploy now for current filters, or wait until cleanup (recommended: deploy if Phase 4A QA needs live testing; prune later).

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Problem clearly stated | pass | Architecture plan §1–2 |
| Entity model documented | pass | Architecture plan §3–4 |
| Design Library scope simplified | pass | Architecture plan §5 |
| AI Review scope defined | pass | Architecture plan §6 |
| Print Request / Print Run model | pass | Not orders or shipping |
| Custom Request separated | pass | Future phase 9 |
| Popularity tracking documented | pass | Analytics only |
| Security model outlined | pass | Architecture plan §10 |
| Roadmap updated | pass | ROADMAP.md |
| Phase 4A impact assessed | pass | This review §Phase 4A |
| No code changes in this work | pass | Docs only |

---

## Signoff recommendation

| Item | Recommendation |
|------|----------------|
| Architecture plan | **Approve with changes** — resolve open decisions OD-5, OD-6 before Phase 5 planning |
| Roadmap realignment | **Approve** — proceed with updated phase sequence |
| Phase 4A signoff | **PASS WITH NOTES** — complete manual QA; record filter relocation as Phase 4 cleanup |
| Phase 5 kickoff | **Hold** until Phase 4 cleanup plan reviewed |
| Implementation | **Forbidden** until Phase 4 cleanup or Phase 5 plan approved per workflow gates |

---

## Next step

1. Human acknowledges realignment decisions (OD-5, OD-6, OD-7).
2. Record ADR in `docs/project/DECISIONS.md`.
3. Create `docs/workflow/plans/phase-4-catalog-cleanup-plan.md` when ready to implement filter removal.
4. Create `docs/workflow/plans/phase-5-ai-review-plan.md` for AI Review phase.
