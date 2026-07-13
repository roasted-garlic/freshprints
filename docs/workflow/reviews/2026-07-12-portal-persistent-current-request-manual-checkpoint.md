# Manual Test Checkpoint — Portal Persistent Current Request

**Feature / area:** Persistent Current Request / cart-style Portal flow  
**Why automated tests are insufficient:** Cross-surface UX, scroll preservation, drawer/mobile, multi-tab, Studio regression  
**Environment:** Portal (+ Studio for selection smoke) against **fresh-prints-dev**  
**Prerequisites:** Signed-in Portal customer; optional Studio staff account  
**Portal URL:** http://localhost:3100 (dev server restarted clean after load fix)

### Load gate (must pass before UX steps)

- [ ] http://localhost:3100/login loads
- [ ] After sign-in, http://localhost:3100/catalog loads (not blank / not 500)
- [ ] Header shows **Upload Artwork** and Current Request basket
- [ ] http://localhost:3100/requests and http://localhost:3100/requests/artwork load

### Mid-checkpoint UX fixes (2026-07-12 feedback)

- [ ] After adding a design, the card uses the **highlighted selection-card** UI (border highlight, − / qty / +, corner clear, trash at qty 1) — not “In Current Request” text
- [ ] Header label is **Upload Designs** with image-up icon
- [ ] **Continue request** primary CTA is gone (requests header / empty working tab / bottom FAB)
- [ ] **How print requests work** accordion is gone from Discover / Library
- [ ] Current Request drawer: thumbnail + truncated title; trash top-right; source pill **Library** (blue) or **Uploaded** (amber) between title and `N Size(s) · Qty X`; only **Review Request** footer action
- [ ] Hamburger menu button appears on **mobile only** (hidden on desktop; sidebar remains)
- [ ] `/requests/artwork` shows **Upload Designs** + lead (no Current Request eyebrow); upload file list expands with the page (not a nested scroll box)
- [ ] ZIP upload: after archive upload, images are **discovered into the list**, then processed one-by-one (not a single stuck ZIP row until the end)

### Steps

1. New / empty customer sees empty Current Request (basket badge `0`) without a Firestore working request created on login alone.  
   **Expected:** Empty drawer; no accidental empty request doc.
2. Add a design from Discover → badge updates; stay on Discover (scroll/rails intact).  
   **Expected:** Success feedback; card shows steppers + `In Current Request · Qty N`.
3. Open Design Library → same design shows correct aggregate qty and steppers.  
4. Add the same design again via **+** → primary variant qty increments.  
5. Open Review Request → duplicate for a second size.  
6. Return to catalog → aggregate qty includes both variants; drawer lists Size 1 and Size 2.  
7. Upload artwork from `/requests/artwork` → attaches to same Current Request.  
8. Confirm upload appears in drawer (image + filename) and Review Request.  
9. Resize item ≥ 300 DPI → saves cleanly.  
10. Resize into 200–299 → warning, still saveable.  
11. Resize below 200 → save blocked.  
12. Remove only one duplicated size variant → other remains.  
13. Choose allocatable show → **Add Request to Show**.  
14. Confirmation; request leaves Working; Current Request empty.  
15. Add another design → new working request created safely.  
16. Repeat critical add/queue with two browser tabs → still one working request.  
17. Studio request-selection mode still works.  
18. No donation copy or donation controls appear in new UI.

### Pass criteria

- [ ] Portal loads (load gate above)
- [ ] Mid-checkpoint UX fixes above
- [ ] Direct-add + aggregates + primary increment correct
- [ ] Artwork page + attach work; no auto show / auto library publish
- [ ] Review Request preserves qty/size/duplicate/DPI/show
- [ ] Queue resets Current Request; multi-tab safe
- [ ] Studio selection unchanged; no donation language

### Please reply with

- `PASS` — all criteria met  
- `FAIL: [description]` — what failed  
- `PASS WITH NOTES: [notes]` — acceptable with follow-ups  

---

## Remediation note (2026-07-12)

Earlier owner **FAIL** (Portal did not load) was fixed before this retest:

1. **Circular import:** `PortalPrintRequestContext` imported `CurrentRequestDrawer`, which imported the context — could crash authenticated shell. Drawer now mounts from `PortalAppShell` only.
2. **Corrupt Next cache:** prior CSS syntax error + later concurrent `next build` while `next dev` ran left webpack runtime broken (`SegmentViewNode` / missing chunk). Cleared `apps/portal/.next` and restarted `npm run dev:portal`.

Verified healthy `200` for `/`, `/login`, `/catalog`, `/catalog/library`, `/requests`, `/requests/artwork` after restart.

## UX feedback remediation (2026-07-12, same session)

Owner mid-checkpoint notes addressed in code:

1. Catalog / details cards switch to **− qty +** when `currentRequestAggregates.quantityByDesignId` > 0; stepper styles added.
2. Removed Continue request CTAs; bottom-nav FAB opens Current Request drawer; request cards show Working (not “Continue Request”).
3. Removed How print requests work component.
4. Drawer: design/upload thumbs, ellipsis title + trash, Size N labels, Review Request only.
5. Desktop hides `.portal-app-header-menu-button` at `min-width: 48rem`.
6. Drawer source pills: **Library** (accent blue) vs **Uploaded** (amber) between title and size/qty meta.
7. `/requests/artwork` header spacing condensed (eyebrow / title / lead).
