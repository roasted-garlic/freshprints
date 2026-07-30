/**
 * Pure formatter that turns a `FirestoreTraceSnapshot` into a structured, human-and-LLM-readable
 * report for the Firebase Debug panel. No I/O, no Firestore reads — see `firestoreUsageTrace.ts`
 * for the safety guarantees this report inherits (no document field values, no signed URLs).
 */

import type { FirestoreTraceEvent, FirestoreTraceSnapshot } from './firestoreUsageTrace';

export interface FirebaseDebugActionSummary {
  action: string;
  readOperations: number;
  documentsReturned: number;
  approximateBillableDocumentReads: number;
  writes: number;
  callables: number;
  storageAssetRequests: number;
  collections: string[];
  firstTimestamp: string | null;
  lastTimestamp: string | null;
  spanMs: number;
}

export interface FirebaseDebugRouteSummary {
  route: string;
  readOperations: number;
  documentsReturned: number;
  approximateBillableDocumentReads: number;
  writes: number;
  callables: number;
  storageAssetRequests: number;
}

export interface FirebaseDebugCollectionSummary {
  collection: string;
  readOperations: number;
  documentsReturned: number;
  approximateBillableDocumentReads: number;
  writes: number;
}

export interface FirebaseDebugCallableSummary {
  callableName: string;
  invocationCount: number;
  successCount: number;
  failureCount: number;
  averageDurationMs: number | null;
}

export interface FirebaseDebugWriteSummary {
  writeKind: string;
  writeCount: number;
  successCount: number;
  failureCount: number;
  averageDurationMs: number | null;
  collections: string[];
}

export interface FirebaseDebugStorageSummary {
  assetClass: string;
  requestCount: number;
  cacheHits: number;
  cacheMisses: number;
  inFlightReuses: number;
  contentVersions: string[];
  fallbackReasons: string[];
}

export interface FirebaseDebugFallback {
  route: string | null;
  action: string | null;
  assetClass: string | null;
  reason: string | null;
  timestamp: string;
}

export interface FirebaseDebugError {
  kind: FirestoreTraceEvent['kind'];
  route: string | null;
  action: string | null;
  subject: string | null;
  errorCode: string;
  failureCode: string | null;
  failureStage: string | null;
  httpStatus: number | null;
  durationMs: number | null;
  timestamp: string;
}

export interface FirebaseDebugReport {
  schemaVersion: 2;
  generatedAtIso: string;
  app: 'studio' | 'portal';
  projectId: string;
  session: {
    status: 'active' | 'inactive';
    startedAtIso: string | null;
    elapsedMs: number;
    routesVisited: string[];
  };
  accuracyDisclaimer: string;
  totals: {
    readOperations: number;
    documentsReturned: number;
    approximateBillableDocumentReads: number;
    listenerInitialDocuments: number;
    listenerUpdateDocuments: number;
    writes: number;
    listenerAttaches: number;
    listenerEmissions: number;
    callables: number;
    storageAssetRequests: number;
    cacheHits: number;
    cacheMisses: number;
    fallbacks: number;
    peakConcurrentListeners: number;
    currentListeners: number;
  };
  byAction: FirebaseDebugActionSummary[];
  byRoute: FirebaseDebugRouteSummary[];
  byCollection: FirebaseDebugCollectionSummary[];
  byCallable: FirebaseDebugCallableSummary[];
  byWrite: FirebaseDebugWriteSummary[];
  storage: FirebaseDebugStorageSummary[];
  fallbacks: FirebaseDebugFallback[];
  errors: FirebaseDebugError[];
  events: FirestoreTraceEvent[];
}

const UNATTRIBUTED_ACTION = '(unattributed)';

export const FIREBASE_DEBUG_ACCURACY_DISCLAIMER =
  'This is an in-memory, development-only approximation captured by the client SDK — not a ' +
  'substitute for Firebase Console or billing metrics. It is bounded to the last 2000 events and ' +
  'counts only client-SDK calls this tracer instruments. Approximate billable document reads use ' +
  'returned document counts plus Firestore’s one-document minimum for completed one-shot queries ' +
  'and initial listener results; they do not include index-entry charges or server-side Cloud ' +
  'Functions reads/writes.';

function sumRecordValues(record: Record<string, number>): number {
  return Object.values(record).reduce((total, value) => total + value, 0);
}

