import {
  nestBoxesIntoShelvesWithHeightCap,
  type NestedSheet,
  type NestableBox,
  type NestingSpacingPx,
} from "@fresh-prints/shared/utils/gangSheetNesting";
import {
  buildGangSheetLabelSvg,
  computeGangSheetLabelBandHeightPx,
} from "@fresh-prints/shared/utils/gangSheetLabelRendering";
import {
  buildGroupedGangSheetSectionHeading,
  buildGroupedGangSheetSectionContinuedHeading,
  resolveGangSheetProductionGroupKey,
} from "@fresh-prints/shared/utils/groupPrintRequestsByShow";
import { buildGangSheetFilename, buildGangSheetSheetLabel } from "@fresh-prints/shared/utils/showExportFilename";
import type { GenerateGangSheetPngRequest } from "@fresh-prints/shared/types/export/gangSheetExportIpc.types";
import type { ShowExportImageWarning } from "@fresh-prints/shared/types/export/showExportIpc.types";

import { loadSharpModule } from "../import/loadSharpModule";

const EXPORT_DPI = 300;

export interface GroupedResizedImage {
  id: string;
  allocationId: string;
  fileName: string;
  pngBytes: Buffer;
  widthPx: number;
  heightPx: number;
}

interface ProductionGroup {
  groupKey: string;
  heading: string;
  images: GroupedResizedImage[];
}

function buildProductionGroups(
  images: GenerateGangSheetPngRequest["images"],
  resizedByAllocationId: Map<string, GroupedResizedImage[]>,
): ProductionGroup[] {
  const groups = new Map<string, { requestNames: Set<string>; images: GroupedResizedImage[] }>();

  for (const image of images) {
    if (!image.grouping) {
      continue;
    }

    const groupKey = resolveGangSheetProductionGroupKey(image.grouping);
    const existing = groups.get(groupKey) ?? { requestNames: new Set<string>(), images: [] };
    existing.requestNames.add(image.grouping.requestName);
    const resized = resizedByAllocationId.get(image.allocationId) ?? [];
    existing.images.push(...resized);
    groups.set(groupKey, existing);
  }

  return [...groups.entries()]
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([groupKey, value]) => ({
      groupKey,
      heading: buildGroupedGangSheetSectionHeading([...value.requestNames]),
      images: value.images,
    }));
}

interface PendingGroupedSection {
  group: ProductionGroup;
  sectionHeading: string;
  sheet: NestedSheet;
}

function packSectionsIntoContinuousPhysicalSheets(
  sections: PendingGroupedSection[],
  maxSheetHeightPx: number,
  showLabelBandHeightPx: number,
  sectionLabelBandHeightPx: number,
): PendingGroupedSection[][] {
  const physicalSheets: PendingGroupedSection[][] = [];
  let currentSections: PendingGroupedSection[] = [];
  let currentSheetUsedHeightPx = showLabelBandHeightPx;

  const commitCurrentSheet = () => {
    if (currentSections.length === 0) {
      return;
    }

    physicalSheets.push(currentSections);
    currentSections = [];
    currentSheetUsedHeightPx = showLabelBandHeightPx;
  };

  for (const section of sections) {
    const sectionHeightPx = sectionLabelBandHeightPx + section.sheet.sheetHeightPx;

    if (
      currentSections.length > 0 &&
      currentSheetUsedHeightPx + sectionHeightPx > maxSheetHeightPx
    ) {
      commitCurrentSheet();
    }

    currentSections.push(section);
    currentSheetUsedHeightPx += sectionHeightPx;
  }

  commitCurrentSheet();

  return physicalSheets;
}

