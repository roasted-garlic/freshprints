import type Sharp from "sharp";

import type { DerivativeGenerationFailure } from "../../../shared/types/import/derivativeGeneration.types";

export type SharpConstructor = typeof Sharp;

let sharpApi: SharpConstructor | null = null;

export function mapSharpLoadFailure(error: unknown): DerivativeGenerationFailure {
  const detail = error instanceof Error ? error.message : "Unknown sharp load error.";

  return {
    code: "SHARP_LOAD_FAILED",
    message: `The image processing library could not be loaded in the main process: ${detail}`,
  };
}

export async function loadSharpModule(): Promise<SharpConstructor> {
  if (sharpApi) {
    return sharpApi;
  }

  try {
    const module = await import("sharp");
    sharpApi = module.default;
    return sharpApi;
  } catch (error) {
    throw mapSharpLoadFailure(error);
  }
}

export function getLoadedSharpVersion(): string | null {
  try {
    if (!sharpApi) {
      return null;
    }

    return sharpApi.versions.sharp ?? null;
  } catch {
    return null;
  }
}

export async function ensureSharpLoaded(): Promise<
  { ok: true; version: string } | { ok: false; error: DerivativeGenerationFailure }
> {
  try {
    const api = await loadSharpModule();
    return { ok: true, version: api.versions.sharp ?? "unknown" };
  } catch (error) {
    if (error && typeof error === "object" && "code" in error) {
      return { ok: false, error: error as DerivativeGenerationFailure };
    }

    return { ok: false, error: mapSharpLoadFailure(error) };
  }
}
