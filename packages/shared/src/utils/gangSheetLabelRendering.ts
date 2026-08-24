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

export function resolveGroupedSectionLabelFontSizePx(sheetLabelFontSizePx: number): number {
  return Math.round(sheetLabelFontSizePx * 0.85);
}
