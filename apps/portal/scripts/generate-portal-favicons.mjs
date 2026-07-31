/**
 * One-shot Portal favicon/manifest generator from brand-asset-sources/05.
 * Not part of the build pipeline.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "../../..");
const source = path.join(
  repoRoot,
  "docs/workflow/setup/brand-asset-sources/05-favicon-app-mark.png",
);
const outDir = path.join(repoRoot, "apps/portal/public");

async function squarePng(size, opaqueBg = null) {
  const artwork = await sharp(source)
    .resize(size, size, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  if (!opaqueBg) {
    return artwork;
  }

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: opaqueBg,
    },
  })
    .composite([{ input: artwork, left: 0, top: 0 }])
    .png()
    .toBuffer();
}

async function main() {
  const outputs = [
    ["favicon-96x96.png", 96, null],
    ["apple-touch-icon.png", 180, { r: 255, g: 255, b: 255, alpha: 1 }],
    ["web-app-manifest-192x192.png", 192, null],
    ["web-app-manifest-512x512.png", 512, null],
  ];

  for (const [name, size, bg] of outputs) {
    const buf = await squarePng(size, bg);
    fs.writeFileSync(path.join(outDir, name), buf);
    console.log(`Wrote ${name} (${buf.length} bytes)`);
  }

  const icoPngs = await Promise.all([16, 32, 48].map((size) => squarePng(size)));
  const ico = await pngToIco(icoPngs);
  fs.writeFileSync(path.join(outDir, "favicon.ico"), ico);
  console.log(`Wrote favicon.ico (${ico.length} bytes)`);

  // Owner supplied PNG only for source #5 — embed a compact PNG in SVG.
  const embed = await squarePng(64);
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">',
    `  <image href="data:image/png;base64,${embed.toString("base64")}" width="64" height="64"/>`,
    "</svg>",
    "",
  ].join("\n");
  fs.writeFileSync(path.join(outDir, "favicon.svg"), svg);
  console.log(`Wrote favicon.svg (${svg.length} bytes)`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
