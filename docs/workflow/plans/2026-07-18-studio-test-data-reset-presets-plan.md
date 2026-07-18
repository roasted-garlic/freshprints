# Plan: Studio Test Data Reset — presets + shorter labels

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-18-studio-test-data-reset-presets-review.md |

---

## Goal

Make Studio **Test Data Reset** faster to use: short target labels, preset buttons for common wipe intents, and expand named wipe targets so a print / Etsy / Custom Requests wipe also clears the **orphaned side collections** left behind on `fresh-prints-dev` after the last wipe — without changing safety gates (dev UI gate, owner role, phrase confirm, designs extra modal).

## Background

Current UI shows long checkbox labels + always-visible multi-sentence descriptions, and only one multi-target preset (“Print-request reset (keep shows)”). Owner wiped print / custom / Etsy parents and still saw leftovers (`assistedCreationUpdateAcks`, `customerNotifications`, `emailDeliveryJobs`, legacy `customRequests` / `customRequestEtsySearchRateLimits`, inert Etsy cache/config). Classification (2026-07-18): those were never in wipe expansion. Prefer **expanding named presets/targets** over a separate “Leftover side data” preset so the next intentional wipe does not leave the same orphans.

Refs: ADR-FP-068; `packages/shared/src/utils/operationalWipeTargets.ts`; `apps/studio/.../test-data-reset/`; leftover analysis decision log 2026-07-18.

---

## Scope

### In Scope

1. **Short labels** on wipe target checkboxes (e.g. Print Requests, Etsy, Custom Requests).
2. **Collapsible / secondary help** for long explanations — critical safety notes remain reachable (designs catalog, accounts kept, confirm phrase).
3. **Preset buttons** for wipe intents that map to one or more targets (see Preset matrix).
4. **Expand wipe plans** so named targets delete related orphan/side collections (see Orphan inclusion).
5. Unit tests for expanded plans + preset target lists; update TESTING.md wipe notes briefly.
6. Soft-reload Studio after implement (no production wipe).

### Out of Scope

- Production wipe / production deploy of functions without explicit owner approval
- Deleting catalog/product config treated as **Ask** in leftover analysis: `etsyRecommendationSuggestions`, `etsySuggestionRequests`, `customers/*/webPushSubscriptions`
- Auto-including `customerUploads` inside Print Requests (still separate; Ask for donation fixtures)
- One-off console `CLEAN DEV LEFTOVERS` deletes (separate owner command)
- Retention maintenance panel changes

---

## Preset matrix (deliverable)

| Preset button | Checks (targets) | Notes |
|---------------|------------------|-------|
| **Print Requests** | `printRequests`, `sequences`, `designRequestStats` | Same as today’s `PRINT_REQUEST_RESET_PRESET_TARGETS`; keeps upcoming shows. Bundled deletes already include staff inbox acks/deliveries + queue attachments. |
| **Etsy** | `etsySearches` | Single checkbox; expansion adds inert/legacy Etsy side collections (below). Does **not** wipe admin suggestion overlays. |
| **Custom Requests** | `assistedCreationRequests` | Single checkbox; expansion adds acks, notifications, email jobs, legacy `customRequests`. |
| **Customer Uploads** | `customerUploads` | Convenience; already expands to upload ops collections. |
| **Designs + prints** | `designs` (toggle also forces `printRequests` + `sequences`) | Triggers existing designs warning modal path. |
| **Select all** | `ALL_OPERATIONAL_WIPE_TARGETS` | Existing. |
| **Clear** | `[]` | Existing. |

Presets that are single-target still earn a button because owner intent is named (“Etsy”, “Custom Requests”) and expansion makes that one target complete.

### Label renames

| Target id | New short label |
|-----------|-----------------|
| `printRequests` | Print Requests |
| `showQueueAttachments` | Queue Attachments |
| `upcomingShows` | Upcoming Shows |
| `sequences` | Sequences |
| `designRequestStats` | Design Stats |
| `designs` | Designs |
| `customerUploads` | Customer Uploads |
| `etsySearches` | Etsy |
| `assistedCreationRequests` | Custom Requests |

Long copy moves under a collapsed “What this deletes” (or similar) per row / shared help; page header keeps short safety summary (accounts/settings kept; phrase confirm unchanged).

### Orphan inclusion (expand existing targets — preferred)

| When wiping | Also delete (new in expansion) | Intentionally **not** included |
|-------------|-------------------------------|--------------------------------|
| `assistedCreationRequests` / Custom Requests preset | `assistedCreationUpdateAcks`, `customerNotifications`, `emailDeliveryJobs`, `customRequests` (legacy) | web push tokens |
| `etsySearches` / Etsy preset | `etsyRecommendationConfig`, `etsyWebsiteSearchCache`, `customRequestEtsySearchRateLimits`, `etsyRecommendationSuggestions`, `etsySuggestionRequests` | — |
| `printRequests` / Print Requests preset | *(no new collections — acks/deliveries already bundled)* | `customerUploads*` (separate preset) |
| `customerUploads` | *(already includes batches/rate limits/leases/idempotency)* | — |

**Owner follow-up 2026-07-18:** include suggestion overlays + suggestion requests in Etsy wipe (previously Ask/excluded).

Update `OPERATIONAL_WIPE_DELETE_COLLECTION_ORDER` with new collection names in safe order (side collections before / with their parents as appropriate).

