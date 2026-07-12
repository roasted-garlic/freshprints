# Fresh Prints — Current State Snapshot

> **Refresh before every external AI session.**
> Source: `.cursor/workflow/state.md` (authoritative) + `docs/project/ROADMAP.md`
> Last updated: **2026-07-12**

---

## At a Glance

| Field | Value |
|-------|-------|
| **App** | Fresh Prints — DTF design catalog & print planning |
| **Active apps** | Fresh Prints Studio (Electron, `apps/studio`); Fresh Prints Portal (Next.js, `apps/portal`) |
| **Roadmap phase** | **Phase 8 complete (MVP)** + **Phase 8 fast-follow** customer artwork uploads |
| **Managed workflow goal** | `portal-customer-artwork-upload` — remediation r2 done; **awaiting manual E2E retest** |
| **Parked** | `admin-operational-test-data-wipe` (not signed off) |
| **Status** | A–F signed off; G automated passed; manual FAIL×2; r2 fixes deployed to `fresh-prints-dev` |
| **Human checkpoint** | yes — `docs/workflow/reviews/2026-07-12-portal-customer-artwork-upload-manual-e2e-remediation-r2-manual-checkpoint.md` |

---

## Workflow Snapshot (FF)

```txt
Mode:           managed-phase
Goal:           portal-customer-artwork-upload
Phase:          test — await remediation r2 manual retest
Remediation r2: duplicate callable, wipe guards, inbox sound delivery,
                Portal upload stages/progress, Studio intake live UX
Deploy:         duplicatePortalPrintRequestItem + rules → fresh-prints-dev
DONE:           no (manual retest + G/parent signoff)
Next:           Owner PASS / PASS WITH NOTES / FAIL
Forbidden:      production; wipe allowlist prod; unpark wipe track; Phase 9
```
