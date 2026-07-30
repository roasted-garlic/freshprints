# Firestore Usage Efficiency Wave C — Final Signoff

**Managed goal:** `firestore-usage-efficiency-wave-c`
**Final verdict:** `SIGNED OFF: PASS WITH NOTES`
**Date:** 2026-07-27
**Production status:** untouched throughout every phase of this goal

---

## 1. Original problem

Studio Print Requests and Portal print-request/catalog surfaces were producing large, unexplained
Firestore read spikes (reported historically in the 1,000+ range for a single Studio Print Requests
session, and repeated hundreds-of-reads Portal minutes) with no bounded, exact-count, or
server-paginated read path. The prior Wave A/B efficiency work had already addressed duplicate
listeners, AI Review counts, Portal library hydration, and slim shell loads, but explicitly deferred
the Print Requests surface and a private-cache exploration as "Wave C."

## 2. Root causes found

- **Studio Print Requests** had no bounded server pagination, no exact tab counts, and no
  `queueTab` field to filter/count against — tab membership was derived client-side from full
  item/allocation sums, which could not be queried or counted exactly without a full scan.
- **Portal catalog-add flow** (`addPortalCatalogDesignToPrintRequest`) reread a growing
  `printRequestItems` collection on every transaction attempt; concurrent same-request additions
  caused transaction retries that reread the growing collection, amplifying read cost.
- **A private, generated Storage-backed JSON read-model cache** (Studio staff-only + Portal
  customer-scoped) was subsequently built as a candidate fix for the Studio bounded-read cost, but a
  controlled real-publication test proved it never actually eliminated the cost it was built to
  remove (~10s load, ~5.29s manifest callable, and 4 count queries + 1 item query + 4 catalog design
  reads still occurring even with the read model live and correct) — see ADR-FP-121.

## 3. Architecture retained (permanent)

### Generated catalog / Design Library architecture
- Firestore remains canonical; catalog and taxonomy snapshots are stored under
  `generated/catalog-reference/**` and `generated/portal-catalog/**`.
- Portal Discover, Library, search, filters, taxonomy, and card hydration use these generated
  assets.
- Studio Design Library and taxonomy use the same generated snapshot architecture.
- Manifest generation-precondition swaps, versioning, coalescing, and cache behavior are unchanged
  by this goal.

### Bounded Print Requests architecture
- Print Requests use Firestore directly — no generated cache layer.
- `printRequests.queueTab` is maintained by two trusted, request-scoped triggers
  (`onPrintRequestItemQueueTabInputWritten`, `onShowAllocationQueueTabInputWritten`).
- Studio loads one bounded server page per tab; exact tab totals use `getCountFromServer`; only the
  visible page's requests are hydrated; a selected request outside the loaded page is fetched
  directly by ID.
- Portal print-request reads remain customer-scoped and bounded.
- No private generated print-request read model remains anywhere in source or `fresh-prints-dev`.

## 4. Architecture abandoned (fully removed)

The private print-request JSON read-model architecture (Studio staff-only manifest/page cache,
Portal customer-scoped manifest/page cache) was implemented, corrected twice for real defects (a
manifest/page path-orphaning bug, then an immutability violation caught by the owner), deployed to
dev, and then abandoned by explicit owner decision after a controlled real-publication test showed
the measured benefit did not justify the complexity. See ADR-FP-121 in `docs/project/DECISIONS.md`
for the full decision record.

## 5. Implementation summary

- Bounded Firestore Print Requests (pass 5): maintained `queueTab`, two maintenance triggers, server
  pagination, `getCountFromServer` exact counts, visible-page-only hydration, direct selected-request
  lookup, local mutation reconciliation.
- Private read-model exploration (pass 6, abandoned): manifest/page publishers, a staff-only read
  callable, Studio/Portal consumer services, a dev publication bridge — built, corrected twice,
  deployed, tested, then fully removed.