---

## Affected Areas

### Files / Modules (expected)

- `packages/shared/src/utils/operationalWipeTargets.ts` (+ tests)
- `packages/shared/src/types/admin/wipeOperationalTestData.types.ts` — only if new target ids (prefer **no** new ids; expand collections only)
- `functions/src/wipeOperationalTestData.ts` — uses shared expand; verify no hard-coded collection list drift
- `apps/studio/.../test-data-reset/constants/wipeTargetOptions.ts`
- `apps/studio/.../test-data-reset/pages/TestDataResetPage.tsx`
- `apps/studio/.../styles/components/test-data-reset.css`
- `docs/standards/TESTING.md` (wipe section)
- Optional one-line note in `docs/architecture/DATA_MODEL.md` or `DECISIONS.md` if wipe contract changes meaningfully

### Architecture Impact

- [x] Details: Shared wipe expansion remains SSOT; Studio UI only selects targets / presets. No new client Firestore deletes.

### Security Impact

- [x] Details: Same gates — development Studio UI + allowlisted project + owner + confirmation phrase + designs ack. Expanding deletes on **dev allowlist only** still cannot run on non-allowlisted projects. No production deploy in this phase unless owner explicitly requests functions redeploy to `fresh-prints-dev`.

### Data Model Impact

- [x] Details: No schema change. Broader **delete set** for existing operational wipe targets on allowlisted projects only. Document in plan/TESTING.

### Backend Impact

- [x] Details: Redeploy `wipeOperationalTestData` to `fresh-prints-dev` required before expanded deletes take effect in the cloud (local Studio UI works immediately for presets/labels; server expansion needs deploy). **No production.**

### UI / UX Impact

- [x] Details: Test Data Reset page — presets row denser; shorter labels; descriptions collapsed. Manual UI check recommended.

### Migration Impact

- [x] None (no migration). Existing orphan docs deleted only when owner runs wipe after deploy.

---

## Approach

1. Add shared preset constants (`ETSY_WIPE_PRESET_TARGETS`, `CUSTOM_REQUESTS_WIPE_PRESET_TARGETS`, `CUSTOMER_UPLOADS_WIPE_PRESET_TARGETS`, `DESIGNS_WIPE_PRESET_TARGETS`) next to `PRINT_REQUEST_RESET_PRESET_TARGETS`; keep `applyOperationalWipeTargetToggle` behavior.
2. Extend `OPERATIONAL_WIPE_DELETE_COLLECTION_ORDER` + `expandOperationalWipePlan` for orphan collections listed above.
3. Shorten `OPERATIONAL_WIPE_TARGET_OPTIONS` labels; move long text to expandable help / `title` + details.
4. Wire preset buttons on `TestDataResetPage`; rename Print-request reset → **Print Requests**.
5. Update unit tests; briefly update TESTING.md wipe bullet list.
6. Soft-reload Studio; document re-test steps (no production wipe).

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Unit tests | `npx tsx --test packages/shared/src/utils/operationalWipeTargets.test.ts` (and UI safety test if present) | yes |
| Typecheck | Studio/shared as needed (`tsc` / package scripts) | yes if touched types |
| Lint | project lint if configured for touched paths | no if not configured |
| Build | no full build required for shared+renderer copy | no |
| Functions deploy | **not** in automated gate; note manual redeploy to `fresh-prints-dev` for orphan deletes | deploy when owner asks |

### Manual

- [x] Details: Soft-reload Studio → Test Data → verify short labels, preset clicks select expected checkboxes, designs still opens catalog warning, phrase confirm unchanged, non-owner / wrong project still gated. Optional: after `fresh-prints-dev` function redeploy, wipe Custom Requests / Etsy and confirm orphan collections gone (dev only).

---

## Human Checkpoints Anticipated

- [x] Manual UI/UX review (soft — owner glance after soft-reload)
- [ ] Design approval — not required (dev-only ops UI)
- [ ] Production deploy — **forbidden**
- [x] Functions redeploy to `fresh-prints-dev` — ask owner when ready so expanded deletes apply
- [ ] Secrets / env — none

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Deleting `customerNotifications` / `emailDeliveryJobs` with Custom Requests wipe surprises owner who only wanted request docs | Low (dev) | Document in expandable help; keep phrase confirm |
| UI presets ship before functions redeploy → orphans still remain | Medium | Call out redeploy in signoff / re-test; UI still improves labels/presets |
| Accidental wipe of suggestion overlays | Low | Explicitly exclude Ask collections |
| Scope creep into leftover console cleanup | Medium | Out of scope; separate `CLEAN DEV LEFTOVERS` |

See also: `.cursor/workflow/risk-checklist.md`

---

## Rollback Plan

Revert shared expand + Studio UI commits. Redeploy previous `wipeOperationalTestData` to `fresh-prints-dev` if needed. No production impact if never deployed there.

---

## Documentation Updates Required

- [x] TESTING.md — wipe presets + expanded side collections
- [ ] Other: optional DECISIONS one-liner if wipe contract change is treated as ADR amendment to ADR-FP-068

---

## Open Questions

- [x] None blocking — Ask-row collections (suggestions, web push, bundling uploads into print) stay **excluded** per leftover analysis unless owner later says otherwise.

---

## Approval

- Review doc: docs/workflow/reviews/2026-07-18-studio-test-data-reset-presets-review.md
- Verdict: pending
