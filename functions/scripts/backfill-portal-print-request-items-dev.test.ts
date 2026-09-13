import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { Timestamp } from "firebase/firestore";

import { projectPortalPrintRequestItem } from "../../packages/shared/src/utils/portalPrintRequestItemProjection";
import {
  CANONICAL_COLLECTION,
  DEFAULT_PAGE_LIMIT,
  DEV_PROJECT_ID,
  FORBIDDEN_STAFF_ARTWORK_PROJECTION_KEYS,
  MAX_PAGE_LIMIT,
  PROJECTION_COLLECTION,
  STAFF_ARTWORK_COLLECTION,
  accumulateRow,
  assertNoNonDevEscapeHatch,
  assertStaffArtworkProjectionPrivacy,
  buildCanonicalPageQuery,
  classifyAgainstExisting,
  classifyProjection,
  emptySummary,
  finalizeSummaryCursor,
  parsePageLimit,
  parseRunMode,
  projectionsEqual,
  reconcileBoundedPage,
  resolveDevProjectId,
} from "./backfill-portal-print-request-items-dev";
import { buildStaffArtworkProjectionEnrichment, projectPortalPrintRequestItem } from "../../packages/shared/src/utils/portalPrintRequestItemProjection";

const scriptSource = readFileSync(
  new URL("./backfill-portal-print-request-items-dev.ts", import.meta.url),
  "utf8",
);

const timestamps = {
  createdAt: Timestamp.fromMillis(1_000),
  updatedAt: Timestamp.fromMillis(2_000),
};

function staffArtworkCanonical(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    printRequestId: "request-1",
    sourceType: "staff_artwork",
    staffArtworkId: "sa-1",
    titleSnapshot: "Fallback title",
    quantity: 2,
    printWidthInches: 10,
    printHeightInches: 8,
    sizeLabel: "10 × 8 in",
    status: "pending",
    addedBy: "customer-1",
    ...timestamps,
    ...overrides,
  };
}

function staffArtworkLibraryDoc(): Record<string, unknown> {
  return {
    title: "Cucumber Life",
    previewStoragePath: "staff-artwork/sa-1/preview.webp",
    thumbnailStoragePath: "staff-artwork/sa-1/thumbnail.webp",
    artworkBackgroundHex: "#111111",
    processing: { widthPx: 5000, heightPx: 4000, effectiveDpi: 300 },
    notes: "Private staff note",
    productionStoragePath: "staff-artwork/sa-1/production.png",
  };
}

function catalogCanonical(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    printRequestId: "request-1",
    sourceType: "catalog_design",
    designId: "design-1",
    titleSnapshot: "Catalog title",
    quantity: 1,
    status: "pending",
    addedBy: "customer-1",
    ...timestamps,
    ...overrides,
  };
}

function uploadCanonical(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    printRequestId: "request-1",
    sourceType: "customer_upload",
    customerUploadId: "upload-1",
    titleSnapshot: "Upload title",
    quantity: 1,
    status: "pending",
    addedBy: "customer-1",
    ...timestamps,
    ...overrides,
  };
}

type StoreDoc = { data: Record<string, unknown> };

