/** Padding above label text within the band. */
export const GANG_SHEET_LABEL_TOP_PADDING_PX = 60;

/** Matches gang sheet export DPI clearance below label text. */
export const GANG_SHEET_EXPORT_DPI = 300;

export const GANG_SHEET_LABEL_CLEARANCE_PX = Math.round(GANG_SHEET_EXPORT_DPI * 1.1);

/** Minimum font size used when an adaptive label needs to shrink. */
export const GANG_SHEET_LABEL_MIN_FONT_SIZE_PX = 20;

/** Bump when line measurement or band geometry changes. */
export const GANG_SHEET_LABEL_LAYOUT_VERSION = 2;

/** Bump when the deterministic sans-serif metric assumptions change. */
export const GANG_SHEET_LABEL_FONT_METRICS_VERSION = 1;

const DEFAULT_LINE_GAP_RATIO = 0.25;
const GROUPED_SUMMARY_LINE_GAP_RATIO = 0.35;
const GROUPED_SUMMARY_MIN_FONT_SIZE_PX = 12;

function splitIntoRenderableUnits(text: string): string[] {
  const units: string[] = [];

  for (const character of Array.from(text)) {
    const codePoint = character.codePointAt(0) ?? 0;
    const previous = units[units.length - 1] ?? "";
    const previousCodePoint = previous.codePointAt(0) ?? 0;
    const isCombiningMark =
      (codePoint >= 0x300 && codePoint <= 0x36f) ||
      (codePoint >= 0x1ab0 && codePoint <= 0x1aff) ||
      (codePoint >= 0x1dc0 && codePoint <= 0x1dff) ||
      (codePoint >= 0x20d0 && codePoint <= 0x20ff) ||
      (codePoint >= 0xfe20 && codePoint <= 0xfe2f);
    const isVariationSelector =
      (codePoint >= 0xfe00 && codePoint <= 0xfe0f) ||
      (codePoint >= 0xe0100 && codePoint <= 0xe01ef);
    const isEmojiModifier = codePoint >= 0x1f3fb && codePoint <= 0x1f3ff;
    const isRegionalIndicator = codePoint >= 0x1f1e6 && codePoint <= 0x1f1ff;
    const previousIsRegionalIndicator = previousCodePoint >= 0x1f1e6 && previousCodePoint <= 0x1f1ff;
    const attachesToPrevious =
      units.length > 0 &&
      (isCombiningMark ||
        isVariationSelector ||
        isEmojiModifier ||
        codePoint === 0x200d ||
        previous.endsWith("\u200d") ||
        (isRegionalIndicator && previousIsRegionalIndicator));

    if (attachesToPrevious) {
      units[units.length - 1] = `${previous}${character}`;
    } else {
      units.push(character);
    }
  }

  return units;
}

export interface GangSheetTextLayout {
  text: string;
  lines: string[];
  fontSizePx: number;
  lineGapPx: number;
  lineHeightPx: number;
  usableWidthPx: number;
  bandHeightPx: number;
}

export interface GangSheetGroupedSectionLabelLayout {
  heading: GangSheetTextLayout;
  summaries: GangSheetTextLayout[];
  bandHeightPx: number;
}

function normalizeUsableWidthPx(value: number): number {
  if (value === Number.POSITIVE_INFINITY) {
    return Number.MAX_SAFE_INTEGER;
  }
  return Math.max(1, Math.floor(Number.isFinite(value) ? value : 1));
}

function normalizeFontSizePx(value: number, minimum: number): number {
  return Math.max(minimum, Math.floor(Number.isFinite(value) ? value : minimum));
}

/**
 * Conservative, deterministic approximation of bold/normal sans-serif SVG text width.
 * Keeping this in shared code means the preview and Electron compositor make the same
 * line-break decisions without depending on browser or platform font APIs.
 */
