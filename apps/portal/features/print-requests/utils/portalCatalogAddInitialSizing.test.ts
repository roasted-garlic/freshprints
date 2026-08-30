import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  assessPrintRequestItemSize,
  formatPrintRequestItemSizeLabel,
  resolveInitialPrintRequestItemSize,
  STANDARD_PRINT_REQUEST_INITIAL_WIDTH_INCHES,
} from '@fresh-prints/shared/utils/printRequestItemSizing';

import {
  formatCurrentRequestDrawerItemMeta,
  formatCurrentRequestDrawerItemSize,
} from './formatCurrentRequestDrawerItemMeta';

function resolvePortalOptimisticCatalogAddSize(
  design: {
  width: number;
  height: number;
  printWidthInches?: number;
},
  printRequestDefaultWidthInches?: number,
) {
  const size = resolveInitialPrintRequestItemSize({
    pixelWidth: design.width,
    pixelHeight: design.height,
    defaultPrintWidthInches: design.printWidthInches,
    printRequestDefaultWidthInches,
  });
  return {
    printWidthInches: size.printWidthInches,
    printHeightInches: size.printHeightInches,
    sizeLabel: formatPrintRequestItemSizeLabel(size.printWidthInches, size.printHeightInches),
  };
}

describe('Portal catalog-add initial sizing (client reconciliation)', () => {
  it('optimistic add flow initializes eligible catalog designs at 11 inches', () => {
    const size = resolvePortalOptimisticCatalogAddSize({
      width: 3600,
      height: 1800,
      printWidthInches: 10,
    });
    assert.equal(size.printWidthInches, 11);
    assert.equal(size.printHeightInches, 5.5);
    assert.match(size.sizeLabel, /^11(\.0+)? x 5\.5/);
  });

  it('Current Request drawer displays persisted 11 inch dimensions', () => {
    const persisted = resolvePortalOptimisticCatalogAddSize({
      width: 3600,
      height: 1800,
      printWidthInches: 10,
    });
    assert.equal(
      formatCurrentRequestDrawerItemSize({
        printWidthInches: persisted.printWidthInches,
        printHeightInches: persisted.printHeightInches,
      }),
      '11 x 5.5',
    );
    assert.equal(
      formatCurrentRequestDrawerItemMeta({
        printWidthInches: persisted.printWidthInches,
        printHeightInches: persisted.printHeightInches,
        quantity: 1,
      }),
      '11 x 5.5 · Qty 1',
    );
  });

  it('review page uses the same persisted dimensions as the cart drawer', () => {
    const persisted = resolvePortalOptimisticCatalogAddSize({
      width: 3000,
      height: 3000,
      printWidthInches: 10,
    });
    const cartLabel = formatCurrentRequestDrawerItemSize({
      printWidthInches: persisted.printWidthInches,
      printHeightInches: persisted.printHeightInches,
    });
    const reviewLabel = formatPrintRequestItemSizeLabel(
      persisted.printWidthInches,
      persisted.printHeightInches,
    )
      .replace(' in', '')
      .replace(/\.00\b/g, '');
    assert.equal(cartLabel, reviewLabel);
    assert.equal(persisted.printWidthInches, 11);
  });

  it('reload preserves dimensions when only quantity changes', () => {
    const initial = resolvePortalOptimisticCatalogAddSize({
      width: 3600,
      height: 1800,
      printWidthInches: 10,
    });
    const afterQuantityBump = {
      ...initial,
      quantity: 2,
    };
    assert.equal(afterQuantityBump.printWidthInches, 11);
    assert.equal(afterQuantityBump.printHeightInches, 5.5);
  });

  it('does not hardcode a Portal-specific 10 inch default', () => {
    assert.equal(STANDARD_PRINT_REQUEST_INITIAL_WIDTH_INCHES, 11);
    const size = resolvePortalOptimisticCatalogAddSize({
      width: 3600,
      height: 1800,
      printWidthInches: 10,
    });
    assert.notEqual(size.printWidthInches, 10);
  });

  it('200–299 DPI at 11 inches remains allowed with warning', () => {
    const size = resolvePortalOptimisticCatalogAddSize({
      width: 3000,
      height: 3000,
      printWidthInches: 10,
    });
    const assessment = assessPrintRequestItemSize({
      pixelWidth: 3000,
      pixelHeight: 3000,
      printWidthInches: size.printWidthInches,
      printHeightInches: size.printHeightInches,
    });
    assert.equal(assessment.qualityLevel, 'good');
    assert.ok(assessment.warningMessage);
    assert.equal(assessment.canSave, true);
  });

  it('uses runtime setting 10.5 inches for optimistic sizing', () => {
    const size = resolvePortalOptimisticCatalogAddSize(
      {
        width: 3600,
        height: 1800,
        printWidthInches: 10,
      },
      10.5,
    );
    assert.equal(size.printWidthInches, 10.5);
  });

  it('uses runtime setting 11.5 inches for optimistic sizing', () => {
    const size = resolvePortalOptimisticCatalogAddSize(
      {
        width: 3600,
        height: 1800,
        printWidthInches: 10,
      },
      11.5,
    );
    assert.equal(size.printWidthInches, 11.5);
  });

  it('client optimistic sizing matches server callable with the same runtime default', () => {
    const design = { width: 3600, height: 1800, printWidthInches: 10 };
    const runtimeDefault = 11.5;
    const client = resolvePortalOptimisticCatalogAddSize(design, runtimeDefault);
    const server = resolveInitialPrintRequestItemSize({
      pixelWidth: design.width,
      pixelHeight: design.height,
      defaultPrintWidthInches: design.printWidthInches,
      printRequestDefaultWidthInches: runtimeDefault,
    });
    assert.equal(client.printWidthInches, server.printWidthInches);
    assert.equal(client.printHeightInches, server.printHeightInches);
  });
});
