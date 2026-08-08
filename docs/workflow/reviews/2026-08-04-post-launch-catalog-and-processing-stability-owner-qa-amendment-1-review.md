# Independent Formal Review: Owner QA Amendment 1 (PR #40)

| Field | Value |
|-------|-------|
| Date | 2026-08-04 |
| Managed goal | `post-launch-catalog-and-processing-stability` |
| Plan reviewed | `docs/workflow/plans/2026-08-04-post-launch-catalog-and-processing-stability-owner-qa-amendment-1.md` |
| Reviewer stance | Independent — re-verified the Plan's load-bearing source and log claims directly, not merely restated |
| Verdict | **approved_with_notes** — proceed directly to Implement; no blocking issue found |

---

## 1. Review method

Re-ran the Plan's most consequential citations directly against the working tree and live
`fresh-prints-dev` logs, rather than trusting the Plan's prose: confirmed
`DesignLibraryPage.tsx:212`'s exact gate condition, confirmed the three `onDocumentWritten` trigger
declarations genuinely omit any options/timeout argument (2-argument call form), and independently
re-read the raw log excerpt the Plan bases its ready-boundary-publisher root cause on to confirm the
Plan's interpretation of "18 joined, 0 claimed, 0 published" is the only reading consistent with the
observed data, not a cherry-picked one.

## 2. Workstream 1 — findings

**Confirmed accurate:** the `usingGeneratedCatalog` gate claim, the `getDesignLibraryFirestoreLoadPolicy`
behavior, and the absence of a stale-but-successful-fetch fallback path in `useGeneratedReadyDesigns.ts`.
These were independently re-read, not merely accepted from the Plan.

**Confirmed accurate and well-reasoned:** the Wave C cross-reference (§2f) correctly distinguishes
"the design list read was never the cost problem" from "the taxonomy reads were the cost problem" —
this is a materially important distinction for the Formal Review to independently verify, because a
sloppier plan could have wrongly claimed this fix reintroduces the exact cost problem Wave C solved.
Re-read the cited Wave C Plan section directly (lines ~906-1045) and confirm the Plan's quotation and
interpretation are accurate: the pre-Wave-C design page read was explicitly measured at "≤101 docs,"
already bounded, already cached — the amendment's stated motivation was the ~1,122-tag and ≤200-category
taxonomy reads, which this Amendment does not touch.

**Genuinely strong, independently-reproduced evidence for the ready-boundary publisher defect:** the
Plan's live-log-based root cause (§2c) is the single most rigorous piece of evidence in this Plan — it
is not a hypothesis dressed as a conclusion; it is a directly observed absence (zero
`claimed-debounce-waiter`, zero `catalog-snapshot-publication`, in a window containing 18
`joined-existing-debounce-window` events) that has no plausible innocent explanation other than a
stuck claim. This Review independently confirms the arithmetic: `DEBOUNCE_MS + LEASE_MS` = 15,000ms +
600,000ms = 615,000ms ≈ 10m15s, and the default Cloud Functions v2 Firestore-trigger timeout actually
in effect here is 60s (independently re-confirmed via the exact same deploy-log citation the Plan
uses, itself captured earlier in this same session's own tool output, not a secondhand claim). The
mechanism the Plan describes — a hard function timeout skips the `finally` release block — is correct
Node.js/Cloud Functions behavior, not an assumption.

**One gap this Review adds, not blocking:** the Plan's §6 fix picks 300s for `timeoutSeconds` and 90s
for the claim's publish-attempt margin without an explicit worst-case estimate of how long
`publishPortal`'s full fan-out could actually take on a substantially larger future catalog (the
current dev-scale evidence — ~1,122 tags — is the only data point available). 90 seconds is
generously larger than anything evidenced so far, but this Review recommends the Implementation
attach the actual observed `durationMs` from the new `catalog-snapshot-publication` log events (once
a real publish succeeds under the fix) to the Test Report, so future capacity planning has a real
number rather than an estimate. This is a follow-up data point to capture, not a reason to withhold
approval.

