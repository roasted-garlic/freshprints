# Review: Production Studio Storage unauthorized + bundled brand defaults

| Field | Value |
|-------|-------|
| Date | 2026-07-31 |
| Reviewer | Review Agent (independent) |
| Plan | `docs/workflow/plans/2026-07-31-production-studio-storage-unauthorized-and-bundled-brand-plan.md` |
| Incident | `docs/workflow/reviews/2026-07-31-production-studio-storage-unauthorized-incident.md` |
| Verdict | **approved_with_changes** |

---

## Summary

Diagnosis correctly rules out wrong packaged bucket/project, live Rules drift, App Check, and CORS,
and correctly reclassifies the brand Settings error as a failed authenticated create. The Plan
rightly refuses to redeploy identical Rules and splits Storage remediation from bundled branding.
Implementation must not start until the diagnostic gate selects class A/B/C and the matching
approval phrase is given; branding must wait for asset-mapping approval and owner files.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Two named workstreams; hard outs listed |
| Architecture alignment | pass | Preserves ADR-FP-114 runtime override |
| Security impact addressed | pass | No blind privilege expansion; claims path requires re-review of exact Rules diff |
| Data model impact addressed | pass | Brand settings absent today; no invented repair |
| Backend impact addressed | pass | Conditional Functions/Rules only for class A |
| Test strategy adequate | pass | Playground + owner QA + packaging checks |
| Human checkpoints identified | pass | Diagnostic + class-specific + brand mapping/implementation/release |
| Roadmap alignment | pass | Unblocks Goal #13 Stage 1 fixtures |
| Documentation plan | pass | Incident + Plan + handoff/state |
| No silent scope expansion | pass | Combined rebuild only if explicitly listed |

---

## Architecture Review

**Findings:**

- Single Firebase app for Auth/Storage is correct; rebuild not indicated unless class B.
- Bundled vs runtime layers correctly distinguished; `onError` fallback is a justified narrow UX fix
  during branding implementation, not a Storage incident fix.

**Required changes:**

- [x] Before any Storage implementation: complete diagnostic gate and record class A/B/C in Plan
      amendment or checkpoint doc.
- [ ] None other for architecture.

---

## Security Review

**Findings:**

- Live Rules already match source; redeploy without diff is waste and false confidence.
- Class A custom claims must not broaden beyond owner/admin/helper semantics already in Rules.
- Do not paste ID tokens, API keys, or download tokens into docs.

**Required changes:**

- [x] Any `storage.rules` diff requires a fresh security pass on the exact patch before
      `APPROVE PRODUCTION STORAGE RULES/CLAIMS REMEDIATION`.
- [x] Branding implementation must not weaken Storage brand predicates (2 MB PNG, owner-only write).

---

## Required changes before implementation

1. **Mandatory diagnostic gate** with `APPROVE PRODUCTION STORAGE WRITE DIAGNOSTIC` (or owner
   self-serve Console/Network evidence recorded in a checkpoint).
2. **Select remediation class** with evidence; amend Plan §Part A if class D.
3. **Do not** deploy Storage Rules, rebuild Studio, or change App Check until the matching
   class approval phrase.
4. **Branding:** obtain `APPROVE BRAND ASSET MAPPING` before accepting files as authoritative;
   obtain `APPROVE BUNDLED BRAND ASSET IMPLEMENTATION` before writing assets.
5. **Working tree hygiene:** do not commit pre-existing dirty app/PNG files from unrelated local
   edits as part of the diagnosis docs commit.

---

## Human checkpoints

| Checkpoint | Phrase / action |
|------------|-----------------|
| Storage diagnostic | `APPROVE PRODUCTION STORAGE WRITE DIAGNOSTIC` |
| Class A fix | `APPROVE PRODUCTION STORAGE RULES/CLAIMS REMEDIATION` |
| Class B fix | `APPROVE PRODUCTION STUDIO STORAGE AUTH FIX REBUILD` |
| Brand mapping | `APPROVE BRAND ASSET MAPPING` |
| Brand implement | `APPROVE BUNDLED BRAND ASSET IMPLEMENTATION` |
| Production Studio/Portal release | Separate, content-listed approvals |

---

## Verdict rationale

**approved_with_changes** — safe to proceed with owner diagnostic + asset-mapping checkpoints;
not approved to implement or deploy yet.
