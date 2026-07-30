/**
 * Development-only Firestore usage tracer (safe metadata only).
 *
 * Enable in a browser/Electron renderer:
 *   localStorage.setItem('FP_FIRESTORE_TRACE', '1')
 * then reload. Dump: `window.__fpFirestoreTrace.dump()`.
 *
 * The tracer never reads or writes Firestore and never accepts document bodies.
 */

export type FirestoreTraceReadKind =
  | 'getDoc'
  | 'getDocs'
  | 'getCountFromServer'
  | 'onSnapshotEmit';

export type FirestoreTraceWriteKind = 'setDoc' | 'addDoc' | 'updateDoc' | 'deleteDoc' | 'writeBatch' | 'runTransaction';

export type FirestoreTraceApp = 'portal' | 'studio';

export type FirestoreTraceTriggerReason =
  | 'authentication'
  | 'explicit-refresh'
  | 'focus'
  | 'initial-mount'
  | 'reconnect'
  | 'route'
  | 'timer'
  | 'unknown'
  | 'visibility';

export type FirestoreTraceEventKind =
  | 'cacheHit'
  | 'cacheMiss'
  | 'fallback'
  | 'listenerAttach'
  | 'listenerDetach'
  | 'listenerEmission'
  | 'oneShotComplete'
  | 'oneShotStart'
  | 'retry'
  | 'writeStart'
  | 'writeComplete'
  | 'callableStart'
  | 'callableComplete'
  | 'storageAssetStart'
  | 'storageAssetComplete'
  | 'generatedAssetSuccess'
  | 'generatedAssetFailure'
  | 'generatedEntryReconciliation'
  | 'generatedCardOverride'
  | 'routeChange'
  | 'actionStart'
  | 'actionEnd';

export interface FirestoreTraceMetadata {
  app?: FirestoreTraceApp;
  collection?: string;
  correlationId?: string;
  constraints?: readonly string[];
  documentPathPattern?: string;
  limit?: number;
  logicalOperation?: string;
  orderBy?: readonly string[];
  page?: number;
  route?: string;
  signature?: string;
  source?: string;
  triggerReason?: FirestoreTraceTriggerReason;
  /** Owner-visible action name from `withDebugTraceAction`/`startDebugTraceAction` (e.g. "Save design"). */
  action?: string;
  /** Write-kind metadata (writeStart/writeComplete only). */
  writeKind?: FirestoreTraceWriteKind;
  writeCount?: number;
  errorCode?: string;
  failureCode?: string;
  failureStage?: string;
  httpStatus?: number;
  /** Callable metadata (callableStart/callableComplete only). Never include request/response payloads. */
  callableName?: string;
  /** Generated-asset metadata (storageAssetStart/storageAssetComplete only). Path CLASS only — no
   * signed URLs, tokens, or full query strings (e.g. "portal-catalog/studio/ready-index", not the
   * real Storage path/download URL). */
  assetClass?: string;
  contentVersion?: string;
  bytes?: number;
  cacheStatus?: 'hit' | 'miss' | 'in-flight-reuse';
  fallbackReason?: string;
  /** Wall-clock duration of the traced operation (writeComplete/callableComplete only) — measured
   * by the calling wrapper (start-to-finish), not derived from `elapsedMs`. */
  durationMs?: number;
  /** Whether the operation succeeded (writeComplete/callableComplete only) — always the inverse of
   * whether an `errorCode` was recorded, provided explicitly so panel/report code never has to
   * infer it. */
  success?: boolean;
  designOpaqueId?: string;
  preservedSortValue?: boolean;
  remainedVisible?: boolean;
  cardCacheInvalidated?: boolean;
  overrideLifecycle?: 'created' | 'applied' | 'superseded' | 'removed';
}

export interface FirestoreTraceEvent {
  activeCount?: number;
  app?: FirestoreTraceApp;
  collection?: string;
  correlationId?: string;
  constraints?: string[];
  documentPathPattern?: string;
  kind: FirestoreTraceEventKind;
  limit?: number;
  logicalOperation?: string;
  operation?: FirestoreTraceReadKind;
  orderBy?: string[];
  page?: number;
  returnedCount?: number;
  route?: string;
  signature: string;
  source?: string;
  timestamp: string;
  triggerReason: FirestoreTraceTriggerReason;
  action?: string;
  writeKind?: FirestoreTraceWriteKind;
  writeCount?: number;
  errorCode?: string;
  failureCode?: string;
  failureStage?: string;
  httpStatus?: number;
  callableName?: string;
  assetClass?: string;
  contentVersion?: string;
  bytes?: number;
  cacheStatus?: 'hit' | 'miss' | 'in-flight-reuse';
  fallbackReason?: string;
  durationMs?: number;
  success?: boolean;
  designOpaqueId?: string;
  preservedSortValue?: boolean;
  remainedVisible?: boolean;
  cardCacheInvalidated?: boolean;
  overrideLifecycle?: 'created' | 'applied' | 'superseded' | 'removed';
  /** Milliseconds since session start when this event was recorded — for the timeline UI. */
  elapsedMs: number;
}

