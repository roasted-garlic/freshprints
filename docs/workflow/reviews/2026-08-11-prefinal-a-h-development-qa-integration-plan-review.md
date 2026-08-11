# Formal Review: Prefinal A–H development QA integration plan

| Field | Value |
|-------|-------|
| Date | 2026-08-11 |
| Reviewer | Review Agent (independent of Planning Agent) |
| Plan | `docs/workflow/plans/2026-08-11-prefinal-a-h-development-qa-integration-plan.md` |
| Checklist | `docs/workflow/reviews/2026-08-11-prefinal-a-h-development-qa-checklist.md` |
| Verdict | **approved_with_changes** |

---

## Summary

The plan correctly maps SHA topology (development lagging/diverged from production), preserves reviewed A–H tips including H commit `6150eee`, isolates Algolia DEV (`portal_catalog_ready_dev` / app `WQ6OPP2E6Z`) from prod (`portal_catalog_ready_prod` / app `Z1FVCM5QUX`), scopes Functions+Storage for `fresh-prints-dev` only, confirms H purpose indexes already exist on DEV, and correctly forbids App Hosting on DEV per `DEPLOYMENT.md`. Integration should start from **`origin/production`**, not lagging `development`, to avoid unnecessary doc-only merge noise while keeping all reviewed A–H product commits.

**No integration merge and no DEV deploy were performed in this review.**

---

## Challenge results

| # | Challenge | Result |
|---|-----------|--------|
| 1 | Integration loses reviewed A–H code? | **pass** if merge order Portal→OG→Intake→Quota→H from `913329c` base; product paths largely disjoint |
| 2 | Current development conflicting work? | **pass with note** — development-only delta is docs/scripts; no A–H product overlap. Starting from `development` would force absorbing production first (state.md conflicts only) |
| 3 | Dev Algolia safely isolated? | **pass** — local/Functions DEV use `_dev` index + different app ID than prod |
| 4 | Functions deployment scoped? | **pass** — explicit allowlist; do not deploy all Functions |
| 5 | Storage Rules required? | **pass** — OG static-og path requires DEV `storage` deploy |
| 6 | Dev indexes present? | **pass** — both purpose composites listed on `fresh-prints-dev` |
| 7 | Local Studio → fresh-prints-dev? | **pass** — `VITE_FIREBASE_PROJECT_ID` via `.env.local`; `npm run dev:studio` |
| 8 | Local Portal → fresh-prints-dev? | **pass** — `NEXT_PUBLIC_FIREBASE_PROJECT_ID` + `_dev` Algolia; `npm run dev:portal` |
| 9 | Production untouched? | **pass** — all commands `--project fresh-prints-dev`; no prod merge/App Hosting |
| 10 | QA checklist covers A–H? | **pass** — combined checklist with H timing fields |

---

## Required changes (before / during approved integrate)

1. **Create `qa/prefinal-a-h-dev` from `origin/production` @ `913329c`**, not from `origin/development` (unless owner explicitly prefers catching up `development` first — still doc-only conflicts expected).  
2. **Preflight Algolia:** before QA, print-check that active Portal index is `portal_catalog_ready_dev` (STOP if `_prod`).  
3. **Product merge conflicts:** if any conflict edits reviewed Portal/Studio/Functions/Storage product behavior, STOP and re-review — do not silent-resolve. Doc/state conflicts may take QA-branch wording.  
4. **Do not** merge QA tip into `production` or deploy prod; **do not** publish Studio 1.0.3.  
5. Optional later: after DEV QA PASS, owner may merge QA tip into `development` — separate decision, not this approval.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | DEV QA only |
| Architecture alignment | pass | Matches DEPLOYMENT.md localhost DEV policy |
| Security impact addressed | pass | No prod Algolia/Rules/Functions |
| Data model impact addressed | pass | No new schema; E/F3/H semantics preserved |
| Backend impact addressed | pass | Scoped DEV Functions + Storage |
| Test strategy adequate | pass | Combined owner checklist |
| Human checkpoints identified | pass | Approval phrase; env preflight; DEV deploy |
| No silent scope expansion | pass | Out of scope explicit |

---

## Verdict

**approved_with_changes** — Implement (integrate + DEV deploy) only after owner issues:

```text
APPROVE DEV INTEGRATION + DEV DEPLOY: PREFINAL A-H QA
```

and follows Required Changes 1–4.

### Blockers for this Plan/Review pass

None for **planning**. Integration/deploy remain **gated** on the phrase above.

Production promotion: **blocked** (no production approval phrase).
