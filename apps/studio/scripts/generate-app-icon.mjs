// One-time asset-generation script — not part of the build pipeline. Regenerates
// apps/studio/icon.ico and apps/studio/icon.png from the exact collapsed-sidebar logo asset
// (apps/studio/src/assets/brand/fresh-prints-studio-logo-collapsed.png), which is what Studio's
// sidebar actually renders when collapsed (AppLogo.tsx's fallback for variant="collapsed") on a
// cold-start project with no custom-uploaded brand logo. Run with:
//   node apps/studio/scripts/generate-app-icon.mjs
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const studioRoot = path.join(__dirname, "..");
const sourcePath = path.join(
  studioRoot,
  "src/assets/brand/fresh-prints-studio-logo-collapsed.png",
);

// The source mark's opaque pixels extend to the canvas edges (confirmed via sharp .trim() —
// trimmed size equals full size), so explicit padding is added here rather than relying on any
// margin baked into the source file, to keep the circular mark from looking cropped tight against
// the square icon frame at small sizes.
const PADDING_RATIO = 0.08;
const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256];
const PNG_SIZE = 512;

async function buildPaddedSquare(size) {
  const artworkSize = Math.round(size * (1 - PADDING_RATIO * 2));
  const offset = Math.round((size - artworkSize) / 2);

  const resizedArtwork = await sharp(sourcePath)
    .resize(artworkSize, artworkSize, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: resizedArtwork, left: offset, top: offset }])
    .png()
    .toBuffer();
}

async function main() {
  await readFile(sourcePath);

  const icoPngBuffers = await Promise.all(ICO_SIZES.map((size) => buildPaddedSquare(size)));
  const icoBuffer = await pngToIco(icoPngBuffers);
  await writeFile(path.join(studioRoot, "icon.ico"), icoBuffer);
  console.log(`Wrote apps/studio/icon.ico (${ICO_SIZES.join(", ")}px)`);

  const linuxPngBuffer = await buildPaddedSquare(PNG_SIZE);
  await writeFile(path.join(studioRoot, "icon.png"), linuxPngBuffer);
  console.log(`Wrote apps/studio/icon.png (${PNG_SIZE}px)`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