export async function composeContinuousCustomerGroupedGangSheetSheets(input: {
  request: GenerateGangSheetPngRequest;
  resizedByAllocationId: Map<string, GroupedResizedImage[]>;
  sheetWidthPx: number;
  spacingPx: NestingSpacingPx;
  maxSheetHeightPx: number;
  warnings: ShowExportImageWarning[];
  onProgress?: (sheetIndex: number, sheetTotal: number) => void;
}): Promise<Array<{ fileName: string; lengthInches: number; heightPx: number; buffer: Buffer }>> {
  const productionGroups = buildProductionGroups(input.request.images, input.resizedByAllocationId);
  if (productionGroups.length === 0) {
    throw new Error(
      "Continuous grouped gang sheet layout found no production groups. Every image must include grouping metadata.",
    );
  }

  const showLabelBandHeightPx = computeGangSheetLabelBandHeightPx(input.request.labelFontSizePx);
  const sectionLabelBandHeightPx = computeGangSheetLabelBandHeightPx(input.request.labelFontSizePx);

  const pendingSections: PendingGroupedSection[] = [];

  for (const group of productionGroups) {
    const nestableBoxes: NestableBox[] = group.images.map((image) => ({
      id: image.id,
      widthPx: image.widthPx,
      heightPx: image.heightPx,
    }));

    const nestResult = nestBoxesIntoShelvesWithHeightCap(
      nestableBoxes,
      input.sheetWidthPx,
      input.spacingPx,
      input.maxSheetHeightPx,
    );

    for (const [groupSheetOffset, sheet] of nestResult.sheets.entries()) {
      const sectionHeading =
        nestResult.sheets.length > 1 && groupSheetOffset > 0
          ? buildGroupedGangSheetSectionContinuedHeading(group.heading)
          : group.heading;

      pendingSections.push({ group, sectionHeading, sheet });
    }
  }

  const physicalSheets = packSectionsIntoContinuousPhysicalSheets(
    pendingSections,
    input.maxSheetHeightPx,
    showLabelBandHeightPx,
    sectionLabelBandHeightPx,
  );

  const sharpApi = await loadSharpModule();
  const rotatedPngCache = new Map<string, Buffer>();

  const getPlacementPngBytes = async (image: GroupedResizedImage, rotated: boolean): Promise<Buffer> => {
    if (!rotated) {
      return image.pngBytes;
    }

    const cached = rotatedPngCache.get(image.id);
    if (cached) {
      return cached;
    }

    const rotatedBytes = await sharpApi(image.pngBytes, { limitInputPixels: false }).rotate(90).png().toBuffer();
    rotatedPngCache.set(image.id, rotatedBytes);
    return rotatedBytes;
  };

  const sheetTotal = physicalSheets.length;
  const composedSheets: Array<{ fileName: string; lengthInches: number; heightPx: number; buffer: Buffer }> = [];

  for (const [sheetIndex, sections] of physicalSheets.entries()) {
    const sheetNumber = sheetIndex + 1;
    let artworkTopOffset = showLabelBandHeightPx;
    const compositeLayers: Array<{ input: Buffer; left: number; top: number }> = [];

    const showLabel = buildGangSheetSheetLabel(input.request.baseFileName, sheetNumber, sheetTotal);
    const showLabelSvg = buildGangSheetLabelSvg({
      label: showLabel,
      sheetWidthPx: input.sheetWidthPx,
      bandHeightPx: showLabelBandHeightPx,
      labelFontSizePx: input.request.labelFontSizePx,
    });
    compositeLayers.push({ input: Buffer.from(showLabelSvg), left: 0, top: 0 });

    for (const pending of sections) {
      const { group, sectionHeading, sheet } = pending;
      const sectionLabelSvg = buildGangSheetLabelSvg({
        label: sectionHeading,
        sheetWidthPx: input.sheetWidthPx,
        bandHeightPx: sectionLabelBandHeightPx,
        labelFontSizePx: input.request.labelFontSizePx,
      });
      compositeLayers.push({ input: Buffer.from(sectionLabelSvg), left: 0, top: artworkTopOffset });

      const sectionArtworkTop = artworkTopOffset + sectionLabelBandHeightPx;

      const artworkLayers = await Promise.all(
        sheet.placements.map(async (placement) => {
          const image = group.images.find((entry) => entry.id === placement.id);
          if (!image) {
            return null;
          }

          return {
            input: await getPlacementPngBytes(image, placement.rotated),
            left: placement.x,
            top: placement.y + sectionArtworkTop,
          };
        }),
      );

      compositeLayers.push(...artworkLayers.filter((entry): entry is NonNullable<typeof entry> => entry !== null));
      artworkTopOffset = sectionArtworkTop + sheet.sheetHeightPx;
    }

    const sheetHeightPx = artworkTopOffset;
    const lengthInches = sheetHeightPx / EXPORT_DPI;

    const composited = await sharpApi({
      create: {
        width: input.sheetWidthPx,
        height: sheetHeightPx,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
      limitInputPixels: false,
    })
      .composite(compositeLayers)
      .withMetadata({ density: EXPORT_DPI })
      .png()
      .toBuffer();

    composedSheets.push({
      fileName: buildGangSheetFilename(input.request.baseFileName, sheetNumber, sheetTotal, lengthInches),
      lengthInches,
      heightPx: sheetHeightPx,
      buffer: composited,
    });

    input.onProgress?.(sheetNumber, sheetTotal);
  }

  return composedSheets;
}

/** Exposed for preview/export parity tests — mirrors compositor packing without image IO. */
export function countContinuousCustomerGroupedPhysicalSheets(input: {
  sections: Array<{ artworkHeightPx: number }>;
  maxSheetHeightPx: number;
  labelFontSizePx: number;
}): number {
  const showLabelBandHeightPx = computeGangSheetLabelBandHeightPx(input.labelFontSizePx);
  const sectionLabelBandHeightPx = computeGangSheetLabelBandHeightPx(input.labelFontSizePx);

  const pendingSections: PendingGroupedSection[] = input.sections.map((section, index) => ({
    group: {
      groupKey: String(index),
      heading: `section-${index}`,
      images: [],
    },
    sectionHeading: `section-${index}`,
    sheet: {
      sheetHeightPx: section.artworkHeightPx,
      placements: [],
    },
  }));

  return Math.max(
    1,
    packSectionsIntoContinuousPhysicalSheets(
      pendingSections,
      input.maxSheetHeightPx,
      showLabelBandHeightPx,
      sectionLabelBandHeightPx,
    ).length,
  );
}
