# Focused Re-QA — Standard Size Defaults v1 Corrective

**Feature / area:** Standard Print Sizes — Fresh Prints Defaults v1 + modal sub-tabs  
**Prior QA:** Original manual QA **PASS WITH NOTES** (2026-08-29)  
**Environment:** Studio + Portal local against `fresh-prints-dev`  
**Prerequisites:** Corrective code on `development`; **`updateStandardPrintSizesSettings` DEV redeploy** completed before Save test

---

## 1. Defaults (Studio Settings)

1. Open Studio Settings → **Standard Print Sizes**.
2. Click **Reset to Defaults** (does not save until Save).
3. Confirm:
   - [ ] Seven placements: Full Front, Full Back, Back Collar, Left Chest, Sleeve, **Pocket**, Hat
   - [ ] Full Front Adult includes **XS through 5XL** (3XL = 14", 4XL = 16", 5XL = 17")
   - [ ] No retired grouped labels (`M - L`, `XXL+`, etc.)
   - [ ] Pocket: Small 2.5", Medium 3", Large 3.5"
   - [ ] Hat Front: Small 3.5", Standard 4", Large 4.5", **Max 5"**
4. Click **Save standard print sizes** → **Expected:** success message; Portal reflects new catalog after reload.

---

## 2. Modal hierarchy (Studio + Portal)

### Garment placements

1. Open Standard Sizes on a Print Request item.
2. Select **Full Front**.
3. Confirm secondary row: **Adult | Youth | Toddler | Infant**.
4. Confirm **only one group’s tiles** visible at a time.
5. Switch to **Youth** → verify YXS–Y2XL tiles only.
6. Confirm modal height stays reasonable (no full vertical stack of all groups).

### Hat

1. Select **Hat** → **Front Panel | Side Panel** sub-tabs.
2. Front Panel → Max 5"; Side Panel → Large 3".

### Pocket

1. Select **Pocket** → Small / Medium / Large tiles (no pointless single sub-tab).

---

## 3. Large adult sizing + validation

Apply on a square-ish catalog design:

| Preset | Expected width |
|--------|----------------|
| Full Front 3XL | 14" |
| Full Front 4XL | 16" |
| Full Front 5XL | 17" |

- [ ] Height aspect-locked (not stretched)
- [ ] Apply blocked/warned per existing DPI / 22" rules when applicable

---

## 4. Cross-app settings

After Reset + Save in Studio:

- [ ] Portal Standard Sizes modal shows new catalog
- [ ] Old provisional options (e.g. XXL+) **gone**

---

## 5. Existing item safety

Open an item that used a **retired** preset key from QA (e.g. `full_front.adult.m_l`):

- [ ] Width/height **unchanged**
- [ ] No automatic resize
- [ ] Card shows generic **Standard Sizes** / Custom (unknown key)

---

## Please reply with

- `PASS` — all criteria met  
- `PASS WITH NOTES: [notes]`  
- `FAIL: [description]`
