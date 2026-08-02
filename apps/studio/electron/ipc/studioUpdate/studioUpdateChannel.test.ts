import assert from "node:assert/strict";
import test from "node:test";

import { resolveStudioUpdateChannel } from "./studioUpdateChannel";

test("defaults to stable when the env var is unset", () => {
  const original = process.env.FRESH_PRINTS_UPDATE_CHANNEL;
  delete process.env.FRESH_PRINTS_UPDATE_CHANNEL;
  try {
    assert.equal(resolveStudioUpdateChannel(), "stable");
  } finally {
    if (original === undefined) {
      delete process.env.FRESH_PRINTS_UPDATE_CHANNEL;
    } else {
      process.env.FRESH_PRINTS_UPDATE_CHANNEL = original;
    }
  }
});

test("defaults to stable for any unrecognized value", () => {
  const original = process.env.FRESH_PRINTS_UPDATE_CHANNEL;
  process.env.FRESH_PRINTS_UPDATE_CHANNEL = "not-a-real-channel";
  try {
    assert.equal(resolveStudioUpdateChannel(), "stable");
  } finally {
    if (original === undefined) {
      delete process.env.FRESH_PRINTS_UPDATE_CHANNEL;
    } else {
      process.env.FRESH_PRINTS_UPDATE_CHANNEL = original;
    }
  }
});

test("selects prerelease only on the exact opt-in value", () => {
  const original = process.env.FRESH_PRINTS_UPDATE_CHANNEL;
  process.env.FRESH_PRINTS_UPDATE_CHANNEL = "prerelease";
  try {
    assert.equal(resolveStudioUpdateChannel(), "prerelease");
  } finally {
    if (original === undefined) {
      delete process.env.FRESH_PRINTS_UPDATE_CHANNEL;
    } else {
      process.env.FRESH_PRINTS_UPDATE_CHANNEL = original;
    }
  }
});
