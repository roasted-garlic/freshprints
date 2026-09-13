import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatOurShowsDayAriaLabel } from './ourShowsDayAriaLabel';

describe('formatOurShowsDayAriaLabel', () => {
  it('includes Today and no-shows copy for an empty today cell', () => {
    const label = formatOurShowsDayAriaLabel({
      dateKey: '2026-09-02',
      designCount: 0,
      hasShows: false,
      isToday: true,
    });
    assert.match(label, /Today/);
    assert.match(label, /no shows/);
    assert.match(label, /Sep/);
    assert.match(label, /2/);
  });

  it('omits Today for a non-today cell', () => {
    const label = formatOurShowsDayAriaLabel({
      dateKey: '2026-09-03',
      designCount: 0,
      hasShows: false,
      isToday: false,
    });
    assert.doesNotMatch(label, /Today/);
    assert.match(label, /no shows/);
  });

  it('includes Today and design count for a today cell with shows', () => {
    const label = formatOurShowsDayAriaLabel({
      dateKey: '2026-09-02',
      designCount: 1,
      hasShows: true,
      isToday: true,
    });
    assert.match(label, /Today/);
    assert.match(label, /1 design/);
    assert.match(label, /open show gallery/);
  });

  it('pluralizes designs without Today for a non-today show day', () => {
    const label = formatOurShowsDayAriaLabel({
      dateKey: '2026-09-04',
      designCount: 3,
      hasShows: true,
      isToday: false,
    });
    assert.doesNotMatch(label, /Today/);
    assert.match(label, /3 designs/);
  });
});