export function measureGangSheetTextWidthPx(
  text: string,
  fontSizePx: number,
  fontWeight: "bold" | "normal" = "bold",
): number {
  const weightFactor = fontWeight === "bold" ? 1.04 : 1;
  let width = 0;

  for (const unit of splitIntoRenderableUnits(text)) {
    const character = unit[0] ?? "";
    const codePoint = character.codePointAt(0) ?? 0;
    if (/\s/u.test(character)) {
      width += 0.34;
    } else if (/^[ilI.,:;!'|`"]$/u.test(character)) {
      width += 0.28;
    } else if (/^[mMwW]$/u.test(character)) {
      width += 0.94;
    } else if (/^[MW@#%&]$/u.test(character)) {
      width += 0.94;
    } else if ("()[]{}-_/\\".includes(character)) {
      width += 0.42;
    } else if (/^[a-z]$/u.test(character)) {
      width += 0.64;
    } else if (/^[A-Z0-9]$/u.test(character)) {
      width += 0.68;
    } else if (unit.includes("\u200d") || codePoint > 0x2ff) {
      // Keep fallback-font CJK, emoji, symbols, and other wide Unicode clusters safe.
      width += 1.1;
    } else {
      // Accented Latin and other BMP glyphs can be wider than the ASCII average.
      width += 0.72;
    }
  }

  return Math.ceil(width * fontSizePx * weightFactor);
}

function splitLongToken(token: string, usableWidthPx: number, fontSizePx: number, fontWeight: "bold" | "normal") {
  const pieces: string[] = [];
  let current = "";

  for (const character of splitIntoRenderableUnits(token)) {
    const candidate = `${current}${character}`;
    if (current && measureGangSheetTextWidthPx(candidate, fontSizePx, fontWeight) > usableWidthPx) {
      pieces.push(current);
      current = character;
    } else {
      current = candidate;
    }
  }

  if (current) {
    pieces.push(current);
  }

  return pieces.length > 0 ? pieces : [""];
}

export function wrapGangSheetText(
  text: string,
  usableWidthPx: number,
  fontSizePx: number,
  fontWeight: "bold" | "normal" = "bold",
): string[] {
  const normalizedText = text.trim().replace(/\s+/gu, " ");
  if (!normalizedText) {
    return [""];
  }

  const lines: string[] = [];
  let currentLine = "";

  for (const word of normalizedText.split(" ")) {
    const wordWidth = measureGangSheetTextWidthPx(word, fontSizePx, fontWeight);
    if (wordWidth <= usableWidthPx) {
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      if (!currentLine || measureGangSheetTextWidthPx(candidate, fontSizePx, fontWeight) <= usableWidthPx) {
        currentLine = candidate;
        continue;
      }

      lines.push(currentLine);
      currentLine = word;
      continue;
    }

    if (currentLine) {
      lines.push(currentLine);
      currentLine = "";
    }
    lines.push(...splitLongToken(word, usableWidthPx, fontSizePx, fontWeight));
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [""];
}

function resolveAdaptiveTextLayout(input: {
  text: string;
  fontSizePx: number;
  usableWidthPx: number;
  fontWeight: "bold" | "normal";
  minimumFontSizePx: number;
  lineGapRatio: number;
}): GangSheetTextLayout {
  const usableWidthPx = normalizeUsableWidthPx(input.usableWidthPx);
  const minimumFontSizePx = normalizeFontSizePx(input.minimumFontSizePx, 1);
  let fontSizePx = normalizeFontSizePx(input.fontSizePx, minimumFontSizePx);

  while (
    fontSizePx > minimumFontSizePx &&
    measureGangSheetTextWidthPx(input.text, fontSizePx, input.fontWeight) > usableWidthPx
  ) {
    fontSizePx -= 1;
  }

  const lines = wrapGangSheetText(input.text, usableWidthPx, fontSizePx, input.fontWeight);
  const lineGapPx = Math.round(fontSizePx * input.lineGapRatio);
  const lineHeightPx = fontSizePx + lineGapPx;
  const textBlockHeightPx = lines.length * fontSizePx + Math.max(0, lines.length - 1) * lineGapPx;

  return {
    text: input.text,
    lines,
    fontSizePx,
    lineGapPx,
    lineHeightPx,
    usableWidthPx,
    bandHeightPx: GANG_SHEET_LABEL_TOP_PADDING_PX + textBlockHeightPx + GANG_SHEET_LABEL_CLEARANCE_PX,
  };
}

export function resolveGangSheetLabelLayout(input: {
  label: string;
  sheetWidthPx: number;
  sideMarginPx: number;
  labelFontSizePx: number;
}): GangSheetTextLayout {
  return resolveAdaptiveTextLayout({
    text: input.label,
    fontSizePx: input.labelFontSizePx,
    usableWidthPx: input.sheetWidthPx - 2 * input.sideMarginPx,
    fontWeight: "bold",
    minimumFontSizePx: GANG_SHEET_LABEL_MIN_FONT_SIZE_PX,
    lineGapRatio: DEFAULT_LINE_GAP_RATIO,
  });
}

export function resolveGroupedSectionLabelLayout(input: {
  heading: string;
  summaryLines: readonly string[];
  sheetWidthPx: number;
  sideMarginPx: number;
  headingFontSizePx: number;
  summaryFontSizePx: number;
}): GangSheetGroupedSectionLabelLayout {
  const usableWidthPx = input.sheetWidthPx - 2 * input.sideMarginPx;
  const heading = resolveAdaptiveTextLayout({
    text: input.heading,
    fontSizePx: input.headingFontSizePx,
    usableWidthPx,
    fontWeight: "bold",
    minimumFontSizePx: GANG_SHEET_LABEL_MIN_FONT_SIZE_PX,
    lineGapRatio: DEFAULT_LINE_GAP_RATIO,
  });
  const summaries = input.summaryLines.map((summaryLine) =>
    resolveAdaptiveTextLayout({
      text: summaryLine,
      fontSizePx: input.summaryFontSizePx,
      usableWidthPx,
      fontWeight: "normal",
      minimumFontSizePx: GROUPED_SUMMARY_MIN_FONT_SIZE_PX,
      lineGapRatio: GROUPED_SUMMARY_LINE_GAP_RATIO,
    }),
  );
  const summaryGapPx = Math.round(input.summaryFontSizePx * GROUPED_SUMMARY_LINE_GAP_RATIO);
  const headingHeightPx = heading.lines.length * heading.fontSizePx + Math.max(0, heading.lines.length - 1) * heading.lineGapPx;
  const summaryHeightPx = summaries.reduce(
    (sum, summary) => sum + summary.lines.length * summary.fontSizePx + Math.max(0, summary.lines.length - 1) * summary.lineGapPx,
    0,
  ) + Math.max(0, summaries.length - 1) * summaryGapPx;

  return {
    heading,
    summaries,
    bandHeightPx:
      GANG_SHEET_LABEL_TOP_PADDING_PX +
      headingHeightPx +
      (summaries.length > 0 ? summaryGapPx : 0) +
      summaryHeightPx +
      GANG_SHEET_LABEL_CLEARANCE_PX,
  };
}

export function computeGangSheetLabelBandHeightPx(labelFontSizePx: number, lineCount = 1): number {
  const safeLineCount = Math.max(1, Math.floor(lineCount));
  const lineGapPx = Math.round(labelFontSizePx * DEFAULT_LINE_GAP_RATIO);
  return (
    GANG_SHEET_LABEL_TOP_PADDING_PX +
    safeLineCount * labelFontSizePx +
    Math.max(0, safeLineCount - 1) * lineGapPx +
    GANG_SHEET_LABEL_CLEARANCE_PX
  );
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
  layout?: GangSheetTextLayout;
}): string {
  if (!input.layout) {
    const textY = GANG_SHEET_LABEL_TOP_PADDING_PX + input.labelFontSizePx;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${input.sheetWidthPx}" height="${input.bandHeightPx}">
    <text x="${input.sheetWidthPx / 2}" y="${textY}" font-family="sans-serif" font-size="${input.labelFontSizePx}" font-weight="bold" fill="#1a1a1a" text-anchor="middle">${escapeGangSheetLabelXml(input.label)}</text>
  </svg>`;
  }

  const textSvg = input.layout.lines
    .map(
      (line, index) =>
        `<text x="${input.sheetWidthPx / 2}" y="${GANG_SHEET_LABEL_TOP_PADDING_PX + input.layout!.fontSizePx + index * input.layout!.lineHeightPx}" font-family="sans-serif" font-size="${input.layout!.fontSizePx}" font-weight="bold" fill="#1a1a1a" text-anchor="middle">${escapeGangSheetLabelXml(line)}</text>`,
    )
    .join("\n    ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${input.sheetWidthPx}" height="${input.bandHeightPx}">
    ${textSvg}
  </svg>`;
}

export function computeGroupedSectionLabelBandHeightPx(
  headingFontSizePx: number,
  summaryFontSizePx: number,
  summaryLineCount = 2,
  adaptiveInput?: {
    heading: string;
    summaryLines?: readonly string[];
    sheetWidthPx: number;
    sideMarginPx: number;
  },
): number {
  if (adaptiveInput) {
    return resolveGroupedSectionLabelLayout({
      heading: adaptiveInput.heading,
      summaryLines: adaptiveInput.summaryLines ?? Array.from({ length: Math.max(1, summaryLineCount) }, () => ""),
      sheetWidthPx: adaptiveInput.sheetWidthPx,
      sideMarginPx: adaptiveInput.sideMarginPx,
      headingFontSizePx,
      summaryFontSizePx,
    }).bandHeightPx;
  }

  const lineGapPx = Math.round(summaryFontSizePx * GROUPED_SUMMARY_LINE_GAP_RATIO);
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
  layout?: GangSheetGroupedSectionLabelLayout;
}): string {
  if (!input.layout) {
    const headingY = GANG_SHEET_LABEL_TOP_PADDING_PX + input.headingFontSizePx;
    const lineGapPx = Math.round(input.summaryFontSizePx * GROUPED_SUMMARY_LINE_GAP_RATIO);
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

  const headingSvg = input.layout.heading.lines
    .map(
      (line, index) =>
        `<text x="${input.sheetWidthPx / 2}" y="${GANG_SHEET_LABEL_TOP_PADDING_PX + input.layout!.heading.fontSizePx + index * input.layout!.heading.lineHeightPx}" font-family="sans-serif" font-size="${input.layout!.heading.fontSizePx}" font-weight="bold" fill="#1a1a1a" text-anchor="middle">${escapeGangSheetLabelXml(line)}</text>`,
    )
    .join("\n    ");
  const headingHeightPx = input.layout.heading.lines.length * input.layout.heading.fontSizePx +
    Math.max(0, input.layout.heading.lines.length - 1) * input.layout.heading.lineGapPx;
  const summaryGapPx = Math.round(input.summaryFontSizePx * GROUPED_SUMMARY_LINE_GAP_RATIO);
  let summaryCursorY = GANG_SHEET_LABEL_TOP_PADDING_PX + headingHeightPx + summaryGapPx;
  const summarySvg = input.layout.summaries
    .flatMap((summary) => {
      const lines = summary.lines.map((line, index) => {
        const svg = `<text x="${input.sheetWidthPx / 2}" y="${summaryCursorY + summary.fontSizePx + index * summary.lineHeightPx}" font-family="sans-serif" font-size="${summary.fontSizePx}" font-weight="normal" fill="#4a4a4a" text-anchor="middle">${escapeGangSheetLabelXml(line)}</text>`;
        return svg;
      });
      summaryCursorY += summary.lines.length * summary.fontSizePx + Math.max(0, summary.lines.length - 1) * summary.lineGapPx + summaryGapPx;
      return lines;
    })
    .join("\n    ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${input.sheetWidthPx}" height="${input.bandHeightPx}">
    ${headingSvg}
    ${summarySvg}
  </svg>`;
}

export function resolveGroupedSectionLabelFontSizePx(sheetLabelFontSizePx: number): number {
  return Math.round(sheetLabelFontSizePx * 0.75);
}
