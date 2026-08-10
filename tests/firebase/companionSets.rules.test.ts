import { after, before, describe, it } from "node:test";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";

let environment: RulesTestEnvironment;

before(async () => {
  environment = await initializeTestEnvironment({
    projectId: "demo-fresh-prints-companion-sets",
    firestore: { host: "127.0.0.1", port: 8080, rules: undefined },
  });

  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "users", "owner"), { role: "owner", isActive: true });
    await setDoc(doc(db, "users", "helper"), { role: "helper", isActive: true });
    await setDoc(doc(db, "users", "customer"), { role: "customer", isActive: true });
    await setDoc(doc(db, "companionSets", "set-1"), {
      id: "set-1",
      memberDesignIds: ["design-a"],
      complete: false,
      createdBy: "owner",
      updatedBy: "owner",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });
});

after(async () => {
  await environment.cleanup();
});

describe("companionSets rules", () => {
  it("allows active staff reads", async () => {
    await assertSucceeds(
      getDoc(doc(environment.authenticatedContext("helper").firestore(), "companionSets", "set-1")),
    );
  });

  it("denies customer and signed-out reads", async () => {
    await assertFails(
      getDoc(doc(environment.authenticatedContext("customer").firestore(), "companionSets", "set-1")),
    );
    await assertFails(getDoc(doc(environment.unauthenticatedContext().firestore(), "companionSets", "set-1")));
  });

  it("allows staff create with required fields", async () => {
    await assertSucceeds(
      setDoc(doc(environment.authenticatedContext("owner").firestore(), "companionSets", "set-new"), {
        id: "set-new",
        memberDesignIds: ["design-b"],
        complete: false,
        createdBy: "owner",
        updatedBy: "owner",
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );
  });

  it("denies customer create", async () => {
    await assertFails(
      setDoc(doc(environment.authenticatedContext("customer").firestore(), "companionSets", "set-cust"), {
        id: "set-cust",
        memberDesignIds: ["design-c"],
        complete: false,
        createdBy: "customer",
        updatedBy: "customer",
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );
  });

  it("allows staff delete of empty/any set", async () => {
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "companionSets", "set-delete"), {
        id: "set-delete",
        memberDesignIds: ["design-z"],
        complete: true,
        createdBy: "owner",
        updatedBy: "owner",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    await assertSucceeds(
      deleteDoc(doc(environment.authenticatedContext("helper").firestore(), "companionSets", "set-delete")),
    );
  });

  it("allows staff update of complete flag", async () => {
    await assertSucceeds(
      updateDoc(doc(environment.authenticatedContext("owner").firestore(), "companionSets", "set-1"), {
        complete: true,
        updatedBy: "owner",
        updatedAt: new Date(),
      }),
    );
  });
});
