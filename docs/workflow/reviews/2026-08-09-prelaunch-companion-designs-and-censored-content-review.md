# Review: Pre-launch companion designs + Explicit / Censored Content (Plan)

| Field | Value |
|-------|-------|
| Date | 2026-08-09 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-08-09-prelaunch-companion-designs-and-censored-content-plan.md` |
| Verdict | **approved_with_changes** |

---

## Summary

Plan is solid, repo-grounded, and correctly scoped as voluntary pre-cutover hardening under Goal #13 after Stage 2 smoke **PASS / READY FOR CUSTOMERS**. Companion **Option A** (`companionSets` + design denorm) and optional `isExplicitContent` with localStorage censor preference match architecture and security constraints. Algolia non-touch MVP is the right default given Firestore hydration. Formal Review **approved_with_changes** — implementers must apply the listed amendments; no re-plan required unless owner rejects the model.

**STOP:** Do not implement until owner explicitly approves this reviewed plan.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Two features; preserves lifecycle/PR/Algolia/smoke behavior |
| Architecture alignment | pass | Services own mutations; Portal presentation-only censor |
| Security impact addressed | pass | Staff-only sets; ready-only companion discovery; OG split |
| Data model impact addressed | pass | Option A vs B compared; A recommended with rationale |
| Backend impact addressed | pass | Narrow Functions OG change; Rules/indexes called out |
| Test strategy adequate | pass | Unit + rules + OG + manual QA + post-prod smoke |
| Human checkpoints identified | pass | Plan approval; dev QA; prod deploys; cutover separate |
| Roadmap alignment | pass | Pre-cutover under #13; does not reopen closed gates |
| Documentation plan | pass | DATA_MODEL / DECISIONS / ROADMAP / DEPLOYMENT |
| No silent scope expansion | pass | No AI classify, auto-add, ecommerce, cutover |

---

## Architecture Review

**Findings:**
- Canonical Design remains Studio `design.types.ts`; Portal `CatalogDesign` stays a customer subset — correct.
- Central set + `companionSetId` / incomplete denorm avoids peer-array sync on designs.
- Portal must not read `companionSets` — plan enforces ready-design query; good.
- Preference via `themeService`-style localStorage is the simplest existing pattern; avoid Firestore customer prefs for this.

**Required changes:**
1. Name the denorm boolean one way in Implement (`companionSetIncomplete` **or** mirrored `companionSetComplete`) and use it consistently in types, filters, and docs — plan mentions both phrasings.
2. Specify AI Review companion UX as: **expects-companions control + incomplete indicator** only; full link/unlink/complete stays Design Library (avoid half-building two editors).

---

## Security Review

**Findings:**
- Censor is presentation, not ACL — `isPublicCatalogDesign` unchanged. Correct per owner.
- Direct-share unblurred OG is intentional; generic OG exclusion is mandatory — Functions change correctly identified.
- `companionSets` customer deny is required to prevent non-ready ID leakage.

**Required changes:**
- [ ] None beyond implementing staff-only Rules as planned.

**Human approval needed before production:**
- [x] Firestore Rules deploy
- [x] Firestore indexes deploy
- [x] Functions deploy (global OG)
- [x] Portal App Hosting + Studio package
- [x] Domain cutover (separate phrase; still deferred)

---

## Data Model Review

**Findings:**
- Option A preferred over B for single completion source and non-sync-prone membership — agrees with inspection.
- Optional `isExplicitContent` with missing=false avoids backfill — correct.
- Linking must not alter `status` — invariant + tests required.

**Required changes:**
1. Document max practical `memberDesignIds` soft cap in DATA_MODEL (e.g. warn in UI above 10) without hard product limit of 2/3 — keeps “arbitrary N” honest for Studio UX.
2. On empty set after last unlink: delete `companionSets` doc (plan says this — make it a hard Implement acceptance check).

---

## Backend Review

**Findings:**
- Algolia schema unchanged MVP is justified: search hydrates from Firestore; explicit designs stay searchable.
- Classifier must **not** accidentally treat companion/explicit as index-filter unless schema expands — call out in Implement PR description.
- Global OG currently samples ready designs without explicit filter — **must** change before production promotion of this feature if any explicit designs exist.

**Required changes:**
- [ ] None blocking; keep reconcile **off** unless Implement discovers a hard need (would require plan note + owner ack).

---

## Testing Review

**Findings:**
- Rules tests for `companionSets` are essential.
- OG unit coverage for exclude-explicit + keep-direct-share-unblurred is essential.
- Manual QA checklist matches product rules.

**Required changes:**
1. Add explicit regression: Halftone toggle still works alongside Explicit toggle (shared form panel).

---

## Documentation Review

**Findings:**
- DATA_MODEL + DECISIONS ADR + ROADMAP under #13 are sufficient.
- Update cutover checkpoint to record voluntary deferral for these enhancements (smoke already PASS).

---

## Required Changes (approved_with_changes)

1. Canonical denorm field name: pick **`companionSetIncomplete: boolean`** (true ⇒ Needs Companion) and use everywhere.
2. Split Studio UX: AI Review = expects + indicator; Design Library = link/unlink/complete.
3. Soft UI warning for very large sets (no hard N=3 cap).
4. Empty-set delete is mandatory on last unlink.
5. Halftone + Explicit coexistence regression in automated or manual tests.
6. Before Implement starts: owner must reply with explicit plan approval (e.g. `APPROVE PLAN: PRELAUNCH COMPANION AND CENSORED CONTENT` or clear equivalent).

---

## Blockers (if blocked)

None — not blocked.

---

## Verdict Rationale

Plan meets all 14 acceptance criteria with inspected file paths, a clear A-vs-B recommendation, deployment matrix, and correct deferral of domain cutover. Conditional approval encodes naming/UX split and test hardening without requiring a new Plan cycle.

---

## Next Step

**Await owner approval of this reviewed plan.** After approval → Implement phase within amended scope only. Do not deploy, reconcile Algolia, or execute cutover.
