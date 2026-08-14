#!/usr/bin/env node
/**
 * Unit tests for merge-latest-mac-yml.mjs
 */
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const merger = path.join(__dirname, "merge-latest-mac-yml.mjs");

test("merge-latest-mac-yml combines arch-explicit file entries without collision", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "merge-mac-yml-"));
  try {
    const arm = `version: 1.0.4
files:
  - url: Fresh-Prints-Mac-arm64-1.0.4-Installer.zip
    sha512: aaa
    size: 11
  - url: Fresh-Prints-Mac-arm64-1.0.4-Installer.dmg
    sha512: bbb
    size: 12
path: Fresh-Prints-Mac-arm64-1.0.4-Installer.zip
sha512: aaa
releaseDate: '2026-08-12T00:00:00.000Z'
`;
    const x64 = `version: 1.0.4
files:
  - url: Fresh-Prints-Mac-x64-1.0.4-Installer.zip
    sha512: ccc
    size: 21
  - url: Fresh-Prints-Mac-x64-1.0.4-Installer.dmg
    sha512: ddd
    size: 22
path: Fresh-Prints-Mac-x64-1.0.4-Installer.zip
sha512: ccc
releaseDate: '2026-08-12T00:00:00.000Z'
`;
    const armPath = path.join(dir, "arm.yml");
    const x64Path = path.join(dir, "x64.yml");
    const outPath = path.join(dir, "latest-mac.yml");
    writeFileSync(armPath, arm);
    writeFileSync(x64Path, x64);
    const result = spawnSync(process.execPath, [merger, armPath, x64Path, outPath], {
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const out = readFileSync(outPath, "utf8");
    assert.match(out, /Fresh-Prints-Mac-arm64-1\.0\.4-Installer\.zip/);
    assert.match(out, /Fresh-Prints-Mac-x64-1\.0\.4-Installer\.zip/);
    assert.doesNotMatch(out, /Fresh Prints/);
    assert.doesNotMatch(out, /Fresh\.Prints/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("merge-latest-mac-yml rejects missing arch URLs", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "merge-mac-yml-bad-"));
  try {
    const arm = `version: 1.0.4
files:
  - url: Fresh-Prints-Mac-arm64-1.0.4-Installer.zip
    sha512: aaa
    size: 11
path: Fresh-Prints-Mac-arm64-1.0.4-Installer.zip
sha512: aaa
releaseDate: '2026-08-12T00:00:00.000Z'
`;
    const x64 = `version: 1.0.4
files:
  - url: Fresh-Prints-Mac-1.0.4-Installer.zip
    sha512: ccc
    size: 21
path: Fresh-Prints-Mac-1.0.4-Installer.zip
sha512: ccc
releaseDate: '2026-08-12T00:00:00.000Z'
`;
    const armPath = path.join(dir, "arm.yml");
    const x64Path = path.join(dir, "x64.yml");
    const outPath = path.join(dir, "latest-mac.yml");
    writeFileSync(armPath, arm);
    writeFileSync(x64Path, x64);
    const result = spawnSync(process.execPath, [merger, armPath, x64Path, outPath], {
      encoding: "utf8",
    });
    assert.notEqual(result.status, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
