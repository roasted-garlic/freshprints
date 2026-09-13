/**
 * DEV-only compatibility backfill for the Print Request lifecycle ordering mirror.
 *
 * This intentionally updates only the server-owned mirror fields. It does not invent forward
 * lifecycle events for historical rows; the Studio reader remains compatibility-safe until this
 * job has been reviewed and run separately.
 *
 * From the repository root:
 *
 *   npx --no-install tsx functions/scripts/backfill-print-request-lifecycle-ordering-dev.ts
 *   APPLY=1 npx --no-install tsx functions/scripts/backfill-print-request-lifecycle-ordering-dev.ts
 *
 * Refuses non-dev projects unless ALLOW_NON_DEV=1.
 */
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  compareLifecycleTupleToMirror,
  compareLifecycleTuples,
  type LifecycleMirrorRecord,
  type LifecycleOrderingTuple,
} from "../src/printRequestLifecycleMirror";

const __dirname = dirname(fileURLToPath(import.meta.url));
const functionsRoot = resolve(__dirname, "..");
const require = createRequire(resolve(functionsRoot, "package.json"));

const { initializeApp, applicationDefault, getApps } = require("firebase-admin/app") as {
  initializeApp: (options: { credential: unknown; projectId: string }) => unknown;
  applicationDefault: () => unknown;
  getApps: () => unknown[];
};
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
  where: (field: string, operator: string, value: unknown) => QueryLike;
  get: () => Promise<QuerySnapshotLike>;
  doc: (id: string) => DocumentSnapshotLike & { get: () => Promise<DocumentSnapshotLike> };
}

interface FirestoreLike {
  collection: (name: string) => QueryLike;
  batch: () => {
    update: (ref: unknown, data: Record<string, unknown>) => void;
    commit: () => Promise<void>;
  };
}

const { Timestamp, getFirestore } = require("firebase-admin/firestore") as {
  Timestamp: { fromMillis: (millis: number) => unknown };
  getFirestore: () => FirestoreLike;
};

export type BackfillCandidate = LifecycleOrderingTuple & {
  source: string;
  derivation: "forward" | "historical";
};

export interface ForwardLifecycleEvidence {
  id: string;
  occurredAt?: unknown;
  precedence?: unknown;
  derivation?: unknown;
}

export function millis(value: unknown): number | undefined {
  if (value && typeof (value as { toMillis?: unknown }).toMillis === "function") {
    return (value as { toMillis: () => number }).toMillis();
  }
  if (value instanceof Date) {
    return value.getTime();
  }
  return typeof value === "number" ? value : undefined;
}

export function chooseLatest(
  candidates: readonly (BackfillCandidate | undefined)[],
): BackfillCandidate | undefined {
  return candidates.filter((candidate): candidate is BackfillCandidate => Boolean(candidate)).reduce(
    (latest, candidate) => (!latest || compareLifecycleTuples(candidate, latest) > 0 ? candidate : latest),
    undefined as BackfillCandidate | undefined,
  );
}

export function historicalCandidate(
  requestId: string,
  requestData: Record<string, unknown>,
  allocations: readonly Record<string, unknown>[],
): BackfillCandidate | undefined {
  const candidates: BackfillCandidate[] = [];
  const add = (value: unknown, precedence: number, id: string, source: string): void => {
    const valueMillis = millis(value);
    if (typeof valueMillis === "number" && Number.isFinite(valueMillis)) {
      candidates.push({ millis: valueMillis, precedence, id, source, derivation: "historical" });
    }
  };

  // These values mirror the reviewed lifecycle precedence table. In particular, requeue is
  // released_for_requeue (50), not the generic queued fallback (20).
  add(requestData.createdAt, 10, `${requestId}:created`, "request.createdAt");
  add(
    requestData.needsStaffRequeueAt,
    50,
    `${requestId}:released-for-requeue`,
    "needsStaffRequeueAt",
  );
  add(requestData.convertedAt, 90, `${requestId}:converted`, "convertedAt");

  for (const allocation of allocations) {
    const allocationId = typeof allocation.id === "string" ? allocation.id : "unknown";
    add(
      allocation.completedAt,
      70,
      `${requestId}:allocation:${allocationId}:completed`,
      "allocation.completedAt",
    );
    add(
      allocation.printedAt,
      70,
      `${requestId}:allocation:${allocationId}:printed`,
      "allocation.printedAt",
    );
    add(
      allocation.canceledAt,
      30,
      `${requestId}:allocation:${allocationId}:canceled`,
      "allocation.canceledAt",
    );
    add(
      allocation.queuedAt,
      20,
      `${requestId}:allocation:${allocationId}:queued`,
      "allocation.queuedAt",
    );
    add(
      allocation.createdAt,
      20,
      `${requestId}:allocation:${allocationId}:created`,
      "allocation.createdAt",
    );
  }

  return chooseLatest(candidates);
}