function countEventsOfKind(events: FirestoreTraceEvent[], kind: FirestoreTraceEvent['kind']): number {
  return events.filter((event) => event.kind === kind).length;
}

function eventSubject(event: FirestoreTraceEvent): string | null {
  return event.collection ?? event.callableName ?? event.assetClass ?? null;
}

interface ReadMetrics {
  readOperations: number;
  documentsReturned: number;
  approximateBillableDocumentReads: number;
  listenerInitialDocuments: number;
  listenerUpdateDocuments: number;
}

function calculateReadMetrics(events: FirestoreTraceEvent[]): ReadMetrics {
  let readOperations = 0;
  let documentsReturned = 0;
  let approximateBillableDocumentReads = 0;
  let listenerInitialDocuments = 0;
  let listenerUpdateDocuments = 0;
  const awaitingInitialEmission = new Map<string, number>();

  for (const event of events) {
    if (event.kind === 'listenerAttach') {
      awaitingInitialEmission.set(
        event.signature,
        (awaitingInitialEmission.get(event.signature) ?? 0) + 1,
      );
      continue;
    }
    if (event.kind === 'listenerDetach') {
      const pending = awaitingInitialEmission.get(event.signature) ?? 0;
      if (pending <= 1) awaitingInitialEmission.delete(event.signature);
      else awaitingInitialEmission.set(event.signature, pending - 1);
      continue;
    }
    if (event.kind === 'oneShotComplete') {
      const returnedCount = Math.max(0, event.returnedCount ?? 0);
      documentsReturned += returnedCount;
      approximateBillableDocumentReads += Math.max(1, returnedCount);
      continue;
    }
    if (event.kind !== 'oneShotStart' && event.kind !== 'listenerEmission') continue;

    readOperations += 1;
    if (event.kind === 'oneShotStart') continue;

    const returnedCount = Math.max(0, event.returnedCount ?? 0);
    documentsReturned += returnedCount;
    const pendingInitial = awaitingInitialEmission.get(event.signature) ?? 0;
    if (pendingInitial > 0) {
      listenerInitialDocuments += returnedCount;
      approximateBillableDocumentReads += Math.max(1, returnedCount);
      if (pendingInitial === 1) awaitingInitialEmission.delete(event.signature);
      else awaitingInitialEmission.set(event.signature, pendingInitial - 1);
    } else {
      listenerUpdateDocuments += returnedCount;
      approximateBillableDocumentReads += returnedCount;
    }
  }

  return {
    readOperations,
    documentsReturned,
    approximateBillableDocumentReads,
    listenerInitialDocuments,
    listenerUpdateDocuments,
  };
}

function buildByAction(events: FirestoreTraceEvent[]): FirebaseDebugActionSummary[] {
  const grouped = new Map<string, FirestoreTraceEvent[]>();

  for (const event of events) {
    const action = event.action ?? UNATTRIBUTED_ACTION;
    const bucket = grouped.get(action) ?? [];
    bucket.push(event);
    grouped.set(action, bucket);
  }

  return [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([action, actionEvents]) => {
      const readMetrics = calculateReadMetrics(actionEvents);
      const timestamps = actionEvents.map((event) => event.timestamp).sort();
      const firstTimestamp = timestamps[0] ?? null;
      const lastTimestamp = timestamps.at(-1) ?? null;
      const collections = [
        ...new Set(actionEvents.flatMap((event) => (event.collection ? [event.collection] : []))),
      ].sort();

      return {
        action,
        readOperations: readMetrics.readOperations,
        documentsReturned: readMetrics.documentsReturned,
        approximateBillableDocumentReads: readMetrics.approximateBillableDocumentReads,
        writes: countEventsOfKind(actionEvents, 'writeStart'),
        callables: countEventsOfKind(actionEvents, 'callableStart'),
        storageAssetRequests: countEventsOfKind(actionEvents, 'storageAssetStart'),
        collections,
        firstTimestamp,
        lastTimestamp,
        spanMs:
          firstTimestamp && lastTimestamp
            ? Math.max(0, new Date(lastTimestamp).getTime() - new Date(firstTimestamp).getTime())
            : 0,
      };
    });
}

