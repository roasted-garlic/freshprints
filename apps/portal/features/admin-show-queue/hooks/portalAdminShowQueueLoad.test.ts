import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  armPortalAdminShowQueueMount,
  refreshPortalAdminShowQueue,
  type MutableRef,
} from './portalAdminShowQueueLoad';

interface QueueData {
  shows: string[];
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

function harness() {
  const inFlightRef: MutableRef<Promise<void> | null> = { current: null };
  const mountedRef: MutableRef<boolean> = { current: true };
  let data: QueueData | null = null;
  let error: string | null = null;
  let isLoading = false;
  let loadCalls = 0;
  let loadPromise = deferred<QueueData>();

  const refresh = () =>
    refreshPortalAdminShowQueue({
      isAdminSession: true,
      inFlightRef,
      mountedRef,
      load: () => {
        loadCalls += 1;
        return loadPromise.promise;
      },
      setData: (nextData) => {
        data = nextData;
      },
      setError: (nextError) => {
        error = nextError;
      },
      setIsLoading: (nextLoading) => {
        isLoading = nextLoading;
      },
    });

  return {
    inFlightRef,
    mountedRef,
    get data() {
      return data;
    },
    get error() {
      return error;
    },
    get isLoading() {
      return isLoading;
    },
    get loadCalls() {
      return loadCalls;
    },
    refresh,
    resolve(nextData: QueueData) {
      loadPromise.resolve(nextData);
    },
    reject(reason: unknown) {
      loadPromise.reject(reason);
    },
    nextRequest() {
      loadPromise = deferred<QueueData>();
    },
  };
}

describe('Portal admin Show Queue load lifecycle', () => {
  it('re-arms the mount guard after a development cleanup/setup cycle', () => {
    const mountedRef: MutableRef<boolean> = { current: false };
    const firstCleanup = armPortalAdminShowQueueMount(mountedRef);
    firstCleanup();
    assert.equal(mountedRef.current, false);

    armPortalAdminShowQueueMount(mountedRef);
    assert.equal(mountedRef.current, true);
  });

  it('clears initial loading and renders a successful queue response', async () => {
    const state = harness();
    const request = state.refresh();
    assert.equal(state.isLoading, true);
    state.resolve({ shows: ['today'] });
    await request;
    assert.deepEqual(state.data, { shows: ['today'] });
    assert.equal(state.error, null);
    assert.equal(state.isLoading, false);
  });

  it('clears initial loading and preserves the explicit no-show response', async () => {
    const state = harness();
    const request = state.refresh();
    state.resolve({ shows: [] });
    await request;
    assert.deepEqual(state.data, { shows: [] });
    assert.equal(state.isLoading, false);
  });

  it('clears loading and surfaces a retryable error when the callable rejects', async () => {
    const state = harness();
    const request = state.refresh();
    state.reject(new Error('callable unavailable'));
    await request;
    assert.equal(state.isLoading, false);
    assert.equal(state.error, 'callable unavailable');
  });

  it('clears refresh state after success and after failure', async () => {
    const state = harness();
    state.resolve({ shows: ['first'] });
    await state.refresh();
    state.nextRequest();
    const successRefresh = state.refresh();
    assert.equal(state.isLoading, true);
    state.resolve({ shows: ['second'] });
    await successRefresh;
    assert.equal(state.isLoading, false);

    state.nextRequest();
    const failedRefresh = state.refresh();
    state.reject(new Error('refresh failed'));
    await failedRefresh;
    assert.equal(state.isLoading, false);
    assert.equal(state.error, 'refresh failed');
  });

  it('coalesces duplicate refreshes without swallowing completion', async () => {
    const state = harness();
    const first = state.refresh();
    const duplicate = state.refresh();
    assert.equal(first, duplicate);
    assert.equal(state.loadCalls, 1);
    state.resolve({ shows: ['only once'] });
    await Promise.all([first, duplicate]);
    assert.equal(state.isLoading, false);
    assert.deepEqual(state.data, { shows: ['only once'] });
  });
});
