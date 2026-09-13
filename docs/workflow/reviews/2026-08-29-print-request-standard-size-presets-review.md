# Review — Print Request Standard Size Presets

| Field | Value |
|-------|-------|
| Date | 2026-08-29 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-08-29-print-request-standard-size-presets-plan.md` |
| Verdict | **approved_with_changes — owner checkpoint cleared 2026-08-29** |
| Amendments | 2026-08-29 — Studio title truncation parity (re-reviewed) |

---

## Summary

The plan correctly anchors preset apply on existing shared sizing (`calculateLockedHeightFromWidth`, `assessPrintRequestItemSize`) and avoids parallel validation or fixed height boxes. **Owner approved 2026-08-29:** full default width table, persisted `standardSizePresetKey`, owner-only Settings, and Hat `front_panel` / `side_panel` groups (not age groups). Implement authorized on `development`.

**Amendment (2026-08-29):** Portal title truncation was inspected in `apps/portal/styles/requests.css` — single-line ellipsis + bounded body `min-height`, not line-clamp. Studio currently uses a **2-line** `-webkit-line-clamp` in `print-requests.css`, which explains control misalignment. The amended plan requires CSS-only Studio parity before Standard Size placement. **No new blockers.** Existing human checkpoint unchanged.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | V1 settings + modal + cards; explicit out-of-scope list |
| Architecture alignment | pass | Component → hook → service → Firebase; shared apply helper |
| Security impact addressed | pass | Callable-only settings write; server parse; signed-in read |
| Data model impact addressed | pass | `standardSizePresetKey` proposed; rules/tests noted |
| Backend impact addressed | pass | Callable + optional loader pattern documented |
| Test strategy adequate | pass | Unit, rules alignment, emulator, manual QA |
| Human checkpoints identified | pass | Default widths blocking; DEV QA before signoff |
| Roadmap alignment | pass | Phase 6 / Phase 8 fast-follow |
| Documentation plan | pass | DATA_MODEL, BACKEND, WORKFLOWS |
| No silent scope expansion | pass | Title parity is layout-only; tied to Standard Size card work |

---

## Amendment review — Studio title truncation parity (2026-08-29)

| Check | Status | Evidence |
|-------|--------|----------|
| Display/layout change only | pass | CSS in `print-requests.css`; full `{title}` string unchanged in TSX |
| No persisted design-title data changes | pass | Same resolution chain `design?.title ?? upload?.title ?? titleSnapshot` |
| No Print Request item identity impact | pass | No model/service field changes for titles |
| No sizing math impact | pass | Out of scope for title CSS |
| No 200 DPI / 22″ guard impact | pass | Unchanged |
| No second title-formatting convention | pass | Copy Portal mechanism from `requests.css`; remove Studio 2-line clamp |
| Portal implementation inspected (not approximated) | pass | `.portal-request-item-editor-body h2` rules verified |

**Portal reference (inspected):**

- `apps/portal/features/print-requests/components/PortalPrintRequestItemCard.tsx` — `<h2>{title}</h2>`
- `apps/portal/styles/requests.css` — `.portal-request-item-editor-body` (`min-height: 2.6rem`) + `h2` (`white-space: nowrap`, `text-overflow: ellipsis`, `overflow: hidden`)
- Full title **not** on truncated `h2` via native `title`; lightbox + `aria-label` paths only

**Studio changes (planned):**

- `apps/studio/src/renderer/src/styles/components/print-requests.css` — `.print-requests-item-card-title`, `.print-requests-item-card-copy`
- `PrintRequestItemCard.tsx` — no persistence changes expected

**Portal changes:** none.

**Verdict after amendment:** **approved_with_changes** (unchanged). **No new blocker.**

---

## Architecture Review

**Findings:**

- Item cards identified accurately: Studio `PrintRequestItemCard.tsx`, Portal `PortalPrintRequestItemCard.tsx`.
- Shared sizing path is correct and matches ADR-FP-075 / ADR-FP-080 clarified manual-save policy from the 2026-08-20 sizing signoff.
- No shared UI package exists; plan correctly limits cross-app sharing to model + apply helper + settings resolve.
- Placement tabs (`full_front`, etc.) are intentionally separate from design `artworkPlacement` (`packages/shared/src/constants/design/artworkPlacement.constants.ts`) — plan should note this distinction in Implement to avoid conflating metadata.

**Required changes:**

- [x] Document placement-tab vs design-placement distinction (added to implement note below).

---

## Security Review

**Findings:**

- Follows established `settings/printRequestLimits` pattern: client read, callable write, `write: if false` in rules.
- Preset widths capped at 22″ in callable parse aligns with save policy.
- Portal signed-in read is appropriate (customers need presets on their requests).

**Required changes:**

- [ ] None

**Human approval needed before production:**

- [ ] Callable + rules deploy to production (standard FreshForge checkpoint)

---

## Data Model Review

**Findings:**

- `sizeLabel` is a formatted inch string today — reusing it would break consumers. Optional `standardSizePresetKey` is the right approach.
- Clearing key on manual width divergence matches product intent (Custom display).
- Settings changes do not retroactively update items — correct.

**Required changes:**

- [ ] Owner confirms persisted `standardSizePresetKey` vs session-only (plan recommends persisted — accept or override before Implement).

---

## Backend Review

**Findings:**

- `updateStandardPrintSizesSettings` callable mirrors `updatePrintRequestLimitSettings.ts` — appropriate.
- Service layer must extend `UpdatePrintRequestItemInput` in Studio and Portal update paths; plan lists this.

**Required changes:**

- [ ] None

---

## Testing Review

**Findings:**

- Plan lists existing sizing tests that must remain green.
- New tests for apply helper, settings parse/resolve, and rules alignment are appropriate.
- Manual QA covers mobile Portal modal and catalog vs upload items.

**Required changes:**

- [ ] None

---

## Documentation Review

**Findings:**

- DATA_MODEL, BACKEND, WORKFLOWS updates identified.
- ADR-FP-075/080 referenced correctly; no new ADR required unless owner wants preset policy recorded (optional follow-up).

---

## Required Changes (approved_with_changes)

1. **Owner must complete and approve the default preset width table** (all placements/groups) before Implement — no placeholder widths in code.
2. **Owner must confirm group membership** for Full Back, Back Collar, Left Chest, Sleeve, and Hat (structure only in plan today).
3. **Owner must confirm** `standardSizePresetKey` persistence decision (recommended: persist).
4. **Owner must confirm** Settings tab permission (recommended: owner-only, like print limits).
5. **Implement note:** Do not conflate Standard Size **placement tabs** with design **`artworkPlacement`** metadata.

---

## Blockers (if blocked)

None for **Plan + Review** completion. **Implement is blocked** until items 1–2 above are owner-approved.

---

## Verdict Rationale

The plan is technically sound, repo-grounded, and respects existing sizing authority. The only material gap is product data: preset widths and non–Full Front group structures are not derivable from the repository. Marking them `[NEEDS OWNER INPUT]` and gating Implement is correct. Conditional approval allows the workflow to proceed to owner sign-off on the plan while preventing silent invention of business defaults.

---

## Owner manual test checkpoint (prepare before Signoff)

**Feature / area:** Print Request Standard Size presets (Studio + Portal)  
**Why automated tests are insufficient:** Modal layout on mobile, card height, visual tile selection, and cross-app UX parity.  
**Environment:** local DEV against `fresh-prints-dev` after callable/rules deploy  
**Prerequisites:** Owner-approved default widths loaded in Settings; catalog item + customer-upload item on same request

### Steps

1. Studio → Print Request → item card → **Standard Size** → Full Front → Adult L → Apply → **Expected:** width updates, height aspect-locked, DPI badge updates, autosave succeeds if ≥200 DPI and ≤22″.
2. Repeat on Portal mobile-width viewport → **Expected:** modal usable, no page horizontal scroll, Apply same behavior.
3. Select preset that would yield &lt;200 DPI → **Expected:** Apply disabled with existing error messaging; no clamp.
4. Select preset that would exceed 22″ on either axis → **Expected:** Apply blocked with existing oversize messaging.
5. After preset apply, manually change width → **Expected:** control shows Custom (preset key cleared).
6. Studio Settings → disable a preset → **Expected:** hidden in both apps; existing items unchanged.
7. Change preset width in Settings → apply on **new** selection → **Expected:** new width; existing saved items unchanged.
8. Duplicate preset-sized item → **Expected:** duplicate copies dimensions and preset label behavior per approved persistence decision.
9. Queue item to show → **Expected:** queued inches match card (no regression from shared sizing work).

#### Studio title layout (amendment)

Create or use a Print Request with short, medium, and very long design titles. Verify in Studio:

- Title truncation matches Portal (single-line ellipsis; aligned title region across cards)
- Standard Size (once implemented), Width/Height, DPI, quantity, Duplicate, Remove stay aligned
- No overlap/clipping; persisted design title unchanged

Compare equivalent Portal card side-by-side.

Also verify narrow Studio width; catalog + customer-upload items.

### Pass criteria

- [ ] All acceptance criteria in plan owner brief met (including title parity amendment)
- [ ] No card layout height regression
- [ ] Manual sizing unchanged

### Please reply with

- `PASS` — all criteria met
- `FAIL: [description]`
- `PASS WITH NOTES: [notes]`

---

## Next Step

**Await owner approval** of:

1. This plan + review (including `approved_with_changes` items)
2. Completed default width table

Then set workflow to **Implement** phase.

---

## Corrective review — Fresh Prints Standard Size Defaults v1 (2026-08-29)

| Field | Value |
|-------|-------|
| Authorization | `CONTINUE WORKFLOW: STANDARD SIZE DEFAULTS + SUB-TAB CORRECTIVE` |
| Prior owner QA | **PASS WITH NOTES** |
| Verdict | **approved_with_changes** — no new architectural conflict |

| Check | Status | Notes |
|-------|--------|-------|
| Width-only preset model preserved | pass | No height constraints added |
| Strong typing preserved | pass | `pocket` placement + group added to unions |
| Forward-compatible resolve | pass | Canonical defaults + key overlay; no silent Firestore rewrite |
| Reset to Defaults explicit path | pass | Owner Reset → Save replaces DEV saved doc |
| Modal Placement → Group → Size | pass | Sub-tabs in Studio + Portal modals |
| Backend scope | pass | Callable redeploy required for v1 parse; rules unchanged |
| Production | blocked | Not authorized |

**Next:** Owner focused re-QA after DEV callable redeploy; no signoff until PASS.