function createMemoryDb(seed: {
  printRequestItems?: Record<string, StoreDoc>;
  portalPrintRequestItems?: Record<string, StoreDoc>;
  staffArtworks?: Record<string, StoreDoc>;
}) {
  const canonical = { ...(seed.printRequestItems ?? {}) };
  const projections = { ...(seed.portalPrintRequestItems ?? {}) };
  const staffArtworks = { ...(seed.staffArtworks ?? {}) };
  let writeCount = 0;
  const writtenCollections: string[] = [];
  const readCollections = new Set<string>();

  function collectionData(name: string): Record<string, StoreDoc> {
    if (name === CANONICAL_COLLECTION) return canonical;
    if (name === PROJECTION_COLLECTION) return projections;
    if (name === STAFF_ARTWORK_COLLECTION) return staffArtworks;
    throw new Error(`Unexpected collection: ${name}`);
  }

  const db = {
    collection(name: string) {
      readCollections.add(name);
      const data = collectionData(name);
      const orderedIds = Object.keys(data).sort();
      return {
        doc(id: string) {
          const ref = {
            __collection: name,
            id,
            async get() {
              const doc = data[id];
              return {
                id,
                exists: Boolean(doc),
                data: () => (doc ? { ...doc.data } : undefined),
                ref,
              };
            },
            async set(value: Record<string, unknown>) {
              writeCount += 1;
              writtenCollections.push(name);
              data[id] = { data: { ...value } };
            },
          };
          return ref;
        },
        orderBy(field: string) {
          assert.equal(field, "__name__");
          let startAfterId: string | null = null;
          let limitCount = orderedIds.length;
          const query = {
            orderBy(next: string) {
              assert.equal(next, "__name__");
              return query;
            },
            limit(count: number) {
              limitCount = count;
              return query;
            },
            startAfter(cursor: { id: string }) {
              startAfterId = cursor.id;
              return query;
            },
            async get() {
              let ids = orderedIds;
              if (startAfterId) {
                ids = ids.filter((id) => id > startAfterId!);
              }
              const page = ids.slice(0, limitCount);
              return {
                empty: page.length === 0,
                size: page.length,
                docs: page.map((id) => ({
                  id,
                  exists: true,
                  data: () => ({ ...data[id]!.data }),
                  ref: { __collection: name, id },
                })),
              };
            },
            doc(id: string) {
              return db.collection(name).doc(id);
            },
          };
          return query;
        },
      };
    },
    async runTransaction<T>(fn: (tx: {
      get: (ref: { __collection: string; id: string }) => Promise<{
        id: string;
        exists: boolean;
        data: () => Record<string, unknown> | undefined;
        ref: unknown;
      }>;
      set: (ref: { __collection: string; id: string }, value: Record<string, unknown>) => void;
    }) => Promise<T>): Promise<T> {
      return fn({
        async get(ref) {
          const data = collectionData(ref.__collection);
          const doc = data[ref.id];
          return {
            id: ref.id,
            exists: Boolean(doc),
            data: () => (doc ? { ...doc.data } : undefined),
            ref,
          };
        },
        set(ref, value) {
          writeCount += 1;
          writtenCollections.push(ref.__collection);
          collectionData(ref.__collection)[ref.id] = { data: { ...value } };
        },
      });
    },
  };

  return {
    db,
    get writeCount() {
      return writeCount;
    },
    get writtenCollections() {
      return [...writtenCollections];
    },
    get readCollections() {
      return [...readCollections];
    },
    get projections() {
      return projections;
    },
  };
}

describe("backfill-portal-print-request-items-dev guards", () => {
  it("accepts exactly fresh-prints-dev from FIREBASE_PROJECT_ID", () => {
    assert.equal(resolveDevProjectId({ FIREBASE_PROJECT_ID: DEV_PROJECT_ID }), DEV_PROJECT_ID);
  });

  it("accepts fresh-prints-dev from GCLOUD_PROJECT when FIREBASE_PROJECT_ID is absent", () => {
    assert.equal(resolveDevProjectId({ GCLOUD_PROJECT: DEV_PROJECT_ID }), DEV_PROJECT_ID);
  });

  it("rejects missing project", () => {
    assert.throws(() => resolveDevProjectId({}), /Missing Firebase project/);
  });

  it("rejects non-DEV project", () => {
    assert.throws(
      () => resolveDevProjectId({ FIREBASE_PROJECT_ID: "fresh-prints-prod" }),
      /Refusing project/,
    );
  });

  it("defaults to dry-run unless APPLY is exactly 1", () => {
    assert.deepEqual(parseRunMode({}), { apply: false, verify: false, dryRun: true });
    assert.deepEqual(parseRunMode({ APPLY: "true" }), { apply: false, verify: false, dryRun: true });
    assert.deepEqual(parseRunMode({ APPLY: "1" }), { apply: true, verify: false, dryRun: false });
  });

  it("rejects VERIFY=1 combined with APPLY=1", () => {
    assert.throws(() => parseRunMode({ APPLY: "1", VERIFY: "1" }), /VERIFY=1 cannot be combined/);
  });

  it("defaults PAGE_LIMIT to 200 and rejects out-of-range values", () => {
    assert.equal(parsePageLimit({}), DEFAULT_PAGE_LIMIT);
    assert.equal(parsePageLimit({ PAGE_LIMIT: "1" }), 1);
    assert.equal(parsePageLimit({ PAGE_LIMIT: String(MAX_PAGE_LIMIT) }), MAX_PAGE_LIMIT);
    assert.throws(() => parsePageLimit({ PAGE_LIMIT: "0" }), /PAGE_LIMIT/);
    assert.throws(() => parsePageLimit({ PAGE_LIMIT: "201" }), /PAGE_LIMIT/);
  });

  it("has no non-dev escape hatch", () => {
    const forbiddenFlag = ["ALLOW", "NON", "DEV"].join("_");
    assert.equal(scriptSource.includes(`process.env.${forbiddenFlag}`), false);
    assert.equal(scriptSource.includes(`env.${forbiddenFlag}`), false);
    assert.doesNotMatch(scriptSource, /allowNonDev/);
    assert.doesNotThrow(() => assertNoNonDevEscapeHatch(scriptSource));
  });
});

