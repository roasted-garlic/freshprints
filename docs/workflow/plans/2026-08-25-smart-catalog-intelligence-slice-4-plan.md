# Plan: Smart Catalog Intelligence — Slice 4 (Autonomy Engine + Catalog Processing Control Plane)

| Field | Value |
|-------|-------|
| Date | 2026-08-25 |
| Author | Planning Agent |
| Status | implement_authorized — Formal Review **approved_with_changes**; owner confirmed locks + **override** (no global unsupported-subject denylist); DEV implement authorized 2026-08-25 |
| Workflow | managed-phase |
| Goal | `smart-catalog-intelligence-unattended-enrichment` |
| Slice | **4 — Autonomy Engine + Catalog Processing Control Plane** |
| Parent | `docs/workflow/plans/2026-08-24-smart-catalog-intelligence-unattended-enrichment-plan.md` (§7, §11a, §24) |
| Reprocessing amendment | `docs/workflow/plans/2026-08-25-smart-catalog-intelligence-catalog-reprocessing-amendment-plan.md` |
| Prior slices | Slice 2 / Slice 3 **signed off** `approved_with_notes` (DEV) |
| Runtime | **Not authorized by this document** — Plan + Formal Review only until owner approves implement |

---

## Goal

Deliver on `fresh-prints-dev` (and later prod via separate gates):

1. **Catalog Processing Mode** — server-authoritative `manual` \| `shadow` \| `autonomous` on `settings/aiEnrichment`
2. **Autonomy engine** — evidence-based decision policy + conditional **targeted verifier** (evolving today’s `computeShadowAutomationDecision`)
3. **Automation Health** — lightweight observability
4. **Catalog Reprocessing control plane** — owner-only durable bulk job infrastructure for Slice 5/6 actions (no Slice 5/6 bulk runs in Slice 4)

**Hard constraints:** Implementing Slice 4 does **not** authorize live Autonomous publication, Slice 5 backlog runs, Slice 6 ready backfill, tag retirement, or production Slice 2–3 promote.

---

## Background (verified)

| Fact | Source |
|------|--------|
| AI success always → `aiReviewStatus: needs_review` | `functions/src/ai/aiEnrichmentPipeline.ts` `markAiSuccess` |
| Catalog `ready` only via staff approve | `apps/studio/.../catalogApprovalService.ts` `approveDesignForCatalog` |
| Shadow decisions on `smartProfile.provenance` | `functions/src/ai/automationDecisionShadow.ts` |
| Settings doc `settings/aiEnrichment`; client write denied | `firestore.rules`; `updateAiEnrichmentSettings` (owner/admin) |
| No catalog reprocess job collection | Amendment audit; only `emailDeliveryJobs` |
| Algolia ready sync via design write + classifier | `syncPortalCatalogDesignToAlgolia` |
| Client AI queue unsuitable for bulk | `useAiProcessingQueue.ts` |

---

## Scope

### In Scope (Slice 4 implement — after owner implement authorization)

- Catalog Processing Mode field + server resolution + fail-safe
- Studio Settings UX (mode + Catalog Reprocessing section)
- Active mode visibility in AI Processing / AI Review
- Autonomy decision engine + targeted verifier architecture
- Server path: Autonomous may set `ready` **only when mode is autonomous AND live gate satisfied** (default: live gate OFF after Slice 4 ship)
- ADR / DATA_MODEL / WORKFLOWS revisions identifying staff-approval doctrine change
- Automation Health panel (lightweight)
- Durable Catalog Reprocessing job collection + start callables + worker + Studio progress UI (control plane only; jobs for Slice 5/6 targets may be stubbed or feature-flagged disabled until those slices)
- Owner-only permissions for reprocess + Autonomous typed enable
- Tests for mode fail-safe, decision policy, job lease/idempotency
- Docs: DATA_MODEL, BACKEND, DECISIONS

### Out of Scope

- Runtime from this Plan/Review command
- Live Autonomous enablement in any environment
- Slice 5 Needs Review backlog execution
- Slice 6 Ready Catalog backfill / tag retirement
- Production deploys / prod Algolia promote
- Prompt/schema overhaul (unless Formal Review marks a hard dependency)
- Category auto-create / rename / merge / archive
- Halftone auto-authority (ADR-FP-080) unless separate owner ADR approval
- Client-side bulk loops

