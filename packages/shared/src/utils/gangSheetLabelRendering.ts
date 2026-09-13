/** Padding above label text within the band. */
export const GANG_SHEET_LABEL_TOP_PADDING_PX = 60;

/** Matches gang sheet export DPI clearance below label text. */
export const GANG_SHEET_EXPORT_DPI = 300;

export const GANG_SHEET_LABEL_CLEARANCE_PX = Math.round(GANG_SHEET_EXPORT_DPI * 1.1);

export function computeGangSheetLabelBandHeightPx(labelFontSizePx: number): number {
  return GANG_SHEET_LABEL_TOP_PADDING_PX + labelFontSizePx + GANG_SHEET_LABEL_CLEARANCE_PX;
}

export function escapeGangSheetLabelXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildGangSheetLabelSvg(input: {
  label: string;
  sheetWidthPx: number;
  bandHeightPx: number;
  labelFontSizePx: number;
}): string {
  const textY = GANG_SHEET_LABEL_TOP_PADDING_PX + input.labelFontSizePx;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${input.sheetWidthPx}" height="${input.bandHeightPx}">
    <text x="${input.sheetWidthPx / 2}" y="${textY}" font-family="sans-serif" font-size="${input.labelFontSizePx}" font-weight="bold" fill="#1a1a1a" text-anchor="middle">${escapeGangSheetLabelXml(input.label)}</text>
  </svg>`;
}

export function computeGroupedSectionLabelBandHeightPx(
  headingFontSizePx: number,
  summaryFontSizePx: number,
  summaryLineCount = 2,
): number {
  const lineGapPx = Math.round(summaryFontSizePx * 0.35);
  const safeSummaryLineCount = Math.max(1, Math.floor(summaryLineCount));
  return (
    GANG_SHEET_LABEL_TOP_PADDING_PX +
    headingFontSizePx +
    lineGapPx +
    safeSummaryLineCount * summaryFontSizePx +
    (safeSummaryLineCount - 1) * lineGapPx +
    GANG_SHEET_LABEL_CLEARANCE_PX
  );
}

export function buildGroupedSectionHeadingSvg(input: {
  heading: string;
  summaryLines: readonly string[];
  sheetWidthPx: number;
  bandHeightPx: number;
  headingFontSizePx: number;
  summaryFontSizePx: number;
}): string {
  const headingY = GANG_SHEET_LABEL_TOP_PADDING_PX + input.headingFontSizePx;
  const lineGapPx = Math.round(input.summaryFontSizePx * 0.35);
  const firstSummaryY = headingY + lineGapPx + input.summaryFontSizePx;
  const summarySvg = input.summaryLines
    .map(
      (summaryLine, index) =>
        `<text x="${input.sheetWidthPx / 2}" y="${firstSummaryY + index * (input.summaryFontSizePx + lineGapPx)}" font-family="sans-serif" font-size="${input.summaryFontSizePx}" font-weight="normal" fill="#4a4a4a" text-anchor="middle">${escapeGangSheetLabelXml(summaryLine)}</text>`,
    )
    .join("\n    ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${input.sheetWidthPx}" height="${input.bandHeightPx}">
    <text x="${input.sheetWidthPx / 2}" y="${headingY}" font-family="sans-serif" font-size="${input.headingFontSizePx}" font-weight="bold" fill="#1a1a1a" text-anchor="middle">${escapeGangSheetLabelXml(input.heading)}</text>
    ${summarySvg}
  </svg>`;
}

export function resolveGroupedSectionLabelFontSizePx(sheetLabelFontSizePx: number): number {
  return Math.round(sheetLabelFontSizePx * 0.75);
}
