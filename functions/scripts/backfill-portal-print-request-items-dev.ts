/**
 * DEV-only bounded reconciler for portalPrintRequestItems.
 *
 * Reads canonical printRequestItems, projects with the shared mapper, and classifies
 * CREATE / UPDATE / ALREADY_CORRECT against portalPrintRequestItems/{itemId}.
 *
 * Default is dry-run. Only APPLY=1 may write. VERIFY=1 is read-only and cannot combine with APPLY.
 * Project must resolve exactly to fresh-prints-dev (no non-dev escape hatch / production override).
 *
 * From the repository root (PowerShell):
 *
 *   $env:FIREBASE_PROJECT_ID='fresh-prints-dev'; npx --no-install tsx functions/scripts/backfill-portal-print-request-items-dev.ts
 */
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

import {
  buildStaffArtworkProjectionEnrichment,
  projectPortalPrintRequestItem,
} from "../../packages/shared/src/utils/portalPrintRequestItemProjection";

const __dirname = dirname(fileURLToPath(import.meta.url));
const functionsRoot = resolve(__dirname, "..");
const require = createRequire(resolve(functionsRoot, "package.json"));

export const DEV_PROJECT_ID = "fresh-prints-dev";
export const DEFAULT_PAGE_LIMIT = 200;
export const MAX_PAGE_LIMIT = 200;
export const MIN_PAGE_LIMIT = 1;
export const CANONICAL_COLLECTION = "printRequestItems";
export const PROJECTION_COLLECTION = "portalPrintRequestItems";

export const STAFF_ARTWORK_COLLECTION = "staffArtworks";

/**
 * Fields that must never appear on a Staff Artwork portal projection.
 * Allowed now: staffArtworkId, titleSnapshot, preview/thumbnail paths, widthPx/heightPx, artworkBackgroundHex.
 */
export const FORBIDDEN_STAFF_ARTWORK_PROJECTION_KEYS = [
  "title",
  "description",
  "previewUrl",
  "thumbnailUrl",
  "customerId",
  "customerAssociation",
  "backgroundHex",
  "backgroundMetadata",
  "sourceWidthPx",
  "sourceHeightPx",
  "effectiveDpi",
  "dpi",
  "approvedMaxPrintWidthInches",
  "approvedMaxPrintHeightInches",
  "upscaleState",
  "upscalePassCount",
  "artworkEnhanceMode",
  "enhancementState",
  "enhancementStoragePath",
  "enhancementWidthPx",
  "enhancementHeightPx",
  "notes",
  "processing",
  "productionStoragePath",
] as const;

export type ProjectionClassification = "CREATE" | "UPDATE" | "ALREADY_CORRECT";

export interface RunMode {
  dryRun: boolean;
  apply: boolean;
  verify: boolean;
}

export interface PageControls {
  pageLimit: number;
  startAfterItemId: string;
}

export interface DryRunSummary {
  projectId: string;
  dryRun: boolean;
  verify: boolean;
  pageLimit: number;
  startCursor: string;
  scanned: number;
  create: number;
  update: number;
  alreadyCorrect: number;
  skipped: number;
  errors: number;
  actualWrites: number;
  lastProcessedId: string;
  nextCursor: string;
  hasMore: boolean;
  malformedCanonicalIds: string[];
  orderBy: "__name__";
}

export interface PlannedRow {
  itemId: string;
  classification: ProjectionClassification | "SKIPPED_MALFORMED";
  expected: Record<string, unknown> | null;
}

type EnvLike = Record<string, string | undefined>;

export function resolveDevProjectId(env: EnvLike = process.env): string {
  const raw = env.FIREBASE_PROJECT_ID ?? env.GCLOUD_PROJECT;
  if (typeof raw !== "string" || !raw.trim()) {
    throw new Error(
      "Missing Firebase project. Set FIREBASE_PROJECT_ID (preferred) or GCLOUD_PROJECT to exactly fresh-prints-dev.",
    );
  }
  const projectId = raw.trim();
  if (projectId !== DEV_PROJECT_ID) {
    throw new Error(
      `Refusing project "${projectId}". This script accepts only exactly "${DEV_PROJECT_ID}".`,
    );
  }
  return projectId;
}

