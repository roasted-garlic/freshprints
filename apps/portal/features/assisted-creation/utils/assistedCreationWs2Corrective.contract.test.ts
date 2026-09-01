import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

describe('assisted creation download service contract', () => {
  it('prefers signed download URL over base64 bytes for large Final Image downloads', () => {
    const source = readFileSync(
      resolve(import.meta.dirname, '../services/assistedCreationService.ts'),
      'utf8',
    );

    assert.match(source, /customerGetAssistedCreationApprovedProofDownloadUrl/);
    assert.match(source, /downloadFinalArtwork/);
    assert.match(source, /downloadAssistedArtwork/);
    assert.match(source, /triggerBrowserDownloadFromUrl/);
    assert.match(
      source,
      /customerGetAssistedCreationApprovedProofFile[\s\S]*contentBase64/,
    );
  });

  it('does not hardcode the legacy 8MB rejection copy in Portal', () => {
    const source = readFileSync(
      resolve(import.meta.dirname, '../services/assistedCreationService.ts'),
      'utf8',
    );

    assert.doesNotMatch(
      source,
      /This file is too large to download here/,
    );
  });
});

describe('assisted add-to-request progress contract', () => {
  it('uses final-artwork copy when Final Image is present', () => {
    const modalSource = readFileSync(
      resolve(import.meta.dirname, '../components/AssistedAddToRequestProgressModal.tsx'),
      'utf8',
    );
    const panelSource = readFileSync(
      resolve(import.meta.dirname, '../components/AssistedCreationDetailPanels.tsx'),
      'utf8',
    );

    assert.match(modalSource, /Preparing final artwork/);
    assert.match(panelSource, /artworkKind=\{hasFinalSource \? 'final' : 'proof'\}/);
  });

  it('does not fake stage transitions with a fixed timer for assisted add', () => {
    const source = readFileSync(
      resolve(import.meta.dirname, '../components/AssistedCreationDetailPanels.tsx'),
      'utf8',
    );

    const approvedSection = source.slice(
      source.indexOf('const runAddToRequest = (catalogUseAcknowledged: boolean) => {'),
      source.indexOf('return (\n    <section\n      aria-label="Approved design"'),
    );

    assert.doesNotMatch(approvedSection, /setTimeout\(\(\) => \{\s*setAddProgressPhase/);
    assert.match(approvedSection, /setAddProgressPhase\('adding'\)/);
  });
});
