import { after, before, beforeEach, describe, it } from "node:test";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Slice 5: catalogReprocessJobs + outcomes/{designId} — owner read; client write deny.
 */

let environment: RulesTestEnvironment;

const OWNER = "owner-uid";
const ADMIN = "admin-uid";
const HELPER = "helper-uid";
const CUSTOMER = "customer-uid";
const JOB_ID = "job-1";
const DESIGN_ID = "design-1";

before(async () => {
  const rules = readFileSync(path.resolve("firestore.rules"), "utf8");
  environment = await initializeTestEnvironment({
    projectId: "demo-fresh-prints-catalog-reprocess",
    firestore: { host: "127.0.0.1", port: 8080, rules },
  });
});

after(async () => {
  await environment.cleanup();
});

describe("catalogReprocessJobs / outcomes rules", () => {
  beforeEach(async () => {
    await environment.clearFirestore();
    await environment.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, "users", OWNER), { role: "owner", isActive: true });
      await setDoc(doc(db, "users", ADMIN), { role: "admin", isActive: true });
      await setDoc(doc(db, "users", HELPER), { role: "helper", isActive: true });
      await setDoc(doc(db, "users", CUSTOMER), { role: "customer", isActive: true });
      await setDoc(doc(db, "catalogReprocessJobs", JOB_ID), {
        targetType: "ai_review_queue",
        status: "running",
        projectId: "fresh-prints-dev",
        createdBy: OWNER,
      });
      await setDoc(doc(db, "catalogReprocessJobs", JOB_ID, "outcomes", DESIGN_ID), {
        designId: DESIGN_ID,
        status: "succeeded",
        remainedNeedsReview: true,
      });
    });
  });

  it("allows owner to read catalogReprocessJobs/{jobId}", async () => {
    await assertSucceeds(
      getDoc(
        doc(environment.authenticatedContext(OWNER).firestore(), "catalogReprocessJobs", JOB_ID),
      ),
    );
  });

  it("allows owner to read catalogReprocessJobs/{jobId}/outcomes/{designId}", async () => {
    await assertSucceeds(
      getDoc(
        doc(
          environment.authenticatedContext(OWNER).firestore(),
          "catalogReprocessJobs",
          JOB_ID,
          "outcomes",
          DESIGN_ID,
        ),
      ),
    );
  });

  it("denies non-owner (admin/helper/customer) reads of outcomes", async () => {
    for (const uid of [ADMIN, HELPER, CUSTOMER]) {
      await assertFails(
        getDoc(
          doc(
            environment.authenticatedContext(uid).firestore(),
            "catalogReprocessJobs",
            JOB_ID,
            "outcomes",
            DESIGN_ID,
          ),
        ),
      );
    }
  });

  it("denies signed-out read of outcomes", async () => {
    await assertFails(
      getDoc(
        doc(
          environment.unauthenticatedContext().firestore(),
          "catalogReprocessJobs",
          JOB_ID,
          "outcomes",
          DESIGN_ID,
        ),
      ),
    );
  });

  it("denies client create/update/delete of outcome docs (including owner)", async () => {
    const ownerDb = environment.authenticatedContext(OWNER).firestore();
    const outcomeRef = doc(ownerDb, "catalogReprocessJobs", JOB_ID, "outcomes", "design-new");

    await assertFails(
      setDoc(outcomeRef, {
        designId: "design-new",
        status: "succeeded",
      }),
    );

    await assertFails(
      updateDoc(
        doc(ownerDb, "catalogReprocessJobs", JOB_ID, "outcomes", DESIGN_ID),
        { status: "failed" },
      ),
    );

    await assertFails(
      deleteDoc(doc(ownerDb, "catalogReprocessJobs", JOB_ID, "outcomes", DESIGN_ID)),
    );
  });

  it("denies client write of parent catalogReprocessJobs docs", async () => {
    const ownerDb = environment.authenticatedContext(OWNER).firestore();
    await assertFails(
      setDoc(doc(ownerDb, "catalogReprocessJobs", "job-client"), {
        targetType: "ai_review_queue",
        status: "pending",
      }),
    );
    await assertFails(
      updateDoc(doc(ownerDb, "catalogReprocessJobs", JOB_ID), { status: "paused" }),
    );
    await assertFails(deleteDoc(doc(ownerDb, "catalogReprocessJobs", JOB_ID)));
  });
});
