import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

describe("assisted creation artwork download contract", () => {
  it("routes Final Artwork downloads through explicit final_artwork target", () => {
    const portalSource = readFileSync(
      resolve(import.meta.dirname, '../services/assistedCreationService.ts'),
      'utf8',
    );
    const resolverSource = readFileSync(
      resolve(import.meta.dirname, '../../../../../functions/src/lib/assistedCreationApprovedProofDownload.ts'),
      'utf8',
    );

    assert.match(portalSource, /downloadFinalArtwork/);
    assert.match(portalSource, /downloadAssistedArtwork\([^,]+,\s*'final_artwork'\)/);
    assert.match(portalSource, /downloadAssistedArtwork\([^,]+,\s*'approved_proof'\)/);
    assert.match(resolverSource, /downloadTarget === "final_artwork"/);
  });

  it('composes proof history with a separate Final Artwork entry', () => {
    const panelSource = readFileSync(
      resolve(import.meta.dirname, '../components/AssistedCreationDetailPanels.tsx'),
      'utf8',
    );

    assert.match(panelSource, /buildAssistedCreationArtworkHistoryNewestFirst/);
    assert.match(panelSource, /Final Artwork/);
    assert.match(panelSource, /downloadFinalArtwork/);
  });
});
