import { after, before, describe, it } from "node:test";
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
let environment: RulesTestEnvironment;
before(async () => { environment = await initializeTestEnvironment({ projectId: "demo-fresh-prints-design-reports", firestore: { host: "127.0.0.1", port: 8080, rules: undefined } }); await environment.withSecurityRulesDisabled(async (context) => { await setDoc(doc(context.firestore(), "users", "owner"), { role: "owner", isActive: true }); await setDoc(doc(context.firestore(), "users", "helper"), { role: "helper", isActive: true }); await setDoc(doc(context.firestore(), "users", "customer"), { role: "customer", isActive: true }); await setDoc(doc(context.firestore(), "designIssueReports", "report-1"), { status: "open", designId: "design-1", description: "Wrong wording" }); }); });
after(async () => environment.cleanup());
describe("design issue report rules", () => {
  it("allows active staff reads", async () => { await assertSucceeds(getDoc(doc(environment.authenticatedContext("helper").firestore(), "designIssueReports", "report-1"))); });
  it("denies customer and signed-out reads", async () => { await assertFails(getDoc(doc(environment.authenticatedContext("customer").firestore(), "designIssueReports", "report-1"))); await assertFails(getDoc(doc(environment.unauthenticatedContext().firestore(), "designIssueReports", "report-1"))); });
  it("denies direct creates and protected updates", async () => { await assertFails(setDoc(doc(environment.authenticatedContext("customer").firestore(), "designIssueReports", "report-2"), { status: "open" })); await assertFails(updateDoc(doc(environment.authenticatedContext("owner").firestore(), "designIssueReports", "report-1"), { status: "resolved" })); });
  it("denies abuse-control writes", async () => { await assertFails(setDoc(doc(environment.authenticatedContext("owner").firestore(), "designIssueReportDailyQuotas", "quota"), { count: 1 })); });
});
