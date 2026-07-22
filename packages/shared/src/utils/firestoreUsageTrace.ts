/**
 * Development-only Firestore usage tracer (count + key signatures only).
 *
 * Enable in a browser/Electron renderer:
 *   localStorage.setItem('FP_FIRESTORE_TRACE', '1')
 * then reload. Dump: `window.__fpFirestoreTrace.dump()` (when enabled).
 *
 * Never logs document bodies, auth tokens, or PII payloads.
 * Default: disabled (no-op).
 */

export type FirestoreTraceReadKind =
  | 'getDoc'
  | 'getDocs'
  | 'getCountFromServer'
  | 'onSnapshotEmit';

export interface FirestoreTraceSnapshot {
  enabled: boolean;
  listenerAttaches: Record<string, number>;
  listenerDetaches: Record<string, number>;
  peakConcurrentListeners: number;
  currentListeners: number;
  reads: Record<string, number>;
}

type TraceState = {
  listenerAttaches: Map<string, number>;
  listenerDetaches: Map<string, number>;
  activeListeners: Map<string, number>;
  peakConcurrentListeners: number;
  reads: Map<string, number>;
};

const STORAGE_FLAG = 'FP_FIRESTORE_TRACE';

let cachedEnabled: boolean | null = null;
let state: TraceState | null = null;

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
    // Ignore.
  }

  return false;
}

export function isFirestoreUsageTraceEnabled(): boolean {
  if (cachedEnabled === null) {
    cachedEnabled = readEnabledFlag();
  }
  return cachedEnabled;
}

/** Test helper — resets enablement cache and counters. */
export function resetFirestoreUsageTraceForTests(options?: { enabled?: boolean }): void {
  cachedEnabled = options?.enabled ?? null;
  state = null;
}

function ensureState(): TraceState | null {
  if (!isFirestoreUsageTraceEnabled()) {
    return null;
  }
  if (!state) {
    state = {
      listenerAttaches: new Map(),
      listenerDetaches: new Map(),
      activeListeners: new Map(),
      peakConcurrentListeners: 0,
      reads: new Map(),
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

export function traceFirestoreListenerAttach(key: string): void {
  const next = ensureState();
  if (!next) {
    return;
  }
  bump(next.listenerAttaches, key);
  bump(next.activeListeners, key);
  next.peakConcurrentListeners = Math.max(
    next.peakConcurrentListeners,
    currentListenerTotal(next.activeListeners),
  );
}

export function traceFirestoreListenerDetach(key: string): void {
  const next = ensureState();
  if (!next) {
    return;
  }
  bump(next.listenerDetaches, key);
  const active = next.activeListeners.get(key) ?? 0;
  if (active <= 1) {
    next.activeListeners.delete(key);
  } else {
    next.activeListeners.set(key, active - 1);
  }
}

export function traceFirestoreRead(kind: FirestoreTraceReadKind, key: string): void {
  const next = ensureState();
  if (!next) {
    return;
  }
  bump(next.reads, `${kind}:${key}`);
}

export function getFirestoreUsageTraceSnapshot(): FirestoreTraceSnapshot {
  const next = ensureState();
  if (!next) {
    return {
      enabled: false,
      listenerAttaches: {},
      listenerDetaches: {},
      peakConcurrentListeners: 0,
      currentListeners: 0,
      reads: {},
    };
  }

  return {
    enabled: true,
    listenerAttaches: mapToRecord(next.listenerAttaches),
    listenerDetaches: mapToRecord(next.listenerDetaches),
    peakConcurrentListeners: next.peakConcurrentListeners,
    currentListeners: currentListenerTotal(next.activeListeners),
    reads: mapToRecord(next.reads),
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
    __fpFirestoreTrace?: { dump: () => FirestoreTraceSnapshot; snapshot: () => FirestoreTraceSnapshot };
  };
  target.__fpFirestoreTrace = {
    dump: dumpFirestoreUsageTrace,
    snapshot: getFirestoreUsageTraceSnapshot,
  };
}

/**
 * Wrap an onSnapshot unsubscribe so detach is counted once.
 */
export function traceWrappedUnsubscribe(
  key: string,
  unsubscribe: () => void,
): () => void {
  let done = false;
  return () => {
    if (done) {
      return;
    }
    done = true;
    traceFirestoreListenerDetach(key);
    unsubscribe();
  };
}
