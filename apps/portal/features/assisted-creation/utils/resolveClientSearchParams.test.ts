import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  resolveClientSearchParams,
  resolveHydrationSearchParams,
} from './resolveClientSearchParams';

describe('resolveHydrationSearchParams', () => {
  it('keeps Next params when present', () => {
    const next = new URLSearchParams('flow=assisted&step=styleMood');
    const win = new URLSearchParams();
    assert.equal(resolveHydrationSearchParams(next, win).get('step'), 'styleMood');
  });

  it('uses window params when Next is still empty (hard refresh)', () => {
    const next = new URLSearchParams();
    const win = new URLSearchParams('flow=assisted&step=styleMood');
    assert.equal(resolveHydrationSearchParams(next, win).get('step'), 'styleMood');
  });

  it('stays empty when both are empty (choose path)', () => {
    const resolved = resolveHydrationSearchParams(
      new URLSearchParams(),
      new URLSearchParams(),
    );
    assert.equal(resolved.toString(), '');
  });
});

describe('resolveClientSearchParams', () => {
  it('returns Next params when window is unavailable', () => {
    const next = new URLSearchParams('flow=assisted&step=styleMood');
    assert.equal(resolveClientSearchParams(next).get('step'), 'styleMood');
  });

  it('prefers window flow when Next omitted it', () => {
    const previousDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        location: { search: '?flow=assisted&step=styleMood', pathname: '/custom-designs' },
      },
    });

    try {
      const resolved = resolveClientSearchParams(new URLSearchParams());
      assert.equal(resolved.get('flow'), 'assisted');
      assert.equal(resolved.get('step'), 'styleMood');
    } finally {
      if (previousDescriptor) {
        Object.defineProperty(globalThis, 'window', previousDescriptor);
      } else {
        Reflect.deleteProperty(globalThis, 'window');
      }
    }
  });
});
