import sharp from "sharp";

const ANALYSIS_CANVAS_SIZE_PX = 1024;
const ANALYSIS_PADDING_PX = 64;
const ANALYSIS_ARTWORK_SIZE_PX = ANALYSIS_CANVAS_SIZE_PX - ANALYSIS_PADDING_PX * 2;
const ANALYSIS_BACKGROUND = { r: 128, g: 128, b: 128, alpha: 1 };

export interface PreparedAiAnalysisImage {
  bytes: Buffer;
  contentType: "image/webp";
  height: number;
  width: number;
}

export async function prepareAiAnalysisImage(inputBytes: Buffer): Promise<PreparedAiAnalysisImage> {
  const image = sharp(inputBytes, { failOn: "none" }).rotate();
  const resized = await image
    .resize({
      background: ANALYSIS_BACKGROUND,
      fit: "contain",
      height: ANALYSIS_ARTWORK_SIZE_PX,
      width: ANALYSIS_ARTWORK_SIZE_PX,
    })
    .extend({
      background: ANALYSIS_BACKGROUND,
      bottom: ANALYSIS_PADDING_PX,
      left: ANALYSIS_PADDING_PX,
      right: ANALYSIS_PADDING_PX,
      top: ANALYSIS_PADDING_PX,
    })
    .flatten({ background: ANALYSIS_BACKGROUND })
    .webp({ effort: 4, quality: 82 })
    .toBuffer();

  return {
    bytes: resized,
    contentType: "image/webp",
    height: ANALYSIS_CANVAS_SIZE_PX,
    width: ANALYSIS_CANVAS_SIZE_PX,
  };
}
