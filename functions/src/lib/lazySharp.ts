import { createRequire } from "node:module";

const loadNativeModule = createRequire(__filename);
let cachedSharp: typeof import("sharp") | undefined;

export function getSharp(): typeof import("sharp") {
  if (!cachedSharp) {
    const loadedSharp: typeof import("sharp") = loadNativeModule("sharp");
    cachedSharp = loadedSharp;
    return loadedSharp;
  }
  return cachedSharp;
}