export interface FirestoreTraceSummary {
  cacheEvents: Record<string, number>;
  duplicateActiveSignatures: Record<string, number>;
  firstTimestamp: string | null;
  lastTimestamp: string | null;
  logicalOperations: Record<string, {
    logicalOperation: string;
    pages: number;
    returnedDocuments: number;
  }>;
  oneShotQueries: Record<string, number>;
  repeatedQueries: Record<string, number>;
  returnedDocuments: Record<string, number>;
  routeOwnership: Record<string, number>;
  triggerReasons: Record<string, number>;
}

export interface FirestoreTraceSnapshot {
  currentListeners: number;
  enabled: boolean;
  events: FirestoreTraceEvent[];
  listenerAttaches: Record<string, number>;
  listenerDetaches: Record<string, number>;
  peakConcurrentListeners: number;
  reads: Record<string, number>;
  summary: FirestoreTraceSummary;
  writes: Record<string, number>;
  callables: Record<string, number>;
  storageAssets: Record<string, number>;
  sessionStartedAtIso: string | null;
  routesVisited: string[];
}

type TraceContext = {
  app?: FirestoreTraceApp;
  route?: string;
};

type TraceState = {
  activeListeners: Map<string, number>;
  cacheEvents: Map<string, number>;
  events: FirestoreTraceEvent[];
  listenerAttaches: Map<string, number>;
  listenerDetaches: Map<string, number>;
  logicalOperations: Map<string, {
    logicalOperation: string;
    pages: number;
    returnedDocuments: number;
  }>;
  oneShotQueries: Map<string, number>;
  pendingOneShotRoutes: Map<string, Array<string | undefined>>;
  peakConcurrentListeners: number;
  reads: Map<string, number>;
  returnedDocuments: Map<string, number>;
  routeOwnership: Map<string, number>;
  triggerReasons: Map<string, number>;
  writes: Map<string, number>;
  callables: Map<string, number>;
  storageAssets: Map<string, number>;
  sessionStartMs: number;
  routesVisited: string[];
  activeActionStack: string[];
};

const STORAGE_FLAG = 'FP_FIRESTORE_TRACE';
const MAX_EVENTS = 2_000;

let cachedEnabled: boolean | null = null;
let context: TraceContext = {};
let state: TraceState | null = null;
const snapshotSubscribers = new Set<(snapshot: FirestoreTraceSnapshot) => void>();

function readEnabledFlag(): boolean {
  if (typeof globalThis === 'undefined') {
    return false;
  }

  try {
    const storage = (globalThis as { localStorage?: Storage }).localStorage;
    if (storage?.getItem(STORAGE_FLAG) === '1') {
      return true;
    }
  } catch {
    // Ignore storage access failures.
  }

  try {
    const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
      ?.env;
    if (env?.FP_FIRESTORE_TRACE === '1' || env?.NEXT_PUBLIC_FP_FIRESTORE_TRACE === '1') {
      return true;
    }
  } catch {
    // Ignore environment access failures.
  }

  return false;
}

export function isFirestoreUsageTraceEnabled(): boolean {
  if (cachedEnabled === null) {
    cachedEnabled = readEnabledFlag();
  }
  return cachedEnabled;
}

export function setFirestoreUsageTraceEnabled(enabled: boolean): void {
  cachedEnabled = enabled;
  if (!enabled) state = null;
  notifySnapshotSubscribers();
}

export function subscribeFirestoreUsageTrace(
  subscriber: (snapshot: FirestoreTraceSnapshot) => void,
): () => void {
  snapshotSubscribers.add(subscriber);
  subscriber(getFirestoreUsageTraceSnapshot());
  return () => snapshotSubscribers.delete(subscriber);
}

