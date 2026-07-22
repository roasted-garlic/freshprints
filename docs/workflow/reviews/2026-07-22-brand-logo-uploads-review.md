# Review: Brand logo uploads (Studio + Portal)

| Field | Value |
|-------|-------|
| Date | 2026-07-22 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-07-22-brand-logo-uploads-plan.md |
| Verdict | **approved** |
| Amended | 2026-07-22 — concurrency isolation; authoritative Storage metadata; implementation approved; production deploy still gated |

---

## Summary

Plan correctly replaces static folder drops with owner Settings uploads for four logo slots (Studio/Portal × full/collapsed), following existing settings + Storage patterns. Amendments require concurrent isolation from `firestore-usage-efficiency` (no parking, no shared workflow-state takeover) and a finalize callable that derives `contentType`, `byteSize`, and download URL from authoritative Storage metadata—not client claims. **Implementation is approved.** Production deploy of Functions, Firestore rules, and Storage rules remains a separate human checkpoint.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Four slots; favicons/splash explicitly out |
| Architecture alignment | pass | Settings service + callable; logos resolve via hooks |
| Security impact addressed | pass | Owner write; public read justified; server-authoritative metadata |
| Data model impact addressed | pass | Additive `settings/brandLogos`; no migration |
| Backend impact addressed | pass | Storage prefix + finalize/clear + OG URL |
| Test strategy adequate | pass | Shared helpers + manual UI; rules deploy gated |
| Human checkpoints identified | pass | Manual UI; production rules/Functions separate |
| Roadmap alignment | pass | Concurrent with Firestore efficiency; does not replace it |
| Documentation plan | pass | DATA_MODEL / BACKEND / DEPLOYMENT / DECISIONS |
| No silent scope expansion | pass | Splash/favicons out; PNG-only v1 |
| Concurrent isolation | pass | Branch/worktree; no overwrite of Firestore efficiency state |

---

## Architecture Review

**Findings:**
- Matches Studio Settings tab + owner callable pattern (`portalSocialMeta`).
- Keeping bundled/`public` PNGs as fallbacks is required for Electron offline and missing-doc cases.
- Presentational `AppLogo` / `PortalLogo` should receive resolved `src` from a thin hook/context (or prop), not open Storage themselves.
- Must not treat this goal as replacing the active Firestore efficiency workflow.

**Required changes (incorporated into amended plan):**
- [x] Resolve URLs in a dedicated hook/service per app; keep logo components dumb.
- [x] Shared path builder as single source of truth for Studio upload, callable validation, and rules-alignment tests.
- [x] Implement on isolated branch/worktree; do not overwrite `.cursor/workflow/state.md` or Firestore efficiency records.
- [x] Pre-merge conflict check: Functions exports, Firestore/Storage rules, docs, shared constants, workflow state.

---

## Security Review

**Findings:**
- Public read of `brand/**` and `settings/brandLogos` is appropriate (URLs/metadata only; needed for Portal guests + OG).
- Client Storage create for owners is consistent with other staff uploads; finalize callable is authoritative for Firestore (deny client writes).
- **Client must not be trusted for `contentType`, `byteSize`, or download URL.** Finalize obtains these from Admin Storage metadata / server-built download URL after verifying path ↔ app/slot binding.
- Clearing only in Firestore would leave public objects — callable must Admin-delete on clear/replace.
- Public read limited to `brand/{studio|portal}/{full|collapsed}/{fileName}` with strict filename pattern (uuid + `.png`).

**Required changes (incorporated):**
- [x] Finalize payload: `{ app, slot, storagePath }` (or clear); server reads metadata; rejects bad MIME/size; writes server-derived fields.
- [x] Storage rules: PNG, size ≤ 2 MiB, canonical filename; create-new + delete-old.
- [x] Firestore: explicit `settings/brandLogos` match — public read; write false.

**Human approval needed before production:**
- [x] Deploy Storage rules, Firestore rules, and brand logo Functions (**separate checkpoint**; not granted by implementation approval)

---

## Data Model Review

**Findings:**
- Slot shape with `storagePath`, server `downloadUrl`, metadata fields, audit is sufficient.
- Optional/null slots → fallback is clear; no backfill.

**Required changes (incorporated):**
- [x] Persist `downloadUrl` / `contentType` / `byteSize` from server only.
- [x] Clear: null/delete field consistently via shared `resolve` helper.

---

## Backend Review

**Findings:**
- OG logo mode must return absolute `portalFull.downloadUrl` when present.
- Functions export registration must be merged carefully with concurrent Firestore efficiency changes.

**Required changes (incorporated):**
- [x] Update `getPortalGlobalOpenGraph` (and share-meta logo fallbacks) to prefer `portalFull.downloadUrl`.
- [x] Export/register new callable; conflict-check on merge.

---

## Testing Review

**Findings:**
- Shared parse/path/resolve unit tests plus finalize “do not trust client metadata” coverage.
- Manual UI across Studio chrome + Portal shell/auth is mandatory.

**Required changes (incorporated):**
- [x] Unit tests for path builder, resolve-with-fallback, callable input parse / metadata authority.
- [x] Manual checkpoint: four slots, collapsed, Clear→fallback, guest Portal auth logo.

---

## Documentation Review

**Findings:**
- DATA_MODEL / BACKEND / DEPLOYMENT / DECISIONS correctly identified.
- Brand-logo docs/signoff must not rewrite Firestore efficiency workflow status.

**Concurrent workflow (amended):**
- `firestore-usage-efficiency` **continues** and is **not** parked, deferred, or awaiting owner direction to resume because of brand-logo work.
- Brand-logo status is tracked in this plan/review pair; shared `state.md` remains owned by the active Firestore efficiency agent while that goal is in progress.

---

## Required Changes (historical — now in amended plan)

1. Dumb logo components + dedicated resolve hook/service; shared path builder.
2. Finalize/clear callable: path/slot binding; **Admin metadata for contentType/byteSize; server download URL**; delete prior object; strict Storage/Firestore rules.
3. OG/share uses absolute `portalFull.downloadUrl` when set.
4. Unit + manual tests as above.
5. No favicons/splash; keep static PNG fallbacks.
6. Concurrent isolation + pre-merge shared-file conflict check; never mark Firestore efficiency as parked.

---

## Blockers (if blocked)

(none)

---

## Verdict Rationale

Prior **approved_with_changes** items are incorporated into the amended plan, plus owner-required concurrency and authoritative-metadata rules. Verdict upgraded to **approved**. Implementation may proceed on an isolated branch/worktree. Production Functions / Firestore rules / Storage rules deploy remains a separate human checkpoint.

---

## Next Step

**Implement** brand-logo scope on an isolated branch/worktree (do not overwrite Firestore efficiency workflow state). Automated Test → manual UI checkpoint → Signoff for this goal only. Before merge: conflict-check shared files. Stop for owner before production rules/Functions deploy.
