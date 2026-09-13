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

  it('guards every existing-upload update against an empty patch', () => {
    const source = readFileSync(
      resolve(import.meta.dirname, './customerAddAssistedApprovedProofToPrintRequest.ts'),
      'utf8',
    );

    const patchComputations = source.match(/const uploadPatch = buildUploadPatch\(\);/g) ?? [];
    assert.equal(patchComputations.length, 3);
    assert.equal(
      (source.match(/if \(Object\.keys\(uploadPatch\)\.length > 0\) \{/g) ?? []).length,
      3,
    );
    assert.doesNotMatch(source, /tx\.update\(uploadSnap\.ref, buildUploadPatch\(\)\)/);
  });

  it('publishes real server stages and clears ephemeral progress', () => {
    const source = readFileSync(
      resolve(import.meta.dirname, './customerAddAssistedApprovedProofToPrintRequest.ts'),
      'utf8',
    );

    assert.match(source, /writeAssistedAddToRequestProgress/);
    assert.match(source, /onStage:\s*\(stage\) => publishProgress\(stage\)/);
    assert.match(source, /publishProgress\("saving"\)/);
    assert.match(source, /publishProgress\("attaching"\)/);
    assert.match(source, /clearAssistedAddToRequestProgress/);
    assert.match(source, /addToRequestProgress:\s*FieldValue\.delete\(\)/);
    assert.match(source, /lastProgressStage === stage/);
    assert.doesNotMatch(source, /addToRequestProgress[\s\S]{0,240}(storagePath|sourceBytes|stack)/i);
  });
});