export function setFirestoreUsageTraceContext(nextContext: TraceContext): void {
  const previousRoute = context.route;
  context = {
    app: nextContext.app ?? context.app,
    route: nextContext.route ?? context.route,
  };

  if (nextContext.route && nextContext.route !== previousRoute) {
    const next = ensureState();
    if (next) {
      if (!next.routesVisited.includes(nextContext.route)) {
        next.routesVisited.push(nextContext.route);
      }
      recordEvent('routeChange', {
        app: context.app,
        route: nextContext.route,
        source: previousRoute,
        triggerReason: 'route',
      });
    }
  }
}

/** Test helper: resets enablement, context, counters, and events. */
export function resetFirestoreUsageTraceForTests(options?: {
  app?: FirestoreTraceApp;
  enabled?: boolean;
  route?: string;
}): void {
  cachedEnabled = options?.enabled ?? null;
  context = { app: options?.app, route: options?.route };
  state = null;
  notifySnapshotSubscribers();
}

function ensureState(): TraceState | null {
  if (!isFirestoreUsageTraceEnabled()) {
    return null;
  }
  if (!state) {
    state = {
      activeListeners: new Map(),
      cacheEvents: new Map(),
      events: [],
      listenerAttaches: new Map(),
      listenerDetaches: new Map(),
      logicalOperations: new Map(),
      oneShotQueries: new Map(),
      pendingOneShotRoutes: new Map(),
      peakConcurrentListeners: 0,
      reads: new Map(),
      returnedDocuments: new Map(),
      routeOwnership: new Map(),
      triggerReasons: new Map(),
      writes: new Map(),
      callables: new Map(),
      storageAssets: new Map(),
      sessionStartMs: Date.now(),
      routesVisited: [],
      activeActionStack: [],
    };
    exposeDumpHelper();
  }
  return state;
}

function bump(map: Map<string, number>, key: string, by = 1): void {
  map.set(key, (map.get(key) ?? 0) + by);
}

function currentListenerTotal(active: Map<string, number>): number {
  let total = 0;
  for (const count of active.values()) {
    total += count;
  }
  return total;
}

function mapToRecord(map: Map<string, number>): Record<string, number> {
  return Object.fromEntries([...map.entries()].sort(([left], [right]) => left.localeCompare(right)));
}

function stableUnique(values: readonly string[] | undefined): string[] | undefined {
  if (!values || values.length === 0) {
    return undefined;
  }
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort();
}

export function buildFirestoreTraceSignature(metadata: FirestoreTraceMetadata): string {
  if (metadata.signature?.trim()) {
    return metadata.signature.trim();
  }

  return JSON.stringify({
    collection: metadata.collection?.trim() || null,
    constraints: stableUnique(metadata.constraints) ?? null,
    documentPathPattern: metadata.documentPathPattern?.trim() || null,
    limit:
      typeof metadata.limit === 'number' && Number.isFinite(metadata.limit)
        ? metadata.limit
        : null,
    orderBy: metadata.orderBy?.map((value) => value.trim()).filter(Boolean) ?? null,
  });
}

function normalizeMetadata(input: string | FirestoreTraceMetadata): Required<
  Pick<FirestoreTraceMetadata, 'triggerReason'>
> &
  FirestoreTraceMetadata & { signature: string } {
  const metadata = typeof input === 'string' ? { signature: input } : input;
  let browserRoute: string | undefined;

  try {
    const location = (
      globalThis as { location?: { hash?: string; pathname?: string } }
    ).location;
    browserRoute =
      location?.hash?.startsWith('#/')
        ? location.hash.slice(1)
        : location?.pathname;
  } catch {
    browserRoute = undefined;
  }

  return {
    ...metadata,
    app: metadata.app ?? context.app,
    constraints: stableUnique(metadata.constraints),
    orderBy: metadata.orderBy?.map((value) => value.trim()).filter(Boolean),
    route: metadata.route ?? context.route ?? browserRoute,
    signature: buildFirestoreTraceSignature(metadata),
    triggerReason: metadata.triggerReason ?? 'unknown',
  };
}

