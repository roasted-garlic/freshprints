import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

test("Portal report UI uses trusted callable and approved accessible copy", () => {
  const details = read("apps/portal/features/catalog/components/CatalogDesignDetailsModal.tsx");
  const modal = read("apps/portal/features/catalog/components/CatalogDesignIssueReportModal.tsx");
  const service = read("apps/portal/features/catalog/services/catalogDesignIssueReportService.ts");
  assert.match(details, />Report an Issue</);
  assert.match(modal, /readOnly value=\{designId\}/);
  assert.match(modal, /aria-modal="true"/);
  assert.doesNotMatch(modal, /\b(?:alert|prompt|confirm)\s*\(/);
  assert.match(service, /submitPortalDesignIssueReport/);
});

test("backend owns identity lifecycle quotas uniqueness and never updates designs", () => {
  const submit = read("functions/src/submitPortalDesignIssueReport.ts");
  const resolve = read("functions/src/resolveDesignIssueReport.ts");
  for (const value of ["requirePortalCustomer", "designIssueReportDailyQuotas", "designIssueReportOpenGuards", "designIssueReportIntents", "FieldValue.serverTimestamp"]) assert.match(submit, new RegExp(value));
  assert.match(resolve, /status: "resolved"/);
  assert.match(resolve, /\["owner", "admin", "helper"\]/);
  assert.doesNotMatch(resolve, /collection\("designs"\).*update/s);
});

test("Studio listener is bounded and resolved history is on demand", () => {
  const subscription = read("apps/studio/src/renderer/src/features/staff-inbox/services/staffInboxSubscriptionService.ts");
  const history = read("apps/studio/src/renderer/src/features/staff-inbox/services/designIssueReportService.ts");
  assert.match(subscription, /where\("status", "==", "open"\)/);
  assert.match(subscription, /limit\(DESIGN_ISSUE_REPORT_OPEN_LIMIT\)/);
  assert.match(history, /limit\(DESIGN_ISSUE_REPORT_HISTORY_PAGE_SIZE\)/);
  assert.doesNotMatch(history, /onSnapshot/);
});

test("Rules deny client writes and exact report indexes exist", () => {
  const rules = read("firestore.rules");
  assert.match(rules, /match \/designIssueReports\/\{reportId\}[\s\S]*allow read: if isStaff\(\);[\s\S]*allow create, update, delete: if false;/);
  const indexes = JSON.parse(read("firestore.indexes.json")) as { indexes: Array<{ collectionGroup: string; fields: Array<{ fieldPath: string; order: string }> }> };
  const reportIndexes = indexes.indexes.filter((entry) => entry.collectionGroup === "designIssueReports");
  assert.deepEqual(reportIndexes.map((entry) => entry.fields.map((field) => `${field.fieldPath}:${field.order}`)), [["status:ASCENDING", "createdAt:DESCENDING"], ["status:ASCENDING", "resolvedAt:DESCENDING"]]);
});