- Portal catalog-add serialization and accounting fix (adjacent Wave C work): per-print-request
  serialized catalog adds, exact transaction/read/write accounting on the add callable and the
  item-created analytics trigger, removing the redundant design-existence read from the analytics
  trigger.

## 6. Dev resources changed (all in `fresh-prints-dev`; production untouched)

**Removed:**
- Functions: `publishPrintRequestReadModels`, `readStudioPrintRequestReadModelAsset`,
  `onPrintRequestReadModelInputWritten` — deleted via `firebase functions:delete`.
- Storage objects: `generated/studio-print-requests/**`, `generated/portal-print-requests/**` —
  manually deleted by the owner via the Firebase Console.
- Storage Rules: explicit private-prefix rules for both abandoned paths, plus the
  `customerBelongsToCaller` helper used only by them — removed and deployed.
- Firestore indexes: `printRequests` (`queueTab ASC, createdAt DESC, __name__ DESC`) and
  (`queueTab ASC, createdAt ASC, __name__ ASC`) — removed via `firebase deploy --only
  firestore:indexes --force`.

**Deployed (kept, corrected):**
- `onPrintRequestItemQueueTabInputWritten`, `onShowAllocationQueueTabInputWritten` — redeployed with
  the read-model publish call removed, queueTab maintenance logic unchanged.

## 7. Resources intentionally preserved

- Generated catalog Functions: `rebuildCatalogSnapshots`, `onPortalCatalogSnapshotSourceWritten`,
  `onCategorySnapshotSourceWritten`, `onTagSnapshotSourceWritten` — confirmed live, unmodified.
- Firestore index `printRequests`: `queueTab ASC, updatedAt DESC, __name__ DESC` — confirmed live,
  supports the permanent bounded Studio Print Requests path.
- All other pre-existing `printRequests` indexes (`customerId+status`, `customerId+updatedAt`,
  `isInternal+updatedAt`, `requestOrigin+updatedAt`, `status+updatedAt`) — confirmed untouched.
- Storage Rules for `originals/**`, `thumbnails/**`, `previews/**`, `customer-uploads/**`,
  `assisted-creation/**`, brand logos, and every `generated/catalog-reference`/`generated/portal-catalog`
  rule — confirmed unmodified.

## 8. Automated test results (last passing state)

- `npm run build --prefix functions` — clean.
- Studio 3-target `vite build` (renderer/main/preload) — clean.
- Portal `typecheck` / `build:portal` — clean.
- `npm run test:rules` (Firestore + Storage Rules emulator, portable JDK) — 12/12 pass, exit 0, run
  both before and after the final Storage Rules deployment.
- Portal print-requests focused tests — 28/28 pass.
- Studio print-requests focused tests — 64/69 pass. The 5 failures
  (`printRequestItemSizingAndNaming.test.ts`, `printRequestOversizedSelection.test.ts` — DPI/print-size
  validation assertions) are **pre-existing and unrelated to Wave C**, confirmed via `git stash`
  against the unmodified tree before any Wave C pass-6 work began. Not attributed to this goal.
- Repo-wide scoped grep for all abandoned-architecture symbols/paths — zero remaining references in
  source or config.

## 9. Studio owner QA result

**Final Studio Print Requests smoke test: PASS.**

- 60 client read operations, 135 documents returned, ~144 client billable document reads.
- 0 listeners, 0 callable invocations, 0 Storage asset requests, 0 writes, 0 fallbacks, 0 errors.
- 28 design cache hits, 12 design cache misses.
- Bounded page, count, request-item, allocation, customer, show, and design reads only.
- No broad collection scan; no return of the prior 1,000+ read spike.
- Leaving the page open does not accumulate reads (no live listeners).

**Interpretation:** the higher total versus a single-tab visit is explained entirely by the owner
intentionally navigating every Print Requests tab in one trace — each tab change performs a fresh
bounded read for that tab, which is expected, bounded, and acceptable.