function forwardCandidate(event: ForwardLifecycleEvidence): BackfillCandidate | undefined {
  if (event.derivation !== "forward") {
    return undefined;
  }
  const eventMillis = millis(event.occurredAt);
  if (typeof eventMillis !== "number" || !Number.isFinite(eventMillis)) {
    return undefined;
  }
  const precedence = typeof event.precedence === "number" ? event.precedence : 0;
  return {
    millis: eventMillis,
    precedence,
    id: event.id,
    source: "forward lifecycle event",
    derivation: "forward",
  };
}

function latestForwardCandidate(
  events: readonly ForwardLifecycleEvidence[],
): BackfillCandidate | undefined {
  return chooseLatest(events.map(forwardCandidate));
}

export function hasTrustedForwardMirror(
  current: LifecycleMirrorRecord | undefined,
  events: readonly ForwardLifecycleEvidence[],
): boolean {
  const currentEventId =
    typeof current?.lastLifecycleActivityEventId === "string"
      ? current.lastLifecycleActivityEventId
      : undefined;
  return Boolean(
    currentEventId &&
      events.some((event) => event.derivation === "forward" && event.id === currentEventId),
  );
}

export function resolveMirrorCandidate(input: {
  requestId: string;
  requestData: Record<string, unknown>;
  allocations: readonly Record<string, unknown>[];
  forwardEvents: readonly ForwardLifecycleEvidence[];
}): { candidate?: BackfillCandidate; historical?: BackfillCandidate; forward?: BackfillCandidate } {
  const historical = historicalCandidate(input.requestId, input.requestData, input.allocations);
  const forward = latestForwardCandidate(input.forwardEvents);

  // At an equal occurrence time, an existing forward event is authoritative over any synthetic
  // historical fallback. This also makes a missing mirror recover from the immutable event tuple.
  if (forward && historical && forward.millis === historical.millis) {
    return { candidate: forward, historical, forward };
  }
  return { candidate: chooseLatest([forward, historical]), historical, forward };
}

export function isAfter(
  candidate: BackfillCandidate,
  current: LifecycleMirrorRecord | undefined,
  trustedForwardMirror = false,
): boolean {
  if (!current) {
    return true;
  }

  const comparison = compareLifecycleTupleToMirror(candidate, current);
  if (comparison <= 0) {
    return false;
  }

  const currentMillis = millis(current.lastLifecycleActivityAt);
  if (
    candidate.derivation === "historical" &&
    trustedForwardMirror &&
    typeof currentMillis === "number" &&
    candidate.millis === currentMillis
  ) {
    return false;
  }
  return true;
}

function hasMirror(data: Record<string, unknown>): boolean {
  return (
    millis(data.lastLifecycleActivityAt) !== undefined &&
    typeof data.lastLifecycleActivityEventId === "string" &&
    typeof data.lastLifecycleActivityPrecedence === "number"
  );
}

function tupleFromMirror(data: Record<string, unknown>): LifecycleOrderingTuple | undefined {
  const valueMillis = millis(data.lastLifecycleActivityAt);
  if (
    valueMillis === undefined ||
    typeof data.lastLifecycleActivityEventId !== "string" ||
    typeof data.lastLifecycleActivityPrecedence !== "number"
  ) {
    return undefined;
  }
  return {
    millis: valueMillis,
    id: data.lastLifecycleActivityEventId,
    precedence: data.lastLifecycleActivityPrecedence,
  };
}

