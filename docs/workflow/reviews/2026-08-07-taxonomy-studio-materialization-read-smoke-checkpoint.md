# Manual QA Checkpoint — Studio taxonomy materialization read smoke

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Owner phrase | `CONTINUE WORKFLOW: TAXONOMY STUDIO MATERIALIZATION READ SMOKE` |
| Project | **fresh-prints-dev** |
| Follow-up | `taxonomy-read-spike-elimination` |
| Mutation | **Forbidden** this pass |
| Deploy | **Forbidden** this pass |

---

## Live prerequisites (already true)

| Item | Value |
|------|--------|
| Materialization | revision **1**, ready, 1 chunk, 1121 tags, 18 categories |
| contentHash | `38e69b3851688e963470b1dc17c879a3e947a481c6d111a0d2a4fe74bdd33e59` |
| Functions | triggers + AI loader + bootstrap callable live |
| Rules | staff read / client write deny live |

---

## Manual Test Checkpoint

**Feature / area:** Studio AI Review — taxonomy materialization read path  
**Why automated tests are insufficient:** Requires live Electron Studio + staff Auth + Firebase Debug trace against real `fresh-prints-dev` Rules and disk cache.  
**Environment:** local Studio (`npm run dev:studio`) → Firebase project **fresh-prints-dev**  
**Prerequisites:** owner/admin login; Firebase Debug panel available (Ctrl+Shift+D or existing shortcut)

### Steps

1. **Hard-reload / restart Studio** against `fresh-prints-dev` (so Rules + materialization client code are current).  
   → **Expected:** App loads; signed in as owner/admin.

2. Open **Firebase Debug** panel; click **Reset** (clear trace). Enable tracing if off.  
   → **Expected:** Empty/cleared snapshot.

3. Navigate to **AI Review**; wait until taxonomy UI finishes loading (TagChipInput / tag picker usable).  
   → **Expected:** No permission errors; tags/categories appear.

4. **Do not** create/edit/archive/approve/reject any tag or category.  
   → **Expected:** No taxonomy writes.

5. In Firebase Debug, inspect reads for:
   - `taxonomyMaterialization/meta`
   - `taxonomyMaterialization/chunk-0`
   - `tags` (list/pagination)
   - `categories`  
   → **Expected (cold disk):** ~1 meta + ~1 chunk-0; **0** multi-page `tags` list; **0** full `categories` list.  
   → **Expected (warm disk):** ~1 meta; **0** chunk if short-circuit; **0** tags/categories lists.

6. Optional disk-cache check (main-process userData only — do not dump unrelated files):  
   Path pattern: `{Studio userData}/taxonomy-cache/v1.json`  
   → **Expected:** file exists after first successful materialization load; `revision: 1` and contentHash matches live hash above.

7. Copy Firebase Debug report (and note warm vs cold) into your reply.

### Pass criteria

- [ ] Staff can read `taxonomyMaterialization/meta` (no permission-denied)
- [ ] Chunk read only if cold/stale (≤1 chunk at current size)
- [ ] No old `listTags` 500+500+121 pattern
- [ ] No full `listCategories` 18-doc hydrate for AI Review picker path
- [ ] Disk cache created/reused at `taxonomy-cache/v1.json` with revision 1
- [ ] AI Review tag/category UI still usable (names, aliases, categories)

### Please reply with

- `STUDIO TAXONOMY MATERIALIZATION READ: PASS`
- `STUDIO TAXONOMY MATERIALIZATION READ: FAIL: [description]`
- `STUDIO TAXONOMY MATERIALIZATION READ: PASS WITH NOTES: [notes]`

Include:
- cold vs warm
- meta / chunk / tags / categories read counts
- any permission errors
- whether disk cache was created/reused
- brief UI sanity note
- debug report summary or paste

---

## Agent status

**Closed — PASS WITH NOTES** (owner Design Library warm-cache proof).

Result: `docs/workflow/reviews/2026-08-07-taxonomy-studio-materialization-read-smoke-result.md`

- `/tags` **0**, `/categories` **0**, fallbacks **0**, errors **0**
- Cold-cache retest waived; AI Review deferred to later batch
- Stale/revision refresh → mutation checkpoint (not executed)

**No mutation / deploy / production / PR merge** this pass.

**STOP** (await mutation smoke).