function recordEvent(
  kind: FirestoreTraceEventKind,
  input: string | FirestoreTraceMetadata,
  options?: {
    activeCount?: number;
    operation?: FirestoreTraceReadKind;
    returnedCount?: number;
  },
): void {
  const next = ensureState();
  if (!next) {
    return;
  }

  const metadata = normalizeMetadata(input);
  const timestamp = new Date().toISOString();
  const currentAction = metadata.action ?? next.activeActionStack.at(-1);
  const event: FirestoreTraceEvent = {
    kind,
    signature: metadata.signature,
    timestamp,
    triggerReason: metadata.triggerReason,
    elapsedMs: Date.now() - next.sessionStartMs,
    ...(metadata.app ? { app: metadata.app } : {}),
    ...(metadata.collection ? { collection: metadata.collection } : {}),
    ...(metadata.correlationId ? { correlationId: metadata.correlationId } : {}),
    ...(metadata.constraints ? { constraints: [...metadata.constraints] } : {}),
    ...(metadata.documentPathPattern
      ? { documentPathPattern: metadata.documentPathPattern }
      : {}),
    ...(typeof metadata.limit === 'number' ? { limit: metadata.limit } : {}),
    ...(metadata.logicalOperation ? { logicalOperation: metadata.logicalOperation } : {}),
    ...(metadata.orderBy ? { orderBy: [...metadata.orderBy] } : {}),
    ...(typeof metadata.page === 'number' ? { page: metadata.page } : {}),
    ...(metadata.route ? { route: metadata.route } : {}),
    ...(metadata.source ? { source: metadata.source } : {}),
    ...(currentAction ? { action: currentAction } : {}),
    ...(metadata.writeKind ? { writeKind: metadata.writeKind } : {}),
    ...(typeof metadata.writeCount === 'number' ? { writeCount: metadata.writeCount } : {}),
    ...(metadata.errorCode ? { errorCode: metadata.errorCode } : {}),
    ...(metadata.failureCode ? { failureCode: metadata.failureCode } : {}),
    ...(metadata.failureStage ? { failureStage: metadata.failureStage } : {}),
    ...(typeof metadata.httpStatus === 'number' ? { httpStatus: metadata.httpStatus } : {}),
    ...(metadata.callableName ? { callableName: metadata.callableName } : {}),
    ...(metadata.assetClass ? { assetClass: metadata.assetClass } : {}),
    ...(metadata.contentVersion ? { contentVersion: metadata.contentVersion } : {}),
    ...(typeof metadata.bytes === 'number' ? { bytes: metadata.bytes } : {}),
    ...(metadata.cacheStatus ? { cacheStatus: metadata.cacheStatus } : {}),
    ...(metadata.fallbackReason ? { fallbackReason: metadata.fallbackReason } : {}),
    ...(typeof metadata.durationMs === 'number' ? { durationMs: metadata.durationMs } : {}),
    ...(typeof metadata.success === 'boolean' ? { success: metadata.success } : {}),
    ...(metadata.designOpaqueId ? { designOpaqueId: metadata.designOpaqueId } : {}),
    ...(typeof metadata.preservedSortValue === 'boolean'
      ? { preservedSortValue: metadata.preservedSortValue }
      : {}),
    ...(typeof metadata.remainedVisible === 'boolean'
      ? { remainedVisible: metadata.remainedVisible }
      : {}),
    ...(typeof metadata.cardCacheInvalidated === 'boolean'
      ? { cardCacheInvalidated: metadata.cardCacheInvalidated }
      : {}),
    ...(metadata.overrideLifecycle ? { overrideLifecycle: metadata.overrideLifecycle } : {}),
    ...(typeof options?.activeCount === 'number' ? { activeCount: options.activeCount } : {}),
    ...(options?.operation ? { operation: options.operation } : {}),
    ...(typeof options?.returnedCount === 'number'
      ? { returnedCount: Math.max(0, Math.trunc(options.returnedCount)) }
      : {}),
  };

  next.events.push(event);
  if (next.events.length > MAX_EVENTS) {
    next.events.splice(0, next.events.length - MAX_EVENTS);
  }

  bump(next.triggerReasons, metadata.triggerReason);
  if (
    kind === 'cacheHit' ||
    kind === 'cacheMiss' ||
    kind === 'fallback' ||
    kind === 'retry'
  ) {
    bump(next.cacheEvents, `${kind}:${metadata.source ?? metadata.signature}`);
  }
  if (metadata.route) {
    bump(next.routeOwnership, `${metadata.route}:${metadata.source ?? metadata.signature}`);
  }
  notifySnapshotSubscribers();
}

function notifySnapshotSubscribers(): void {
  if (snapshotSubscribers.size === 0) return;
  const snapshot = getFirestoreUsageTraceSnapshot();
  for (const subscriber of snapshotSubscribers) subscriber(snapshot);
}