---

## A. Catalog Processing Mode

### A.1 Modes

| Mode | Enrichment | Decision / verifier | Review outcome |
|------|------------|---------------------|----------------|
| **manual** | Runs normally | Optional internal scoring for Health only | Always Needs Review |
| **shadow** | Runs normally | Full Autonomous policy + verifier | Always Needs Review; record would-auto-approve |
| **autonomous** | Runs normally | Full policy + verifier | Qualifying → `ready` (when live gate ON); else Needs Review |

### A.2 Persistence (additive)

**Doc:** `settings/aiEnrichment` (existing)

**Proposed fields:**

```typescript
catalogWorkflowMode?: "manual" | "shadow" | "autonomous"; // absent → treat as "manual"
catalogAutonomousLiveEnabled?: boolean; // default false; typed ENABLE AUTONOMOUS required to set true
catalogAutonomousLiveEnabledAt?: Timestamp;
catalogAutonomousLiveEnabledBy?: string; // uid
```

**Update path:** Extend `updateAiEnrichmentSettings` **or** dedicated owner-only callable `updateCatalogWorkflowMode` (prefer dedicated for Autonomous enable + typed phrase — Formal Review may merge).

**Server resolution** (Functions enrichment / approval path):

```
resolveCatalogWorkflowMode(settings) →
  if missing/invalid/unreadable → "manual"
  never return "autonomous" as fail-safe default
```

Live Autonomous publication requires **both** `catalogWorkflowMode === "autonomous"` **and** `catalogAutonomousLiveEnabled === true`. Mode alone is insufficient.

### A.3 Studio UX

- Settings → AI Enrichment → **Catalog Processing Mode** control (Manual / Shadow / Autonomous)
- Active badge in AI Review / AI Processing chrome: `Catalog Processing: Manual|Shadow|Autonomous`
- Entering Autonomous mode: confirm dialog; enabling **live** Autonomous: typed **`ENABLE AUTONOMOUS`** (server-validated)
- Switching to Manual/Shadow: simple confirm (no typed phrase)

### A.4 ADR / workflow

Must revise before live Autonomous:

- New **ADR-FP-NEW-1** (or next FP number): Unattended catalog approval under Catalog Processing Mode
- Update `DATA_MODEL.md` staff-approval doctrine
- Update `WORKFLOWS.md` AI Review path
- Explicit owner checkpoint per environment after Slice 4 evidence

---

## B. Catalog Reprocessing control plane (owner-only)

### B.1 Surface

`apps/studio/.../settings/pages/SettingsPage.tsx` tab `aiEnrichment` → section **Catalog Reprocessing**

Display Firebase project prominently as **DEV** (`fresh-prints-dev`) or **PRODUCTION** (`fresh-prints-prod`) from Studio config (`projectId`).

### B.2 Actions (wired in Slice 4; execution authorized later)

| Action | Target type | Enabled in |
|--------|-------------|------------|
| Reprocess AI Review Queue | `ai_review_queue` | Slice 5 |
| Reprocess Ready Catalog | `ready_catalog` | Slice 6 |

Slice 4 ships UX + callables that **create jobs** and worker that can process both target types; Slice 5/6 Formal Reviews unlock eligibility queries and “Start” for each target (or Slice 4 gates starts behind feature flags until those slices).

**Owner decision (binding):** **Owner-only** — do not broaden to admin unless Formal Review finds a hard blocker (then stop and ask owner).

### B.3 Permissions

| Layer | Rule |
|-------|------|
| Studio | New `permissionService.canManageCatalogReprocessing(user)` → `isOwner(user)` |
| Start / pause / resume / retry callables | `caller.role === "owner"` |
| Job docs | Client write deny; staff/owner read of own env jobs as designed |
| Contrast | `updateAiEnrichmentSettings` remains owner+admin for non-mode fields |

---

## C. Durable job architecture — **selected: A (job doc + worker)**

### C.1 Decision

