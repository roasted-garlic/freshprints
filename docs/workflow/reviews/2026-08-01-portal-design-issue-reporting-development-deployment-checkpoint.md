# Development deployment checkpoint: Portal design issue reporting

Status: **AWAITING EXPLICIT APPROVAL — nothing deployed**

Required scoped commands after approval:

1. Functions:
   `firebase deploy --only functions:submitPortalDesignIssueReport,functions:resolveDesignIssueReport --project fresh-prints-dev`
2. Firestore Rules (separate explicit Rules approval required by owner decision 15):
   `firebase deploy --only firestore:rules --project fresh-prints-dev`
3. Firestore indexes (separate explicit indexes approval required by owner decision 15):
   `firebase deploy --only firestore:indexes --project fresh-prints-dev`
4. Wait for both new indexes to become Enabled.
5. Roll out the reviewed feature branch to the development Portal using the established App Hosting development process.
6. Run Studio against `fresh-prints-dev`; do not build or distribute a production installer.

No production command is authorized. The three pending Customer Upload production Functions remain undeployed.