export function traceFirestoreListenerAttach(input: string | FirestoreTraceMetadata): void {
  const next = ensureState();
  if (!next) {
    return;
  }
  const metadata = normalizeMetadata(input);
  bump(next.listenerAttaches, metadata.signature);
  bump(next.activeListeners, metadata.signature);
  const activeCount = next.activeListeners.get(metadata.signature) ?? 0;
  next.peakConcurrentListeners = Math.max(
    next.peakConcurrentListeners,
    currentListenerTotal(next.activeListeners),
  );
  recordEvent('listenerAttach', metadata, { activeCount });
}

export function traceFirestoreListenerDetach(input: string | FirestoreTraceMetadata): void {
  const next = ensureState();
  if (!next) {
    return;
  }
  const metadata = normalizeMetadata(input);
  bump(next.listenerDetaches, metadata.signature);
  const active = next.activeListeners.get(metadata.signature) ?? 0;
  if (active <= 1) {
    next.activeListeners.delete(metadata.signature);
  } else {
    next.activeListeners.set(metadata.signature, active - 1);
  }
  recordEvent('listenerDetach', metadata, {
    activeCount: next.activeListeners.get(metadata.signature) ?? 0,
  });
}

export function traceFirestoreListenerEmission(
  input: string | FirestoreTraceMetadata,
  returnedCount: number,
): void {
  const next = ensureState();
  if (!next) {
    return;
  }
  const metadata = normalizeMetadata(input);
  bump(next.reads, `onSnapshotEmit:${metadata.signature}`);
  bump(next.returnedDocuments, metadata.signature, Math.max(0, Math.trunc(returnedCount)));
  recordEvent('listenerEmission', metadata, {
    activeCount: next.activeListeners.get(metadata.signature) ?? 0,
    operation: 'onSnapshotEmit',
    returnedCount,
  });
}

function getOneShotCorrelationKey(
  operation: Exclude<FirestoreTraceReadKind, 'onSnapshotEmit'>,
  metadata: FirestoreTraceMetadata & { signature: string },
): string {
  return `${operation}:${metadata.signature}:${metadata.source ?? ''}`;
}

export function traceFirestoreOneShotStart(
  operation: Exclude<FirestoreTraceReadKind, 'onSnapshotEmit'>,
  input: string | FirestoreTraceMetadata,
): void {
  const next = ensureState();
  if (!next) {
    return;
  }
  const metadata = normalizeMetadata(input);
  const correlationKey = getOneShotCorrelationKey(operation, metadata);
  const pendingRoutes = next.pendingOneShotRoutes.get(correlationKey) ?? [];
  pendingRoutes.push(metadata.route);
  next.pendingOneShotRoutes.set(correlationKey, pendingRoutes);
  bump(next.reads, `${operation}:${metadata.signature}`);
  bump(next.oneShotQueries, metadata.signature);
  if (metadata.logicalOperation && metadata.correlationId) {
    const key = `${metadata.logicalOperation}:${metadata.correlationId}`;
    const logical = next.logicalOperations.get(key) ?? {
      logicalOperation: metadata.logicalOperation,
      pages: 0,
      returnedDocuments: 0,
    };
    logical.pages += 1;
    next.logicalOperations.set(key, logical);
  }
  recordEvent('oneShotStart', metadata, { operation });
}

export function traceFirestoreOneShotComplete(
  operation: Exclude<FirestoreTraceReadKind, 'onSnapshotEmit'>,
  input: string | FirestoreTraceMetadata,
  returnedCount: number,
): void {
  const next = ensureState();
  if (!next) {
    return;
  }
  const normalizedMetadata = normalizeMetadata(input);
  const correlationKey = getOneShotCorrelationKey(operation, normalizedMetadata);
  const pendingRoutes = next.pendingOneShotRoutes.get(correlationKey);
  const startedRoute = pendingRoutes?.shift();
  if (pendingRoutes?.length === 0) {
    next.pendingOneShotRoutes.delete(correlationKey);
  }
  const metadata = startedRoute
    ? { ...normalizedMetadata, route: startedRoute }
    : normalizedMetadata;
  bump(next.returnedDocuments, metadata.signature, Math.max(0, Math.trunc(returnedCount)));
  if (metadata.logicalOperation && metadata.correlationId) {
    const key = `${metadata.logicalOperation}:${metadata.correlationId}`;
    const logical = next.logicalOperations.get(key);
    if (logical) {
      logical.returnedDocuments += Math.max(0, Math.trunc(returnedCount));
    }
  }
  recordEvent('oneShotComplete', metadata, { operation, returnedCount });
}

