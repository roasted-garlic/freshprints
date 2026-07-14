# Signoff: Admin operational test-data wipe

| Field | Value |
|-------|-------|
| Date | 2026-07-13 |
| Signoff by | Signoff Agent |
| Plan | docs/workflow/plans/2026-07-10-admin-operational-test-data-wipe-plan.md |
| Review | docs/workflow/reviews/2026-07-10-admin-operational-test-data-wipe-review.md |
| Related | ADR-FP-068 (updated 2026-07-13); customerUploads target via artwork upload G |
| Final status | **approved_with_notes** |

---

## Summary

Operational **Test Data Reset** (`wipeOperationalTestData`) is accepted as complete for workflow purposes. Owner confirmed (2026-07-13) that wipe must **not** ship as a production staff feature: **development Studio builds only**, **owner role only**, **allowlisted Firebase project `fresh-prints-dev` only**. Hardening applied at signoff to match that policy (narrowed from earlier owner/admin + any build pointed at the allowlisted project).

---

## Changes Delivered

### Behavior (existing + 2026-07-13 harden)
- Selectable wipe targets + presets; typed confirm `WIPE TEST DATA`
- Server project allowlist: `["fresh-prints-dev"]` only
- **Owner-only** callable (admins denied)
- Studio UI gated with `import.meta.env.DEV` **and** project allowlist — production Studio builds do not expose the sidebar/page controls
- Permission key `wipeOperationalTestData` (owner-only) for route + sidebar

### Documentation Updated
- SECURITY.md (owner can; admins cannot)
- DECISIONS.md ADR-FP-068 consequences

---

## Tests

### Automated
- Prior wipe target / plan expand unit coverage remains
- Policy change is small; redeploy Functions on `fresh-prints-dev` required for owner-only server gate

### Manual
| Test | Result | Approved by |
|------|--------|-------------|
| Wipe usable for owner on fresh-prints-dev in Studio `npm run dev` | PASS (owner acceptance) | owner 2026-07-13 |
| Not for production app / not for admins | PASS (policy + harden) | owner 2026-07-13 |

---

## Human Approvals Obtained
| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Production wipe / production project allowlist | **forbidden / not obtained** | 2026-07-13 | Explicitly out of scope forever without new plan |
| Business / policy | obtained | 2026-07-13 | Owner-only + dev Studio + fresh-prints-dev |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Callable still exists in Functions codebase for all projects | low | Runtime refuses non-allowlisted project IDs; never deploy wipe reliance on production |
| Production Studio build against fresh-prints-dev hides UI | info | Intended — use `npm run dev` for wipe |
| Redeploy Functions needed for owner-only server change | medium | Deploy `wipeOperationalTestData` to fresh-prints-dev |

---

## Deferred Items (Roadmap)
- None — wipe track closed under this policy

---

## Open Blockers
- [x] None

---

## Verdict

**approved_with_notes** — wipe accepted as a **dev-owner tooling** feature only; production shipping and admin access explicitly rejected.

---

## Workflow Complete
- [x] Included in 2026-07-13 parked/open batch closeout
- [x] ADR-FP-068 / SECURITY updated
- [x] `.cursor/workflow/state.md` updated
