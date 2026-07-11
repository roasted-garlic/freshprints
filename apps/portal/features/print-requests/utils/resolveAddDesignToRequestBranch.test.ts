import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveAddDesignToRequestBranch } from './resolveAddDesignToRequestBranch';

describe('resolveAddDesignToRequestBranch', () => {
  it('creates when there are no continuable requests', () => {
    assert.deepEqual(resolveAddDesignToRequestBranch([]), { kind: 'create' });
  });

  it('uses the single continuable request', () => {
    assert.deepEqual(resolveAddDesignToRequestBranch(['req-1']), {
      kind: 'single',
      requestId: 'req-1',
    });
  });

  it('opens the picker when multiple continuable requests exist', () => {
    assert.deepEqual(resolveAddDesignToRequestBranch(['req-1', 'req-2']), { kind: 'pick' });
  });
});
