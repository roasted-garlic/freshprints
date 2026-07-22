# Manual Test Checkpoint: Custom Request AI Context + Final Source Workflow

| Field | Value |
|-------|-------|
| Date | 2026-07-21 |
| Feature / area | Assisted Creation — AI Context, Final Source Needed, Start Work nav, proof preview |
| Why automated tests are insufficient | Studio/Portal UI flows, Storage Save-As behavior, soft-deployed callables |
| Environment | local Studio + Portal against `fresh-prints-dev` **after** soft-deploy |
| Prerequisites | Soft-deploy Functions + Storage rules (see test report); staff owner/admin + Portal customer test accounts |

---

## Manual Test Checkpoint

### Steps

1. **AI Context (with refs)** — Open Assisted request with reference images → **AI Context…** → verify populated answers, no URLs/paths/UID/email, `REFERENCE_IMAGE_n` order matches UI → **Copy Full AI Input** pastes clean. → **Expected:** Prompt includes reference sentence; JSON has `reference_images`.
2. **AI Context (no refs)** — Repeat on a request without references. → **Expected:** No `reference_images` key; prompt omits reference sentence.
3. **Start Work navigation** — From New, **Start work**. → **Expected:** Lands on **In progress** tab with same request selected and detail open. Failure leaves tab unchanged.
4. **Proof approve → Final Source Needed** — Upload proof → customer approve. → **Expected:** Studio shows **Final Source Needed** (not Completed); Portal badge/heading **Proof approved** + waiting copy; no Download Final Artwork yet; approved proof still previewable.
5. **Proof preview filename** — On Portal proof preview, inspect `img src` is a `blob:` URL (not a permanent Storage URL). Save Image As. → **Expected:** Opaque / generic basename, not `proof-n-date…`. Cross-customer access denied.
6. **Final upload failure** — On Final Source Needed, cancel or fail an upload mid-flight if possible. → **Expected:** Status stays `final_source_needed`.
7. **Final upload success** — **Upload Final Artwork** succeeds. → **Expected:** Request → Completed; Studio follows to Completed with selection; Portal shows **Download Final Artwork** with friendly name; Add to Request works (copies final when present).
8. **catalog_share regression** — Suggest library design → customer approve. → **Expected:** Goes directly to `approved` (no Final Source Needed); catalog Add to Request unchanged.

### Pass criteria

- [ ] AI Context copy-only works with and without references
- [ ] Start Work follow-navigation works
- [ ] Proof-image approve enters Final Source Needed; Portal waiting copy correct
- [ ] Proof preview uses object URL; no proof download button; Save-As not human-readable Storage name
- [ ] Final upload completes request; Download Final Artwork + Add to Request use final source
- [ ] catalog_share still completes directly to approved

### Please reply with

- `PASS` — all criteria met
- `FAIL: [description]` — what failed
- `PASS WITH NOTES: [notes]` — acceptable with follow-ups

---

## Soft-deploy approval (separate)

Reply **`APPROVE SOFT-DEPLOY`** (or run the commands yourself) before Functions/Storage deploy to `fresh-prints-dev`. Production is **not** authorized.
