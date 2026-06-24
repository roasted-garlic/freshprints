import { nativeImage } from "electron";

import { MAX_SINGLE_PNG_SIZE_BYTES } from "../../../shared/constants/importValidation.constants";

export const PNG_PREVIEW_MAX_WIDTH_PX = 320;

export interface SelectedPngPreviewResult {
  dataUrl: string;
  previewHeight: number;
  previewWidth: number;
}

export function getSelectedPngPreview(filePath: string): SelectedPngPreviewResult | null {
  const image = nativeImage.createFromPath(filePath);

  if (image.isEmpty()) {
    return null;
  }

  const { width, height } = image.getSize();

  if (width <= 0 || height <= 0) {
    return null;
  }

  const previewImage =
    width > PNG_PREVIEW_MAX_WIDTH_PX
      ? image.resize({ width: PNG_PREVIEW_MAX_WIDTH_PX })
      : image;

  const previewSize = previewImage.getSize();
  const dataUrl = previewImage.toDataURL();

  if (!dataUrl) {
    return null;
  }

  return {
    dataUrl,
    previewWidth: previewSize.width,
    previewHeight: previewSize.height,
  };
}

export function isPreviewablePngSize(fileSizeBytes: number): boolean {
  return fileSizeBytes <= MAX_SINGLE_PNG_SIZE_BYTES;
}