export function parsePageLimit(env: EnvLike = process.env): number {
  const raw = env.PAGE_LIMIT;
  if (raw === undefined || raw === "") {
    return DEFAULT_PAGE_LIMIT;
  }
  if (!/^\d+$/.test(raw.trim())) {
    throw new Error(`PAGE_LIMIT must be an integer from ${MIN_PAGE_LIMIT} to ${MAX_PAGE_LIMIT}.`);
  }
  const value = Number.parseInt(raw.trim(), 10);
  if (!Number.isInteger(value) || value < MIN_PAGE_LIMIT || value > MAX_PAGE_LIMIT) {
    throw new Error(`PAGE_LIMIT must be an integer from ${MIN_PAGE_LIMIT} to ${MAX_PAGE_LIMIT}.`);
  }
  return value;
}

export function parseStartAfterItemId(env: EnvLike = process.env): string {
  return env.START_AFTER_ITEM_ID?.trim() ?? "";
}

export function parseRunMode(env: EnvLike = process.env): RunMode {
  const apply = env.APPLY === "1";
  const verify = env.VERIFY === "1";
  if (apply && verify) {
    throw new Error("VERIFY=1 cannot be combined with APPLY=1.");
  }
  return {
    apply,
    verify,
    dryRun: !apply,
  };
}

export function assertNoNonDevEscapeHatch(source: string = readOwnSource()): void {
  const forbiddenFlag = ["ALLOW", "NON", "DEV"].join("_");
  if (source.includes(`process.env.${forbiddenFlag}`) || source.includes(`env.${forbiddenFlag}`)) {
    throw new Error("Non-dev escape hatch must not exist in this script.");
  }
}

function readOwnSource(): string {
  return readFileSync(fileURLToPath(import.meta.url), "utf8");
}

function isTimestampLike(value: unknown): value is { toMillis: () => number } {
  return Boolean(value && typeof (value as { toMillis?: unknown }).toMillis === "function");
}

export function valuesEqual(left: unknown, right: unknown): boolean {
  if (isTimestampLike(left) || isTimestampLike(right)) {
    if (!isTimestampLike(left) || !isTimestampLike(right)) {
      return false;
    }
    return left.toMillis() === right.toMillis();
  }
  if (left === right) {
    return true;
  }
  if (left === null || right === null || typeof left !== "object" || typeof right !== "object") {
    return false;
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
      return false;
    }
    return left.every((entry, index) => valuesEqual(entry, right[index]));
  }
  const leftKeys = Object.keys(left as Record<string, unknown>).sort();
  const rightKeys = Object.keys(right as Record<string, unknown>).sort();
  if (leftKeys.length !== rightKeys.length) {
    return false;
  }
  for (let i = 0; i < leftKeys.length; i += 1) {
    if (leftKeys[i] !== rightKeys[i]) {
      return false;
    }
    if (
      !valuesEqual(
        (left as Record<string, unknown>)[leftKeys[i]!],
        (right as Record<string, unknown>)[rightKeys[i]!],
      )
    ) {
      return false;
    }
  }
  return true;
}

export function projectionsEqual(
  expected: Record<string, unknown>,
  existing: Record<string, unknown> | undefined | null,
): boolean {
  if (!existing) {
    return false;
  }
  const expectedKeys = Object.keys(expected).sort();
  const existingKeys = Object.keys(existing).sort();
  if (expectedKeys.length !== existingKeys.length) {
    return false;
  }
  for (let i = 0; i < expectedKeys.length; i += 1) {
    if (expectedKeys[i] !== existingKeys[i]) {
      return false;
    }
    if (!valuesEqual(expected[expectedKeys[i]!], existing[existingKeys[i]!])) {
      return false;
    }
  }
  return true;
}

export function classifyProjection(
  expected: Record<string, unknown> | null,
  existing: Record<string, unknown> | undefined | null,
): ProjectionClassification | "SKIPPED_MALFORMED" {
  if (!expected) {
    return "SKIPPED_MALFORMED";
  }
  if (!existing) {
    return "CREATE";
  }
  return projectionsEqual(expected, existing) ? "ALREADY_CORRECT" : "UPDATE";
}