async function main(): Promise<void> {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || "fresh-prints-dev";
  const apply = process.env.APPLY === "1";
  const allowNonDev = process.env.ALLOW_NON_DEV === "1";
  const pageLimit = Math.max(1, Number(process.env.PAGE_LIMIT ?? 200));
  const startAfterRequestId = process.env.START_AFTER_REQUEST_ID?.trim() ?? "";

  if (projectId !== "fresh-prints-dev" && !allowNonDev) {
    throw new Error(`Refusing project "${projectId}". DEV only.`);
  }

  if (getApps().length === 0) {
    initializeApp({ credential: applicationDefault(), projectId });
  }
  const db = getFirestore();

  console.log(JSON.stringify({ projectId, dryRun: !apply, pageLimit, startAfterRequestId }, null, 2));
  let query = db.collection("printRequests").orderBy("__name__").limit(pageLimit);
  if (startAfterRequestId) {
    const cursor = await db.collection("printRequests").doc(startAfterRequestId).get();
    if (!cursor.exists) throw new Error(`startAfterRequestId missing: ${startAfterRequestId}`);
    query = query.startAfter(cursor);
  }

  let pages = 0;
  let scanned = 0;
  let readerEligible = 0;
  let existingMirrors = 0;
  let missingMirrors = 0;
  let proposedWrites = 0;
  let unchanged = 0;
  let skipped = 0;
  let forwardEvidenceRequests = 0;
  let historicalFallbackRequests = 0;
  let missingEvidence = 0;
  let equalTimeCases = 0;
  let currentMirrorNewerPreserved = 0;
  const anomalies = 0;
  let allocationReads = 0;
  let lifecycleEventReads = 0;
  let lastId = startAfterRequestId;
  const candidateSources: Record<string, number> = {};
  const tieCases: Array<Record<string, unknown>> = [];

  for (;;) {
    const snapshot = await query.get();
    if (snapshot.empty) break;
    pages += 1;
    const batch = db.batch();
    let batchWrites = 0;

    for (const requestDoc of snapshot.docs) {
      scanned += 1;
      lastId = requestDoc.id;
      const requestData = (requestDoc.data() ?? {}) as Record<string, unknown>;
      if (typeof requestData.customerId === "string" && requestData.customerId.trim()) {
        readerEligible += 1;
      }
      if (hasMirror(requestData)) {
        existingMirrors += 1;
      } else {
        missingMirrors += 1;
      }

      const allocationSnapshot = await db
        .collection("showAllocations")
        .where("printRequestId", "==", requestDoc.id)
        .get();
      allocationReads += allocationSnapshot.size;
      const allocations = allocationSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() ?? {}),
      }));

      const lifecycleEventSnapshot = await db
        .collection("printRequestLifecycleEvents")
        .where("printRequestId", "==", requestDoc.id)
        .get();
      lifecycleEventReads += lifecycleEventSnapshot.size;
      const forwardEvents = lifecycleEventSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() ?? {}),
      })) as ForwardLifecycleEvidence[];
      const hasForwardEvidence = forwardEvents.some((event) => event.derivation === "forward");
      if (hasForwardEvidence) {
        forwardEvidenceRequests += 1;
      } else {
        historicalFallbackRequests += 1;
      }

      const current = requestData;
      const currentTuple = tupleFromMirror(current);
      const resolved = resolveMirrorCandidate({
        requestId: requestDoc.id,
        requestData,
        allocations,
        forwardEvents,
      });
      if (resolved.historical && currentTuple && resolved.historical.millis === currentTuple.millis) {
        equalTimeCases += 1;
      }
      if (!resolved.candidate) {
        missingEvidence += 1;
        skipped += 1;
        continue;
      }
      candidateSources[resolved.candidate.source] = (candidateSources[resolved.candidate.source] ?? 0) + 1;

      const trustedForwardMirror = hasTrustedForwardMirror(current, forwardEvents);
      const shouldUpdate = isAfter(resolved.candidate, current, trustedForwardMirror);
      if (!shouldUpdate) {
        unchanged += 1;
        if (currentTuple && compareLifecycleTuples(currentTuple, resolved.candidate) > 0) {
          currentMirrorNewerPreserved += 1;
        }
      } else {
        proposedWrites += 1;
        if (apply) {
          batch.update(requestDoc.ref, {
            lastLifecycleActivityAt: Timestamp.fromMillis(resolved.candidate.millis),
            lastLifecycleActivityEventId: resolved.candidate.id,
            lastLifecycleActivityPrecedence: resolved.candidate.precedence,
          });
          batchWrites += 1;
        }
      }

      if (
        resolved.historical &&
        trustedForwardMirror &&
        currentTuple &&
        resolved.historical.millis === currentTuple.millis
      ) {
        tieCases.push({
          requestId: requestDoc.id,
          current: currentTuple,
          historicalCandidate: resolved.historical,
          proposedFinalTuple: resolved.candidate,
          proposedWrite: shouldUpdate,
          reason: shouldUpdate
            ? "historical candidate is newer than the trusted mirror"
            : "trusted forward mirror preserved for equal occurrence time",
        });
      }
    }

    if (apply && batchWrites > 0) await batch.commit();
    console.log(
      JSON.stringify({
        page: pages,
        scannedPage: snapshot.size,
        scannedTotal: scanned,
        proposedWritesTotal: proposedWrites,
        lastId,
      }),
    );
    if (snapshot.size < pageLimit) break;
    query = db.collection("printRequests").orderBy("__name__").startAfter(lastId).limit(pageLimit);
  }

  const estimatedReads = {
    requestDocuments: scanned,
    allocationDocuments: allocationReads,
    lifecycleEventDocuments: lifecycleEventReads,
    totalDocuments: scanned + allocationReads + lifecycleEventReads,
  };
  console.log("---SUMMARY---");
  console.log(
    JSON.stringify(
      {
        projectId,
        dryRun: !apply,
        pages,
        scanned,
        readerEligible,
        existingMirrors,
        missingMirrors,
        proposedWrites,
        unchanged,
        skipped,
        forwardEvidenceRequests,
        historicalFallbackRequests,
        missingEvidence,
        equalTimeCases,
        currentMirrorNewerPreserved,
        candidateSources,
        anomalies,
        errors: 0,
        estimatedReads,
        estimatedWrites: proposedWrites,
        actualWrites: apply ? proposedWrites : 0,
        tieCases,
        lastId,
      },
      null,
      2,
    ),
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