| Option | Verdict |
|--------|---------|
| **A. Firestore job doc + backend worker** | **Selected** — Studio disconnect, lease/retry, durable progress (pattern: `emailDeliveryJobs` + `onEmailDeliveryJobCreated`) |
| B. Cursor callable only | Rejected as sole design — session-bound |
| B start gates + A worker | **Adopted hybrid:** start callable uses typed phrase / dryRun / eligibility count like `backfillPrintRequestQueueTab`; processing uses job doc + worker |
| Cloud Tasks | Not present in repo — do not invent |

### C.2 Proposed collection & functions (names for implement)

| Name | Role |
|------|------|
| Collection `catalogReprocessJobs` | Durable job state (client write denied) |
| Callable `previewCatalogReprocessJob` | Owner; returns eligible count + exclusions + mode (no side effects) |
| Callable `startCatalogReprocessJob` | Owner; phrase + env checks; creates job `pending` |
| Callable `pauseCatalogReprocessJob` / `resumeCatalogReprocessJob` / `retryCatalogReprocessJobFailures` | Owner; soft-pause / resume / retry |
| Trigger `onCatalogReprocessJobWritten` (or Created + Scheduled tick) | Worker claims pages, processes designs |
| Optional `onSchedule` watchdog | Recover stale leases |

### C.3 Job schema (proposed)

```typescript
interface CatalogReprocessJob {
  id: string;
  targetType: "ai_review_queue" | "ready_catalog";
  environment: "dev" | "production"; // denormalized from GCLOUD_PROJECT at create
  projectId: string;
  status: "pending" | "running" | "paused" | "completed" | "failed" | "cancelled";
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  pipelineVersion: string; // e.g. catalog-enrich-v27 + smart-profile-v1
  catalogWorkflowModeSnapshot: "manual" | "shadow" | "autonomous";
  autonomousLiveEnabledSnapshot: boolean;
  // progress
  totalEligible: number;
  processed: number;
  succeeded: number;
  remainedNeedsReview: number;
  autoApproved: number; // Autonomous live only
  failed: number;
  retrying: number;
  skipped: number;
  // checkpoint
  cursorDesignId?: string; // __name__ cursor
  leaseOwner?: string;
  leaseExpiresAt?: Timestamp;
  attemptCount?: number;
  maxAttempts?: number;
  pauseRequested?: boolean; // soft pause
  lastError?: string;
  confirmationPhrase: string; // audit
  dryRun?: boolean; // preview-only jobs optional
}
```

Optional subcollection `catalogReprocessJobs/{id}/failures/{designId}` for per-design errors.

### C.4 Lifecycle

`pending` → `running` (claim) → `paused` (soft) → `running` → `completed` | `failed`

**Concurrency:** At most **one active** (`pending`\|`running`\|`paused`) job per `(projectId, targetType)`.

**Idempotency:** Job id client- or server-generated; design processing keyed by `(jobId, designId)` with write-once outcome; re-enqueue of same design skipped if already `succeeded` for this job.

**Rate:** Configurable page size (e.g. 10–25) + delay between units; respect AI provider limits.

### C.5 Soft pause (preferred)

1. Set `pauseRequested: true`
2. Worker finishes **current claimed design** only
3. Persist checkpoint cursor; set `status: paused`; clear lease
4. Resume clears flag → `pending`/`running` → continue from cursor

No mid-write cancellation of design mutations.

### C.6 Studio reconnect

Subscribe to `catalogReprocessJobs/{id}` (owner read rules) or list active jobs for project; render progress from doc fields.

---

## D. Pause / resume

Formal Review confirms **soft pause** as default (§C.5). Hard cancel optional later (`cancelled`) without rolling back completed designs.

---

## E. Targeted verifier

### E.1 Role

Conditional second-pass AI **or** deterministic secondary checks — **not** mandatory for every design.

### E.2 Invoke when (evidence-based)

| Trigger | Calibration link |
|---------|------------------|
| Subject specificity risk (generic animal vs breed in title) | Highland cow → subject `cow` |
| Unsupported structured subject/object suspicion | Jimothy → `people` |
| Category ambiguity / alternatives / gap | Existing shadow codes |
| Conflicting first-pass signals (title vs category vs subjects) | — |
| Automation-policy uncertainty near decision boundary | — |

**Not automatic verifier triggers:** Search Concept awkwardness/redundancy alone (Santa / plant mom) if title/category/structured fields are strong — mark as **acceptable soft concern** for Health, not Needs Review blocker.

