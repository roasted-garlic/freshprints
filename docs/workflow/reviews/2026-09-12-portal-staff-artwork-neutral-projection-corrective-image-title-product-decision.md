# Human Checkpoint — Staff Artwork Portal image/title product decision

| Field | Value |
|-------|-------|
| Date | 2026-09-12 |
| Workflow | managed-phase / `portal-staff-artwork-neutral-projection-corrective` |
| Reason | Owner QA screenshots reject the approved neutral no-image/no-title Portal contract and ask to restore Staff Library preview + title |
| Status | **pending** |
| Resolution | pending |

---

## What We Need From You

Choose whether Portal Staff Artwork request cards should stay **privacy-neutral** (current approved corrective) or return to the **previous image + title** customer experience.

---

## Context

The first screenshot (blank image area + repeated “Staff-added”) is the **intentional** result of the owner-accepted Staff Artwork **neutral projection** corrective.

That corrective existed because a pre-freeze Portal boundary audit found customers could:

- read `staffArtworks/{id}`
- resolve `/staff-artwork/...` preview/thumbnail Storage
- see Staff Artwork title / DPI / private metadata on request cards

The second screenshot is the **previous** Portal behavior that audit flagged. Removing image + title was not an accidental regression from the mapper visibility fix; it was the locked privacy contract:

- customer-safe projection only
- no Staff Artwork image/lightbox
- no Staff Artwork title
- no customer `staffArtworks` or `/staff-artwork/...` reads
- quantity + requested size remain editable via trusted callables

The mapper visibility corrective only stopped valid Staff Artwork rows from being dropped when `designId` was absent. It did **not** restore private preview/title hydration.

Restoring image + title now requires a **new Plan → Formal Review** because it changes the security boundary (either by projecting customer-safe preview/title fields, or by reopening Staff Artwork/Storage reads).

---

## Decision Required

**Question:** What should a customer see for a Staff Artwork print-request item in Portal?

**Options:**

1. **Keep approved privacy contract (current)**
   Neutral `Staff-added` label, no image, no Staff Artwork title/DPI from the library. Quantity/size editing remains. Matches the locked corrective and Owner QA checklist as written.

2. **Restore previous customer UX (image + title from Staff Library)**
   Cards again show Staff Artwork preview and title (as in the second screenshot). Requires:
   - Plan amendment + Formal Review (security)
   - deciding whether preview/title are projected as **customer-safe** fields, or Staff Artwork/Storage reads are re-allowed
   - Rules/Storage/projection/mapper/UI changes
   - new DEV population/cutover as needed
   This **reverses** the current corrective’s privacy goal.

3. **Compromise (needs product definition)**
   Example: show a non-private customer-safe title and/or preview that is explicitly approved for customer visibility, without exposing `staffArtworkId`, DPI, dimensions, notes, or other private metadata. Still needs Plan/Review; not implementable by guessing.

**Recommendation (agent):** Do not silently restore Option 2. If the product priority is now the previous visual parity, pick **Option 2 or 3** explicitly and authorize a new Plan → Review before Implement.

**Your decision:** _pending_

Reply with one of:

- `OWNER DECISION: KEEP NEUTRAL STAFF-ADDED (NO IMAGE/TITLE)`
- `OWNER DECISION: RESTORE STAFF ARTWORK IMAGE + TITLE — START PLAN AMENDMENT`
- `OWNER DECISION: COMPROMISE — [describe allowed customer-visible fields]`

---

## What is already working (do not treat as broken)

- Staff Artwork items appear in Portal after the mapper visibility fix
- Quantity / size controls render
- Projection boundary is populated and Rules deny private Staff Artwork reads

## What looks “missing” only because the approved contract removed it

- Staff Library preview image
- Staff Artwork title / title snapshot
- DPI / Standard Sizes / Upscale affordances tied to private source metadata

---

## Status

Workflow is paused for this product/security decision. No further Implement that reopens Staff Artwork image/title exposure until you choose.