export function traceFirestoreCacheEvent(
  kind: 'cacheHit' | 'cacheMiss' | 'fallback' | 'retry',
  input: string | FirestoreTraceMetadata,
): void {
  recordEvent(kind, input);
}

/** Backward-compatible counter used by earlier instrumentation sites. */
export function traceFirestoreRead(kind: FirestoreTraceReadKind, key: string): void {
  if (kind === 'onSnapshotEmit') {
    traceFirestoreListenerEmission(key, 0);
    return;
  }
  traceFirestoreOneShotStart(kind, key);
}

/** Records a Firestore write attempt (setDoc/addDoc/updateDoc/deleteDoc/writeBatch/runTransaction).
 * Never records field values — only collection, write kind, and document count. */
export function traceFirestoreWriteStart(
  writeKind: FirestoreTraceWriteKind,
  input: string | FirestoreTraceMetadata,
): void {
  const next = ensureState();
  if (!next) return;
  const metadata = normalizeMetadata(input);
  bump(next.writes, `${writeKind}:${metadata.signature}`);
  recordEvent('writeStart', { ...metadata, writeKind });
}

export function traceFirestoreWriteComplete(
  writeKind: FirestoreTraceWriteKind,
  input: string | FirestoreTraceMetadata,
  options?: { writeCount?: number; errorCode?: string; durationMs?: number },
): void {
  const next = ensureState();
  if (!next) return;
  const metadata = normalizeMetadata(input);
  recordEvent('writeComplete', {
    ...metadata,
    writeKind,
    writeCount: options?.writeCount,
    errorCode: options?.errorCode,
    durationMs: options?.durationMs,
    success: !options?.errorCode,
  });
}

/** Records a callable invocation. Never records request/response payloads — safe name only. */
export function traceCallableStart(callableName: string, input: string | FirestoreTraceMetadata = {}): void {
  const next = ensureState();
  if (!next) return;
  const metadata = normalizeMetadata(input);
  bump(next.callables, callableName);
  recordEvent('callableStart', { ...metadata, callableName, signature: metadata.signature || callableName });
}

export function traceCallableComplete(
  callableName: string,
  input: string | FirestoreTraceMetadata = {},
  options?: { errorCode?: string; durationMs?: number },
): void {
  const next = ensureState();
  if (!next) return;
  const metadata = normalizeMetadata(input);
  recordEvent('callableComplete', {
    ...metadata,
    callableName,
    signature: metadata.signature || callableName,
    errorCode: options?.errorCode,
    durationMs: options?.durationMs,
    success: !options?.errorCode,
  });
}

/** Records a generated Storage JSON asset request. `assetClass` must be a sanitized path CLASS
 * (e.g. "portal-catalog/studio/ready-index"), never a signed URL, download token, or full path. */
export function traceStorageAssetStart(assetClass: string, input: string | FirestoreTraceMetadata = {}): void {
  const next = ensureState();
  if (!next) return;
  const metadata = normalizeMetadata(input);
  bump(next.storageAssets, assetClass);
  recordEvent('storageAssetStart', { ...metadata, assetClass, signature: metadata.signature || assetClass });
}

export function traceStorageAssetComplete(
  assetClass: string,
  input: string | FirestoreTraceMetadata = {},
  options?: {
    bytes?: number;
    cacheStatus?: 'hit' | 'miss' | 'in-flight-reuse';
    contentVersion?: string;
    fallbackReason?: string;
    errorCode?: string;
    failureCode?: string;
    failureStage?: string;
    httpStatus?: number;
    durationMs?: number;
    success?: boolean;
  },
): void {
  const next = ensureState();
  if (!next) return;
  const metadata = normalizeMetadata(input);
  recordEvent('storageAssetComplete', {
    ...metadata,
    assetClass,
    signature: metadata.signature || assetClass,
    bytes: options?.bytes,
    cacheStatus: options?.cacheStatus,
    contentVersion: options?.contentVersion,
    fallbackReason: options?.fallbackReason,
    errorCode: options?.errorCode,
    failureCode: options?.failureCode,
    failureStage: options?.failureStage,
    httpStatus: options?.httpStatus,
    durationMs: options?.durationMs,
    success: options?.success ?? !(options?.failureCode || options?.errorCode),
  });
}