### E.3 Uncertainty classes (Formal Review lock)

| Class | Examples | Autonomy impact |
|-------|----------|-----------------|
| **Acceptable** | Mild Search Concept speculation; minor concept redundancy | Do not block auto-approve |
| **Verifier-worthy** | Generic subject vs specific title identity; unsupported subject tokens | Invoke verifier; if unresolved → Needs Review |
| **Needs Review-worthy (hard)** | Missing category/title/description; validation errors; category gap suggested; title over max chars | Block auto-approve without requiring verifier |

### E.4 Result handling

- `confirmed` → allow Autonomous path (if other blockers clear)
- `unresolved` / fail → Needs Review + reason codes
- Verifier errors → isolate; treat as unresolved (fail closed for Autonomous)

---

## F. Automation decision policy

**Do not** use a single uncalibrated model self-score.

### F.1 Evidence inputs

- Title validity (`validateCatalogTitleLength` + non-empty)
- Description validity (non-empty for Autonomous; Manual/Shadow may still record warning)
- Category resolved to existing id (no auto-create)
- Smart Profile `validateDesignSmartProfile`
- Structured evidence consistency (subjects/objects vs title/description/image evidence) — **not** a global semantic denylist
- Subject specificity heuristic (title contains more specific identity than subject list)
- Category gap / alternatives
- Verifier result when invoked
- Pipeline stage success
- For Autonomous live: Algolia/index readiness (publication must succeed or enter retryable recovery before “operationally complete”)

### F.2 Deterministic blockers (force Needs Review)

- Any hard validation error
- `category_unresolved` / `category_gap_suggested`
- `description_missing` (Autonomous)
- `title:title_exceeds_max_characters`
- Contextual structured-metadata inconsistency (e.g. `people` with no supporting evidence) after verifier unresolved — **not** a global token ban
- Verifier unresolved
- `catalogAutonomousLiveEnabled !== true` while mode is autonomous → behave as Shadow for publication (record would-approve; Needs Review)

### F.3 Soft concerns (do not alone block)

- Search Concept quality
- Mild subject genericness without title conflict → may still be verifier-worthy if title is more specific

Evolve `computeShadowAutomationDecision` → `computeCatalogAutomationDecision(mode, liveEnabled, …)` used by Manual (metrics), Shadow, and Autonomous.

---

## G. Title behavior

- Keep **200-char hard max** + **24-word lean cap**
- No global second title AI call
- Targeted title fixer **only if** implement-phase fixtures show first pass still produces invalid/overlong titles; conditional; preserve identity; re-validate deterministically

---

## H. Category intelligence

- Select existing category; record ambiguity / gap
- **Never** auto-create / rename / merge / archive
- Batch coherence = soft prior only
- Automation Health tracks category-gap volume

---

## I. Automation Health

Lightweight panel (Settings and/or AI Review):

- Active mode + live Autonomous flag
- analyzed / would-auto-approve / actually auto-approved
- verifier invoked / confirmed / unresolved
- routed Needs Review / retries / failures
- category-gap cases
- recent `catalogReprocessJobs` summary

Needs Review: surface `automationReasonCodes` (already in `AiReviewSmartProfileSection`) + future verifier reasons.

---

## J. Slice 5 / 6 interaction

| Slice | Mode Manual | Shadow | Autonomous (live) |
|-------|-------------|--------|-------------------|
| **5 AI Review Queue** | Reprocess → Needs Review | Full decision; would-approve; Needs Review | Qualifying → ready; else Needs Review |
| **6 Ready Catalog** | Stay ready; update profile/search; **no lifecycle from mode** | Same | Same |

---

## K. Production safety

| Action | Proposed phrase (server-validated) |
|--------|-----------------------------------|
| Enable live Autonomous | `ENABLE AUTONOMOUS` |
| Start AI Review reprocess on PRODUCTION | `REPROCESS PRODUCTION AI REVIEW` |
| Start Ready reprocess on PRODUCTION | `REPROCESS PRODUCTION READY CATALOG` |
| Start same on DEV | `REPROCESS AI REVIEW QUEUE` / `REPROCESS READY CATALOG` (no PRODUCTION token) |

Backend independently checks: owner role, target type, `GCLOUD_PROJECT` / Studio projectId match, phrase.