export function assertStaffArtworkProjectionPrivacy(projection: Record<string, unknown>): void {
  for (const key of FORBIDDEN_STAFF_ARTWORK_PROJECTION_KEYS) {
    if (Object.prototype.hasOwnProperty.call(projection, key)) {
      throw new Error(`Staff Artwork projection must not contain forbidden field "${key}".`);
    }
  }
}

export function classifyAgainstExisting(
  itemId: string,
  canonicalData: Record<string, unknown>,
  existingProjection: Record<string, unknown> | undefined | null,
  enrichment: ReturnType<typeof buildStaffArtworkProjectionEnrichment> = null,
): PlannedRow {
  const expected = projectPortalPrintRequestItem(
    itemId,
    canonicalData,
    enrichment,
  ) as Record<string, unknown> | null;
  if (expected && expected.sourceType === "staff_artwork") {
    assertStaffArtworkProjectionPrivacy(expected);
  }
  return {
    itemId,
    expected,
    classification: classifyProjection(expected, existingProjection),
  };
}

export function emptySummary(input: {
  projectId: string;
  dryRun: boolean;
  verify: boolean;
  pageLimit: number;
  startCursor: string;
}): DryRunSummary {
  return {
    projectId: input.projectId,
    dryRun: input.dryRun,
    verify: input.verify,
    pageLimit: input.pageLimit,
    startCursor: input.startCursor,
    scanned: 0,
    create: 0,
    update: 0,
    alreadyCorrect: 0,
    skipped: 0,
    errors: 0,
    actualWrites: 0,
    lastProcessedId: "",
    nextCursor: "",
    hasMore: false,
    malformedCanonicalIds: [],
    orderBy: "__name__",
  };
}

export function accumulateRow(summary: DryRunSummary, row: PlannedRow): void {
  summary.scanned += 1;
  summary.lastProcessedId = row.itemId;
  switch (row.classification) {
    case "CREATE":
      summary.create += 1;
      break;
    case "UPDATE":
      summary.update += 1;
      break;
    case "ALREADY_CORRECT":
      summary.alreadyCorrect += 1;
      break;
    case "SKIPPED_MALFORMED":
      summary.skipped += 1;
      summary.errors += 1;
      summary.malformedCanonicalIds.push(row.itemId);
      break;
    default: {
      const _exhaustive: never = row.classification;
      throw new Error(`Unexpected classification: ${_exhaustive}`);
    }
  }
}

export function finalizeSummaryCursor(summary: DryRunSummary, hasMore: boolean): void {
  summary.hasMore = hasMore;
  summary.nextCursor = hasMore ? summary.lastProcessedId : "";
}

interface DocumentSnapshotLike {
  id: string;
  exists: boolean;
  data: () => Record<string, unknown> | undefined;
  ref: unknown;
}

interface QuerySnapshotLike {
  empty: boolean;
  size: number;
  docs: DocumentSnapshotLike[];
}

interface QueryLike {
  orderBy: (field: string) => QueryLike;
  limit: (count: number) => QueryLike;
  startAfter: (cursor: unknown) => QueryLike;
  get: () => Promise<QuerySnapshotLike>;
}

interface DocRefLike {
  get: () => Promise<DocumentSnapshotLike>;
  set?: (data: Record<string, unknown>) => unknown;
}

interface CollectionLike extends QueryLike {
  doc: (id: string) => DocRefLike;
}

interface TransactionLike {
  get: (ref: unknown) => Promise<DocumentSnapshotLike>;
  set: (ref: unknown, data: Record<string, unknown>) => void;
}

interface FirestoreLike {
  collection: (name: string) => CollectionLike;
  runTransaction: <T>(fn: (tx: TransactionLike) => Promise<T>) => Promise<T>;
}

