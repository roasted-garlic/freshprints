import assert from "node:assert/strict";
import test from "node:test";

import { MaterializedCardBucketCache } from "./materializedCardBucketCache";

test("duplicate bucket paths are loaded and materialized once", async () => {
  const cache = new MaterializedCardBucketCache<string>();
  const calls: string[] = [];
  const result = await cache.load(["bucket-1", "bucket-1", "bucket-2"], async (path) => {
    calls.push(path);
    return `cards:${path}`;
  });

  assert.deepEqual(calls, ["bucket-1", "bucket-2"]);
  assert.deepEqual(result, ["cards:bucket-1", "cards:bucket-2"]);
});

test("filter interactions reuse materialized buckets until targeted invalidation", async () => {
  const cache = new MaterializedCardBucketCache<string>();
  let calls = 0;
  const loader = async (path: string) => {
    calls += 1;
    return `cards:${path}:${calls}`;
  };

  await cache.load(["bucket-1"], loader);
  await cache.load(["bucket-1"], loader);
  assert.equal(calls, 1);

  cache.delete("bucket-1");
  await cache.load(["bucket-1"], loader);
  assert.equal(calls, 2);
});

test("Strict Mode-style concurrent resolution shares one in-flight bucket load", async () => {
  const cache = new MaterializedCardBucketCache<string>();
  let calls = 0;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const loader = async () => {
    calls += 1;
    await gate;
    return "cards";
  };

  const first = cache.load(["bucket-1"], loader);
  const second = cache.load(["bucket-1"], loader);
  release();
  await Promise.all([first, second]);

  assert.equal(calls, 1);
});
