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

interface PendingGroupedSheet {
  group: ProductionGroup;
  sectionHeading: string;
  sheet: NestedSheet;
}

export async function composeGroupedGangSheetSheets(input: {
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
      "Grouped gang sheet layout found no production groups. Every image must include grouping metadata.",
    );
  }

  const showLabelBandHeightPx = computeGangSheetLabelBandHeightPx(input.request.labelFontSizePx);
  const sectionLabelBandHeightPx = computeGangSheetLabelBandHeightPx(input.request.labelFontSizePx);

  const sharpApi = await loadSharpModule();
  const rotatedPngCache = new Map<string, Buffer>();
  const pendingSheets: PendingGroupedSheet[] = [];

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

      pendingSheets.push({ group, sectionHeading, sheet });
    }
  }

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

  const sheetTotal = pendingSheets.length;
  const composedSheets: Array<{ fileName: string; lengthInches: number; heightPx: number; buffer: Buffer }> = [];

  for (const [sheetIndex, pending] of pendingSheets.entries()) {
    const { group, sectionHeading, sheet } = pending;
    const sheetNumber = sheetIndex + 1;
    const sheetHeightPx = showLabelBandHeightPx + sectionLabelBandHeightPx + sheet.sheetHeightPx;
    const lengthInches = sheetHeightPx / EXPORT_DPI;
    const showLabel = buildGangSheetSheetLabel(input.request.baseFileName, sheetNumber, sheetTotal);
    const showLabelSvg = buildGangSheetLabelSvg({
      label: showLabel,
      sheetWidthPx: input.sheetWidthPx,
      bandHeightPx: showLabelBandHeightPx,
      labelFontSizePx: input.request.labelFontSizePx,
    });
    const sectionLabelSvg = buildGangSheetLabelSvg({
      label: sectionHeading,
      sheetWidthPx: input.sheetWidthPx,
      bandHeightPx: sectionLabelBandHeightPx,
      labelFontSizePx: input.request.labelFontSizePx,
    });

    const artworkTopOffset = showLabelBandHeightPx + sectionLabelBandHeightPx;
    const compositeInputs = await Promise.all(
      sheet.placements.map(async (placement) => {
        const image = group.images.find((entry) => entry.id === placement.id);
        if (!image) {
          return null;
        }

        return {
          input: await getPlacementPngBytes(image, placement.rotated),
          left: placement.x,
          top: placement.y + artworkTopOffset,
        };
      }),
    );

    const composited = await sharpApi({
      create: {
        width: input.sheetWidthPx,
        height: sheetHeightPx,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
      limitInputPixels: false,
    })
      .composite([
        { input: Buffer.from(showLabelSvg), left: 0, top: 0 },
        { input: Buffer.from(sectionLabelSvg), left: 0, top: showLabelBandHeightPx },
        ...compositeInputs.filter((entry): entry is NonNullable<typeof entry> => entry !== null),
      ])
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
