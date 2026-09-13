# Production maintenance-mode prerequisite — Formal Review

**FreshForge phase:** Managed Phase — Formal Review
**Goal:** `production-maintenance-mode-prerequisite`
**Parent goal:** `coordinated-production-promotion-release-readiness`
**Review date:** 2026-09-10
**Plan reviewed:** `docs/workflow/plans/2026-09-10-production-maintenance-mode-prerequisite-plan.md`
**Verdict:** `approved_with_changes`
**Implementation authorization:** not granted
**Production/DEV mutation authorization:** not granted

## Review boundary

This review is adversarial and evidence-based. It checked the new Plan against the approved parent
Plan/review, `.cursor/workflow/state.md`, the handoff, the FreshForge standards, and the current
Portal, Studio, Functions, shared, Firebase, Firestore Rules, Storage Rules, auth, settings, and
caching source. No app file, Rules file, setting, database, storage object, deployment, commit, or
push was changed or executed for this goal.

## Findings

### 1. Architecture fit — pass with implementation checks

The Plan correctly uses the existing `settings/*` Firestore convention, Admin SDK trusted readers,
callable Functions, Studio `SettingsPage`/`permissionService.canManageSettings`, and Portal
`providers.tsx` rather than inventing a separate service or requiring a Portal rebuild. It correctly
rejects public direct reads of settings because the Rules surface keeps settings private by default.

The exact new document ID/module names, callable names, Studio section/service wiring, and Portal
provider component are not established by source. The Plan marks each `[NEEDS REPO CHECK]`; the
implementation review must resolve them before code is written.

### 2. Trusted enforcement — pass after ordering amendment

The inventory covers callable, direct Firestore, and direct Storage mutation boundaries. The shared
guard design prevents stale-callable bypass, while Rules reinforcement covers writes that never pass
through a callable. The review required and the Plan now states the safe order: existing auth and
basic input validation, then maintenance guard, then quota consumption/external side effects and
business writes. Staff/owner/admin role checks remain unchanged.

The Plan also requires per-match access-call/expression measurements. This is mandatory because the
current print-request-item Rules already document a tight expression budget and both Rules files
perform Firestore lookups.

### 3. Mutation inventory — pass with mechanical re-run gate

The groups cover Print Requests/queue, uploads and donation, Assisted Creation, Etsy, account and
identity, reports, direct SDK writes, and the current staff/admin/read-only surface. The Plan
requires regenerating the inventory at the frozen source and failing review if a new customer write
is missing. Notification read-marker writes are now explicitly blocked so ON is genuinely
read-only; reopening that exception requires a separate reviewed product decision.

### 4. UX and recovery — pass

The proposed provider/banner is deliberately small: safe public reads can remain available, write
journeys become branded read-only, and retry/focus/visibility refresh avoids indefinite stale UI.
The existing `/admin/show-queue` and Studio operational paths remain role-gated and outside the
customer presentation. No secret URL or client-only bypass is permitted. Accessibility and mobile
requirements are concrete and testable.

### 5. Runtime, cache, and failure semantics — pass with no-store proof required

Missing state defaults OFF for a safe disabled rollout. Malformed or unreadable state fails closed
for customer mutations. The per-invocation trusted read avoids unsafe stale server caches; bounded
Portal refresh avoids indefinite normal/maintenance UI. The implementation must prove the public
state response is not CDN/static cached under the current callable stack and must not reuse the
existing catalog, social-meta, or AI caches.

### 6. Testing and promotion discipline — pass

The Plan follows repository testing conventions and separates unit/callable contracts, Firestore
and Storage emulator coverage, Portal/cache behavior, and existing auth/permission regressions. It
keeps owner DEV QA to one journey and makes the eventual production step disabled by default with a
recorded rollback baseline. It does not authorize the parent accumulated rollout or an extended
production maintenance window.

## Required Plan amendments (incorporated before verdict)

1. State that the common guard runs before quota use, external calls, or business writes (not merely
   somewhere after all callable validation).
2. Treat customer notification read-marker updates as blocked while ON so the maintenance contract
   is strictly read-only; preserve existing reads and ownership checks.
3. Keep the exact names, Rules budgets, callable no-store behavior, and complete frozen-source
   mutation manifest as explicit implementation/review gates marked `[NEEDS REPO CHECK]`.

The Plan was amended in place to include all three requirements. No further Plan change is required
to enter the next gated phase.

## Review decision

**Approved with changes.** The Plan is sufficiently bounded and evidence-backed to proceed to a
separately authorized Implement phase after owner acceptance. This verdict does not authorize
implementation, DEV QA, Rules/index/Storage deployment, Portal hosting, Studio publication, data
mutation, candidate freeze, commit, push, or any production action.

## Exit and next command

Stop here for the owner checkpoint. The recommended next FreshForge command is **`Continue FreshForge`**
after the owner explicitly accepts this reviewed prerequisite and authorizes Implement. If the owner
does not accept, leave the state at Formal Review complete and do not mutate runtime or source.
