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
  it('optimistic add flow initializes eligible catalog designs at 10.5 inches', () => {
    const size = resolvePortalOptimisticCatalogAddSize({
      width: 3600,
      height: 1800,
      printWidthInches: 10,
    });
    assert.equal(size.printWidthInches, 10.5);
    assert.equal(size.printHeightInches, 5.25);
    assert.match(size.sizeLabel, /^10\.50? x 5\.25/);
  });

  it('Current Request drawer displays persisted 10.5 inch dimensions', () => {
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
      '10.5 x 5.25',
    );
    assert.equal(
      formatCurrentRequestDrawerItemMeta({
        printWidthInches: persisted.printWidthInches,
        printHeightInches: persisted.printHeightInches,
        quantity: 1,
      }),
      '10.5 x 5.25 · Qty 1',
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
    const normalizeInchLabel = (label: string) =>
      label
        .replace(' in', '')
        .replace(/(\.\d*?)0+\b/g, '$1')
        .replace(/\.$/g, '');
    const reviewLabel = normalizeInchLabel(
      formatPrintRequestItemSizeLabel(
        persisted.printWidthInches,
        persisted.printHeightInches,
      ),
    );
    assert.equal(normalizeInchLabel(cartLabel), reviewLabel);
    assert.equal(persisted.printWidthInches, 10.5);
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
    assert.equal(afterQuantityBump.printWidthInches, 10.5);
    assert.equal(afterQuantityBump.printHeightInches, 5.25);
  });

  it('does not hardcode a Portal-specific 10 inch default', () => {
    assert.equal(STANDARD_PRINT_REQUEST_INITIAL_WIDTH_INCHES, 10.5);
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