function buildByRoute(events: FirestoreTraceEvent[]): FirebaseDebugRouteSummary[] {
  const grouped = new Map<string, FirestoreTraceEvent[]>();

  for (const event of events) {
    if (!event.route) continue;
    const bucket = grouped.get(event.route) ?? [];
    bucket.push(event);
    grouped.set(event.route, bucket);
  }

  return [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([route, routeEvents]) => {
      const readMetrics = calculateReadMetrics(routeEvents);
      return {
        route,
        readOperations: readMetrics.readOperations,
        documentsReturned: readMetrics.documentsReturned,
        approximateBillableDocumentReads: readMetrics.approximateBillableDocumentReads,
        writes: countEventsOfKind(routeEvents, 'writeStart'),
        callables: countEventsOfKind(routeEvents, 'callableStart'),
        storageAssetRequests: countEventsOfKind(routeEvents, 'storageAssetStart'),
      };
    });
}

function buildByCollection(events: FirestoreTraceEvent[]): FirebaseDebugCollectionSummary[] {
  const grouped = new Map<string, FirestoreTraceEvent[]>();

  for (const event of events) {
    if (!event.collection) continue;
    const bucket = grouped.get(event.collection) ?? [];
    bucket.push(event);
    grouped.set(event.collection, bucket);
  }

  return [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([collection, collectionEvents]) => {
      const readMetrics = calculateReadMetrics(collectionEvents);
      return {
        collection,
        readOperations: readMetrics.readOperations,
        documentsReturned: readMetrics.documentsReturned,
        approximateBillableDocumentReads: readMetrics.approximateBillableDocumentReads,
        writes: countEventsOfKind(collectionEvents, 'writeStart'),
      };
    });
}

function averageDuration(events: FirestoreTraceEvent[]): number | null {
  const durations = events
    .map((event) => event.durationMs)
    .filter((value): value is number => typeof value === 'number');
  if (durations.length === 0) return null;
  return Math.round(durations.reduce((total, value) => total + value, 0) / durations.length);
}

function buildByCallable(
  callables: Record<string, number>,
  events: FirestoreTraceEvent[],
): FirebaseDebugCallableSummary[] {
  return Object.entries(callables)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([callableName, invocationCount]) => {
      const completeEvents = events.filter(
        (event) => event.kind === 'callableComplete' && event.callableName === callableName,
      );
      return {
        callableName,
        invocationCount,
        successCount: completeEvents.filter((event) => event.success === true).length,
        failureCount: completeEvents.filter((event) => event.success === false).length,
        averageDurationMs: averageDuration(completeEvents),
      };
    });
}

function buildByWrite(events: FirestoreTraceEvent[]): FirebaseDebugWriteSummary[] {
  const grouped = new Map<string, FirestoreTraceEvent[]>();

  for (const event of events) {
    if (event.kind !== 'writeStart' && event.kind !== 'writeComplete') continue;
    if (!event.writeKind) continue;
    const bucket = grouped.get(event.writeKind) ?? [];
    bucket.push(event);
    grouped.set(event.writeKind, bucket);
  }

  return [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([writeKind, writeEvents]) => {
      const completeEvents = writeEvents.filter((event) => event.kind === 'writeComplete');
      const collections = [
        ...new Set(writeEvents.flatMap((event) => (event.collection ? [event.collection] : []))),
      ].sort();

      return {
        writeKind,
        writeCount: writeEvents.filter((event) => event.kind === 'writeStart').length,
        successCount: completeEvents.filter((event) => event.success === true).length,
        failureCount: completeEvents.filter((event) => event.success === false).length,
        averageDurationMs: averageDuration(completeEvents),
        collections,
      };
    });
}

function buildStorage(events: FirestoreTraceEvent[]): FirebaseDebugStorageSummary[] {
  const grouped = new Map<string, FirestoreTraceEvent[]>();

  for (const event of events) {
    if (!event.assetClass) continue;
    const bucket = grouped.get(event.assetClass) ?? [];
    bucket.push(event);
    grouped.set(event.assetClass, bucket);
  }

  return [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([assetClass, assetEvents]) => {
      const requestEvents = assetEvents.filter((event) => event.kind === 'storageAssetStart');
      const completeEvents = assetEvents.filter((event) => event.kind === 'storageAssetComplete');

      return {
        assetClass,
        requestCount: requestEvents.length,
        cacheHits: completeEvents.filter((event) => event.cacheStatus === 'hit').length,
        cacheMisses: completeEvents.filter((event) => event.cacheStatus === 'miss').length,
        inFlightReuses: completeEvents.filter((event) => event.cacheStatus === 'in-flight-reuse').length,
        contentVersions: [
          ...new Set(completeEvents.flatMap((event) => (event.contentVersion ? [event.contentVersion] : []))),
        ].sort(),
        fallbackReasons: [
          ...new Set(assetEvents.flatMap((event) => (event.fallbackReason ? [event.fallbackReason] : []))),
        ].sort(),
      };
    });
}

