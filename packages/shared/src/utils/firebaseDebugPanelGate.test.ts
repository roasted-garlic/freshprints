import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  isFirebaseDebugPanelAllowedProjectId,
  isFirebaseDebugPanelEnabled,
} from './firebaseDebugPanelGate';

describe('firebaseDebugPanelGate', () => {
  it('allows only the fresh-prints-dev project id', () => {
    assert.equal(isFirebaseDebugPanelAllowedProjectId('fresh-prints-dev'), true);
    assert.equal(isFirebaseDebugPanelAllowedProjectId('fresh-prints-prod'), false);
    assert.equal(isFirebaseDebugPanelAllowedProjectId(''), false);
  });

  it('requires both a development build and the allowed project id', () => {
    assert.equal(
      isFirebaseDebugPanelEnabled({ isDevelopmentBuild: true, projectId: 'fresh-prints-dev' }),
      true,
    );
    assert.equal(
      isFirebaseDebugPanelEnabled({ isDevelopmentBuild: false, projectId: 'fresh-prints-dev' }),
      false,
    );
    assert.equal(
      isFirebaseDebugPanelEnabled({ isDevelopmentBuild: true, projectId: 'fresh-prints-prod' }),
      false,
    );
    assert.equal(
      isFirebaseDebugPanelEnabled({ isDevelopmentBuild: false, projectId: 'fresh-prints-prod' }),
      false,
    );
  });
});