export async function loadStaffArtworkEnrichmentForCanonical(
  db: FirestoreLike,
  canonicalData: Record<string, unknown>,
): Promise<ReturnType<typeof buildStaffArtworkProjectionEnrichment>> {
  const staffArtworkId =
    typeof canonicalData.staffArtworkId === "string" ? canonicalData.staffArtworkId.trim() : "";
  const isStaffArtwork =
    canonicalData.sourceType === "staff_artwork" || Boolean(staffArtworkId);
  if (!isStaffArtwork || !staffArtworkId) {
    return null;
  }
  const snap = await db.collection(STAFF_ARTWORK_COLLECTION).doc(staffArtworkId).get();
  if (!snap.exists) {
    return null;
  }
  return buildStaffArtworkProjectionEnrichment((snap.data() ?? {}) as Record<string, unknown>);
}

export function buildCanonicalPageQuery(
  db: FirestoreLike,
  pageLimit: number,
  cursorSnapshot: DocumentSnapshotLike | null,
): QueryLike {
  let query = db.collection(CANONICAL_COLLECTION).orderBy("__name__").limit(pageLimit + 1);
  if (cursorSnapshot) {
    query = query.startAfter(cursorSnapshot);
  }
  return query;
}

async function loadCursorSnapshot(
  db: FirestoreLike,
  startAfterItemId: string,
): Promise<DocumentSnapshotLike | null> {
  if (!startAfterItemId) {
    return null;
  }
  const cursor = await db.collection(CANONICAL_COLLECTION).doc(startAfterItemId).get();
  if (!cursor.exists) {
    throw new Error(`START_AFTER_ITEM_ID missing: ${startAfterItemId}`);
  }
  return cursor;
}

export async function reconcileBoundedPage(input: {
  db: FirestoreLike;
  projectId: string;
  mode: RunMode;
  pageLimit: number;
  startAfterItemId: string;
}): Promise<DryRunSummary> {
  const summary = emptySummary({
    projectId: input.projectId,
    dryRun: input.mode.dryRun,
    verify: input.mode.verify,
    pageLimit: input.pageLimit,
    startCursor: input.startAfterItemId,
  });

  const cursorSnapshot = await loadCursorSnapshot(input.db, input.startAfterItemId);
  const snapshot = await buildCanonicalPageQuery(input.db, input.pageLimit, cursorSnapshot).get();
  const pageDocs = snapshot.docs.slice(0, input.pageLimit);
  const hasMore = snapshot.docs.length > input.pageLimit;

  const planned: PlannedRow[] = [];
  for (const canonicalDoc of pageDocs) {
    const canonicalData = (canonicalDoc.data() ?? {}) as Record<string, unknown>;
    const existing = await input.db.collection(PROJECTION_COLLECTION).doc(canonicalDoc.id).get();
    const enrichment = await loadStaffArtworkEnrichmentForCanonical(input.db, canonicalData);
    const row = classifyAgainstExisting(
      canonicalDoc.id,
      canonicalData,
      existing.exists ? ((existing.data() ?? {}) as Record<string, unknown>) : null,
      enrichment,
    );
    accumulateRow(summary, row);
    planned.push(row);
  }
  finalizeSummaryCursor(summary, hasMore);

  if (input.mode.verify) {
    if (summary.errors > 0 || summary.create > 0 || summary.update > 0) {
      const error = new Error(
        `VERIFY failed: create=${summary.create} update=${summary.update} errors=${summary.errors}`,
      );
      (error as Error & { summary: DryRunSummary }).summary = summary;
      throw error;
    }
    return summary;
  }

  if (!input.mode.apply) {
    summary.actualWrites = 0;
    return summary;
  }

  if (summary.errors > 0) {
    const error = new Error(
      `APPLY aborted before writes: ${summary.errors} malformed canonical row(s): ${summary.malformedCanonicalIds.join(",")}`,
    );
    (error as Error & { summary: DryRunSummary }).summary = summary;
    throw error;
  }

  const writeIds = planned
    .filter((row) => row.classification === "CREATE" || row.classification === "UPDATE")
    .map((row) => row.itemId);

  const actualWrites = await input.db.runTransaction(async (tx) => {
    const pageIds = pageDocs.map((doc) => doc.id);
    const prepared: Array<{
      itemId: string;
      projectionRef: unknown;
      expected: Record<string, unknown>;
      shouldWrite: boolean;
    }> = [];

    for (const itemId of pageIds) {
      const canonicalRef = input.db.collection(CANONICAL_COLLECTION).doc(itemId);
      const projectionRef = input.db.collection(PROJECTION_COLLECTION).doc(itemId);
      const canonicalSnap = await tx.get(canonicalRef);
      const projectionSnap = await tx.get(projectionRef);
      if (!canonicalSnap.exists) {
        throw new Error(`Canonical document disappeared during APPLY transaction: ${itemId}`);
      }
      const canonicalData = (canonicalSnap.data() ?? {}) as Record<string, unknown>;
      const enrichment = await loadStaffArtworkEnrichmentForCanonical(input.db, canonicalData);
      const expected = projectPortalPrintRequestItem(
        itemId,
        canonicalData,
        enrichment,
      ) as Record<string, unknown> | null;
      if (!expected) {
        throw new Error(`APPLY aborted inside transaction for malformed canonical row: ${itemId}`);
      }
      if (expected.sourceType === "staff_artwork") {
        assertStaffArtworkProjectionPrivacy(expected);
      }
      const existing = projectionSnap.exists
        ? ((projectionSnap.data() ?? {}) as Record<string, unknown>)
        : null;
      const classification = classifyProjection(expected, existing);
      prepared.push({
        itemId,
        projectionRef,
        expected,
        shouldWrite: classification === "CREATE" || classification === "UPDATE",
      });
    }

    let writes = 0;
    for (const row of prepared) {
      if (!row.shouldWrite) continue;
      tx.set(row.projectionRef, row.expected);
      writes += 1;
    }
    return writes;
  });

  // Defensive: only projection IDs from this page may be written.
  for (const itemId of writeIds) {
    if (!pageDocs.some((doc) => doc.id === itemId)) {
      throw new Error(`Write ID outside bounded page: ${itemId}`);
    }
  }

  summary.actualWrites = actualWrites;
  return summary;
}