## 10. Portal owner QA result

**Final Portal smoke test: PASS.**

- 14 client Firestore read operations, 16 documents returned, ~20 client billable document reads.
- 7 callable invocations, all succeeded: 1 `registerWebPushSubscription`,
  1 `addPortalCatalogDesignToPrintRequest`, 1 `updatePortalPrintRequestItemQuantity`,
  4 `removePortalPrintRequestItem`.
- 112 generated Storage asset requests, all from active catalog families
  (`portal-catalog/portal/manifest`, `/discover`, `/filter`, `/search-shard`, `/card-bucket`,
  `/taxonomy`, `/taxonomy-manifest`).
- 0 client writes, 0 fallbacks, 0 errors.
- No abandoned private print-request manifest/page asset appeared; no broad Firestore catalog
  query appeared; request data remained customer-scoped and bounded; add-to-request and quantity
  update both succeeded.

**Interpretation:** the trace included four item-removal actions beyond the required smoke-test
steps (additional owner activity). The Firebase Console showed ~149 reads/2 writes/2 deletes for
the displayed minute — materially different from the client trace's own count, consistent with the
Console aggregating server-side callable/trigger work and minute-bucket boundaries, not evidence of
missing or duplicate work.

## 11. Final cost/read interpretation

The Firebase Console minute-graph and the development client tracer are **not identical accounting
systems** — the Console aggregates all server-side Firestore activity (Functions, triggers) for a
wall-clock minute, while the client tracer records only what the browser/Electron client itself
issued. Every read/write observed across both Studio and Portal final smoke tests was traced to a
bounded, expected operation (a tab-scoped page load, an exact count query, a per-item analytics
write, a per-request queueTab recompute). No unbounded scan, unexplained spike, or unattributed
write pattern was found in either final test. The owner accepts the current bounded operating level
as materially lower and more predictable than the pre-Wave-C behavior.

## 12. Known notes and non-blocking limitations

- Studio's all-tab traversal during the smoke test naturally generated more total reads than a
  single-tab visit would — expected behavior, not a defect.
- Portal testing included four additional item removals beyond the planned smoke-test script —
  additional owner activity, correctly reconciled and not counted against the pass criteria.
- Firebase Console minute totals and the development client tracer are not identical accounting
  sources; do not expect them to match exactly in future testing either.
- The 5 pre-existing Studio DPI/print-size test failures remain documented as unrelated to Wave C
  and are not blocking this signoff.
- No unbounded scan, fallback, abandoned-resource usage, retry storm, or duplicate invocation was
  found in either final smoke test.

## 13. Confirmation production was untouched

Every deployment, deletion, and verification command throughout every phase of Wave C explicitly
targeted `--project fresh-prints-dev` only. No production project, alias, Firebase resource, or
data was referenced, deployed to, or modified at any point in this goal.

## 14. Final verdict

**SIGNED OFF: PASS WITH NOTES**

## 15. Recommended monitoring approach after production

This is an operational recommendation, not a new feature or blocker:

- Configure Firebase billing budgets and alerts before production launch (not part of this goal;
  requires its own separate approval).
- Review Firestore Usage and Query Insights after real production traffic exists.
- Reopen performance work only when a measured regression, unbounded query, repeated retry pattern,
  or materially unexpected cost is proven — not merely because normal user actions produce bounded
  reads.

---

## Reference index

- Plan: `docs/workflow/plans/2026-07-23-firestore-usage-efficiency-wave-c-plan.md`
- Review: `docs/workflow/reviews/2026-07-23-firestore-usage-efficiency-wave-c-review.md`
- Abandonment decision: ADR-FP-121, `docs/project/DECISIONS.md`
- Workflow state history: `.cursor/workflow/state.md`
- Handoff snapshot: `references/project-chatgpt-handoff/CURRENT-STATE.md`
