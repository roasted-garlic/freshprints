import { useCallback, useMemo, useState } from "react";

import {
  AI_ENRICHMENT_PLAYGROUND_IMAGE_CONTENT_TYPES,
  AI_ENRICHMENT_PLAYGROUND_MAX_IMAGE_BYTES,
  AI_ENRICHMENT_PLAYGROUND_MAX_PROMPT_LENGTH,
  DEFAULT_VISION_MODEL_ID,
  type AllowedVisionModelId,
} from "../../../../../../shared/constants/aiEnrichment.constants";
import type {
  AiEnrichmentPlaygroundRequest,
  AiEnrichmentPlaygroundResponse,
} from "../../../../../../shared/types/ai/aiEnrichmentPlayground.types";
import { resolveClientVisionModelId } from "../constants/aiEnrichmentSettingsConstants";
import { aiEnrichmentPlaygroundService } from "../services/aiEnrichmentPlaygroundService";

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (bytes >= 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${bytes} B`;
}

async function encodeFileToBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return window.btoa(binary);
}

function resolveSelectedImageError(file: File | null): string | null {
  if (!file) {
    return null;
  }

  if (
    !AI_ENRICHMENT_PLAYGROUND_IMAGE_CONTENT_TYPES.includes(
      file.type as (typeof AI_ENRICHMENT_PLAYGROUND_IMAGE_CONTENT_TYPES)[number],
    )
  ) {
    return "Playground image must be PNG, JPEG, or WebP.";
  }

  if (file.size > AI_ENRICHMENT_PLAYGROUND_MAX_IMAGE_BYTES) {
    return "Image must be 50 MB or smaller.";
  }

  return null;
}

export interface UseAiEnrichmentPlaygroundResult {
  acceptedImageTypes: string;
  clearSelectedImage: () => void;
  error: string | null;
  imageName: string | null;
  imageSizeLabel: string | null;
  isRunning: boolean;
  prompt: string;
  result: AiEnrichmentPlaygroundResponse | null;
  resetPlayground: () => void;
  runPlayground: () => Promise<void>;
  setPrompt: (value: string) => void;
  setSelectedImage: (file: File | null) => void;
  setVisionModelId: (value: string) => void;
  visionModelId: AllowedVisionModelId;
}

export function useAiEnrichmentPlayground(): UseAiEnrichmentPlaygroundResult {
  const [visionModelId, setVisionModelIdState] = useState<AllowedVisionModelId>(DEFAULT_VISION_MODEL_ID);
  const [prompt, setPromptState] = useState("");
  const [selectedImage, setSelectedImageState] = useState<File | null>(null);
  const [result, setResult] = useState<AiEnrichmentPlaygroundResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const acceptedImageTypes = useMemo(
    () => AI_ENRICHMENT_PLAYGROUND_IMAGE_CONTENT_TYPES.join(","),
    [],
  );

  const imageName = useMemo(() => {
    if (!selectedImage) {
      return null;
    }

    return selectedImage.name;
  }, [selectedImage]);

  const imageSizeLabel = useMemo(() => {
    if (!selectedImage) {
      return null;
    }

    return formatFileSize(selectedImage.size);
  }, [selectedImage]);

  const setVisionModelId = useCallback((value: string) => {
    setVisionModelIdState(resolveClientVisionModelId(value));
  }, []);

  const setPrompt = useCallback((value: string) => {
    setPromptState(value);
  }, []);

  const clearSelectedImage = useCallback(() => {
    setSelectedImageState(null);
    setError(null);
  }, []);

  const resetPlayground = useCallback(() => {
    setPromptState("");
    setSelectedImageState(null);
    setResult(null);
    setError(null);
  }, []);

  const setSelectedImage = useCallback((file: File | null) => {
    const nextError = resolveSelectedImageError(file);

    if (nextError) {
      setSelectedImageState(null);
      setError(nextError);
      return;
    }

    setSelectedImageState(file);
    setError(null);
  }, []);

  const runPlayground = useCallback(async () => {
    const trimmedPrompt = prompt.trim();
    const selectedImageError = resolveSelectedImageError(selectedImage);

    if (!trimmedPrompt) {
      setError("A prompt is required.");
      return;
    }

    if (trimmedPrompt.length > AI_ENRICHMENT_PLAYGROUND_MAX_PROMPT_LENGTH) {
      setError(`Prompt must be ${AI_ENRICHMENT_PLAYGROUND_MAX_PROMPT_LENGTH.toLocaleString()} characters or fewer.`);
      return;
    }

    if (selectedImageError) {
      setError(selectedImageError);
      return;
    }

    if (!selectedImage) {
      setError("Select one image before running the playground.");
      return;
    }

    setIsRunning(true);
    setError(null);
    setResult(null);

    try {
      const imageBase64 = await encodeFileToBase64(selectedImage);
      const response = await aiEnrichmentPlaygroundService.runPlayground({
        imageBase64,
        imageContentType:
          selectedImage.type as AiEnrichmentPlaygroundRequest["imageContentType"],
        prompt: trimmedPrompt,
        visionModelId:
          resolveClientVisionModelId(
            visionModelId,
          ) as AiEnrichmentPlaygroundRequest["visionModelId"],
      });

      setResult(response);
    } catch (playgroundError) {
      setError(
        playgroundError instanceof Error
          ? playgroundError.message
          : "Unable to run the AI playground request.",
      );
    } finally {
      setIsRunning(false);
    }
  }, [prompt, selectedImage, visionModelId]);

  return {
    acceptedImageTypes,
    clearSelectedImage,
    error,
    imageName,
    imageSizeLabel,
    isRunning,
    prompt,
    result,
    resetPlayground,
    runPlayground,
    setPrompt,
    setSelectedImage,
    setVisionModelId,
    visionModelId,
  };
}
