# Plan Amendment: Owner Catalog Reprocessing (Slices 4–6)

| Field | Value |
|-------|-------|
| Date | 2026-08-25 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase amendment (docs only) |
| Parent | `docs/workflow/plans/2026-08-24-smart-catalog-intelligence-unattended-enrichment-plan.md` |
| Related | Owner Catalog Reprocessing cross-slice requirement (post Slice 3 signoff) |

---

## Goal

Make **Catalog Reprocessing** a first-class, owner-only Studio capability so the owner can safely start bulk AI/catalog reprocessing in **DEV and PROD** without ad hoc scripts or per-design manual work. Shared control plane spans Slices 4–6; migrations themselves remain Slice 5 / Slice 6.

---

## Repo audit summary (2026-08-25)

| Finding | Source |
|---------|--------|
| No durable catalog-reprocess job collection exists | Confirmed |
| Closest bulk pattern: owner callable + typed phrase + dryRun + cursor (`backfillPrintRequestQueueTab`) | `functions/src/backfillPrintRequestQueueTab.ts` |
| Durable worker pattern exists for email (`emailDeliveryJobs` + onCreate worker) | Confirmed — candidate if multi-session durability required |
| Client AI Processing queue is **not** acceptable for bulk (Studio must stay open) | `useAiProcessingQueue.ts` |
| Settings surface: `/settings` → AI Enrichment tab | `SettingsPage.tsx` |
| Typed confirmation convention (phrase + server check); no existing “type PRODUCTION” phrase — prod safety often via project allowlist + copy | Confirmed |
| Algolia: reuse `syncPortalCatalogDesignToAlgolia` / reconcile — no parallel publisher | Slice 3 |

**Architectural recommendation for Slice 4 Formal Review:** Prefer **Firestore job document + backend worker** (patterned after `emailDeliveryJobs` lease/status) **or** an evolution of the **cursor callable** that writes durable progress to a job doc so Studio can disconnect. Do **not** invent a third queue stack until Formal Review picks one of these established patterns. Do **not** use client-side loops.

---

## Slice ownership

### Slice 4 — Control plane + architecture (no backlog/backfill execution)

Define and (when Slice 4 implement is authorized) implement:

- Server-authoritative bulk reprocessing architecture
- Owner-only permissions (Studio + backend)
- Studio UX under Settings → AI Enrichment → **Catalog Reprocessing**
- Durable/resumable job state, progress, retry/isolation, rate controls
- Environment safety (Firebase project isolation; PRODUCTION unmistakable in UI)
- Interaction with Catalog Processing Mode (§7)
- Shared job infrastructure **if** Formal Review determines Slices 5/6 need it

**Out of Slice 4:** Needs Review backlog migration run; Ready catalog backfill run.

### Slice 5 — Action: Reprocess AI Review Queue

- Eligible Needs Review / AI Review migration designs
- Re-run current enrichment; rebuild suggestions / analysis / Smart Profile
- Preserve staff edits per Slice 5 plan
- Honor Catalog Processing Mode (Manual / Shadow / Autonomous) as already specified in master §12
- Per-design failure isolation; resumable/idempotent

### Slice 6 — Action: Reprocess Ready Catalog

- Eligible `status: ready` designs
- Stay `ready` throughout; **no** lifecycle routing from Catalog Processing Mode
- Smart Profile + Search Intelligence + validate + Algolia via existing sync
- Preserve published title/description/category by default
- Legacy tags until separate retirement gate
- Resumable/idempotent/checkpointed/rate-aware

---

## Owner UX (product contract)

**Surface:** Studio Settings → AI Enrichment → section **Catalog Reprocessing**  
(`apps/studio/.../settings/pages/SettingsPage.tsx` tab `aiEnrichment`)

**Environment:** Prominently show configured Firebase project as **DEV** or **PRODUCTION** (derived from app config — not hardcoded forks).

**Actions:**

1. Reprocess AI Review Queue  
2. Reprocess Ready Catalog  

**Before start:** eligible count, exclusions, Catalog Processing Mode (where relevant), confirmation.  
**Production:** high-impact typed confirmation; copy must clearly identify **PRODUCTION**; prefer stronger repo patterns (`CONFIRMATION_PHRASE` + server validation), not a lightweight confirm alone. Slice 4 Formal Review finalizes exact phrases (e.g. `REPROCESS AI REVIEW QUEUE` / `REPROCESS READY CATALOG` plus PRODUCTION marker in copy).

**Progress (minimum):** total eligible, processed, succeeded, routed/remained Needs Review, automatically approved (where applicable), failed, retrying, skipped.  
**Controls:** pause if safe; resume; retry failed; durable history across Studio restart.  
**Execution:** trusted backend only — Studio need not stay open.

---

## Permissions

**Owner-only** (presentation + trusted backend). Do not rely on UI hide as security. Slice 4 Formal Review may note whether admin is excluded (owner requirement says owner-only — prefer stricter than existing AI settings owner+admin).

---

## Environment safety

- Same product code; behavior follows configured Firebase project  
- DEV job must never touch prod resources and vice versa  
- PRODUCTION must be unmistakable in UI  

---

## Reprocessing safety

Bounded concurrency / rate-aware; resumable; idempotent; per-design isolation; observable; no duplicate catalog records; no accidental status changes; no tag retirement from reprocess alone; no category auto-creation; rejected/archived excluded by default.

---

## Algolia

Ready-catalog path uses existing Slice 3 sync/reconcile architecture only.

---

## Acceptance criteria (cross-slice)

- Owner can eventually start either bulk operation from Studio  
- Same flow works in DEV and PROD  
- Backend enforces owner access  
- Production has explicit safety confirmation  
- Studio need not stay open  
- Job resumable/idempotent with failure isolation  
- Slice 5 honors Catalog Processing Mode  
- Slice 6 ready processing never changes lifecycle due to mode  
- Ready designs stay visible during backfill  
- Search sync reliable  
- Legacy tag retirement remains separate Slice 6 owner gate  

---

## Out of scope (this amendment)

- Implementing Slice 4–6 runtime  
- Authorizing Slice 4 start  
- Production deploys  
- Live Autonomous publication  

---

## Open questions for Slice 4 Formal Review

1. Job durability: Firestore job doc + worker vs cursor-callable + progress doc hybrid?  
2. Exact owner-only vs owner+admin for reprocess callables?  
3. Exact confirmation phrases + PRODUCTION copy  
4. Pause semantics (soft vs hard)  
5. Placement within AI Enrichment tab vs dedicated subsection component
