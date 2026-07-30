import { after, before, beforeEach, describe, it } from "node:test";

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, setDoc, Timestamp, updateDoc } from "firebase/firestore";

let environment: RulesTestEnvironment;

const OWNER_UID = "owner-uid";
const ADMIN_UID = "admin-uid";
const HELPER_UID = "helper-uid";
const CUSTOMER_UID = "customer-uid";
const INACTIVE_UID = "inactive-uid";
const REQUEST_ID = "request-1";

interface CurrentFieldOptions {
  queueTab?: boolean;
  acknowledgment?: boolean;
  status?: string;
  extra?: Record<string, unknown>;
}

function buildRequest(options: CurrentFieldOptions = {}) {
  return {
    name: "Portal request",
    customerId: "customer-1",
    isInternal: false,
    requestOrigin: "portal_customer",
    status: options.status ?? "active",
    itemCount: 1,
    createdBy: "customer-uid",
    updatedBy: "customer-uid",
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    ...(options.queueTab ? { queueTab: "printing" } : {}),
    ...(options.acknowledgment
      ? {
          showQueueBiddingAcknowledgment: {
            accepted: true,
            acceptedAt: Timestamp.now(),
            acceptedByUid: "customer-uid",
            version: "portal-bidding-ack-v3",
            upcomingShowId: "show-1",
          },
        }
      : {}),
    ...options.extra,
  };
}

async function seedRequest(options: CurrentFieldOptions): Promise<void> {
  await environment.withSecurityRulesDisabled(async (context) => {
    const firestore = context.firestore();
    await setDoc(doc(firestore, "users", OWNER_UID), { role: "owner", isActive: true });
    await setDoc(doc(firestore, "users", ADMIN_UID), { role: "admin", isActive: true });
    await setDoc(doc(firestore, "users", HELPER_UID), { role: "helper", isActive: true });
    await setDoc(doc(firestore, "users", CUSTOMER_UID), { role: "customer", isActive: true });
    await setDoc(doc(firestore, "users", INACTIVE_UID), { role: "owner", isActive: false });
    await setDoc(doc(firestore, "printRequests", REQUEST_ID), buildRequest(options));
  });
}

function completeRequest(
  callerUid = OWNER_UID,
  patch: Record<string, unknown> = {},
) {
  const firestore = environment.authenticatedContext(callerUid).firestore();
  return updateDoc(doc(firestore, "printRequests", REQUEST_ID), {
    status: "completed",
    updatedBy: callerUid,
    updatedAt: Timestamp.now(),
    ...patch,
  });
}

before(async () => {
  environment = await initializeTestEnvironment({
    projectId: "demo-fresh-prints-request-completion-rules",
    firestore: { host: "127.0.0.1", port: 8080, rules: undefined },
  });
});

beforeEach(async () => {
  await environment.clearFirestore();
});

after(async () => {
  await environment.cleanup();
});

