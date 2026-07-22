# Plan: Assisted Creation proof preview hang (Studio + Portal)

| Field | Value |
|-------|-------|
| Date | 2026-07-21 |
| Author | Agent (owner escalation) |
| Status | ready_for_review |
| Workflow | managed-phase / hotfix |
| Related | ADR-FP-110 proof hardening; 2026-07-21 Studio ref-thumb hang hotfix |

---

## Goal

Restore fast, reliable proof image previews in Studio Proofs tab and Portal customer status/proofs UI after staff submits a proof. Never leave infinite “Loading proof image…”. Do not mislabel load timeouts as “File removed” while status is `proof_ready`.

## Background

Owner escalation 2026-07-21: after proof submit, Studio thumbs stay empty/gray or show “File removed”; Portal shows “Loading proof image…” forever. Same class of bug as Assisted Creation **reference** thumbs (Decision Log 19:55): Electron/browser `getBytes` can hang indefinitely; ADR-FP-110 switched proof previews to `getBytes` → blob URL (opaque Storage names). References were fixed (signed URL first + timeout); **proofs were not**.

Portal StatusPanel also treats `proofUrl === null` as loading forever — failed loads never surface “Preview unavailable”.

Storage rules already allow customer + staff read on `…/proofs/{fileId}`; soft-deploy of Storage/Functions is only needed if rules drift or callable delivery is broken (not the primary hang).

## Scope

### In Scope

- Portal: proof preview load path (`getPreviewObjectUrl` / status panel / proofs panel / media thumbs) — signed download URL first with timeout; `getBytes` fallback with timeout; terminal unavailable UI
- Studio: proof thumb load in `AssistedCreationRequestsSection` — same order/timeouts as refs; prompt list update; distinguish purged vs load failure label
- ADR note amending ADR-FP-110 preview strategy (signed TTL URLs OK for preview; opaque names stay)
- Decision Log + manual verify steps
- Soft-deploy command prepared only if Functions/rules found broken (owner APPROVE)

### Out of Scope

- Changing opaque proof object naming
- Changing purge / download-callable / Add to Request flows
- Production deploy
- Email noreply smoke (parked)

---

## Affected Areas

### Files / Modules (expected)

- `apps/portal/features/assisted-creation/services/assistedCreationService.ts`
- `apps/portal/features/assisted-creation/components/AssistedCreationStatusPanel.tsx`
- `apps/portal/features/assisted-creation/components/AssistedCreationDetailPanels.tsx`
- `apps/portal/features/assisted-creation/components/AssistedCreationMediaThumbs.tsx`
- `apps/studio/.../AssistedCreationRequestsSection.tsx`
- `docs/project/DECISIONS.md` (ADR amend)
- `.cursor/workflow/state.md`

### Architecture Impact

- [x] Details: Prefer Storage signed download URL for preview; blob URL only as fallback. Layering unchanged (service owns Storage access).

### Security Impact

- [x] Details: Signed URLs with Firebase TTL remain auth-gated at mint time; not permanent public objects. Opaque names retained. Object URL revoke retained when blob path used. No rule relaxation required if current rules already allow owner/customer read.

### Data Model Impact

- [x] None

### Backend Impact

- [x] Details: No Functions change expected unless soft-deploy needed for unrelated drift. Storage rules: verify only.

### UI / UX Impact

- [x] Details: Loading → image or “Preview unavailable” within ~12–28s. Studio: “File removed” only when purged / missing path.

### Migration Impact

- [x] None

---

## Approach

1. Portal service: add timeout helper; change preview helper to **getDownloadURL first**, then timed `getBytes` → blob; log path-prefix failures.
2. Portal StatusPanel: track loading vs failed; never infinite “Loading proof image…”.
3. Portal DetailPanels / MediaThumbs: same service path; settle failures to unavailable (not eternal gray/loading).
4. Studio proofs effect: mirror ref loader (signed URL first, per-item settle, safety timer); seed loading placeholders so list updates promptly after snapshot; label load fail ≠ purged.
5. Document ADR amendment + Decision Log; manual verify Studio + Portal.
6. If soft-deploy needed: print exact command and wait for **APPROVE SOFT-DEPLOY**.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Portal unit (if touched utils) | existing portal vitest subset | if new pure helpers |
| Typecheck / lint | project scripts as available | preferred |
| Studio / Portal build | skip unless trivial | optional |

### Manual

| Step | Expected |
|------|----------|
| Studio: submit proof on AC request | Proofs tab shows thumb within seconds (not forever Loading / gray) |
| Studio: open proof row | Image visible; not “File removed” unless purged |
| Portal: customer `proof_ready` | Proof image loads; Approve/revisions usable |
| Portal: force offline Storage | Within timeout → “Preview unavailable”, not infinite Loading |

---

## Human Checkpoints

- Manual UI verify Studio + Portal after implement
- Soft-deploy only if owner approves and Functions/rules require it

## Risks and Rollback

| Risk | Mitigation |
|------|------------|
| Signed URL CORS in Electron | Keep timed getBytes fallback (same as refs) |
| Security concern on signed URL in img | TTL + opaque names; ADR amend |
| Mis-label still wrong | Separate `purged` vs `unavailable` |

Rollback: revert client preview helpers to prior getBytes-only (not recommended — hangs return).

## Open Questions

None blocking — owner mandated restore of fast previews.
