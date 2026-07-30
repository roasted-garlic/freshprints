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

describe('catalog snapshot security boundaries', () => {
  it('allows public-safe generated assets to guest and authenticated clients', async () => {
    const guestStorage = environment.unauthenticatedContext().storage();
    await assertSucceeds(getBytes(ref(guestStorage, 'generated/catalog-reference/manifest.json')));
    await assertSucceeds(getBytes(ref(guestStorage, 'generated/catalog-reference/client/v1.json')));
    await assertSucceeds(getBytes(ref(guestStorage, 'generated/portal-catalog/manifest.json')));
    await assertSucceeds(getBytes(ref(guestStorage, 'generated/portal-catalog/v1/discover.json')));

    const customerStorage = environment.authenticatedContext(CUSTOMER_UID).storage();
    await assertSucceeds(getBytes(ref(customerStorage, 'generated/catalog-reference/manifest.json')));
    await assertSucceeds(getBytes(ref(customerStorage, 'generated/catalog-reference/client/v1.json')));
    await assertSucceeds(getBytes(ref(customerStorage, 'generated/portal-catalog/v1/discover.json')));
  });

  it('covers the new tag-facet summary path under the existing generated/portal-catalog wildcard', async () => {
    // No rules change was needed for this new path (generated/portal-catalog/{allPaths=**} already
    // covers it) — this test proves that rather than assuming it.
    const guestStorage = environment.unauthenticatedContext().storage();
    await assertSucceeds(getBytes(ref(guestStorage, 'generated/portal-catalog/v1/filters/tags-facet.json')));

    const staffStorage = environment.authenticatedContext(OWNER_UID).storage();
    await assertFails(uploadBytes(
      ref(staffStorage, 'generated/portal-catalog/v1/filters/tags-facet.json'),
      new TextEncoder().encode('{}'),
    ));
  });

  it('covers the new Studio ready-index path under the existing generated/portal-catalog wildcard', async () => {
    // No rules change was needed for this new path either (same
    // generated/portal-catalog/{allPaths=**} wildcard) — proven, not assumed. Public-read is
    // intentional: this asset only ever contains ready (customer-visible) designs, the same scope
    // already exposed via Portal card buckets — never archived/staff-only designs.
    const guestStorage = environment.unauthenticatedContext().storage();
    await assertSucceeds(getBytes(ref(guestStorage, 'generated/portal-catalog/v1/studio/ready-index.json')));

    const staffStorage = environment.authenticatedContext(OWNER_UID).storage();
    await assertFails(uploadBytes(
      ref(staffStorage, 'generated/portal-catalog/v1/studio/ready-index.json'),
      new TextEncoder().encode('{}'),
    ));
  });

  it('covers immutable card overrides under the existing public-read/Admin-write wildcard', async () => {
    const guestStorage = environment.unauthenticatedContext().storage();
    await assertSucceeds(
      getBytes(ref(guestStorage, 'generated/portal-catalog/card-overrides/v1.json')),
    );

    const staffStorage = environment.authenticatedContext(OWNER_UID).storage();
    await assertFails(uploadBytes(
      ref(staffStorage, 'generated/portal-catalog/card-overrides/v1.json'),
      new TextEncoder().encode('{}'),
    ));
  });

  it('denies every read of the private AI projection regardless of role', async () => {
    const guestStorage = environment.unauthenticatedContext().storage();
    await assertFails(getBytes(ref(guestStorage, 'generated/catalog-reference/ai/v1.json')));

    const customerStorage = environment.authenticatedContext(CUSTOMER_UID).storage();
    await assertFails(getBytes(ref(customerStorage, 'generated/catalog-reference/ai/v1.json')));

    const staffStorage = environment.authenticatedContext(OWNER_UID).storage();
    await assertFails(getBytes(ref(staffStorage, 'generated/catalog-reference/ai/v1.json')));
  });

  it('denies client writes to every generated prefix including the private AI projection', async () => {
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

  it('denies all client access to coordination documents including update and delete', async () => {
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
    // Staff can still read a ready design directly (unaffected by the new coordination deny).
    await assertSucceeds(getDoc(doc(staffFirestore, 'designs', READY_DESIGN_ID)));

    const customerFirestore = environment.authenticatedContext(CUSTOMER_UID).firestore();
    // Public catalog design read remains allowed for any signed-in customer.
    await assertSucceeds(getDoc(doc(customerFirestore, 'designs', READY_DESIGN_ID)));
    // Default-deny still applies to an undeclared collection.
    await assertFails(getDoc(doc(customerFirestore, 'someUndeclaredCollection', 'doc1')));
  });

  /**
   * Abandoned private print-request read-model prefix removal (Wave C pass 6, 2026-07-26): the
   * explicit `generated/studio-print-requests/**` and
   * `generated/portal-print-requests/customers/{customerId}/**` match blocks (and their
   * `customerBelongsToCaller` helper) were deleted from `storage.rules` once the objects under
   * both prefixes were confirmed deleted and the publishing/consuming source was fully removed.
   * Proves the paths now fall through only to the final catch-all default-deny — no broader
   * `generated/**` wildcard exists in this file that would otherwise expose them; every other
   * `generated/**` rule is scoped to a distinct literal subpath
   * (`generated/catalog-reference/...`, `generated/portal-catalog/...`), never a bare
   * `generated/**`.
   */
  describe('abandoned private print-request read-model prefixes (removed, default-deny only)', () => {
    it('denies every role read access to the old Studio prefix, with no write path for any role', async () => {
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

    it('denies every role read access to the old Portal customer prefix, with no write path for any role', async () => {
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

    it('does not fall through to any broader generated/** wildcard — the abandoned prefixes remain a distinct literal path, denied by the final catch-all only', async () => {
      const guestStorage = environment.unauthenticatedContext().storage();
      // Confirms the abandoned paths behave identically to any other undeclared path under
      // generated/**, not like the public catalog paths above — proving no wildcard leak.
      await assertFails(getBytes(ref(guestStorage, 'generated/studio-print-requests/working/page-0-vabc123.json')));
      await assertFails(getBytes(ref(guestStorage, 'generated/portal-print-requests/customers/x/page-0-vabc123.json')));

      // Sanity check: the public catalog wildcard itself still behaves as expected — proves this
      // test's `assertFails` calls above are exercising a real deny, not a broken rules load.
      await assertSucceeds(getBytes(ref(guestStorage, 'generated/portal-catalog/manifest.json')));
    });
  });
});
