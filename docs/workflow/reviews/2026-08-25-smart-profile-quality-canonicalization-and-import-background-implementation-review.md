# Formal Implementation Review: Smart Profile Quality + Canonicalization (+ Import Background)

| Field | Value |
|-------|--------|
| Date | 2026-08-25 |
| Amended | 2026-08-25 — QA corrective A–D (import preview/picker/visibility detector + AI Review category chips) |
| Reviewer | Review Agent (post-corrective) |
| Plan | `docs/workflow/plans/2026-08-25-smart-profile-quality-canonicalization-and-import-background-plan.md` |
| Test report | `docs/workflow/reviews/2026-08-25-smart-profile-quality-canonicalization-and-import-background-test-report.md` |
| Verdict | **approved_with_notes** (corrective complete; owner manual QA **PASS** 2026-08-25) |
| Environment | **development source** — **no Cloud Function redeploy required for this corrective** |

---

## Owner DEV QA

**PASS WITH NOTES** (2026-08-25) — three corrective items authorized in-refinement (not a separate goal).

**PASS** (2026-08-25) — owner local Studio QA on fresh-prints-dev. Full checklist recorded in `docs/workflow/reviews/2026-08-25-smart-profile-quality-corrective-owner-qa-pass.md`.

Verified: compact imports layout; Single/Batch Auto background before upload; per-image Auto | Light | Dark picker; cream/light → Dark; dark art → Light; halftone session indicator + dark default; per-image override without clearing Halftone; dark background alone ≠ Halftone; AI Review category alternative chips clickable; category update without approval; normal picker unchanged.

---

## Corrective A–D (delivered)

### A — Import preview shows resolved Auto mat immediately

**Root cause (repo):** Previews always used theme grey CSS; detector ran only at upload/create. Not a batch index race.

**Fix:** `getSelectedPngPreviewWithBackgroundHint` runs the visibility detector when preview loads; Single + Batch apply `resolveImportPreviewBackgroundCssHex` to the preview stage before design create.

### B — Per-image Auto | Light | Dark picker + Halftone badge

- Compact quick picker on Single + each Batch card
- Precedence: per-image Light/Dark → session All light/dark → all-halftones dark → Auto detector → default light
- Halftone badge when session = All incoming images are halftones (display only; not AI detection)

### C — Visibility / contrast detector

- Compares opaque ink vs mats `#e5e7eb` and `#2c2d2d`
- Synthetic cream RGB(224,208,192) → Dark; white → Dark; dark art → Light; mixed high-contrast → Light; sparse → Light
- **[NEEDS OWNER FIXTURE]** real cream poodle PNG for final calibration (not in chat-accessible path)

### D — Clickable Category Alternatives in AI Review

- Chips for primary + resolvable alternatives against existing catalog options
- Updates `draftForm.categoryId` only; no approve; unresolved names stay informational

---

## Deploy impact

| Artifact | Change? |
|----------|---------|
| Cloud Functions | **No** — Studio + shared only |
| Firestore Rules / indexes | **No** |
| Studio Electron / renderer | **Yes** — local DEV QA / Studio restart |

---

## Explicit non-actions

- No Slice 5 / 6
- No live Autonomous
- No production
- No AI halftone authority
- No auto category creation
- No refinement signoff yet

---

## Next required step

Owner manual QA **PASS** recorded. **Calibration prep complete** — execute bounded v28 DEV calibration (~26 fixtures; see fixture inventory). **STOP for owner review** of calibration report before refinement signoff. Do not start Slice 5.
