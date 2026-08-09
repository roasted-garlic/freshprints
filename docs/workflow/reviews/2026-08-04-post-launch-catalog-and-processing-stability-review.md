# Independent Formal Review: Post-Launch Catalog and Processing Stability

| Field | Value |
|-------|-------|
| Date | 2026-08-04 |
| Managed goal | `post-launch-catalog-and-processing-stability` |
| Plan reviewed | `docs/workflow/plans/2026-08-04-post-launch-catalog-and-processing-stability-plan.md` |
| Reviewer stance | Independent — re-verified source claims directly rather than restating the Plan |
| Verdict | **approved_with_notes** |

---

## 1. Review method

The Plan was produced from five parallel, independent source-tracing investigations. For this
Review, I did not simply re-read the Plan's prose — I independently re-ran targeted greps/reads
against the actual repository for the load-bearing claims in each workstream (the exact constant
values, the exact cache-invalidation call sites, the exact error string, the exact Storage Rules
block, and the exact `INDEX_FILTER_FIELDS` list) to confirm the Plan's citations are real and
current, not paraphrased or stale. All spot-checks below were run against the working tree at
review time.

## 2. Spot-check results

| Claim | Verified? | Evidence |
|---|---|---|
| Studio `DESIGN_LIBRARY_DEFAULT_SORT_FIELD` is literally `"updatedAt"` | **Confirmed** | `designLibraryFilters.ts:158` — `export const DESIGN_LIBRARY_DEFAULT_SORT_FIELD: DesignListSortField = "updatedAt";`, used at line 175 |
| `archiveTagWithGuards`'s client call chain never invalidates `tagListCache` | **Confirmed, with a refinement (see §3.1)** | `catalogTagService.ts` invalidates at lines 285, 334, 391 (create/update/bulk-create) but not from the archive path; a ready-made helper `clearStudioTaxonomyCaches()` exists (`taxonomyCacheControl.ts`) and is called **only** from `AuthProvider.tsx:108` (auth transitions) — never from `useCatalogTags.archiveTag` or `taxonomyArchiveGuardsService` |
| `portalCatalogChangeClassifier.ts`'s `INDEX_FILTER_FIELDS` includes `"status"` | **Confirmed** | `portalCatalogChangeClassifier.ts:17-23` — array literally includes `"status"` |
| `enqueueAiEnrichment.ts`'s exact error string | **Confirmed** | `enqueueAiEnrichment.ts:100` — `throw failedPrecondition("This design is no longer eligible for automatic AI enqueue.");` — matches the reported production message verbatim |
| `storage.rules`'s `isStaff()` performs a live `firestore.get()` | **Confirmed** | `storage.rules:15` — `return firestore.get(/databases/(default)/documents/users/$(request.auth.uid)).data;`, consumed by `isStaff()` at line 18 |
| `MAX_SINGLE_PNG_SIZE_BYTES` = 150 MiB, checked pre-decode | **Confirmed** | `importValidation.constants.ts:4` — `150 * 1024 * 1024` |

All six spot-checked claims hold. This gives confidence that the underlying investigations were
performed against real source, not hallucinated, and that the Plan's citations are trustworthy
enough to build an implementation plan on.

## 3. Findings requiring correction or refinement before Implement

### 3.1 Workstream A — the Plan understates that a fix helper already exists (minor, non-blocking)

The Plan's §3 correctly identifies the missing invalidation but frames it as needing new wiring. In
fact `clearStudioTaxonomyCaches()` (`taxonomyCacheControl.ts:5-8`) already invalidates **both** the
tag and category list caches in one call, and is already used for exactly this kind of "write
happened somewhere the cache doesn't know about" situation (auth transitions). The narrowest correct
fix is very likely: call `clearStudioTaxonomyCaches()` (not a new tag-only invalidator) from
`useCatalogTags.archiveTag`'s success path, and audit whether `updateTag`'s guarded-write siblings
(if any exist beyond direct client writes) have the same gap. This doesn't change the Plan's root
cause finding or its "files expected to change" list in substance, but Implement should be told to
reuse the existing helper rather than authoring a new tag-specific one — a smaller, more consistent
change. Recommend the Plan's §3 "Files expected to change" bullet be read as "wire in the *existing*
`clearStudioTaxonomyCaches()`," not "add a new invalidation call."

This also somewhat weakens the Plan's claim that "zero test coverage... is why this regression
shipped unnoticed" — there IS at least one test asserting `clearStudioTaxonomyCaches()` is wired into
auth transitions (`firestoreRouteContainment.test.ts:134`), showing the project is aware of this
cache-staleness class of bug in the auth context but didn't extend the same discipline to the
archive-guards call sites. Worth noting in the eventual Test report as "known pattern, missed at one
call site," not "no one had ever thought about this."

### 3.2 Workstream A — category parity is asserted as "almost certainly" but not actually traced with equal rigor

The Plan is appropriately hedged here ("almost certainly," "recommends checking... if confirmed"),
which is the correct posture given the underlying investigation focused on tags. I independently
confirmed `categoryService.ts` has its own `categoryListCache`/`invalidateCategoryListCache` pair
with the identical shape (invalidated at lines 450, 492, 617 — presumably create/update/similar
guarded paths), which is consistent with the Plan's suspicion. This is fine as written — flagged
here only so Implement treats "confirm category parity" as a required first step of that slice, not
an optional nice-to-have, since the evidence now more strongly suggests it's real.

### 3.3 Workstream C — the "immediate containment recommendation" changes trigger behavior without a bounded blast-radius statement

