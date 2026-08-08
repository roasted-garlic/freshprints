# Manual QA Checkpoint — Taxonomy controlled mutation smoke (revision 1 → 2)

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Status | **Owner mutation done — SERVER REBUILD FAIL** |
| Project | **fresh-prints-dev** |
| Prerequisite | Studio read smoke **PASS WITH NOTES** |
| Prior materialization | revision **1**, hash `38e69b3851688e963470b1dc17c879a3e947a481c6d111a0d2a4fe74bdd33e59` |
| Live materialization after mutation | still revision **1** / same hash (stale) |
| Live triggers | `onTagTaxonomySourceWritten` **fired**; rebuild **did not** |
| Verify record | `docs/workflow/reviews/2026-08-07-taxonomy-mutation-server-rebuild-verify-result.md` |
| Studio stale-cache refresh | **STOPPED** (blocked until revision advances) |

---

## Goal

Prove end-to-end:

taxonomy edit → source trigger → materialization **revision 1 → 2** → Studio detects stale revision → meta (+ chunk if needed) refresh → **0** `/tags` pagination → **0** `/categories` hydrate → updated taxonomy visible in Studio.

---

## Manual Test Checkpoint

**Feature / area:** Taxonomy materialization rebuild + Studio revision short-circuit refresh  
**Why automated tests are insufficient:** Requires live Firestore triggers, Rules, Studio Auth, and Firebase Debug.  
**Environment:** Studio + `fresh-prints-dev`  
**Prerequisites:** owner/admin; Design Library or Tags UI; Firebase Debug tracing

### Pre-mutation baseline (read-only)

Confirm live meta still:

- `revision: 1`
- `ready: true`
- `chunkCount: 1`
- `tagCount: 1121` (or note if counts change after edit)
- `categoryCount: 18`
- contentHash as above (will change after rebuild)

### Mutation (exactly one controlled write)

Preferred: **minimal, reversible** edit to a single approved tag (e.g. add/remove a disposable alias, or tweak `preferredWhen` by a known token), then optionally revert in a follow-up.

Alternatively: create then archive a disposable test tag if preferred — still one intentional rebuild cycle for 1→2.

**Do not** bulk-import or mass-edit.

### Steps

1. Firebase Debug → **Reset**.
2. Perform the single taxonomy write in Studio; wait for success.
3. Allow ~1–3s for coalesced trigger rebuild (750ms coalesce + Function runtime).
4. Read-only verify (Console or agent after your PASS):
   - `taxonomyMaterialization/meta.revision === 2`
   - `ready: true`
   - new `contentHash` ≠ revision-1 hash
   - `chunk-0` present; revision matches meta
5. Navigate to Design Library and/or AI Review (or remount taxonomy consumer).
6. Confirm Studio shows updated taxonomy field (alias / preferredWhen / new tag as applicable).
7. From Debug for the **post-mutation taxonomy load** window:
   - meta read ≥ 1 (revision check)
   - chunk read 0 or 1 (mismatch → fetch)
   - `/tags` list pages: **0**
   - `/categories` list: **0**
   - no permission-denied

### Pass criteria

- [ ] Materialization revision **1 → 2**
- [ ] Meta ready; chunk integrity OK
- [ ] Studio reflects the edit
- [ ] No `/tags` multi-page hydrate on refresh path
- [ ] No `/categories` full hydrate on refresh path
- [ ] No permission-denied on materialization reads

### Please reply with

- `TAXONOMY MUTATION SMOKE: PASS`
- `TAXONOMY MUTATION SMOKE: FAIL: [description]`
- `TAXONOMY MUTATION SMOKE: PASS WITH NOTES: [notes]`

Include: what was edited, new revision/hash if known, Debug taxonomy vs tags/categories counts, UI confirmation.

---

## Agent constraints until owner authorization to execute

- **STOP** — do not perform the mutation in this prepare pass
- NO deploy / production / PR merge

Owner may later authorize agent-assisted verify (read-only Admin) after they complete the Studio write, or run the full smoke themselves.