## 3. Workstream 2 — findings

**Confirmed accurate via independent re-read:** `useAiProcessingQueue.ts`'s options interface has no
`onQueueChanged`; `processSelectedDesign` and `runAutoQueueLoop` both call only `refreshDesignList`;
the four `useAiReviewInbox.ts` inbox actions that do call `options?.onQueueChanged?.()` were
independently located and line-matched. The `canProcessSelected`/`selectedDesign`/`-1`-reselection
mechanism was independently traced against `aiProcessingQueueSelection.ts`'s
`resolveAdvanceIndexAfterProcessing` and confirmed to return `-1` (not `0` or an out-of-range index
that would coincidentally still resolve) when no awaiting design remains — matching the Plan's claim
exactly.

**No defect found in this workstream's diagnosis.** The distinction the Plan draws between the
prior pass's fix (rerun-from-inbox path only) and this defect (manual/auto-queue path) is correct and
independently verifiable — `aiProcessingReconciliation.test.ts` (from the prior pass, re-read during
this Review) indeed only asserts against `useAiReviewInbox.ts`'s `executeRerunToProcessing`, never
`useAiProcessingQueue.ts`.

## 4. Workstream 3 — findings

**Confirmed accurate:** the single global `Set<string>` model, the unconditional
`clearImportFileSession()` inside `registerImportFilePath`, and the redundant second
`validatePngFile()` call in `readSelectedPngFileBytes.ts:13` were all independently re-read.

**Appropriately hedged, not overclaimed:** the Plan correctly does not assert a single definitive
triggering sequence — it states the structural vulnerability is confirmed, while the exact
second-registration trigger remains unconfirmed in currently-committed code. This Review agrees this
is the honest, correct posture: the fix (session-scoped provenance + halved processing cost) is
justified by the confirmed structural defect regardless of whether the exact owner-observed trigger
sequence is ever fully reconstructed, and is proportionate — it does not weaken the arbitrary-path
security check, which both the Plan and this Review independently confirm remains a separate,
untouched gate (`isUnsafeClientFilePath`).

## 5. Scope and constraint compliance

- No Rules, Storage Rules, index, schema, migration, secret, or production change is proposed
  anywhere in the Plan — confirmed by re-reading the full document, not just its "out of scope"
  section.
- The Plan does not propose restoring `loadAll`, adding a new unbounded listener, or reintroducing a
  full collection scan on the Studio read path — the selected architecture explicitly reuses the
  existing bounded `useDesigns` pagination unchanged.
- The Plan does not propose deleting or bypassing the generated ready-index for other consumers —
  it is retained in a secondary role, with the exact retention decision correctly deferred to
  Implement and flagged `[NEEDS REPO CHECK]` rather than guessed.
- The Plan does not weaken any existing security check (Storage/Rules/path-validation) in any
  workstream.
- The Plan is honest about what could not be measured live (§9) rather than fabricating a
  measurement — consistent with the prior pass's established, correct posture on this exact
  environment constraint.

## 6. Verdict

**approved_with_notes.** All three workstreams' root causes are independently verified against
source and, for Workstream 1's publisher defect, against live production-adjacent log evidence — not
merely re-stated from the Plan. The one note (§2, Workstream 1 gap) is a data-capture recommendation
for the Test Report, not a defect in the Plan's reasoning or a blocker to implementation. Per the
governing instruction, this verdict authorizes proceeding directly into Implement without a separate
pause, since every required change is resolvable from repository/log evidence already gathered and no
genuine unresolved product decision, unsafe scope expansion, or Rules/index/schema/secret change is
present.

## 7. Approval phrase

Unchanged from the Plan — this Review does not narrow it, since all three workstreams remain
sufficiently independent and evidence-bounded for one batched approval:

`APPROVE POST-LAUNCH CATALOG AND PROCESSING STABILITY OWNER QA AMENDMENT 1`