function opaqueTraceId(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `design-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export function traceGeneratedEntryReconciliation(
  designId: string,
  options: {
    success: boolean;
    preservedSortValue: boolean;
    remainedVisible: boolean;
    cardCacheInvalidated: boolean;
  },
): void {
  recordEvent('generatedEntryReconciliation', {
    app: 'studio',
    source: 'studioDesignLibrary.localReconciliation@generated-first-v3',
    triggerReason: 'explicit-refresh',
    designOpaqueId: opaqueTraceId(designId),
    ...options,
  });
}

export function traceGeneratedCardOverride(
  lifecycle: 'created' | 'applied' | 'superseded' | 'removed',
  designId: string,
  contentVersion?: string,
): void {
  recordEvent('generatedCardOverride', {
    app: 'studio',
    source: 'studioDesignLibrary.sessionCardOverride@generated-first-v3',
    triggerReason: 'explicit-refresh',
    designOpaqueId: opaqueTraceId(designId),
    overrideLifecycle: lifecycle,
    contentVersion,
  });
}

export function traceGeneratedAssetOutcome(
  outcome: 'success' | 'failure',
  source: string,
  input: FirestoreTraceMetadata = {},
): void {
  recordEvent(outcome === 'success' ? 'generatedAssetSuccess' : 'generatedAssetFailure', {
    ...input,
    signature: source,
    source,
  });
}

export function traceGeneratedFallbackActivation(
  source: string,
  reason: string,
  input: FirestoreTraceMetadata = {},
): void {
  recordEvent('fallback', {
    ...input,
    fallbackReason: reason,
    signature: source,
    source,
  });
}

/**
 * Groups related Firestore/Storage/callable operations under one owner-visible action name (e.g.
 * "Save design", "Open show calendar") for the Firebase Debug panel's "by action" breakdown. Push
 * onto a stack so nested actions attribute correctly; every `recordEvent` call while an action is
 * active is tagged with the innermost active action unless it explicitly names its own.
 */
export function startFirebaseTraceAction(actionName: string): void {
  const next = ensureState();
  if (!next) return;
  next.activeActionStack.push(actionName);
  recordEvent('actionStart', { action: actionName, signature: actionName });
}

export function endFirebaseTraceAction(): void {
  const next = ensureState();
  if (!next) return;
  const actionName = next.activeActionStack.pop();
  recordEvent('actionEnd', { action: actionName, signature: actionName ?? 'unknown' });
}

/** Runs `fn` with the given action name active for the duration of the (possibly async) call,
 * ensuring the action is always popped even if `fn` throws. */
export async function withFirebaseTraceAction<T>(actionName: string, fn: () => Promise<T> | T): Promise<T> {
  startFirebaseTraceAction(actionName);
  try {
    return await fn();
  } finally {
    endFirebaseTraceAction();
  }
}

function errorCodeFromUnknown(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error && typeof (error as { code: unknown }).code === 'string') {
    return (error as { code: string }).code;
  }
  return 'unknown';
}

/**
 * Wraps a single Firebase callable invocation with start/complete tracing, so every service that
 * calls a Cloud Function through this helper shows up in the Firebase Debug panel without each call
 * site hand-rolling trace calls. `invoke` is the already-constructed callable (the result of
 * `httpsCallable(functions, callableName)`) — this helper never imports `firebase/functions` itself,
 * keeping the shared package framework-agnostic. Never pass the request/response payload as
 * `metadata` — only safe descriptive fields (route, action, source, a sanitized document count).
 */
export async function runTracedCallable<Request, Response>(
  callableName: string,
  invoke: (request?: Request) => Promise<{ data: Response }>,
  request?: Request,
  metadata: FirestoreTraceMetadata = {},
): Promise<Response> {
  const startedAtMs = Date.now();
  traceCallableStart(callableName, metadata);
  try {
    const result = await invoke(request);
    traceCallableComplete(callableName, metadata, { durationMs: Date.now() - startedAtMs });
    return result.data;
  } catch (error) {
    traceCallableComplete(callableName, metadata, {
      durationMs: Date.now() - startedAtMs,
      errorCode: errorCodeFromUnknown(error),
    });
    throw error;
  }
}

/**
 * Wraps a single Firestore write with start/complete tracing (mirrors `runTracedCallable`). `run`
 * performs the actual `setDoc`/`updateDoc`/`addDoc`/`deleteDoc`/batch call and returns its result;
 * this helper never touches document field values, only the caller-supplied safe metadata.
 */
export async function runTracedWrite<T>(
  writeKind: FirestoreTraceWriteKind,
  run: () => Promise<T>,
  metadata: FirestoreTraceMetadata = {},
  options?: { writeCount?: number },
): Promise<T> {
  const startedAtMs = Date.now();
  traceFirestoreWriteStart(writeKind, metadata);
  try {
    const result = await run();
    traceFirestoreWriteComplete(writeKind, metadata, {
      writeCount: options?.writeCount ?? 1,
      durationMs: Date.now() - startedAtMs,
    });
    return result;
  } catch (error) {
    traceFirestoreWriteComplete(writeKind, metadata, {
      durationMs: Date.now() - startedAtMs,
      errorCode: errorCodeFromUnknown(error),
    });
    throw error;
  }
}

function buildSummary(next: TraceState): FirestoreTraceSummary {
  const duplicateActiveSignatures = new Map<string, number>();
  const repeatedQueries = new Map<string, number>();

  for (const [signature, count] of next.activeListeners) {
    if (count > 1) {
      duplicateActiveSignatures.set(signature, count);
    }
  }
  for (const [signature, count] of next.oneShotQueries) {
    if (count > 1) {
      repeatedQueries.set(signature, count);
    }
  }

  return {
    cacheEvents: mapToRecord(next.cacheEvents),
    duplicateActiveSignatures: mapToRecord(duplicateActiveSignatures),
    firstTimestamp: next.events[0]?.timestamp ?? null,
    lastTimestamp: next.events.at(-1)?.timestamp ?? null,
    logicalOperations: Object.fromEntries(
      [...next.logicalOperations.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, value]) => [key, { ...value }]),
    ),
    oneShotQueries: mapToRecord(next.oneShotQueries),
    repeatedQueries: mapToRecord(repeatedQueries),
    returnedDocuments: mapToRecord(next.returnedDocuments),
    routeOwnership: mapToRecord(next.routeOwnership),
    triggerReasons: mapToRecord(next.triggerReasons),
  };
}

export function getFirestoreUsageTraceSnapshot(): FirestoreTraceSnapshot {
  const next = ensureState();
  if (!next) {
    return {
      currentListeners: 0,
      enabled: false,
      events: [],
      listenerAttaches: {},
      listenerDetaches: {},
      peakConcurrentListeners: 0,
      reads: {},
      summary: {
        cacheEvents: {},
        duplicateActiveSignatures: {},
        firstTimestamp: null,
        lastTimestamp: null,
        logicalOperations: {},
        oneShotQueries: {},
        repeatedQueries: {},
        returnedDocuments: {},
        routeOwnership: {},
        triggerReasons: {},
      },
      writes: {},
      callables: {},
      storageAssets: {},
      sessionStartedAtIso: null,
      routesVisited: [],
    };
  }

  return {
    currentListeners: currentListenerTotal(next.activeListeners),
    enabled: true,
    events: next.events.map((event) => ({ ...event })),
    listenerAttaches: mapToRecord(next.listenerAttaches),
    listenerDetaches: mapToRecord(next.listenerDetaches),
    peakConcurrentListeners: next.peakConcurrentListeners,
    reads: mapToRecord(next.reads),
    summary: buildSummary(next),
    writes: mapToRecord(next.writes),
    callables: mapToRecord(next.callables),
    storageAssets: mapToRecord(next.storageAssets),
    sessionStartedAtIso: new Date(next.sessionStartMs).toISOString(),
    routesVisited: [...next.routesVisited],
  };
}

export function dumpFirestoreUsageTrace(): FirestoreTraceSnapshot {
  const snapshot = getFirestoreUsageTraceSnapshot();
  if (snapshot.enabled && typeof console !== 'undefined') {
    console.info('[FP_FIRESTORE_TRACE]', snapshot);
  }
  return snapshot;
}

function exposeDumpHelper(): void {
  if (typeof globalThis === 'undefined') {
    return;
  }
  const target = globalThis as {
    __fpFirestoreTrace?: {
      dump: () => FirestoreTraceSnapshot;
      snapshot: () => FirestoreTraceSnapshot;
      summary: () => FirestoreTraceSummary;
    };
  };
  target.__fpFirestoreTrace = {
    dump: dumpFirestoreUsageTrace,
    snapshot: getFirestoreUsageTraceSnapshot,
    summary: () => getFirestoreUsageTraceSnapshot().summary,
  };
}

/** Wrap an onSnapshot unsubscribe so detach is counted once. */
export function traceWrappedUnsubscribe(
  input: string | FirestoreTraceMetadata,
  unsubscribe: () => void,
): () => void {
  let done = false;
  return () => {
    if (done) {
      return;
    }
    done = true;
    traceFirestoreListenerDetach(input);
    unsubscribe();
  };
}