function buildFallbacks(events: FirestoreTraceEvent[]): FirebaseDebugFallback[] {
  return events
    .filter((event) => event.kind === 'fallback' || Boolean(event.fallbackReason))
    .map((event) => ({
      route: event.route ?? null,
      action: event.action ?? null,
      assetClass: event.assetClass ?? null,
      reason: event.fallbackReason ?? null,
      timestamp: event.timestamp,
    }));
}

function buildErrors(events: FirestoreTraceEvent[]): FirebaseDebugError[] {
  return events
    .filter((event): event is FirestoreTraceEvent & { errorCode: string } => Boolean(event.errorCode))
    .map((event) => ({
      kind: event.kind,
      route: event.route ?? null,
      action: event.action ?? null,
      subject: eventSubject(event),
      errorCode: event.errorCode,
      failureCode: event.failureCode ?? null,
      failureStage: event.failureStage ?? null,
      httpStatus: event.httpStatus ?? null,
      durationMs: event.durationMs ?? null,
      timestamp: event.timestamp,
    }));
}

export function buildFirebaseDebugReport(
  snapshot: FirestoreTraceSnapshot,
  context: { app: 'studio' | 'portal'; projectId: string },
): FirebaseDebugReport {
  const cacheEventTotals = Object.entries(snapshot.summary.cacheEvents).reduce(
    (totals, [key, count]) => {
      if (key.startsWith('cacheHit:')) totals.hits += count;
      if (key.startsWith('cacheMiss:')) totals.misses += count;
      return totals;
    },
    { hits: 0, misses: 0 },
  );
  const readMetrics = calculateReadMetrics(snapshot.events);

  return {
    schemaVersion: 2,
    generatedAtIso: new Date().toISOString(),
    app: context.app,
    projectId: context.projectId,
    session: {
      status: snapshot.enabled && snapshot.sessionStartedAtIso ? 'active' : 'inactive',
      startedAtIso: snapshot.sessionStartedAtIso,
      elapsedMs: snapshot.sessionStartedAtIso
        ? Math.max(0, Date.now() - new Date(snapshot.sessionStartedAtIso).getTime())
        : 0,
      routesVisited: [...snapshot.routesVisited],
    },
    accuracyDisclaimer: FIREBASE_DEBUG_ACCURACY_DISCLAIMER,
    totals: {
      readOperations: readMetrics.readOperations,
      documentsReturned: readMetrics.documentsReturned,
      approximateBillableDocumentReads: readMetrics.approximateBillableDocumentReads,
      listenerInitialDocuments: readMetrics.listenerInitialDocuments,
      listenerUpdateDocuments: readMetrics.listenerUpdateDocuments,
      writes: sumRecordValues(snapshot.writes),
      listenerAttaches: sumRecordValues(snapshot.listenerAttaches),
      listenerEmissions: countEventsOfKind(snapshot.events, 'listenerEmission'),
      callables: sumRecordValues(snapshot.callables),
      storageAssetRequests: sumRecordValues(snapshot.storageAssets),
      cacheHits: cacheEventTotals.hits,
      cacheMisses: cacheEventTotals.misses,
      fallbacks: countEventsOfKind(snapshot.events, 'fallback'),
      peakConcurrentListeners: snapshot.peakConcurrentListeners,
      currentListeners: snapshot.currentListeners,
    },
    byAction: buildByAction(snapshot.events),
    byRoute: buildByRoute(snapshot.events),
    byCollection: buildByCollection(snapshot.events),
    byCallable: buildByCallable(snapshot.callables, snapshot.events),
    byWrite: buildByWrite(snapshot.events),
    storage: buildStorage(snapshot.events),
    fallbacks: buildFallbacks(snapshot.events),
    errors: buildErrors(snapshot.events),
    events: snapshot.events.map((event) => ({ ...event })),
  };
}
