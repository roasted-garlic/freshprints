import { after, before, beforeEach, describe, it } from "node:test";
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { readFileSync } from "node:fs";
import path from "node:path";

let environment: RulesTestEnvironment;
const users = { owner: "trace-owner", admin: "trace-admin", helper: "trace-helper", customer: "trace-customer" };
before(async () => { environment = await initializeTestEnvironment({ projectId: "demo-fresh-prints-traces", firestore: { host: "127.0.0.1", port: 8080, rules: readFileSync(path.resolve("firestore.rules"), "utf8") } }); });
after(async () => { await environment.cleanup(); });
beforeEach(async () => { await environment.clearFirestore(); await environment.withSecurityRulesDisabled(async (context) => { const db = context.firestore(); for (const [role, uid] of Object.entries(users)) await setDoc(doc(db, "users", uid), { role, isActive: true }); await setDoc(doc(db, "aiEnrichmentTraces", "t"), { traceId: "t", source: "AUTOMATED TEST - MOCK/FIXTURE" }); await setDoc(doc(db, "aiEnrichmentTraceFull", "t"), { traceId: "t", source: "AUTOMATED TEST - MOCK/FIXTURE", prompt: { effectiveUser: "owner only" } }); }); });
describe("AI enrichment trace rules", () => {
  it("allows owner/admin bounded reads", async () => { for (const uid of [users.owner, users.admin]) await assertSucceeds(getDoc(doc(environment.authenticatedContext(uid).firestore(), "aiEnrichmentTraces", "t"))); });
  it("allows only owner full reads", async () => { await assertSucceeds(getDoc(doc(environment.authenticatedContext(users.owner).firestore(), "aiEnrichmentTraceFull", "t"))); await assertFails(getDoc(doc(environment.authenticatedContext(users.admin).firestore(), "aiEnrichmentTraceFull", "t"))); });
  it("denies helper/customer reads and all client writes", async () => { for (const uid of [users.helper, users.customer]) await assertFails(getDoc(doc(environment.authenticatedContext(uid).firestore(), "aiEnrichmentTraces", "t"))); await assertFails(setDoc(doc(environment.authenticatedContext(users.owner).firestore(), "aiEnrichmentTraces", "new"), { traceId: "new" })); });
});