§5's containment recommendation (narrow `INDEX_FILTER_FIELDS`'s effective handling of `status` so
`processing`/reverted-`imported` writes stop scheduling `portal-catalog` rebuilds) is well-reasoned
and cheap, but the Plan does not explicitly state what happens to **card-only** reads during that
window — i.e., confirm that no consumer needs a fresh `portal-catalog` publish while a design merely
transitions through `processing`/`imported` (since, per the Plan's own trace, the publisher's query
is `where("status","==","ready")` and never includes those designs regardless). This is very likely
a non-issue given the trace already shown, but the Plan should say so explicitly rather than leaving
it implied, so Implement doesn't have to re-derive it. Recommend adding one sentence to §5 confirming
this before the narrowing change is coded.

### 3.4 Workstream E — the retry-mitigation design needs a boundedness statement

§7's candidate fix ("a narrow, bounded automatic retry specifically on `storage/unauthorized`
immediately following a fresh Firestore re-read") is reasonable, but "bounded" is not yet defined
(how many retries, what backoff, what happens if it still fails — does the user see the original
error, a different one, or silence?). This is appropriately deferred detail for Implement, not a Plan
defect, but the Review flags it so the eventual Plan-for-Implement (or the Implementation Review) is
explicit that an unbounded or silent retry loop would itself be a new defect class to avoid.

## 4. Findings that do NOT require correction

- **Workstream B's Portal "no defect found" conclusion** is well-supported by the cited trace
  (`useCatalogDesigns.ts` default + explicit re-sort of `discover.json`, order-preserving filtered
  intersection, correct Firestore-fallback default) and by the Review's own reading of the same
  `portalCatalogChangeClassifier.ts` file for an unrelated spot-check. I did not find contrary
  evidence. The Plan's recommendation to get owner re-confirmation before authorizing any Portal
  change (rather than either assuming Portal is broken, or unilaterally declaring it fine and
  closing it) is the correct, appropriately humble posture given a user-reported symptom that
  current source does not reproduce.
- **Workstream C's quantification** (documents-per-rebuild, the 4-schedules-per-design-lifecycle
  table, the in-memory-vs-persistent debounce distinction, the lease mechanism) is internally
  consistent and the `INDEX_FILTER_FIELDS` citation checks out. The ranked hypothesis for the ~54K
  spike is appropriately labeled as best-evidence rather than proven, and the Plan correctly declines
  to claim production log correlation it did not perform.
- **Workstream D's two-bug framing** (false error + independent stale list/count sources) is
  internally consistent with the exact error string confirmed above, and the "why navigating away
  fixes it" explanation (remount reruns both mount effects) is a sound mechanical explanation, not
  speculation.
- **Workstream E's elimination of the size-limit and token-refresh hypotheses** is well-argued: the
  150 MiB pre-decode gate is confirmed real and would have blocked decode/trim entirely, and the
  repo-wide absence of custom claims is a strong, checkable negative (confirmed independently: the
  Storage Rules do read Firestore directly, not token claims, per the spot-check above).

## 5. Scope and architecture-constraint compliance

- No application source, Rules, index, Function, or production change was made during this Plan/Review pass — confirmed; only documentation files were created.
- The Plan does not recommend restoring broad direct-Firestore catalog reads as a permanent architecture (§8 explicitly rules this out).
- The Plan does not recommend rebuilding the full catalog once per individual design mutation as the fix — to the contrary, §5's core recommendation is to reduce exactly that behavior.
- The Plan's snapshot recommendation (§5) does not rely solely on in-memory debounce for concurrency safety — it correctly identifies the existing persisted lease as adequate and targets the *scheduling* coalescing gap instead, which was the specific constraint called out in the managed-goal brief.
- The Plan explicitly preserves "last valid snapshot remains usable while publication is pending" as already-true existing behavior, not a new build (§5).
- `createdAt` descending is preserved as the default ordering rule throughout; no metric-collection ordering (Popular, Most Liked, Recently Requested) is touched by any recommended change.
- No new dependency is proposed without flagging it for explicit owner sign-off (§5 flags the possible Cloud Scheduler mechanism as requiring separate approval).
- The Plan does not silently expand scope: Workstream B's "Portal may not actually be broken" finding is surfaced transparently rather than either quietly dropped or quietly expanded into unrequested Portal changes.

## 6. Open items carried into Implement (per Plan §11, endorsed by this Review)

1. Read-only production log correlation for the Workstream C spike window.
2. Read-only production log / account-timeline correlation for the Workstream E incident.
3. Independent live Firestore document check on `fresh-prints-dev` for Workstream A (click Archive, read the actual document) — required by the managed-goal brief before Workstream A can be called closed; correctly not yet claimed as done.
4. Owner re-confirmation of the exact Portal ordering symptom before any Portal code change is authorized.
5. Confirm category-archive parity (elevated from "likely" to "should be a required first step," per §3.2 above).

This Review adds no new open items beyond the Plan's own §11 list except the four refinements in §3.

## 7. Verdict

**approved_with_notes.**

The Plan's root-cause analysis is well-evidenced, its citations independently verified as accurate,
its architecture recommendation is consistent with the binding constraints, and its scope is
honestly bounded (it does not overclaim confirmation where only source evidence, not log or live-data
confirmation, exists). The four notes in §3 are refinements, not blockers — none of them invalidate
a root cause, and none require re-running any of the five investigations. Implement should read §3.1
through §3.4 alongside the Plan itself, but no re-plan is required.

## 8. Approval phrase

The Plan's proposed phrase is not narrowed by this Review — the five root causes are sufficiently
independent and well-bounded that a single batched-implementation approval remains appropriate,
provided Implement honors the two-batch grouping in the Plan's §9 (client-only first, then
Functions+dev-deploy) and the open items in §6 above before claiming Workstreams A, C, and E fully
closed.

`APPROVE POST-LAUNCH CATALOG AND PROCESSING STABILITY IMPLEMENTATION`
