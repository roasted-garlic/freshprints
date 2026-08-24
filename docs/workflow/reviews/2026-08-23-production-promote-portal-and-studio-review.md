# Review: Production promote Portal + Studio (2026-08-23)

| Field | Value |
|-------|-------|
| Date | 2026-08-23 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-08-23-production-promote-portal-and-studio-plan.md |
| Verdict | **approved_with_changes** |

---

## Summary

The production promotion plan is correctly sequenced (Git → scoped Firebase → App Hosting → Studio), grounded in a verified two-commit `production..development` delta, and respects FreshForge production gates. Approval is conditional on closing the **Class E DEV-signoff gap** for the show-discovery / Our Shows batch before any Gate B version pin or production mutation, and on updating ChatGPT handoff docs at Gate G as the owner requested.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Coordinated promote only; Phase 9 excluded |
| Architecture alignment | pass | Callables + Rules + Portal/Studio clients; no layer shortcuts |
| Security impact addressed | pass | Public show DTOs catalog-only; conversion fields Rules-locked; no secret exposure |
| Data model impact addressed | pass | Closure/conversion fields already documented (ADR-FP-142 era); no migration |
| Backend impact addressed | pass | Exact 4-Function allowlist + Rules; no indexes/storage |
| Test strategy adequate | pass | Full Gate B suite + Portal/Studio smoke lists |
| Human checkpoints identified | pass | Ordered phrases for each gate |
| Roadmap alignment | pass | Signed-off DEV work toward production; Phase 9 parked |
| Documentation plan | pass | Records + ROADMAP + **ChatGPT handoff** required |
| No silent scope expansion | pass | Only the two commits (+ 1.0.9 pin) |

---

## Architecture Review

**Findings:**
- Public show browsing via trusted callables matches ADR-FP-142.
- Grouped gang sheets remain Studio/Electron-local; efficiency path default preserved (ADR-FP-143).
- Portal App Hosting must not deploy until production Functions for public shows exist.

**Required changes:**
- [x] None beyond Class E gate below

---

## Security Review

**Findings:**
- Rules correctly freeze conversion linkage fields from client spoofing.
- `listPortalShowCatalogDesigns` must continue to exclude private customer uploads (smoke required).
- No new secrets in delta.

**Required changes:**
- [x] None

**Human approval needed before production:**
- [x] Production Git merge
- [x] Production Firebase deploy
- [x] App Hosting rollout
- [x] Studio publish

---

## Data Model Review

**Findings:**
- Additive optional conversion/closure fields; no breaking schema migration.
- Indexes not required for this delta.

**Required changes:**
- [x] None

---

## Backend Review

**Findings:**
- Allowlist matches DEV deploy executed 2026-08-22 for the same resources.
- `completeStaffGangSheetAndOpenNext` is an **update**; three Functions are **creates**.
- Production Git tip `27b0b4f` does **not** yet include these Functions — Gate D is mandatory before Portal features that call them.

**Required changes:**
- [x] None (command already exact in plan)

---

## Testing Review

**Findings:**
- Prior Studio workflow Signoff deferred full lint/package build — Gate B correctly restores those checks.
- Portal build requires local Firebase public env (known).
- Production smoke lists cover recent features including Standard vs Grouped gang sheets.

**Required changes:**
- [x] None

---

## Documentation Review

**Findings:**
- Formal Signoff missing for `customer-request-show-discovery-and-search-correctives` and `our-shows-page-ux-and-print-request-actions` despite owner promotion intent.
- `references/project-chatgpt-handoff/` absent (gitignored `references/`); must be recreated/updated at Gate G.

**Required changes:**
1. Owner Class E confirmation (or retrospective Signoffs) before Gate B
2. ChatGPT handoff update mandatory at Gate G

---

## Required Changes (approved_with_changes)

1. **Before Gate B / any production mutation:** Owner must confirm DEV acceptance of the `7dfd7ee` batch (show discovery + conversion + Our Shows UX) using the phrase in Next Step. On confirmation, create retrospective Signoff docs (or fold confirmation into this production Signoff Decision Log) so FreshForge records match promotion scope.
2. **Gate G:** Recreate/update `references/project-chatgpt-handoff/CURRENT-STATE.md` (and companion recent-completed/roadmap files if used) — do not skip because the folder was missing.
3. **Gate E start:** Re-verify live App Hosting build/source; do not assume `7716d4a` without a fresh read.
4. **Studio version:** Proceed with **1.0.9** only; do not invent alternate versions.

---

## Blockers

None that invalidate the plan structure. Class E confirmation is a **hard pre-Gate-B checkpoint**, not a reason to rewrite the release architecture.

---

## Verdict Rationale

**approved_with_changes** — Inventory, allowlists, sequencing, and rollback targets are sound. The only material FreshForge gap is incomplete DEV Signoff paperwork for commit `7dfd7ee`, which the owner’s promotion brief treats as signed-off intent but repo artifacts do not yet close. That must be confirmed explicitly before release prep begins. ChatGPT handoff updates are required per owner.

---

## Next Step

**STOP.** No Gate B, production PR, Firebase, App Hosting, or Studio dispatch until owner replies with approval phrases.

Recommended combined reply:

```text
APPROVE PRODUCTION RELEASE PLAN: production-promote-portal-and-studio-2026-08-23
CONFIRM DEV SIGNOFF FOR PROMOTION: customer-request-show-discovery-and-search-correctives + our-shows-page-ux-and-print-request-actions
```

After that: Gate B (pin Studio 1.0.9 + full verification) on `development` only — still no production mutation until subsequent gate phrases.
