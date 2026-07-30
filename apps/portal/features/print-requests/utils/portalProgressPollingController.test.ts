import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PortalProgressPollingController } from './portalProgressPollingController';
import { PortalProgressRequestGate } from './portalProgressRequestGate';

class FakeScheduler {
  callbacks = new Map<number, () => void>();
  delays: number[] = [];
  nextId = 1;
  setTimeout(callback: () => void, delayMs: number): number {
    const id = this.nextId++;
    this.callbacks.set(id, callback);
    this.delays.push(delayMs);
    return id;
  }
  clearTimeout(handle: unknown): void {
    this.callbacks.delete(handle as number);
  }
  tick(): void {
    const callbacks = [...this.callbacks.values()];
    this.callbacks.clear();
    callbacks.forEach((callback) => callback());
  }
}

describe('PortalProgressPollingController', () => {
  it('polls from waiting through printing until the terminal lifecycle stops it', async () => {
    const scheduler = new FakeScheduler();
    const states = ['waiting', 'printing', 'completed'];
    let loads = 0;
    const controller = new PortalProgressPollingController(async () => {
      const state = states[loads++];
      if (state === 'completed') controller.stop();
    }, () => loads === 0 ? 5_000 : 10_000, scheduler);

    controller.start();
    assert.deepEqual(scheduler.delays, [5_000]);
    scheduler.tick();
    await Promise.resolve();
    assert.deepEqual(scheduler.delays, [5_000, 10_000]);
    scheduler.tick();
    await Promise.resolve();
    assert.deepEqual(scheduler.delays, [5_000, 10_000, 10_000]);
    scheduler.tick();
    await Promise.resolve();
    assert.equal(loads, 3);
    assert.equal(scheduler.callbacks.size, 0);
  });

  it('stops while hidden and resumes with one timer', () => {
    const scheduler = new FakeScheduler();
    const controller = new PortalProgressPollingController(async () => undefined, () => 5_000, scheduler);
    controller.start();
    controller.stop();
    assert.equal(scheduler.callbacks.size, 0);
    controller.start();
    controller.start();
    assert.equal(scheduler.callbacks.size, 1);
  });

  it('coalesces focus refresh through the request-scoped load gate supplied by the hook', async () => {
    const scheduler = new FakeScheduler();
    let calls = 0;
    let inFlight: Promise<void> | undefined;
    const gatedLoad = () => {
      if (!inFlight) inFlight = Promise.resolve().then(() => { calls += 1; });
      return inFlight;
    };
    const controller = new PortalProgressPollingController(gatedLoad, () => 5_000, scheduler);
    await Promise.all([controller.refreshNow(), controller.refreshNow()]);
    assert.equal(calls, 1);
  });

  it('composes request switch, hidden/unmount stop, and stale-result rejection at the hook boundary', async () => {
    const scheduler = new FakeScheduler();
    const gate = new PortalProgressRequestGate();
    const applied: string[] = [];
    let resolveOld!: (value: string) => void;
    const oldRequest = new Promise<string>((resolve) => { resolveOld = resolve; });
    let currentRequestId = 'request-a';
    const load = () => gate.run(
      () => currentRequestId === 'request-a' ? oldRequest : Promise.resolve('request-b'),
      (value) => applied.push(value),
      () => undefined,
      () => undefined,
      () => undefined,
    );
    const controller = new PortalProgressPollingController(load, () => 5_000, scheduler);

    controller.start();
    const focusLoad = controller.refreshNow();
    currentRequestId = 'request-b';
    gate.invalidate();
    controller.stop();
    resolveOld('request-a');
    await focusLoad;
    assert.deepEqual(applied, []);
    assert.equal(scheduler.callbacks.size, 0);

    controller.start();
    scheduler.tick();
    await Promise.resolve();
    await Promise.resolve();
    assert.deepEqual(applied, ['request-b']);
    controller.stop();
    assert.equal(scheduler.callbacks.size, 0);
  });
});
