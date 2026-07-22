import { resolveAiAnalysisBackground } from "../../../packages/shared/src/constants/design/artworkBackground.constants";

const ANALYSIS_CANVAS_SIZE_PX = 1024;
const ANALYSIS_PADDING_PX = 64;
const ANALYSIS_ARTWORK_SIZE_PX = ANALYSIS_CANVAS_SIZE_PX - ANALYSIS_PADDING_PX * 2;

/** Lazy-load native sharp — avoid cold require during Functions deploy discovery. */
function getSharp(): typeof import("sharp") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("sharp") as typeof import("sharp");
}

export interface PreparedAiAnalysisImage {
  bytes: Buffer;
  contentType: "image/webp";
  height: number;
  width: number;
}

/**
 * Composite artwork onto the AI analysis canvas.
 * @param artworkBackgroundHex — design `artworkBackgroundHex` when set; omit/invalid → `#808080`
 */
export async function prepareAiAnalysisImage(
  inputBytes: Buffer,
  artworkBackgroundHex?: unknown,
): Promise<PreparedAiAnalysisImage> {
  const background = resolveAiAnalysisBackground(artworkBackgroundHex);
  const sharp = getSharp();
  const image = sharp(inputBytes, { failOn: "none" }).rotate();
  const resized = await image
    .resize({
      background,
      fit: "contain",
      height: ANALYSIS_ARTWORK_SIZE_PX,
      width: ANALYSIS_ARTWORK_SIZE_PX,
    })
    .extend({
      background,
      bottom: ANALYSIS_PADDING_PX,
      left: ANALYSIS_PADDING_PX,
      right: ANALYSIS_PADDING_PX,
      top: ANALYSIS_PADDING_PX,
    })
    .flatten({ background })
    .webp({ effort: 4, quality: 82 })
    .toBuffer();

  return {
    bytes: resized,
    contentType: "image/webp",
    height: ANALYSIS_CANVAS_SIZE_PX,
    width: ANALYSIS_CANVAS_SIZE_PX,
  };
}
