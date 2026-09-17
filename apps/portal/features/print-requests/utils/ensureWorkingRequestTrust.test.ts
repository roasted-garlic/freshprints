import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  isPortalPrintRequestNotContinuableError,
  shouldTrustEnsuredWorkingRequestId,
} from './ensureWorkingRequestTrust';

describe('shouldTrustEnsuredWorkingRequestId', () => {
  it('rejects empty ensured ids', () => {
    assert.equal(
      shouldTrustEnsuredWorkingRequestId({
        ensuredId: null,
        workingRequestId: null,
        pendingWorkingRequestId: null,
        activeEditableRequestIds: [],
        hasInFlightCreate: false,
      }),
      false,
    );
  });

  it('trusts the live working request id', () => {
    assert.equal(
      shouldTrustEnsuredWorkingRequestId({
        ensuredId: 'req-1',
        workingRequestId: 'req-1',
        pendingWorkingRequestId: null,
        activeEditableRequestIds: ['req-1'],
        hasInFlightCreate: false,
      }),
      true,
    );
  });

  it('rejects a queued/non-active ensured id after Add-to-Show', () => {
    assert.equal(
      shouldTrustEnsuredWorkingRequestId({
        ensuredId: 'queued-req',
        workingRequestId: null,
        pendingWorkingRequestId: null,
        activeEditableRequestIds: [],
        hasInFlightCreate: false,
      }),
      false,
    );
  });

  it('trusts pending create lag before the list reloads', () => {
    assert.equal(
      shouldTrustEnsuredWorkingRequestId({
        ensuredId: 'new-req',
        workingRequestId: null,
        pendingWorkingRequestId: 'new-req',
        activeEditableRequestIds: [],
        hasInFlightCreate: false,
      }),
      true,
    );
  });

  it('trusts an in-flight create before pending state commits', () => {
    assert.equal(
      shouldTrustEnsuredWorkingRequestId({
        ensuredId: 'new-req',
        workingRequestId: null,
        pendingWorkingRequestId: null,
        activeEditableRequestIds: [],
        hasInFlightCreate: true,
      }),
      true,
    );
  });

  it('rejects when the live Working request already moved on', () => {
    assert.equal(
      shouldTrustEnsuredWorkingRequestId({
        ensuredId: 'old-req',
        workingRequestId: 'new-req',
        pendingWorkingRequestId: null,
        activeEditableRequestIds: ['new-req'],
        hasInFlightCreate: false,
      }),
      false,
    );
  });

  it('trusts an id still present in the active-editable set', () => {
    assert.equal(
      shouldTrustEnsuredWorkingRequestId({
        ensuredId: 'req-2',
        workingRequestId: null,
        pendingWorkingRequestId: null,
        activeEditableRequestIds: ['req-2'],
        hasInFlightCreate: false,
      }),
      true,
    );
  });
});

describe('isPortalPrintRequestNotContinuableError', () => {
  it('matches the server failed-precondition copy', () => {
    assert.equal(
      isPortalPrintRequestNotContinuableError(
        new Error('Request abc is not in a continuable state (active).'),
      ),
      true,
    );
    assert.equal(isPortalPrintRequestNotContinuableError(new Error('unrelated')), false);
  });
});