UI must label **PRODUCTION** unmistakably when `projectId === fresh-prints-prod`.

---

## L. Algolia / publication

- Reuse `syncPortalCatalogDesignToAlgolia` + classifier (Slice 3)
- Autonomous ready transition must trigger ready boundary sync; failures → retryable recovery / Health alert; do not silently claim success
- Ready reprocess: design field writes → existing sync; reconcile for repair only

---

## M. Legacy tags

Coexist unchanged in Slice 4. No retirement, Tag Management removal, or index-field removal.

---

## N. Halftone

ADR-FP-080 remains human-authoritative. Slice 4 may note shadow evidence for later calibration. No automated halftone authority without separate ADR + owner approval. Must not block Slice 4.

---

## Affected files (implement list — identify only)

### Shared
- `packages/shared/src/types/ai/aiEnrichmentSettings.types.ts` (extend)
- `packages/shared/src/types/admin/catalogReprocess*.ts` (new)
- `packages/shared/src/constants/smartProfile.constants.ts` (unsupported subjects list optional)
- `packages/shared/src/utils/smartProfileValidation.ts` (as needed)

### Functions
- `functions/src/updateAiEnrichmentSettings.ts` and/or new mode callable
- `functions/src/ai/loadAiEnrichmentSettings.ts`, `aiEnrichmentPipeline.ts`, `automationDecisionShadow.ts` → decision engine
- `functions/src/ai/*Verifier*.ts` (new)
- `functions/src/catalogReprocess/*.ts` (new job start/worker)
- `functions/src/index.ts` exports
- Firestore rules: `catalogReprocessJobs`

### Studio
- `SettingsPage.tsx` / AI Enrichment section components
- AI Review chrome badge
- `permissionService.ts` owner-only method
- Catalog Reprocessing progress UI

### Docs
- `DATA_MODEL.md`, `BACKEND.md`, `DECISIONS.md` (ADR), `WORKFLOWS.md`

---

## Test strategy (when implement authorized)

| Area | Approach |
|------|----------|
| Mode fail-safe | Unit: missing/invalid → manual; never autonomous |
| Decision policy | Unit: blockers vs soft; Highland/Jimothy fixtures |
| Verifier gating | Unit: Search Concepts alone do not force verifier |
| Job lease/pause/idempotency | Unit + Functions tests patterned on email jobs |
| Owner gates | Callable tests reject non-owner / bad phrase |
| Algolia | Containment: no parallel publisher |
| Manual | DEV mode switching; badge; Autonomy live remains OFF |

---

## Human checkpoints (anticipated)

1. Owner approve this Plan + Formal Review (possibly with listed decisions)
2. Owner authorize **Slice 4 implement**
3. Owner authorize DEV deploy of Slice 4
4. Owner authorize live Autonomous (separate; typed ENABLE AUTONOMOUS)
5. Slice 5 / 6 start (separate)
6. Production promote (separate)

---

## Risks

| Risk | Mitigation |
|------|------------|
| False Autonomous approvals | Live gate OFF by default; Shadow calibration; fail closed |
| Job stuck leases | Watchdog + lease expiry reclaim (email pattern) |
| Admin vs owner confusion | Explicit owner-only for reprocess/Autonomous live |
| Scope creep into Slice 5/6 runs | Hard out-of-scope; feature-flag Start buttons |

---

## Rollback

- Mode → Manual; disable live Autonomous flag
- Disable worker export / pause jobs
- No tag/index retirement to roll back

---

## Owner decisions (2026-08-25)

1. All Formal Review locks confirmed (architecture A, soft pause, dual gate, owner-only, phrases, Start gated until Slice 5/6).
2. Slice 4 **DEV implement authorized** (no live Autonomous, no Slice 5/6 runs, no prod).
3. Owner-only retained for reprocess + live Autonomous enable.
4. **Override — no global unsupported-subject denylist:** Tokens such as `people` / `person` / `animal` are not inherently invalid. Evaluate contextually (evidence consistency + targeted verifier). Jimothy-class: `people` with no visible people → verifier-worthy. Genuine people artwork with `people` → may be correct. Small structural/schema-invalid lists only if needed.

---

## Open questions

Resolved by owner 2026-08-25 (see above).
