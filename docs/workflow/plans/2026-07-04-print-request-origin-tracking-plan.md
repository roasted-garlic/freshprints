# Print Request Origin Tracking Plan

Date: 2026-07-04
Mode: Managed Phase
Goal: `print-request-origin-tracking`
Roadmap Area: Phase 6 - Customers And Print Requests follow-up; Phase 8 Portal preparation

## Workflow Gate

Status: signed off PASS after implementation, automated verification, dev Firestore rules deploy,
and user-run authenticated manual QA.

Required workflow:

1. Plan
2. Review
3. Implement
4. Test
5. Signoff

Implementation must not begin until this plan is reviewed and explicitly approved.

## 1. Goal

Add explicit origin metadata to Print Requests so Studio and the future Portal can distinguish:

- Internal requests created in Studio.
- Customer requests created by staff in Studio.
- Customer requests submitted by customers in the future Portal.

This must not be inferred from the request name. Customer request names remain sequence-based, such
as `sarahsmith-CR001` and `sarahsmith-CR002`; origin is stored separately.

## 2. Phase Alignment

This is a Phase 6 hardening/foundation follow-up with Phase 8 Portal preparation.

It may add shared schema, service, rule, test, and Studio display support for origin metadata. It
must not implement customer Portal request creation, Portal account linking, Print Runs, Custom
Requests, payments, shipping, checkout, show capacity, or any Phase 8/9 UI surface.

## 3. Current State

Docs and repo paths inspected:

- `docs/AI_RULES.md`
- `.cursor/workflow/state.md`
- `project-chatgpt-handoff/CURRENT-STATE.md`
- `docs/project/ROADMAP.md`
- `docs/architecture/ARCHITECTURE.md`
- `docs/standards/CODING_STANDARDS.md`
- `docs/standards/STYLE_GUIDE.md`
- `docs/architecture/FIREBASE.md`
- `docs/architecture/DATA_MODEL.md`
- `docs/standards/SECURITY.md`
- `docs/WORKFLOWS.md`
- `shared/types/printRequest/printRequest.types.ts`
- `src/renderer/src/features/print-requests/services/printRequestService.ts`
- `src/renderer/src/features/print-requests/pages/PrintRequestsPage.tsx`
- `firestore.rules`

No requested path differed.

Current model:

- `PrintRequest` has `name`, optional `customerId`, `isInternal`, `status`, `itemCount`,
  `requestSequenceNumber`, customer snapshots, optional `internalBaseName`, optional
  `nameFormatVersion`, optional `notes`, and standard audit timestamps.
- New Studio customer requests use `username-CR###`.
- New Studio internal requests use `baseName-IR###`.
- `isInternal` distinguishes internal vs customer assignment, but it does not distinguish
  staff-created customer requests from future customer-created Portal requests.
- Customer role has no Studio access to Print Requests yet.
- Firestore rules currently allow staff to create/update Print Requests and do not yet validate a
  request origin field.

## 4. Product Decisions

Confirmed:

- Add explicit request origin tracking.
- Use the field name `requestOrigin`.
- Approved origin values:

```ts
export type PrintRequestOrigin =
  | "studio_internal"
  | "studio_customer"
  | "portal_customer";
```

- Internal request created in Studio: `requestOrigin: "studio_internal"`.
- Customer request created by staff in Studio: `requestOrigin: "studio_customer"`.
- Customer request created by customer in future Portal: `requestOrigin: "portal_customer"`.
- Request origin must not be inferred from the request name.
- Customer request names remain sequence-based, for example `sarahsmith-CR001`.
- Existing requests without `requestOrigin` remain readable and do not require a migration or
  backfill.
- Origin display badges use the final compatibility mapping in the UI plan.
- Do not add origin filters or Firestore indexes in this phase.
- Do not implement Portal behavior, customer Auth, Portal login, customer-created requests,
  migrations, or backfills.

## 5. Proposed Data Model

Extend `PrintRequest`:

