# Review: Coordinated production cutover prerequisites

| Field | Value |
|-------|-------|
| Date | 2026-09-12 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-09-12-coordinated-production-cutover-prerequisites-plan.md` |
| Verdict | **approved_with_changes** |

---

## Summary

The Plan is bounded, architecture-aligned, and substantially ready for implementation. It correctly
preserves the private canonical source, introduces an additive customer-safe projection cutover,
hardens production reconciliation, couples rollback states, and retains every production/security
action as a separate human checkpoint. One narrow sequencing contradiction must be resolved before
implementation: pre-APPLY `VERIFY` cannot both reject missing projections and precede the APPLY that
creates those projections.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Repository preparation only; production, Git promotion, freeze, publication, and runner invocation are excluded. |
| Architecture alignment | pass | Canonical `printRequestItems` remain authoritative; Admin-maintained projection and service-layer Portal reads preserve existing boundaries. |
| Security impact addressed | pass | Exact projection allowlist, parent ownership, client-write denial, redacted runner output, hard production pin, and accepted preview/thumb risk are explicit. |
| Data model impact addressed | pass | Additive projection only; no canonical or `staffArtworks` schema change and no destructive cleanup. |
| Backend impact addressed | pass | Synchronizer reuse, dual Rules artifacts, bounded runner, and rollback coupling are specified. |
| Test strategy adequate | pass | Focused mapper, Rules, Storage, Portal, runner, parity, manifest, metadata, and repository checks are required. |
| Human checkpoints identified | pass | APPLY, final canonical-read denial, deploy/promotion, publish, maintenance/config/data, and production QA remain separately gated. |
| Roadmap alignment | pass | Resolves the recorded M0 cutover and immutable-manifest blockers before a renewed M0/M1 proposal. |
| Documentation plan | pass | SECURITY, FIREBASE, RISK_REGISTER, and contradiction-only data/workflow synchronization are required. |
| No silent scope expansion | pass | New runtime surface, schema, callable, access expansion, or destructive behavior requires amendment and renewed Review. |

---

## Architecture Review

**Findings:**

- The single-source-of-truth boundary is preserved: canonical request items remain authoritative,
  while `portalPrintRequestItems` is an allowlisted, server-owned read projection.
- Projection-first Portal reads with request-bounded canonical fallback are compatible with the
  transition state and do not authorize direct Portal reads of `staffArtworks`.
- Explicit transition/final Rules artifacts and coupled rollback prevent a deny-first outage and
  prevent a legacy Portal or synchronizer rollback from becoming incompatible with final Rules.
- Commit-object manifest generation closes the parent M0 working-tree evidence gap without itself
  freezing or approving a candidate.

**Required changes:**

- [ ] Apply Required Change 1 below; no other architecture change is required.

---

## Security Review

**Findings:**

- The Plan retains parent-request ownership checks and denies all client writes to projections.
- The runner is fail-closed on project identity, emulator/DEV input, dirty or mismatched candidate
  bytes, malformed rows, unsafe fields, conflicting modes, and missing cursors.
- APPLY remains bounded, transactional, idempotent, additive, non-deleting, and separately gated.
- The owner-accepted residual risk is stated accurately: any authenticated customer who learns a
  valid Staff Artwork ID may fetch only `preview.webp` or `thumbnail.webp`; source, production, and
  interactive objects remain denied. The required SECURITY/FIREBASE/Risk Register synchronization
  resolves the current documentation disagreement over customer Firestore access.
- Logs and runner output are constrained to identifiers and aggregate/control metadata, excluding
  payloads, PII, paths/URLs, tokens, secrets, and Staff Artwork metadata.

**Required changes:**

- [ ] Apply Required Change 1 below so a pre-APPLY read-only safety check cannot be confused with
  the post-APPLY exact-population proof.

**Human approval needed before production:**

- [ ] Candidate staging/commit/push and M1 freeze require their parent checkpoints.
- [ ] Any deploy of additive indexes, Functions, transition Firestore Rules, Storage Rules, or the
  Portal candidate requires the reviewed parent production-readiness/deployment checkpoint.
- [ ] Any production runner access, including DRY RUN and VERIFY, requires an explicit production
  checkpoint; neither implementation nor child Signoff authorizes invocation.
- [ ] Projection APPLY requires the exact separate owner authorization recorded in the Plan.
- [ ] Final Firestore Rules denial of customer canonical-item reads requires a later, separate
  final-boundary approval after complete population verification, convergence observation, and smoke evidence.
- [ ] Studio 1.0.10 publication, Portal traffic promotion, production QA, maintenance changes,
  Auth/settings/secrets changes, and any other data/configuration action retain separate approval.

---

## Data Model Review

**Findings:**

- No canonical `printRequestItems` or private `staffArtworks` schema change is authorized.
- Stable-ID merge semantics, projection precedence, exact allowlist replacement, and no orphan
  deletion preserve the additive model and make retries deterministic.
- The accepted Storage exposure is separate from Firestore document access; implementation must
  preserve the Plan's rule that customers never read `staffArtworks` documents.

**Required changes:**

- [ ] None beyond Required Change 1.

---

## Backend Review

**Findings:**

- A new production-pinned runner is preferable to weakening the existing DEV-only guard.
- Reuse of the live synchronizer's projection/enrichment helpers prevents duplicated privacy logic.
- One deterministic page per invocation, explicit cursoring, an optimistic transaction, and
  whole-page abort on malformed data are appropriate production safety constraints.
- The proposed cutover order correctly keeps transition Rules and Portal fallback active until
  population and smoke evidence support final denial.

**Required changes:**

- [ ] None beyond Required Change 1.

---

## Testing Review

**Findings:**

- The automated strategy covers the material authorization, privacy, convergence, idempotency,
  rollback, version, and immutable-manifest risks.
- Local/injected runner evidence is correctly distinguished from production execution.
- A child Test Report and honest recording of baseline failures are explicitly required.
- Tests for the clarified pre-APPLY and post-APPLY verification semantics must be distinct and must
  prove that expected absent/stale projections can reach the separately gated APPLY checkpoint,
  while post-APPLY exact verification still fails closed on any mismatch.

**Required changes:**

- [ ] Add the distinct verification-mode tests described in Required Change 1.

---

## Documentation Review

**Findings:**

- Required permanent-doc updates cover the projection ownership/cutover and accepted known-ID risk.
- Current docs are not fully synchronized: SECURITY currently describes customer get-by-ID access
  to `staffArtworks`, while the Plan and DATA_MODEL require no customer Firestore access. The Plan
  correctly requires implementation-time synchronization rather than treating that stale wording
  as the target contract.
- Parent M0 artifacts must be regenerated from one clean committed SHA after this child; existing
  working-tree manifests are evidence only and cannot be promoted as immutable manifests.

---

## Required Changes (if approved_with_changes)

1. Clarify and implement two non-mutating verification outcomes without changing the owner's
   settled **DRY RUN → VERIFY → separately gated APPLY** decision:
   - pre-APPLY VERIFY validates project/SHA/manifest binding, source safety, allowlist derivation,
     canonical fingerprints, page bounds, and the exact proposed CREATE/UPDATE set; expected
     missing or stale projections are reported as population deltas and do not by themselves block
     presentation of the APPLY checkpoint;
   - malformed/unsafe input, private/extra-field uncertainty, ownership/manifest/index/source drift,
     or any unclassified discrepancy still fails closed before APPLY;
   - post-APPLY VERIFY requires exact projection equality, zero missing/extra/private fields, zero
     canonical fingerprint change, zero deletes/out-of-page writes, and is followed by repeat DRY
     RUN with zero proposed changes;
   - the production runbook, runner help/output mode labels, focused tests, and FIREBASE/security
     operating documentation must use the same unambiguous semantics.

This is a bounded implementation constraint that makes the already settled sequence executable; it
does not authorize APPLY, weaken any production guard, broaden access, or alter the projection schema.

---

## Blockers (if blocked)

1. None. The required clarification is bounded and can be applied during implementation under this
   `approved_with_changes` verdict.

---

## Verdict Rationale

**approved_with_changes.** The Plan is otherwise sound and gives unusually strong treatment to
authorization, privacy, immutable evidence, rollback coupling, and stop boundaries. The single
required change resolves an internal deadlock: as written, pre-APPLY VERIFY rejects missing
projections and the runbook stops on that result, so the separately gated APPLY intended to create
them could never be reached. Implementation may proceed only with the two verification outcomes
above and may perform no production or release action.

---

## Next Step

Implementation Agent may implement only the reviewed Plan plus Required Change 1, then hand off to
the Test phase. Stop before any production access, runner invocation, staging/commit/push, candidate
freeze, deploy/publish, data mutation, Rules change, or release action.
