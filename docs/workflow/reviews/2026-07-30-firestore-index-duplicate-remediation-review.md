# Formal Review: Firestore Index Duplicate Remediation Plan

| Field | Value |
|-------|-------|
| Date | 2026-07-30 |
| Plan reviewed | `docs/workflow/plans/2026-07-30-firestore-index-duplicate-remediation-plan.md` |
| Reviewer | Review Agent (independent pass) |
| Verdict | **approved** |

---

## Review Method

Independently re-derived every factual claim in the Plan against the actual repository state and
Git history, rather than trusting the Plan's own prose.

## Independent Verification

1. **Re-ran the canonical duplicate audit independently** (own script, not copied from the Plan's
   author): parsed `firestore.indexes.json`, built the same structural-identity key
   (collectionGroup + queryScope + ordered fields with fieldPath/order/arrayConfig), and confirmed
   **66 total definitions, 65 unique, exactly one duplicate group** at array positions 44 and 50,
   both `customerUploads` / `purpose ASC + catalogReviewStatus ASC`. Confirmed
   `JSON.stringify` byte-equality between positions 44 and 50. Confirmed position 43 (three-field
   `purpose+catalogReviewStatus+createdAt`) is *not* equal to either — the Plan's claim that the
   legitimate prefix pair remains distinct is correct.
2. **Re-ran `git blame` on both duplicate line ranges independently**: confirmed lines 828–840
   (position 44) trace to `043f38a1adc4a62a727e5a4a1ee30fd4d1900c81` (2026-07-13) and lines
   912–924 (position 50) trace to `cbba4ca858d76da5514389a67e187612761240fd` (2026-07-14) for the
   `collectionGroup`/`queryScope`/`fields:[` structural lines; the inner field-object lines in both
   blocks blame to `0317a6db536b682ad0eb97ffa569b2be5c133ac6` (2026-07-22), confirmed via direct
   diff inspection of that commit to be a pure single-line→multi-line reformat with no content
   change (every reformatted field block has an identical `-`/`+` pair with only whitespace
   differing). The Plan's provenance conclusion is independently confirmed accurate.
3. **Re-ran the remote index check independently**: `firebase firestore:indexes --project
   fresh-prints-prod` returns 50 indexes, 0 field overrides, matching the Plan's claimed remote
   state exactly, including the same 7 missing collection groups.
4. **Confirmed no other file in the repository depends on index array position or count** —
   searched `functions/src`, `packages/shared/src`, `apps/portal`, `apps/studio` for any reference
   to `firestore.indexes.json`'s structure beyond the Rules-deployment/CI documentation already
   covered in `docs/standards/DEPLOYMENT.md`; found none. Removing one duplicate array entry has no
   downstream code dependency.
5. **Confirmed the proposed validator location and pattern match existing convention** — read
   `packages/shared/src/constants/storageRulesAlignment.test.ts` directly; confirmed it is a real,
   currently-passing pattern (`node:test`, `node:assert/strict`, direct repo-root file read, zero
   new dependency) that the Plan's proposed `firestoreIndexesDuplicateValidation.test.ts` correctly
   follows.

## Findings

**No blocking finding.** The Plan's factual claims are all independently verified correct:
- The single duplicate is real, exactly identified, and its removal cannot reduce query coverage
  (a byte-identical index provides no additional capability).
- The legitimate two-field/three-field pair is correctly protected — the Plan does not conflate
  them.
- Provenance is correctly traced with exact commit hashes and dates, not asserted without
  evidence.
- The remote-state handling (no deletion, no `--force`, no Console edits, 50 existing indexes left
  untouched) is consistent with the parent goal's standing production-safety rules.
- The validator approach reuses an existing, working repository convention rather than inventing a
  new one or adding a dependency.

**Minor observation, non-blocking:** the Plan notes in passing that the original two-field index
(position 44) might itself be redundant with the three-field index for some query shapes, since
Firestore composite indexes serve prefix queries. This is correctly scoped as **out of this
remediation's boundary** — the Plan only removes the exact duplicate, not a possibly-redundant but
structurally distinct index, which is the right call for a narrow, low-risk fix. Recommend a future
separate optimization pass (not this remediation) if the owner wants to investigate collapsing
prefix-redundant indexes generally — not a blocker here.

## Verdict Rationale

**Approved, no unresolved blocker.** Every claim was independently re-derived and matched. The
proposed correction is minimal, precisely scoped, has zero query-coverage impact, adds regression
protection via a test that follows existing repository convention, and does not touch anything
already deployed. The Plan may proceed to implementation.