describe("backfill-portal-print-request-items-dev classification", () => {
  it("classifies CREATE, UPDATE, and ALREADY_CORRECT", () => {
    const expected = projectPortalPrintRequestItem("item-a", catalogCanonical())!;
    assert.equal(classifyProjection(expected as Record<string, unknown>, null), "CREATE");
    assert.equal(
      classifyProjection(expected as Record<string, unknown>, {
        ...(expected as Record<string, unknown>),
        extraLeak: true,
      }),
      "UPDATE",
    );
    assert.equal(
      classifyProjection(expected as Record<string, unknown>, expected as Record<string, unknown>),
      "ALREADY_CORRECT",
    );
  });

  it("treats timestamp equality by toMillis and rejects extra keys", () => {
    const expected = projectPortalPrintRequestItem("item-b", catalogCanonical())!;
    const sameMillis = {
      ...(expected as Record<string, unknown>),
      createdAt: { toMillis: () => 1_000 },
      updatedAt: { toMillis: () => 2_000 },
    };
    assert.equal(projectionsEqual(expected as Record<string, unknown>, sameMillis), true);
    assert.equal(
      projectionsEqual(expected as Record<string, unknown>, {
        ...(expected as Record<string, unknown>),
        rogue: 1,
      }),
      false,
    );
  });

  it("uses the shared mapper for Staff Artwork, catalog, and upload rows", () => {
    const enrichment = buildStaffArtworkProjectionEnrichment(staffArtworkLibraryDoc());
    const staff = classifyAgainstExisting("sa-1", staffArtworkCanonical(), null, enrichment);
    const catalog = classifyAgainstExisting("cd-1", catalogCanonical(), null);
    const upload = classifyAgainstExisting("cu-1", uploadCanonical(), null);
    assert.equal(staff.classification, "CREATE");
    assert.equal(catalog.classification, "CREATE");
    assert.equal(upload.classification, "CREATE");
    assert.equal(staff.expected?.sourceType, "staff_artwork");
    assert.equal(staff.expected?.sourceLabel, "Staff-added");
    assert.equal(staff.expected?.titleSnapshot, "Cucumber Life");
    assert.equal(staff.expected?.previewStoragePath, "staff-artwork/sa-1/preview.webp");
    assert.equal(staff.expected?.widthPx, 5000);
    assert.equal(catalog.expected?.designId, "design-1");
    assert.equal(upload.expected?.customerUploadId, "upload-1");
    assert.equal(scriptSource.includes("projectPortalPrintRequestItem"), true);
    assert.match(scriptSource, /from "..\/..\/packages\/shared\/src\/utils\/portalPrintRequestItemProjection"/);
  });

  it("proves Staff Artwork private fields cannot cross the projection", () => {
    const enrichment = buildStaffArtworkProjectionEnrichment(staffArtworkLibraryDoc());
    const projected = projectPortalPrintRequestItem("sa-2", staffArtworkCanonical(), enrichment)!;
    assertStaffArtworkProjectionPrivacy(projected as Record<string, unknown>);
    for (const key of FORBIDDEN_STAFF_ARTWORK_PROJECTION_KEYS) {
      assert.equal(Object.prototype.hasOwnProperty.call(projected, key), false, key);
    }
    assert.equal(projected.staffArtworkId, "sa-1");
    assert.equal(projected.titleSnapshot, "Cucumber Life");
  });

  it("keeps catalog and customer-upload projections valid", () => {
    const catalog = projectPortalPrintRequestItem("cd-2", catalogCanonical())!;
    const upload = projectPortalPrintRequestItem("cu-2", uploadCanonical())!;
    assert.equal(catalog.sourceType, "catalog_design");
    assert.equal(catalog.designId, "design-1");
    assert.equal(catalog.titleSnapshot, "Catalog title");
    assert.equal(upload.sourceType, "customer_upload");
    assert.equal(upload.customerUploadId, "upload-1");
  });

  it("marks malformed rows as skipped/error for dry-run planning", () => {
    const summary = emptySummary({
      projectId: DEV_PROJECT_ID,
      dryRun: true,
      verify: false,
      pageLimit: 200,
      startCursor: "",
    });
    const row = classifyAgainstExisting("bad-1", { printRequestId: "r1" }, null);
    accumulateRow(summary, row);
    finalizeSummaryCursor(summary, false);
    assert.equal(row.classification, "SKIPPED_MALFORMED");
    assert.equal(summary.skipped, 1);
    assert.equal(summary.errors, 1);
    assert.deepEqual(summary.malformedCanonicalIds, ["bad-1"]);
  });
});

