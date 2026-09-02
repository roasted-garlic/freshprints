import assert from "node:assert/strict";
import { deflateRawSync } from "node:zlib";
import { describe, it } from "node:test";

import {
  deterministicZipUploadId,
  extractSafeCustomerUploadImagesFromZip,
  isCandidateImageEntryName,
  isNestedZipEntryName,
  isSafeZipEntryName,
  zipFailureCode,
} from "./customerUploadZip";

/** Minimal store/deflate ZIP builder for fixture tests. */
function buildZip(entries: Array<{ name: string; data: Buffer; store?: boolean }>): Buffer {
  const fileParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, "utf8");
    const raw = entry.data;
    const compressed = entry.store ? raw : deflateRawSync(raw);
    const method = entry.store ? 0 : 8;
    const crc = crc32(raw);

    const local = Buffer.alloc(30 + nameBuf.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    nameBuf.copy(local, 30);

    const central = Buffer.alloc(46 + nameBuf.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    nameBuf.copy(central, 46);

    fileParts.push(local, compressed);
    centralParts.push(central);
    offset += local.length + compressed.length;
  }

  const centralDir = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDir.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...fileParts, centralDir, end]);
}

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

describe("customerUploadZip helpers", () => {
  it("rejects unsafe entry names", () => {
    assert.equal(isSafeZipEntryName("../evil.png"), false);
    assert.equal(isSafeZipEntryName("/abs.png"), false);
    assert.equal(isSafeZipEntryName("C:/windows.png"), false);
    assert.equal(isSafeZipEntryName("ok/folder/art.png"), true);
  });

  it("detects nested zip and image candidates", () => {
    assert.equal(isNestedZipEntryName("inner.zip"), true);
    assert.equal(isCandidateImageEntryName("a.PNG"), true);
    assert.equal(isCandidateImageEntryName("a.webp"), false);
    assert.equal(isCandidateImageEntryName("notes.txt"), false);
  });

  it("builds deterministic upload ids", () => {
    const a = deterministicZipUploadId("batch1", "art.png");
    const b = deterministicZipUploadId("batch1", "art.png");
    const c = deterministicZipUploadId("batch1", "other.png");
    assert.equal(a, b);
    assert.notEqual(a, c);
    assert.equal(a.length, 20);
  });

  it("extracts a safe png entry", async () => {
    const png = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    ]);
    const zip = buildZip([{ name: "folder/art.png", data: png, store: true }]);
    const result = await extractSafeCustomerUploadImagesFromZip(zip);
    assert.equal(result.images.length, 1);
    assert.equal(result.images[0].entryName, "folder/art.png");
    assert.equal(result.images[0].displayFilename, "art.png");
  });

  it("rejects nested zip entries", async () => {
    const zip = buildZip([{ name: "nested.zip", data: Buffer.from("not-a-real-zip"), store: true }]);
    await assert.rejects(
      () => extractSafeCustomerUploadImagesFromZip(zip),
      (error: unknown) => {
        assert.equal(zipFailureCode(error), "nested_archive_rejected");
        return true;
      },
    );
  });

  it("rejects traversal entry names", async () => {
    const zip = buildZip([
      { name: "subdir/../../escape.png", data: Buffer.from("x"), store: true },
    ]);
    await assert.rejects(
      () => extractSafeCustomerUploadImagesFromZip(zip),
      (error: unknown) => {
        assert.equal(zipFailureCode(error), "archive_exceeds_limits");
        return true;
      },
    );
  });
});
