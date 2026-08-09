# Test Report: AI Processing Monotonic Reconciliation Repair

| Field | Value |
|---|---|
| Date | 2026-08-05 |
| Branch | `fix/post-launch-catalog-and-processing-stability` |
| Plan | `docs/workflow/plans/2026-08-05-ai-processing-monotonic-reconciliation-repair-plan.md` |
| HEAD before repair | `d5f75bdfbf9c78ed924ae2b96b9ac10758e5feee` |
| Scope | Approach C Studio AI Processing monotonic repair only |
| Signoff | **Not started** — live owner QA required |

---

## 1. Commands run

### Focused + regression (from repo root)

```bash
npx tsx --test \
  apps/studio/src/renderer/src/features/ai-review/utils/monotonicAiProcessingListMerge.test.ts \
  apps/studio/src/renderer/src/features/ai-review/hooks/aiProcessingMonotonicReconciliation.wiring.test.ts \
  apps/studio/src/renderer/src/features/ai-review/utils/backgroundAiQueueReconciliation.test.ts \
  apps/studio/src/renderer/src/features/ai-review/hooks/useAiReviewInbox.observerSubscription.test.ts \
  apps/studio/src/renderer/src/features/ai-review/hooks/useAiReviewInbox.liveDesignReconciliation.test.ts \
  apps/studio/src/renderer/src/features/ai-review/hooks/aiProcessingReconciliation.test.ts \
  apps/studio/src/renderer/src/features/imports/services/importAiBackgroundQueueSequencing.test.ts
```

**Result:** `# tests 60` / `# pass 60` / `# fail 0`

### Studio typecheck

```bash
# cwd: apps/studio
npx tsc --noEmit
```

**Result:** exit 0

### Studio Vite build (renderer + main + preload)

```bash
# cwd: apps/studio
npx vite build
```

**Result:** exit 0 (renderer, `dist-electron/main.js`, `dist-electron/preload.mjs`)

### Repository lint

```bash
npm run lint
```

**Result:** exit 0

### Whitespace

```bash
git diff --check
```

**Result:** exit 0 (CRLF normalization notice only; no whitespace errors)

---

## 2. Pre-repair failure demonstration

The behavioral suite includes an explicit **PRE-REPAIR DEFECT** harness that simulates current HEAD `useDesigns` accept semantics (wholesale replace after a post-patch reload with a newer generation):

- Terminal patch removes A from the filtered Processing list (count 3→2).
- A later stale/cached pending page containing A is accepted.
- **Assertion:** A reappears (length 3) — this is the HEAD defect.

Post-repair harness tests assert the opposite contract (A stays out; 3→2→1→0). Those assertions fail under the pre-repair harness and pass under the repaired merge+ledger path.

---

## 3. Plan §7 scenario map

| # | Scenario | Where covered | Result |
|---|---|---|---|
| 1 | Terminal patch removes A | `monotonicAiProcessingListMerge.test.ts` | Pass |
| 2 | Stale reload cannot reinsert A | same (repair harness) | Pass |
| 3 | Cached stale page cannot reinsert A | same | Pass |
| 4 | Later B/C cannot revive A | same | Pass |
| 5 | Count 3→2→1→0 | same | Pass |
| 6 | Selection A→B→C→none | reconcile `pendingAdvanceIndex` test | Pass |
| 7 | Reverse-order overlapping reload | generation + merge harness | Pass |
| 8 | Genuine later reprocessing after clear | harness + wiring clear-before-retry/rerun | Pass |
| 9 | No recurring reload loop | liveDesign one-shot + P1 no `reloadDesigns` | Pass |
| 10 | No observer resubscription loop | Amendment 7 observer suite | Pass |
| 11 | Manual Process | wiring `skipListReload` + count refresh | Pass |
| 12 | Auto-processing | wiring `skipListReload` on auto loop | Pass |
| 13 | Route remount authoritative | Implicit (new ledger per `useDesigns` mount) | Pass (implicit) |
| 14 | No-patch recovery reload | harness + observer-fallback wiring | Pass |

---

## 4. Untouched / out of scope confirmation

- No Amendment 8 snapshot implementation
- No Portal / Algolia / Open Graph / taxonomy cutover code changes
- No Firebase Rules, indexes, Functions, Storage, or production actions
- `importAiBackgroundQueue.ts` and `backgroundAiQueueReconciliation.ts` not modified for feature logic (sequencing test updated only to match Amendment 7 observer shape)

---

## 5. Test status for workflow

**Test Status:** `passed`

Notes:

- Scenario 13 remount is implicit (fresh hook instance → empty ledger); owner live QA covered navigation remount.
- **Owner live QA: PASS** (2026-08-05) — Signoff recorded in
  `docs/workflow/reviews/2026-08-05-ai-processing-monotonic-reconciliation-repair-signoff.md`.