```ts
export type PrintRequestOrigin =
  | "studio_internal"
  | "studio_customer"
  | "portal_customer";

export interface PrintRequest {
  // existing fields...
  requestOrigin?: PrintRequestOrigin;
}
```

Compatibility:

- Existing Print Requests without `requestOrigin` remain readable.
- No automatic migration or backfill is part of this phase.
- New Studio-created requests must persist `requestOrigin`.
- Runtime mappers should read the field as optional for legacy compatibility.
- UI may display a legacy-compatible fallback label for old records, but new behavior must rely on
  `requestOrigin` when present and must not parse request names.

Final compatibility display mapping:

- If `requestOrigin === "studio_internal"`, show badge `Internal`.
- If `requestOrigin === "studio_customer"`, show badge `Staff Created`.
- If `requestOrigin === "portal_customer"`, show badge `Customer Submitted`.
- If `requestOrigin` is missing and `isInternal === true`, show badge `Internal`.
- If `requestOrigin` is missing and `customerId` exists, show badge `Staff Created`.
- If `requestOrigin` is missing and neither rule applies, show badge `Legacy`.

This fallback is for display compatibility only. It must not be used for new write semantics or
future Portal authorization.

## 6. Implementation Scope After Approval

In scope after approval:

- Add shared `PrintRequestOrigin` type and optional `requestOrigin` field to `PrintRequest`.
- Add shared helper functions if useful:
  - Validate/normalize supported origin values.
  - Format Studio display badges as `Internal`, `Staff Created`, and `Customer Submitted`.
  - Resolve legacy display labels without reading the request name.
- Update `printRequestService` create paths:
  - `createInternalPrintRequest` writes `studio_internal`.
  - `createCustomerPrintRequest` writes `studio_customer`.
- Keep future `portal_customer` as a valid model value without implementing Portal creation.
- Update Firestore rules to allow and validate `requestOrigin`.
- Keep existing requests without `requestOrigin` readable and editable where otherwise permitted.
- Display origin clearly in Studio request list cards and/or request detail header so staff can tell
  at a glance how the request was created.
- Add focused tests for:
  - Origin type/helper behavior.
  - Studio internal create writes `studio_internal`.
  - Studio customer create writes `studio_customer`.
  - Legacy records without `requestOrigin` remain readable.
  - Firestore rule shape, if the repo has suitable rule test coverage; otherwise document manual
    rule verification.
- Update durable docs:
  - `docs/architecture/DATA_MODEL.md`
  - `docs/WORKFLOWS.md`
  - `docs/standards/SECURITY.md`
  - `docs/project/DECISIONS.md`
  - `docs/project/ROADMAP.md`
  - `project-chatgpt-handoff/CURRENT-STATE.md`

Out of scope:

- No Portal app behavior.
- No customer-created Portal request implementation.
- No customer Auth or Portal login.
- No Portal authentication/account linking.
- No Custom Requests.
- No Print Runs.
- No show selection or show capacity.
- No request naming format change.
- No request counter change.
- No request status workflow change.
- No item sizing or duplicate behavior changes.
- No production status workflow changes.
- No design lifecycle status changes.
- No migration or backfill.
- No Firebase deploy without a separate human checkpoint.
- No Firestore index changes or deploys for origin tracking.

## 7. Firestore Rules Plan

Rules should add `requestOrigin` to the allowed `printRequests` keys and validate values when the
field is present.

Recommended rule behavior:

- New Studio-created requests include `requestOrigin`.
- Existing legacy documents without `requestOrigin` can remain valid for read and normal update
  compatibility.
- If `requestOrigin` is present, it must be one of:
  - `studio_internal`
  - `studio_customer`
  - `portal_customer`
- For new writes, origin should align with assignment:
  - `studio_internal` requires `isInternal == true` and no customer assignment.
  - `studio_customer` requires `isInternal == false` and a customer assignment.
  - `portal_customer` requires `isInternal == false` and a customer assignment.

