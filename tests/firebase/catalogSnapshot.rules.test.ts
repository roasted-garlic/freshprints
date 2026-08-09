import { after, before, describe, it } from 'node:test';

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, setDoc, Timestamp, updateDoc } from 'firebase/firestore';
import { getBytes, ref, uploadBytes } from 'firebase/storage';

let environment: RulesTestEnvironment;

const OWNER_UID = 'owner-uid';
const CUSTOMER_UID = 'customer-uid';
const READY_DESIGN_ID = 'design-ready-1';

before(async () => {
  environment = await initializeTestEnvironment({
    projectId: 'demo-fresh-prints-snapshot-rules',
    firestore: { host: '127.0.0.1', port: 8080, rules: undefined },
    storage: { host: '127.0.0.1', port: 9199, rules: undefined },
  });
  await environment.withSecurityRulesDisabled(async (context) => {
    // Seed residual generated objects that Stage 5 deletes from live Storage —
    // Rules must now deny all client access (default-deny after Stage 5 narrowing).
    await uploadBytes(
      ref(context.storage(), 'generated/catalog-reference/manifest.json'),
      new TextEncoder().encode('{}'),
      { contentType: 'application/json' },
    );
    await uploadBytes(
      ref(context.storage(), 'generated/catalog-reference/client/v1.json'),
      new TextEncoder().encode('{}'),
      { contentType: 'application/json' },
    );
    await uploadBytes(
      ref(context.storage(), 'generated/catalog-reference/ai/v1.json'),
      new TextEncoder().encode('{}'),
      { contentType: 'application/json' },
    );
    await uploadBytes(
      ref(context.storage(), 'generated/portal-catalog/manifest.json'),
      new TextEncoder().encode('{}'),
      { contentType: 'application/json' },
    );
    await uploadBytes(
      ref(context.storage(), 'generated/portal-catalog/v1/discover.json'),
      new TextEncoder().encode('{}'),
      { contentType: 'application/json' },
    );
    await uploadBytes(
      ref(context.storage(), 'generated/portal-catalog/v1/filters/tags-facet.json'),
      new TextEncoder().encode('{}'),
      { contentType: 'application/json' },
    );
    await uploadBytes(
      ref(context.storage(), 'generated/portal-catalog/v1/studio/ready-index.json'),
      new TextEncoder().encode('{}'),
      { contentType: 'application/json' },
    );
    await uploadBytes(
      ref(context.storage(), 'generated/portal-catalog/card-overrides/v1.json'),
      new TextEncoder().encode('{}'),
      { contentType: 'application/json' },
    );

    const firestore = context.firestore();
    await setDoc(doc(firestore, 'users', OWNER_UID), {
      role: 'owner',
      isActive: true,
    });
    await setDoc(doc(firestore, 'users', CUSTOMER_UID), {
      role: 'customer',
      isActive: true,
    });
    await setDoc(doc(firestore, 'taxonomyMaterialization', 'meta'), {
      revision: 1,
      schemaVersion: 1,
      chunkCount: 1,
      tagCount: 1,
      categoryCount: 1,
      contentHash: 'abc',
      updatedAtMs: Date.now(),
      updatedBy: 'test',
      ready: true,
    });
    await setDoc(doc(firestore, 'taxonomyMaterialization', 'chunk-0'), {
      revision: 1,
      schemaVersion: 1,
      chunkIndex: 0,
      chunkCount: 1,
      contentHash: 'abc',
      categories: [],
      tags: [],
    });
    await setDoc(doc(firestore, 'snapshotPublicationState', 'catalog-reference'), {
      requestedGeneration: 1,
      publishedGeneration: 1,
    });
    await setDoc(doc(firestore, 'designs', READY_DESIGN_ID), {
      id: READY_DESIGN_ID,
      title: 'Ready design',
      tags: [],
      status: 'ready',
      originalPath: `${READY_DESIGN_ID}.png`,
      thumbnailPath: `${READY_DESIGN_ID}.webp`,
      uploadedBy: OWNER_UID,
      createdBy: OWNER_UID,
      updatedBy: OWNER_UID,
      queueCount: 0,
      aiProcessed: true,
      aiReviewed: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  });
});

after(async () => {
  await environment.cleanup();
});

describe('catalog snapshot security boundaries (Stage 5 — generated access retired)', () => {
  it('denies all client reads of former public-safe generated catalog assets', async () => {
    const guestStorage = environment.unauthenticatedContext().storage();
    await assertFails(getBytes(ref(guestStorage, 'generated/catalog-reference/manifest.json')));
    await assertFails(getBytes(ref(guestStorage, 'generated/catalog-reference/client/v1.json')));
    await assertFails(getBytes(ref(guestStorage, 'generated/portal-catalog/manifest.json')));
    await assertFails(getBytes(ref(guestStorage, 'generated/portal-catalog/v1/discover.json')));
    await assertFails(getBytes(ref(guestStorage, 'generated/portal-catalog/v1/filters/tags-facet.json')));
    await assertFails(getBytes(ref(guestStorage, 'generated/portal-catalog/v1/studio/ready-index.json')));
    await assertFails(getBytes(ref(guestStorage, 'generated/portal-catalog/card-overrides/v1.json')));

    const customerStorage = environment.authenticatedContext(CUSTOMER_UID).storage();
    await assertFails(getBytes(ref(customerStorage, 'generated/catalog-reference/manifest.json')));
    await assertFails(getBytes(ref(customerStorage, 'generated/portal-catalog/v1/discover.json')));

    const staffStorage = environment.authenticatedContext(OWNER_UID).storage();
    await assertFails(getBytes(ref(staffStorage, 'generated/portal-catalog/manifest.json')));
  });

  it('denies every read of the private AI projection regardless of role', async () => {
    const guestStorage = environment.unauthenticatedContext().storage();
    await assertFails(getBytes(ref(guestStorage, 'generated/catalog-reference/ai/v1.json')));

    const customerStorage = environment.authenticatedContext(CUSTOMER_UID).storage();
    await assertFails(getBytes(ref(customerStorage, 'generated/catalog-reference/ai/v1.json')));

    const staffStorage = environment.authenticatedContext(OWNER_UID).storage();
    await assertFails(getBytes(ref(staffStorage, 'generated/catalog-reference/ai/v1.json')));
  });

  it('denies client writes to every generated catalog prefix', async () => {
    const storage = environment.authenticatedContext(OWNER_UID).storage();
    await assertFails(uploadBytes(
      ref(storage, 'generated/portal-catalog/manifest.json'),
      new TextEncoder().encode('{}'),
    ));
    await assertFails(uploadBytes(
      ref(storage, 'generated/portal-catalog/v1/discover.json'),
      new TextEncoder().encode('{}'),
    ));
    await assertFails(uploadBytes(
      ref(storage, 'generated/catalog-reference/client/v2.json'),
      new TextEncoder().encode('{}'),
    ));
    await assertFails(uploadBytes(
      ref(storage, 'generated/catalog-reference/manifest.json'),
      new TextEncoder().encode('{}'),
    ));
    await assertFails(uploadBytes(
      ref(storage, 'generated/catalog-reference/ai/v2.json'),
      new TextEncoder().encode('{}'),
    ));
  });

  it('preserves unrelated existing Storage path behavior', async () => {
    const guestStorage = environment.unauthenticatedContext().storage();
    // Originals remain staff-only regardless of catalog snapshot changes.
    await assertFails(getBytes(ref(guestStorage, 'originals/some-file.png')));

    const customerStorage = environment.authenticatedContext(CUSTOMER_UID).storage();
    await assertFails(getBytes(ref(customerStorage, 'originals/some-file.png')));
  });

  it('denies all client access to orphan snapshotPublicationState docs (default-deny)', async () => {
    const firestore = environment.authenticatedContext(OWNER_UID).firestore();
    const reference = doc(firestore, 'snapshotPublicationState/catalog-reference');
    await assertFails(getDoc(reference));
    await assertFails(setDoc(reference, { requestedGeneration: 1 }));
    await assertFails(updateDoc(reference, { requestedGeneration: 2 }));
    await assertFails(deleteDoc(reference));

    const otherReference = doc(firestore, 'snapshotPublicationState/portal-catalog');
    await assertFails(getDoc(otherReference));
    await assertFails(setDoc(otherReference, { requestedGeneration: 1 }));
  });

  it('preserves unrelated existing Firestore access and default-deny behavior', async () => {
    const staffFirestore = environment.authenticatedContext(OWNER_UID).firestore();
    await assertSucceeds(getDoc(doc(staffFirestore, 'designs', READY_DESIGN_ID)));

    const customerFirestore = environment.authenticatedContext(CUSTOMER_UID).firestore();
    await assertSucceeds(getDoc(doc(customerFirestore, 'designs', READY_DESIGN_ID)));
    await assertFails(getDoc(doc(customerFirestore, 'someUndeclaredCollection', 'doc1')));
  });

  describe('taxonomyMaterialization (RC7)', () => {
    it('allows staff read and denies unauthenticated / non-staff read', async () => {
      const staff = environment.authenticatedContext(OWNER_UID).firestore();
      await assertSucceeds(getDoc(doc(staff, 'taxonomyMaterialization', 'meta')));
      await assertSucceeds(getDoc(doc(staff, 'taxonomyMaterialization', 'chunk-0')));

      const customer = environment.authenticatedContext(CUSTOMER_UID).firestore();
      await assertFails(getDoc(doc(customer, 'taxonomyMaterialization', 'meta')));

      const guest = environment.unauthenticatedContext().firestore();
      await assertFails(getDoc(doc(guest, 'taxonomyMaterialization', 'meta')));
    });

    it('denies all client writes including staff', async () => {
      const staff = environment.authenticatedContext(OWNER_UID).firestore();
      await assertFails(
        setDoc(doc(staff, 'taxonomyMaterialization', 'meta'), {
          revision: 2,
          ready: true,
        }),
      );
      await assertFails(
        updateDoc(doc(staff, 'taxonomyMaterialization', 'meta'), { revision: 2 }),
      );
      await assertFails(deleteDoc(doc(staff, 'taxonomyMaterialization', 'chunk-0')));

      const customer = environment.authenticatedContext(CUSTOMER_UID).firestore();
      await assertFails(
        setDoc(doc(customer, 'taxonomyMaterialization', 'chunk-1'), { revision: 1 }),
      );
    });
  });

  /**
   * Abandoned private print-request read-model prefix removal (Wave C pass 6, 2026-07-26)
   * plus Stage 5 generated catalog retirement: all undeclared generated/** paths deny
   * via the final catch-all only — no broader generated/** public wildcard remains.
   */
  describe('abandoned / retired generated prefixes (default-deny only)', () => {
    it('denies every role read access to the old Studio print-request prefix', async () => {
      const guestStorage = environment.unauthenticatedContext().storage();
      await assertFails(getBytes(ref(guestStorage, 'generated/studio-print-requests/manifest.json')));

      const staffStorage = environment.authenticatedContext(OWNER_UID).storage();
      await assertFails(getBytes(ref(staffStorage, 'generated/studio-print-requests/manifest.json')));
      await assertFails(
        uploadBytes(
          ref(staffStorage, 'generated/studio-print-requests/manifest.json'),
          new TextEncoder().encode('{}'),
        ),
      );

      const customerStorage = environment.authenticatedContext(CUSTOMER_UID).storage();
      await assertFails(getBytes(ref(customerStorage, 'generated/studio-print-requests/manifest.json')));
    });

    it('denies every role read access to the old Portal customer print-request prefix', async () => {
      const guestStorage = environment.unauthenticatedContext().storage();
      await assertFails(
        getBytes(ref(guestStorage, 'generated/portal-print-requests/customers/some-customer/manifest.json')),
      );

      const staffStorage = environment.authenticatedContext(OWNER_UID).storage();
      await assertFails(
        getBytes(ref(staffStorage, 'generated/portal-print-requests/customers/some-customer/manifest.json')),
      );

      const customerStorage = environment.authenticatedContext(CUSTOMER_UID).storage();
      await assertFails(
        getBytes(
          ref(customerStorage, 'generated/portal-print-requests/customers/some-customer/manifest.json'),
        ),
      );
      await assertFails(
        uploadBytes(
          ref(customerStorage, 'generated/portal-print-requests/customers/some-customer/manifest.json'),
          new TextEncoder().encode('{}'),
        ),
      );
    });

    it('denies retired portal-catalog and catalog-reference equally with other undeclared generated paths', async () => {
      const guestStorage = environment.unauthenticatedContext().storage();
      await assertFails(getBytes(ref(guestStorage, 'generated/studio-print-requests/working/page-0-vabc123.json')));
      await assertFails(getBytes(ref(guestStorage, 'generated/portal-print-requests/customers/x/page-0-vabc123.json')));
      // Stage 5: former public catalog paths now deny identically (no public wildcard leak).
      await assertFails(getBytes(ref(guestStorage, 'generated/portal-catalog/manifest.json')));
      await assertFails(getBytes(ref(guestStorage, 'generated/catalog-reference/client/v1.json')));
    });
  });
});