describe("print request completion — current-schema failing-before matrix", () => {
  it("allows the minimal control with neither current server-maintained field", async () => {
    await seedRequest({});
    await assertSucceeds(completeRequest());
  });

  it("allows the otherwise-identical request when queueTab alone is present", async () => {
    await seedRequest({ queueTab: true });
    await assertSucceeds(completeRequest());
  });

  it("allows the otherwise-identical request when the bidding acknowledgment alone is present", async () => {
    await seedRequest({ acknowledgment: true });
    await assertSucceeds(completeRequest());
  });

  it("allows the live Portal-queued shape containing both current fields", async () => {
    await seedRequest({ queueTab: true, acknowledgment: true });
    await assertSucceeds(completeRequest());
  });

  it("allows active admin and helper staff under the current policy", async () => {
    for (const uid of [ADMIN_UID, HELPER_UID]) {
      await seedRequest({ queueTab: true, acknowledgment: true });
      await assertSucceeds(completeRequest(uid));
      await environment.clearFirestore();
    }
  });

  it("allows editing to completed", async () => {
    await seedRequest({ status: "editing", queueTab: true, acknowledgment: true });
    await assertSucceeds(completeRequest());
  });

  it("denies draft, completed, and archived to completed", async () => {
    for (const status of ["draft", "completed", "archived"]) {
      await seedRequest({ status, queueTab: true, acknowledgment: true });
      await assertFails(completeRequest());
      await environment.clearFirestore();
    }
  });

  it("denies an invalid proposed status value", async () => {
    await seedRequest({ queueTab: true, acknowledgment: true });
    await assertFails(completeRequest(OWNER_UID, { status: "not-a-status" }));
  });

  it("denies customer, inactive staff, and signed-out completion", async () => {
    await seedRequest({ queueTab: true, acknowledgment: true });
    await assertFails(completeRequest(CUSTOMER_UID));
    await assertFails(completeRequest(INACTIVE_UID));
    const firestore = environment.unauthenticatedContext().firestore();
    await assertFails(updateDoc(doc(firestore, "printRequests", REQUEST_ID), {
      status: "completed",
      updatedBy: "signed-out",
      updatedAt: Timestamp.now(),
    }));
  });

  it("denies wrong updatedBy and invalid updatedAt", async () => {
    await seedRequest({ queueTab: true, acknowledgment: true });
    await assertFails(completeRequest(OWNER_UID, { updatedBy: ADMIN_UID }));
    await assertFails(completeRequest(OWNER_UID, { updatedAt: "not-a-timestamp" }));
  });

  it("denies completion combined with unrelated or server-maintained field changes", async () => {
    await seedRequest({ queueTab: true, acknowledgment: true });
    await assertFails(completeRequest(OWNER_UID, { notes: "unrelated" }));
    await assertFails(completeRequest(OWNER_UID, { queueTab: "printed" }));
    await assertFails(completeRequest(OWNER_UID, {
      showQueueBiddingAcknowledgment: {
        accepted: true,
        acceptedAt: Timestamp.now(),
        acceptedByUid: "customer-uid",
        version: "changed-version",
        upcomingShowId: "show-1",
      },
    }));
  });

  it("denies ownership, origin, and customer-assignment changes during completion", async () => {
    await seedRequest({ queueTab: true, acknowledgment: true });
    await assertFails(completeRequest(OWNER_UID, { createdBy: OWNER_UID }));
    await assertFails(completeRequest(OWNER_UID, { createdAt: Timestamp.now() }));
    await assertFails(completeRequest(OWNER_UID, { requestOrigin: "studio_customer" }));
    await assertFails(completeRequest(OWNER_UID, { customerId: "another-customer" }));
    await assertFails(completeRequest(OWNER_UID, { guestCustomerId: "guest-1" }));
  });

  it("denies malformed current field shapes and unknown legacy fields", async () => {
    await seedRequest({ extra: { queueTab: "unknown" } });
    await assertFails(completeRequest());
    await environment.clearFirestore();
    await seedRequest({ extra: {
      showQueueBiddingAcknowledgment: {
        accepted: false,
        acceptedAt: Timestamp.now(),
        acceptedByUid: "customer-uid",
        version: "portal-bidding-ack-v3",
        upcomingShowId: "show-1",
      },
    } });
    await assertFails(completeRequest());
    await environment.clearFirestore();
    await seedRequest({ extra: { legacyImportShape: true } });
    await assertFails(completeRequest());
  });

  it("denies regression from completed while preserving a representative active detail edit", async () => {
    await seedRequest({ status: "completed", queueTab: true, acknowledgment: true });
    const firestore = environment.authenticatedContext(OWNER_UID).firestore();
    await assertFails(updateDoc(doc(firestore, "printRequests", REQUEST_ID), {
      status: "active",
      updatedBy: OWNER_UID,
      updatedAt: Timestamp.now(),
    }));
    await environment.clearFirestore();
    await seedRequest({ queueTab: true, acknowledgment: true });
    const activeFirestore = environment.authenticatedContext(OWNER_UID).firestore();
    await assertSucceeds(updateDoc(doc(activeFirestore, "printRequests", REQUEST_ID), {
      notes: "safe staff detail edit",
      updatedBy: OWNER_UID,
      updatedAt: Timestamp.now(),
    }));
    await assertFails(updateDoc(doc(activeFirestore, "printRequests", REQUEST_ID), {
      queueTab: "printed",
      updatedBy: OWNER_UID,
      updatedAt: Timestamp.now(),
    }));
  });
});