async function main(): Promise<void> {
  assertNoNonDevEscapeHatch();
  const projectId = resolveDevProjectId();
  const mode = parseRunMode();
  const pageLimit = parsePageLimit();
  const startAfterItemId = parseStartAfterItemId();

  const { initializeApp, applicationDefault, getApps } = require("firebase-admin/app") as {
    initializeApp: (options: { credential: unknown; projectId: string }) => unknown;
    applicationDefault: () => unknown;
    getApps: () => unknown[];
  };
  const { getFirestore } = require("firebase-admin/firestore") as {
    getFirestore: () => FirestoreLike;
  };

  if (getApps().length === 0) {
    initializeApp({ credential: applicationDefault(), projectId });
  }
  const db = getFirestore();

  const summary = await reconcileBoundedPage({
    db,
    projectId,
    mode,
    pageLimit,
    startAfterItemId,
  });

  console.log("---SUMMARY---");
  console.log(
    JSON.stringify(
      {
        projectId: summary.projectId,
        dryRun: summary.dryRun,
        verify: summary.verify,
        pageLimit: summary.pageLimit,
        startCursor: summary.startCursor,
        scanned: summary.scanned,
        create: summary.create,
        update: summary.update,
        alreadyCorrect: summary.alreadyCorrect,
        skipped: summary.skipped,
        errors: summary.errors,
        actualWrites: summary.actualWrites,
        lastProcessedId: summary.lastProcessedId,
        nextCursor: summary.nextCursor,
        hasMore: summary.hasMore,
        malformedCanonicalIds: summary.malformedCanonicalIds,
        orderBy: summary.orderBy,
      },
      null,
      2,
    ),
  );

  if (mode.verify && (summary.errors > 0 || summary.create > 0 || summary.update > 0)) {
    process.exitCode = 1;
  }
  if (mode.apply && summary.errors > 0) {
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    const withSummary = error as Error & { summary?: DryRunSummary };
    if (withSummary.summary) {
      console.log("---SUMMARY---");
      console.log(JSON.stringify(withSummary.summary, null, 2));
    }
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