Portal-specific write permissions for `portal_customer` remain out of scope. The value may be valid
in the schema before Portal writes are allowed.

Deploy checkpoint:

- Updating `firestore.rules` locally is in implementation scope if approved.
- Deploying rules to `fresh-prints-dev` requires explicit human approval.
- No Functions, Hosting, Storage rules, indexes, migrations, or backfills are approved by this plan.

## 8. Query And Index Plan

Do not add origin filtering in this implementation.

Recommended first implementation:

- Preserve existing Print Request list query paths and indexes.
- Add origin as display metadata only.
- Do not add new Firestore composite indexes.

If a future implementation adds `requestOrigin` filters or dashboards, plan indexes separately.

## 9. UI Plan

Studio should show origin at a glance without adding new behavior.

Final badge labels:

- `requestOrigin === "studio_internal"` -> `Internal`
- `requestOrigin === "studio_customer"` -> `Staff Created`
- `requestOrigin === "portal_customer"` -> `Customer Submitted`
- Missing `requestOrigin` and `isInternal === true` -> `Internal`
- Missing `requestOrigin` and `customerId` exists -> `Staff Created`
- Missing `requestOrigin` with no matching compatibility rule -> `Legacy`

Recommended placement:

- Request list card badge near the existing Internal/Customer/status badges.
- Request detail header badge near the status and Internal/Customer badges.

The badge is display-only. It must not make request names editable, change request status behavior,
or add Portal actions.

## 10. Testing Plan

Run and report:

```bash
npx tsx --test src/renderer/src/features/print-requests/utils/printRequestItemSizingAndNaming.test.ts src/renderer/src/features/print-requests/utils/printRequestQueryPlanning.test.ts <new origin test path>
npx tsc --noEmit
npm run lint
npx vite build
git diff --check
```

Manual QA after implementation:

- Open `/print-requests`.
- Confirm existing legacy requests still load.
- Confirm request list cards show an origin badge/label.
- Create an internal Studio request and confirm origin displays as `Internal`.
- Create a staff-created customer request and confirm origin displays as `Staff Created`.
- Confirm legacy requests without `requestOrigin` display `Internal`, `Staff Created`, or `Legacy`
  according to the compatibility rules.
- Confirm request names remain `baseName-IR###` or `username-CR###`.
- Confirm request origin is not editable from the page.
- Open request detail and confirm origin displays consistently.
- Confirm item autosave and Request Detail manual-save behavior still work.
- Confirm no Portal, Print Runs, Custom Requests, status workflow, or design lifecycle changes occur.

If Firestore rules are changed and deployed to dev after approval, repeat manual QA against the dev
Firebase backend.

## 11. Human Checkpoints

Required before implementation:

- Plan review and explicit implementation approval.

Required before deploy:

- Explicit approval to deploy Firestore rules to dev, if implementation changes `firestore.rules`.
- Explicit approval for any Firestore index deploy, if a reviewed implementation unexpectedly needs
  a new index.

Always forbidden without separate approval:

- Production deploys.
- Data migrations/backfills.
- Firestore rules relaxation beyond the reviewed origin-field validation.
- Portal creation behavior.
- Functions deploy.

## 12. Open Questions For Review

Recommended default decisions unless changed in review:

1. Should `requestOrigin` be optional in TypeScript for legacy compatibility? Recommended: yes.
2. Should new Studio-created requests always write `requestOrigin`? Recommended: yes.
3. Should Studio display fallback labels for legacy records? Final decision: yes, using
   `requestOrigin` first, then `isInternal`, then `customerId`, and never the request name.
4. Should this phase add origin filters? Final decision: no; display-only metadata first.
5. Should `portal_customer` be allowed in rules now? Recommended: validate the value, but do not
   grant customer write permissions until Phase 8 Portal work.

## 13. Ready For Implementation Approval

This plan is ready for implementation approval. Implementation remains blocked until explicitly
approved.