describe("backfill-portal-print-request-items-dev page and reconcile", () => {
  it("orders by __name__ and resumes with startAfter", async () => {
    const mem = createMemoryDb({
      printRequestItems: {
        a: { data: catalogCanonical() },
        b: { data: catalogCanonical() },
        c: { data: catalogCanonical() },
      },
    });
    const first = await buildCanonicalPageQuery(mem.db as never, 2, null).get();
    assert.deepEqual(
      first.docs.map((doc) => doc.id),
      ["a", "b", "c"].slice(0, 3).slice(0, 3),
    );
    assert.equal(first.docs.length, 3); // pageLimit+1 look-ahead
    const cursor = await mem.db.collection(CANONICAL_COLLECTION).doc("b").get();
    const second = await buildCanonicalPageQuery(mem.db as never, 2, cursor as never).get();
    assert.deepEqual(
      second.docs.map((doc) => doc.id),
      ["c"],
    );
  });

  it("enforces one-page bound and dry-run zero writes", async () => {
    const mem = createMemoryDb({
      printRequestItems: {
        a: { data: catalogCanonical() },
        b: { data: catalogCanonical() },
        c: { data: staffArtworkCanonical() },
      },
    });
    const summary = await reconcileBoundedPage({
      db: mem.db as never,
      projectId: DEV_PROJECT_ID,
      mode: { apply: false, verify: false, dryRun: true },
      pageLimit: 2,
      startAfterItemId: "",
    });
    assert.equal(summary.scanned, 2);
    assert.equal(summary.create, 2);
    assert.equal(summary.hasMore, true);
    assert.equal(summary.nextCursor, "b");
    assert.equal(summary.actualWrites, 0);
    assert.equal(mem.writeCount, 0);
  });

  it("applies only projection CREATE/UPDATE and is idempotent on repeat", async () => {
    const expectedA = projectPortalPrintRequestItem("a", catalogCanonical())!;
    const mem = createMemoryDb({
      printRequestItems: {
        a: { data: catalogCanonical() },
        b: { data: staffArtworkCanonical() },
      },
      staffArtworks: {
        "sa-1": { data: staffArtworkLibraryDoc() },
      },
      portalPrintRequestItems: {
        a: { data: { ...(expectedA as Record<string, unknown>), leftoverPrivate: true } },
      },
    });
    const first = await reconcileBoundedPage({
      db: mem.db as never,
      projectId: DEV_PROJECT_ID,
      mode: { apply: true, verify: false, dryRun: false },
      pageLimit: 200,
      startAfterItemId: "",
    });
    assert.equal(first.create, 1);
    assert.equal(first.update, 1);
    assert.equal(first.alreadyCorrect, 0);
    assert.equal(first.actualWrites, 2);
    assert.deepEqual(mem.writtenCollections, [PROJECTION_COLLECTION, PROJECTION_COLLECTION]);
    assert.equal(Object.prototype.hasOwnProperty.call(mem.projections.a!.data, "leftoverPrivate"), false);
    assert.equal(mem.projections.b!.data.titleSnapshot, "Cucumber Life");
    assert.equal(mem.projections.b!.data.widthPx, 5000);

    const secondDry = await reconcileBoundedPage({
      db: mem.db as never,
      projectId: DEV_PROJECT_ID,
      mode: { apply: false, verify: false, dryRun: true },
      pageLimit: 200,
      startAfterItemId: "",
    });
    assert.equal(secondDry.create, 0);
    assert.equal(secondDry.update, 0);
    assert.equal(secondDry.alreadyCorrect, 2);
    assert.equal(secondDry.actualWrites, 0);

    const writesBefore = mem.writeCount;
    const secondApply = await reconcileBoundedPage({
      db: mem.db as never,
      projectId: DEV_PROJECT_ID,
      mode: { apply: true, verify: false, dryRun: false },
      pageLimit: 200,
      startAfterItemId: "",
    });
    assert.equal(secondApply.actualWrites, 0);
    assert.equal(mem.writeCount, writesBefore);
  });

  it("fails closed for APPLY when a malformed canonical row exists", async () => {
    const mem = createMemoryDb({
      printRequestItems: {
        good: { data: catalogCanonical() },
        bad: { data: { printRequestId: "request-1" } },
      },
    });
    await assert.rejects(
      () =>
        reconcileBoundedPage({
          db: mem.db as never,
          projectId: DEV_PROJECT_ID,
          mode: { apply: true, verify: false, dryRun: false },
          pageLimit: 200,
          startAfterItemId: "",
        }),
      /APPLY aborted before writes/,
    );
    assert.equal(mem.writeCount, 0);
    assert.equal(Object.keys(mem.projections).length, 0);
  });

  it("continues dry-run through malformed rows with zero writes", async () => {
    const mem = createMemoryDb({
      printRequestItems: {
        bad: { data: { printRequestId: "request-1" } },
        good: { data: catalogCanonical() },
      },
    });
    const summary = await reconcileBoundedPage({
      db: mem.db as never,
      projectId: DEV_PROJECT_ID,
      mode: { apply: false, verify: false, dryRun: true },
      pageLimit: 200,
      startAfterItemId: "",
    });
    assert.equal(summary.scanned, 2);
    assert.equal(summary.skipped, 1);
    assert.equal(summary.errors, 1);
    assert.equal(summary.create, 1);
    assert.equal(summary.actualWrites, 0);
    assert.deepEqual(summary.malformedCanonicalIds, ["bad"]);
    assert.equal(mem.writeCount, 0);
  });

  it("never writes canonical/staff documents and never reads Storage", async () => {
    const mem = createMemoryDb({
      printRequestItems: {
        a: { data: staffArtworkCanonical() },
      },
      staffArtworks: {
        "sa-1": { data: staffArtworkLibraryDoc() },
      },
    });
    await reconcileBoundedPage({
      db: mem.db as never,
      projectId: DEV_PROJECT_ID,
      mode: { apply: true, verify: false, dryRun: false },
      pageLimit: 200,
      startAfterItemId: "",
    });
    assert.deepEqual(mem.writtenCollections, [PROJECTION_COLLECTION]);
    assert.ok(mem.readCollections.includes(STAFF_ARTWORK_COLLECTION));
    assert.ok(mem.readCollections.includes(CANONICAL_COLLECTION));
    assert.ok(mem.readCollections.includes(PROJECTION_COLLECTION));
    assert.doesNotMatch(scriptSource, /getStorage\b/);
    assert.doesNotMatch(scriptSource, /bucket\(/);
  });
});
