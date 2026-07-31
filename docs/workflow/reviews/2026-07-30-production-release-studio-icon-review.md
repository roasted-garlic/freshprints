# Formal Review: Studio Desktop Icon Alignment (Goal #13 `production-release`)

| Field | Value |
|-------|-------|
| Date | 2026-07-30 |
| Plan reviewed | `docs/workflow/plans/2026-07-30-production-release-studio-icon-plan.md` |
| Verdict | **approved** |

---

## Review Method

Independently re-traced the collapsed-sidebar render path rather than accepting the Plan's citation
at face value: confirmed `Sidebar.tsx:365-372` renders `<AppLogo variant="collapsed" ...>` when
`isCollapsed` is true, confirmed `AppLogo.tsx:2,42` resolves the `collapsed` variant's fallback to
the exact import `studioLogoCollapsedUrl` from `.../assets/brand/fresh-prints-studio-logo-collapsed.png`,
and independently ran `sharp` metadata inspection on that exact file, confirming 6387×6405px RGBA
with alpha — matching the Plan's cited properties precisely, not merely restated from the Plan's
own prose. Independently read the actual image content (not just metadata) and confirmed it is the
circular "FP Request" mark with a transparent background, consistent with what the task described
as the icon to preserve.

Confirmed via the current `settings/brandLogos` cold-start finding (already established earlier
this same session's Phase D bootstrap-inventory work) that no custom logo override exists on
`fresh-prints-prod` — so the Plan's claim that this bundled asset is what's *actually* currently
displayed, not merely a theoretical fallback, is correct and traceable to real prior evidence in
this same conversation, not a new unverified assumption.

Independently confirmed the packaging gap is real: read `electron-builder.json5` directly and
confirmed `win.icon: "icon.ico"` / `linux.icon: "icon.png"` are already present, then confirmed via
a directory listing that neither file exists in `apps/studio/` — matching the "default Electron
icon is used" log line observed in this session's own prior build outputs (the original Studio
build and the white-screen-fix replacement build).

---

## Findings

### Confirmed accurate

- The source-of-truth identification is rigorous: it traces the actual component render path
  (not just "there's a logo file somewhere"), correctly distinguishes the collapsed variant from
  the full-wordmark variant (a real, easy-to-get-wrong distinction — the repo has both
  `fresh-prints-studio-logo.png` and `fresh-prints-studio-logo-collapsed.png`), and correctly rules
  out every item on the task's explicit exclusion list with a specific reason for each rather than
  a blanket "not used" claim.
- The Plan correctly identifies that the "REQUEST" text present in the source asset is not new text
  being added — it's already part of the asset — satisfying the task's "no added text unless
  already part of the icon" constraint without needing to strip or alter the artwork.
- The `BrowserWindow.icon` research (§3.3) is well-sourced (Electron's own docs plus a
  corroborating GitHub issue) and reaches a nuanced, correct conclusion: not required for the
  packaged Windows taskbar (redundant with `rcedit`-embedded resources), but genuinely worth fixing
  for dev-mode correctness since the current value points at a nonexistent file. This is exactly
  the right scope — neither ignoring the task's explicit question nor overstating the fix's
  packaged-build significance.
- The Plan is honest about what it cannot verify from this environment (icon rendering in Windows
  Explorer/taskbar, icon-cache staleness) and correctly defers those to the owner's retest rather
  than fabricating a "verified" claim — consistent with the precedent set by the white-screen-fix
  Plan's identical environment-limitation handling.

### Minor gaps (do not block approval — recommend addressing during Implementation)

1. **§3.1 step 3's `[NEEDS REPO CHECK]` on the `.ico`-writing tool** — appropriately left open
   rather than naming an unverified package. Recommend Implementation select a small, single-purpose,
   actively-maintained library, confirm its license is compatible with this repository's existing
   dependency posture, and scope it narrowly (a one-time asset-generation script, not a runtime or
   build-pipeline dependency) — the Plan's own framing already anticipates this correctly.
2. **§3.1 step 1's padding question** — reasonable to defer to Implementation with a visual check,
   since the existing asset already has substantial transparent margin around the circular mark
   (visible in the source image); Implementation should still explicitly measure/confirm the margin
   is proportionally sufficient at 16×16 before considering this step complete, not assume the
   large source image's margin ratio survives naive downscaling without inspection.
3. **§5 item 3's small-size clipping check** — correctly named as an explicit verification step;
   recommend Implementation actually render and visually inspect (not just generate) the 16×16 and
   32×32 outputs before considering the `.ico` complete, since small-size legibility of a mark with
   a thin outer ring (the teal ring at native resolution) is a real risk at 16×16 specifically.

### No blocking findings

No fabricated file path or Electron/electron-builder API. The existing `win.icon`/`linux.icon`
configuration keys are used exactly as they already exist, not reinvented. No production
Firebase/data/infrastructure surface is touched. The Plan does not claim the fix is guaranteed
correct without the owner's real-machine visual retest — consistent with this environment's
demonstrated inability to render Windows Explorer/taskbar icon previews, the same limitation
already established and accepted in the white-screen-fix precedent.

---

## Verdict Rationale

**Approved.** The source-of-truth identification is well-evidenced (component trace + direct image
inspection + a real cold-start-config cross-check from earlier in this session, not a fresh
assumption), the packaging gap is real and independently confirmed, and the `BrowserWindow.icon`
research correctly answers the task's explicit question with a nuanced, sourced conclusion rather
than a guess. Implementation should proceed to §3, complete the verification suite in §5 to the
extent this environment allows, and must stop at the `development`→`production` PR checkpoint per
§6 — no replacement installer may be built until that PR is confirmed merged and the exact commit
re-verified, matching the same discipline applied to the white-screen-fix remediation.
