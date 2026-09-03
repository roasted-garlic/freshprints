/**
 * TD-033 / interactive-upscale-dpi-rehydration: parent summary hydration + cache invalidate
 * wiring (no-DOM source inspection; shared merge helper covered in interactiveArtworkEnhance.test).
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  mergeInteractiveEnhanceResultIntoAssetSummary,
  resolveActiveArtworkPixelDimensions,
} from '@fresh-prints/shared/utils/interactiveArtworkEnhance';
import { assessPrintRequestItemSize } from '@fresh-prints/shared/utils/printRequestItemSizing';

const here = dirname(fileURLToPath(import.meta.url));
const hookSource = readFileSync(join(here, 'usePrintRequestDetail.ts'), 'utf8');
const cardSource = readFileSync(
  join(here, '..', 'components', 'PortalPrintRequestItemCard.tsx'),
  'utf8',
);

describe('Portal Interactive Upscale DPI rehydration (TD-033)', () => {
  it('patchArtworkEnhanceMode merges callable pixels into design/upload summaries', () => {
    assert.match(hookSource, /mergeInteractiveEnhanceResultIntoAssetSummary/);
    assert.match(hookSource, /setDesignSummaries/);
    assert.match(hookSource, /setUploadSummaries/);
    assert.match(hookSource, /invalidateReadyDesignById/);
  });

  it('card prefers parent enhanced dims and does not fall DPI back to baseline while enhanced', () => {
    assert.match(cardSource, /const dpiAspectPixels = activeAspectPixels/);
    assert.match(cardSource, /pixelWidth: dpiAspectPixels\.width/);
    assert.match(cardSource, /if \(!active\) \{\s*return null;/);
  });

  it('H1: non-upscaled catalog uses baseline dimensions', () => {
    const active = resolveActiveArtworkPixelDimensions({
      artworkEnhanceMode: 'baseline',
      baselineWidthPx: 2000,
      baselineHeightPx: 2000,
      enhancedWidthPx: 5100,
      enhancedHeightPx: 5100,
    });
    assert.deepEqual(active, { widthPx: 2000, heightPx: 2000 });
  });

  it('H2/H3: immediately after upscale / rehydrated catalog uses enhanced dimensions', () => {
    const patched = mergeInteractiveEnhanceResultIntoAssetSummary(
      { id: 'd1', width: 2000, height: 2000 },
      { artworkEnhanceMode: 'enhanced', widthPx: 5100, heightPx: 5100 },
    );
    const active = resolveActiveArtworkPixelDimensions({
      artworkEnhanceMode: 'enhanced',
      baselineWidthPx: 2000,
      baselineHeightPx: 2000,
      enhancedWidthPx: patched?.interactiveEnhancedWidthPx,
      enhancedHeightPx: patched?.interactiveEnhancedHeightPx,
    });
    assert.deepEqual(active, { widthPx: 5100, heightPx: 5100 });
    const dpi = assessPrintRequestItemSize({
      pixelWidth: active!.widthPx,
      pixelHeight: active!.heightPx,
      printWidthInches: 17,
      printHeightInches: 17,
    });
    assert.ok(dpi.effectiveDpi >= 300);
  });

  it('H4: parent summary patch alone is enough (no card-local pixels required)', () => {
    const active = resolveActiveArtworkPixelDimensions({
      artworkEnhanceMode: 'enhanced',
      baselineWidthPx: 2130,
      baselineHeightPx: 2130,
      enhancedWidthPx: 5100,
      enhancedHeightPx: 5100,
    });
    assert.deepEqual(active, { widthPx: 5100, heightPx: 5100 });
  });

  it('H5/H6: multi-item independence after separate patches', () => {
    const a = mergeInteractiveEnhanceResultIntoAssetSummary(
      { id: 'a' },
      { artworkEnhanceMode: 'enhanced', widthPx: 4000, heightPx: 4000 },
    );
    const b = mergeInteractiveEnhanceResultIntoAssetSummary(
      { id: 'b' },
      { artworkEnhanceMode: 'enhanced', widthPx: 6000, heightPx: 5500 },
    );
    assert.equal(a?.interactiveEnhancedWidthPx, 4000);
    assert.equal(b?.interactiveEnhancedWidthPx, 6000);
  });

  it('H7: customer-upload enhanced rehydrates from enhanced dimensions', () => {
    const upload = mergeInteractiveEnhanceResultIntoAssetSummary(
      { id: 'u1', widthPx: 1800, heightPx: 1800 },
      { artworkEnhanceMode: 'enhanced', widthPx: 5400, heightPx: 5400 },
    );
    const active = resolveActiveArtworkPixelDimensions({
      artworkEnhanceMode: 'enhanced',
      baselineWidthPx: 1800,
      baselineHeightPx: 1800,
      enhancedWidthPx: upload?.interactiveEnhancedWidthPx,
      enhancedHeightPx: upload?.interactiveEnhancedHeightPx,
    });
    assert.deepEqual(active, { widthPx: 5400, heightPx: 5400 });
  });

  it('H10: enhanced mode without dims returns null (no baseline DPI mislabel)', () => {
    assert.equal(
      resolveActiveArtworkPixelDimensions({
        artworkEnhanceMode: 'enhanced',
        baselineWidthPx: 2000,
        baselineHeightPx: 2000,
        enhancedWidthPx: null,
        enhancedHeightPx: null,
      }),
      null,
    );
  });

  it('E8/E9: 200 save floor and 300 optimal remain unchanged', () => {
    const belowFloor = assessPrintRequestItemSize({
      pixelWidth: 1900,
      pixelHeight: 1900,
      printWidthInches: 10,
      printHeightInches: 10,
    });
    assert.equal(belowFloor.canSave, false);

    const warning = assessPrintRequestItemSize({
      pixelWidth: 2500,
      pixelHeight: 2500,
      printWidthInches: 10,
      printHeightInches: 10,
    });
    assert.equal(warning.canSave, true);
    assert.ok(warning.warningMessage);

    const optimal = assessPrintRequestItemSize({
      pixelWidth: 3000,
      pixelHeight: 3000,
      printWidthInches: 10,
      printHeightInches: 10,
    });
    assert.equal(optimal.canSave, true);
    assert.equal(optimal.warningMessage, undefined);
  });
});
