# Development deployment checkpoint: Portal design issue reporting

Status: **COMPLETE for `fresh-prints-dev`** (superseding the earlier "AWAITING EXPLICIT APPROVAL —
nothing deployed" status below, which was found to be stale against actual project state).

**Superseded note (as of 2026-08-02):** item 5 below ("roll out to the development Portal using
the established App Hosting development process") is **no longer authorized or applicable**.
`fresh-prints-dev` intentionally has no App Hosting backend — see "Development and Production
Portal Hosting Policy" in `docs/standards/DEPLOYMENT.md`. Development Portal QA is localhost-only
(`npm run dev:portal`). The missing dev backend is not a blocker.

## Actual deployment status (verified 2026-08-02)

1. Functions — **ACTIVE**, verified via `firebase functions:list --project fresh-prints-dev`:
   `submitPortalDesignIssueReport`, `resolveDesignIssueReport` (v2, callable, `us-central1`).
2. Firestore Rules — **DEPLOYED 2026-08-02** via
   `firebase deploy --only firestore:rules --project fresh-prints-dev` (exit 0, "Deploy complete!").
   Diff audited against `origin/production`'s `firestore.rules` beforehand and confirmed scoped
   only to `designIssueReports` + its quota/intent/idempotency/uniqueness support collections
   (staff read, all client writes denied). Firestore/Storage Rules emulator suite re-run
   immediately before deploy: 60/60 pass, exit 0.
3. Firestore indexes — **Enabled**, verified via `firebase firestore:indexes --project
   fresh-prints-dev`: both `designIssueReports` composite indexes present (`status ASC, createdAt
   DESC`; `status ASC, resolvedAt DESC`).
4. ~~Roll out to development Portal via App Hosting~~ — **not applicable; superseded by hosting
   policy.** No dev App Hosting backend exists or will be created. Development Portal QA runs via
   `npm run dev:portal` against `fresh-prints-dev`.
5. Studio against `fresh-prints-dev` — local Electron dev process only; no production installer
   built or distributed.

No production command was run in this pass. The three pending Customer Upload production
Functions remain undeployed (out of scope for this feature).

---

## Original checkpoint record (historical — superseded, preserved for the record)

Status: ~~AWAITING EXPLICIT APPROVAL — nothing deployed~~

Required scoped commands after approval:

1. Functions:
   `firebase deploy --only functions:submitPortalDesignIssueReport,functions:resolveDesignIssueReport --project fresh-prints-dev`
2. Firestore Rules (separate explicit Rules approval required by owner decision 15):
   `firebase deploy --only firestore:rules --project fresh-prints-dev`
3. Firestore indexes (separate explicit indexes approval required by owner decision 15):
   `firebase deploy --only firestore:indexes --project fresh-prints-dev`
4. Wait for both new indexes to become Enabled.
5. ~~Roll out the reviewed feature branch to the development Portal using the established App Hosting development process.~~ (superseded — no dev App Hosting backend will be created; see policy above)
6. Run Studio against `fresh-prints-dev`; do not build or distribute a production installer.

No production command is authorized. The three pending Customer Upload production Functions remain undeployed.
