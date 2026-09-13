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
      source.indexOf('const runAddToRequest = () => {'),
      source.indexOf('return (\n    <section\n      aria-label="Approved design"'),
    );

    assert.doesNotMatch(approvedSection, /setTimeout\(\(\) => \{\s*setAddProgressPhase/);
    assert.match(approvedSection, /setAddProgressPhase\('adding'\)/);
  });

  it('renders trusted server stage, elapsed time, and remaining logical steps without fake ETA', () => {
    const modalSource = readFileSync(
      resolve(import.meta.dirname, '../components/AssistedAddToRequestProgressModal.tsx'),
      'utf8',
    );
    const serviceSource = readFileSync(
      resolve(import.meta.dirname, '../services/assistedCreationService.ts'),
      'utf8',
    );
    const panelSource = readFileSync(
      resolve(import.meta.dirname, '../components/AssistedCreationDetailPanels.tsx'),
      'utf8',
    );

    assert.match(serviceSource, /parseAssistedAddToRequestProgress/);
    assert.match(serviceSource, /addToRequestProgress:\s*parseAssistedAddToRequestProgress/);
    assert.match(serviceSource, /ASSISTED_ADD_PROGRESS_STALE_AFTER_MS/);
    assert.match(serviceSource, /Date\.now\(\) - startedAtMillis > ASSISTED_ADD_PROGRESS_STALE_AFTER_MS/);
    assert.match(panelSource, /serverProgress=\{request\.addToRequestProgress\}/);
    assert.match(modalSource, /customerLabelForStage/);
    assert.match(modalSource, /Step \{currentStep\} of \{PROGRESS_STEPS\.length\}/);
    assert.match(modalSource, /Elapsed: \{formatElapsed\(elapsedMillis\)\}/);
    assert.match(modalSource, /remainingSteps/);
    assert.match(modalSource, /remaining/);
    assert.doesNotMatch(modalSource, /percent|countdown|estimated ETA/i);
  });

  it('adds Fresh Prints-created artwork directly without a catalog-permission modal or consent payload', () => {
    const serviceSource = readFileSync(
      resolve(import.meta.dirname, '../services/assistedCreationService.ts'),
      'utf8',
    );
    const panelSource = readFileSync(
      resolve(import.meta.dirname, '../components/AssistedCreationDetailPanels.tsx'),
      'utf8',
    );

    assert.match(panelSource, /const runAddToRequest = \(\) => \{/);
    assert.match(panelSource, /runAddToRequest\(\);/);
    assert.doesNotMatch(panelSource, /AssistedLibraryListingConsentModal/);
    assert.match(serviceSource, /addApprovedProofToPrintRequest\(\s*requestId: string/);
    assert.doesNotMatch(
      serviceSource.slice(serviceSource.indexOf('async addApprovedProofToPrintRequest')),
      /catalogUseAcknowledged\s*:/,
    );
  });
});
