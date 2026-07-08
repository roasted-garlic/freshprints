import { Router } from "express";
import multer from "multer";
import sharp from "sharp";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 200 * 1024 * 1024, files: 50 } });

/**
 * POST /api/stitch
 *
 * Accepts one or more PNG tiles (multipart, field name "tiles") ordered
 * top-to-bottom and composites them into a single transparent PNG that is
 * streamed back to the client.
 *
 * Strategy: decode each tile to raw RGBA pixel data with limitInputPixels:false,
 * concatenate the raw buffers (rows are already top-to-bottom), then encode the
 * concatenated buffer as a single PNG.  This avoids the sharp composite() pixel-
 * limit check on individual inputs, and works for any sheet size.
 */
router.post("/stitch", upload.array("tiles"), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) {
      res.status(400).json({ error: "No tile files uploaded." });
      return;
    }

    const rawParts: Buffer[] = [];
    let tileW = 0;
    let totalH = 0;

    for (const file of files) {
      const { data, info } = await sharp(file.buffer, { limitInputPixels: false })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      if (tileW === 0) tileW = info.width;
      totalH += info.height;
      rawParts.push(data);
    }

    if (tileW === 0 || totalH === 0) {
      res.status(400).json({ error: "Could not decode tile dimensions." });
      return;
    }

    // Concatenate raw RGBA rows — already in the correct top-to-bottom order.
    const combinedRaw = Buffer.concat(rawParts);

    const outputBuffer = await sharp(combinedRaw, {
      raw: { width: tileW, height: totalH, channels: 4 },
      limitInputPixels: false,
    })
      .withMetadata({ density: 300 })
      .png({ compressionLevel: 6 })
      .toBuffer();

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", 'attachment; filename="stitched.png"');
    res.setHeader("Content-Length", outputBuffer.length);
    res.send(outputBuffer);
  } catch (err) {
    console.error("[stitch] error:", err);
    res.status(500).json({ error: "Failed to stitch tiles." });
  }
});

export default router;
