import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  ASSISTED_CREATION_MAX_REFERENCE_BYTES,
  ASSISTED_CREATION_MAX_REFERENCE_IMAGES,
  ASSISTED_CREATION_MAX_REFERENCE_TOTAL_BYTES,
} from '@fresh-prints/shared/constants/assistedCreation/assistedCreation.constants';

import {
  validateAssistedCreationReferenceFiles,
  type ReferenceFileLike,
} from './assistedCreationReferenceFilesValidation';

function file(size: number, type = 'image/jpeg'): ReferenceFileLike {
  return { size, type };
}

describe('validateAssistedCreationReferenceFiles', () => {
  it('accepts a file exactly at the 40 MB per-file limit', () => {
    const error = validateAssistedCreationReferenceFiles([
      file(ASSISTED_CREATION_MAX_REFERENCE_BYTES),
    ]);
    assert.equal(error, null);
  });

  it('accepts a file one byte under the 40 MB per-file limit', () => {
    const error = validateAssistedCreationReferenceFiles([
      file(ASSISTED_CREATION_MAX_REFERENCE_BYTES - 1),
    ]);
    assert.equal(error, null);
  });

  it('rejects a file one byte over the 40 MB per-file limit', () => {
    const error = validateAssistedCreationReferenceFiles([
      file(ASSISTED_CREATION_MAX_REFERENCE_BYTES + 1),
    ]);
    assert.match(error ?? '', /40 MB or smaller/);
  });

  it('rejects a disallowed content type', () => {
    const error = validateAssistedCreationReferenceFiles([file(1024, 'application/pdf')]);
    assert.match(error ?? '', /JPEG, PNG, or WebP/);
  });

  it('allows exactly 8 files when each passes other checks', () => {
    const files = Array.from({ length: ASSISTED_CREATION_MAX_REFERENCE_IMAGES }, () => file(1024));
    assert.equal(validateAssistedCreationReferenceFiles(files), null);
  });

  it('rejects a 9th file', () => {
    const files = Array.from(
      { length: ASSISTED_CREATION_MAX_REFERENCE_IMAGES + 1 },
      () => file(1024),
    );
    const error = validateAssistedCreationReferenceFiles(files);
    assert.match(error ?? '', /Upload up to 8 reference images/);
  });

  it('accepts exactly 8 files at the per-file max, totaling exactly the 320 MB ceiling', () => {
    const files = Array.from({ length: ASSISTED_CREATION_MAX_REFERENCE_IMAGES }, () =>
      file(ASSISTED_CREATION_MAX_REFERENCE_BYTES),
    );
    assert.equal(validateAssistedCreationReferenceFiles(files), null);
    const total = files.reduce((sum, f) => sum + f.size, 0);
    assert.equal(total, ASSISTED_CREATION_MAX_REFERENCE_TOTAL_BYTES);
  });

  it('accepts a total exactly at the 320 MB combined ceiling, including existing retained bytes', () => {
    const existingRetainedBytes = ASSISTED_CREATION_MAX_REFERENCE_TOTAL_BYTES - 1024;
    const error = validateAssistedCreationReferenceFiles([file(1024)], existingRetainedBytes);
    assert.equal(error, null);
  });

  it('rejects a total one byte over the 320 MB combined ceiling, including existing retained bytes', () => {
    const existingRetainedBytes = ASSISTED_CREATION_MAX_REFERENCE_TOTAL_BYTES - 1023;
    const error = validateAssistedCreationReferenceFiles([file(1024)], existingRetainedBytes);
    assert.match(error ?? '', /total 320 MB or less/);
  });

  it('rejects zero-byte files (existing per-file floor, unaffected by the size increase)', () => {
    const error = validateAssistedCreationReferenceFiles([file(0)]);
    assert.match(error ?? '', /40 MB or smaller/);
  });

  it('defaults existingRetainedBytes to 0 for the submit path (brand-new request)', () => {
    // Matches submit-path call sites that never pass a second argument.
    const files = Array.from({ length: ASSISTED_CREATION_MAX_REFERENCE_IMAGES }, () =>
      file(ASSISTED_CREATION_MAX_REFERENCE_BYTES),
    );
    assert.equal(validateAssistedCreationReferenceFiles(files), null);
  });
});
