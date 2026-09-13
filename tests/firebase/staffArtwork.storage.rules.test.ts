import { after, before, describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, setDoc } from "firebase/firestore";
import { getBytes, ref, uploadBytes } from "firebase/storage";

let environment: RulesTestEnvironment;
const OWNER_UID = "staff-storage-owner";
const CUSTOMER_UID = "staff-storage-customer";

describe("Staff Artwork Storage privacy boundary", () => {
  before(async () => {
    environment = await initializeTestEnvironment({
      projectId: "fresh-prints-dev",
      firestore: { rules: readFileSync("firestore.rules", "utf8"), host: "127.0.0.1", port: 8080 },
      storage: { rules: readFileSync("storage.rules", "utf8"), host: "127.0.0.1", port: 9199 },
    });
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "users", OWNER_UID), { role: "owner", isActive: true });
      await setDoc(doc(context.firestore(), "users", CUSTOMER_UID), { role: "customer", isActive: true });
    });
  });

  after(async () => environment.cleanup());

  it("allows customer preview/thumb reads and denies production/source", async () => {
    const bytes = new Uint8Array([1, 2, 3]);
    await environment.withSecurityRulesDisabled(async (context) => {
      await uploadBytes(ref(context.storage(), "staff-artwork/art-1/preview.webp"), bytes, {
        contentType: "image/webp",
      });
      await uploadBytes(ref(context.storage(), "staff-artwork/art-1/thumbnail.webp"), bytes, {
        contentType: "image/webp",
      });
      await uploadBytes(ref(context.storage(), "staff-artwork/art-1/production.png"), bytes, {
        contentType: "image/png",
      });
      await uploadBytes(ref(context.storage(), "staff-artwork/art-1/source"), bytes, {
        contentType: "image/png",
      });
    });
    const ownerStorage = environment.authenticatedContext(OWNER_UID).storage();
    const customerStorage = environment.authenticatedContext(CUSTOMER_UID).storage();
    await assertSucceeds(getBytes(ref(customerStorage, "staff-artwork/art-1/preview.webp")));
    await assertSucceeds(getBytes(ref(customerStorage, "staff-artwork/art-1/thumbnail.webp")));
    await assertFails(getBytes(ref(customerStorage, "staff-artwork/art-1/production.png")));
    await assertFails(getBytes(ref(customerStorage, "staff-artwork/art-1/source")));
    await assertSucceeds(getBytes(ref(ownerStorage, "staff-artwork/art-1/production.png")));
  });
});
