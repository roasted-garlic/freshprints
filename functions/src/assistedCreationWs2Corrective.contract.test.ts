import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

describe('customerGetAssistedCreationApprovedProofFile large-download guard', () => {
  it('documents the exact 8MB client rejection that WS2 download must bypass', () => {
    const source = readFileSync(
      resolve(import.meta.dirname, './customerGetAssistedCreationApprovedProofFile.ts'),
      'utf8',
    );

    assert.match(source, /MAX_DOWNLOAD_BYTES = 8 \* 1024 \* 1024/);
    assert.match(
      source,
      /This file is too large to download here\. Please contact Fresh Prints for a copy\./,
    );
  });
});

describe('customerAddAssistedApprovedProofToPrintRequest WS2 corrective contract', () => {
  it('reuses ready uploads for the same artwork lineage before reprocessing', () => {
    const source = readFileSync(
      resolve(import.meta.dirname, './customerAddAssistedApprovedProofToPrintRequest.ts'),
      'utf8',
    );

    assert.match(source, /findReusableAssistedArtworkUpload/);
    assert.match(source, /assistedUploadMatchesArtworkSource/);
    assert.match(source, /selectReusableAssistedArtworkUpload/);
    assert.match(source, /reusedExistingUpload: false/);
    assert.doesNotMatch(source, /proofFile\.copy\(sourceFile\)/);
  });
});
