# Test Report: Brand logo uploads (Studio + Portal)

| Field | Value |
|-------|-------|
| Date | 2026-07-22 |
| Goal | `brand-logo-uploads` |
| Branch | `feature/brand-logo-uploads` |
| Plan | docs/workflow/plans/2026-07-22-brand-logo-uploads-plan.md |
| Review | docs/workflow/reviews/2026-07-22-brand-logo-uploads-review.md |
| Manual checkpoint | docs/workflow/reviews/2026-07-22-brand-logo-uploads-manual-checkpoint.md |
| Status | **passed_with_notes** (automated passed; owner manual **PASS** 2026-07-22) |

---

## Automated

| Check | Command | Exit | Result |
|-------|---------|------|--------|
| Unit — brand logo helpers | `npx tsx --test packages/shared/src/constants/brand/brandLogoSettings.constants.test.ts` | 0 | pass (5) — includes matching default header/sidebar height 52 as independent fields |
| Unit — storage rules alignment | `npx tsx --test packages/shared/src/constants/storageRulesAlignment.test.ts` | 0 | pass (4, including brand path) |

### Not run (documented)

| Check | Why |
|-------|-----|
| Full monorepo typecheck / lint / build | Not required for this narrow slice; optional follow-up |
| Emulator rules tests | No harness run this session; alignment unit test covers path/MIME/size strings |
| E2E | None for Settings logo upload |

---

## Manual

See `docs/workflow/reviews/2026-07-22-brand-logo-uploads-manual-checkpoint.md`.

| Result | Date | By |
|--------|------|-----|
| **PASS** | 2026-07-22 | owner |

Covered after iterative fixes: separate Portal header / Portal sidebar size controls (matching defaults height 52); height-only sidebar/header sizing (no letterbox under max-width); guest mobile header Login hide + bottom nav guest bar; logo flash mitigated via localStorage cache.

**Soft-deploy (fresh-prints-dev, not production):** `finalizeBrandLogoSlot`, `updateBrandLogoDisplaySizes` (deployed mid-session after Save display sizes returned "internal"), `getPortalGlobalOpenGraph`, Firestore rules, Storage rules. Soft-deploy leftovers: none required for this goal on **dev** beyond what was already deployed. **Production** Functions / rules / storage deploy was **not** performed and remains gated.

---

## Notes

- Finalize callable accepts only `{ app, slot, storagePath }` or `{ app, slot, clear: true }`; metadata/URL come from Admin Storage.
- Production Functions / Firestore / Storage deploy remains **forbidden** until separate owner **APPROVE** after this signoff.
- Owner clarification 2026-07-22: Portal header and expanded sidebar are **separate** size controls with matching **defaults** (not one unified knob).
- Adjacent same-session fix (not in brand-logo plan scope): Studio Design Library `createdAt` desc enforcement — recorded as out-of-band QA fix on the branch.
