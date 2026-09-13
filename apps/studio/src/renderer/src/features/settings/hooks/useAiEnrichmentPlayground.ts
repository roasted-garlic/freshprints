import { useCallback, useMemo, useState } from "react";

import {
  AI_ENRICHMENT_PLAYGROUND_IMAGE_CONTENT_TYPES,
  AI_ENRICHMENT_PLAYGROUND_MAX_IMAGE_BYTES,
  AI_ENRICHMENT_PLAYGROUND_MAX_PROMPT_LENGTH,
  DEFAULT_VISION_MODEL_ID,
  type AllowedVisionModelId,
} from "@fresh-prints/shared/constants/aiEnrichment.constants";
import type {
  AiEnrichmentPlaygroundRequest,
  AiEnrichmentPlaygroundResponse,
} from "@fresh-prints/shared/types/ai/aiEnrichmentPlayground.types";
import { resolveClientVisionModelId } from "../constants/aiEnrichmentSettingsConstants";
import { aiEnrichmentPlaygroundService } from "../services/aiEnrichmentPlaygroundService";
import { preparePlaygroundCallableImage } from "../utils/aiPlaygroundCallableImage";
import { resolveAiEnrichmentCallableErrorMessage } from "../utils/aiEnrichmentCallableError";

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (bytes >= 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${bytes} B`;
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
  captureFullTrace: boolean;
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
  setCaptureFullTrace: (value: boolean) => void;
  setSelectedImage: (file: File | null) => void;
  setVisionModelId: (value: string) => void;
  visionModelId: AllowedVisionModelId;
}

export function useAiEnrichmentPlayground(options?: {
  canCaptureFullTrace?: boolean;
}): UseAiEnrichmentPlaygroundResult {
  const canCaptureFullTrace = options?.canCaptureFullTrace === true;
  const [visionModelId, setVisionModelIdState] = useState<AllowedVisionModelId>(
    DEFAULT_VISION_MODEL_ID,
  );
  const [prompt, setPromptState] = useState("");
  const [selectedImage, setSelectedImageState] = useState<File | null>(null);
  const [result, setResult] = useState<AiEnrichmentPlaygroundResponse | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [captureFullTrace, setCaptureFullTraceState] = useState(true);

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
    setResult(null);
  }, []);

  const setPrompt = useCallback((value: string) => {
    setPromptState(value);
    setResult(null);
  }, []);

  const clearSelectedImage = useCallback(() => {
    setSelectedImageState(null);
    setError(null);
    setResult(null);
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
    setResult(null);
  }, []);

  const runPlayground = useCallback(async () => {
    const trimmedPrompt = prompt.trim();
    const selectedImageError = resolveSelectedImageError(selectedImage);

    if (!trimmedPrompt) {
      setError("A prompt is required.");
      return;
    }

    if (trimmedPrompt.length > AI_ENRICHMENT_PLAYGROUND_MAX_PROMPT_LENGTH) {
      setError(
        `Prompt must be ${AI_ENRICHMENT_PLAYGROUND_MAX_PROMPT_LENGTH.toLocaleString()} characters or fewer.`,
      );
      return;
    }

    if (selectedImageError) {
      setError(selectedImageError);
      return;
    }

    // Image is optional — an image-less run is a text-only prompt test.
    setIsRunning(true);
    setError(null);
    setResult(null);

    try {
      const preparedImage = selectedImage
        ? await preparePlaygroundCallableImage(selectedImage)
        : undefined;
      const response = await aiEnrichmentPlaygroundService.runPlayground({
        imageBase64: preparedImage?.imageBase64,
        imageContentType: preparedImage?.imageContentType,
        prompt: trimmedPrompt,
        visionModelId: resolveClientVisionModelId(
          visionModelId,
        ) as AiEnrichmentPlaygroundRequest["visionModelId"],
        captureFullTrace:
          canCaptureFullTrace && captureFullTrace ? true : undefined,
      });

      setResult(response);
    } catch (playgroundError) {
      const message =
        playgroundError instanceof Error ? playgroundError.message : "";
      if (/still too large|AI analysis|could not be decoded|encode an AI analysis/i.test(message)) {
        setError(message);
      } else {
        setError(
          resolveAiEnrichmentCallableErrorMessage(
            playgroundError,
            "playground",
          ),
        );
      }
    } finally {
      setIsRunning(false);
    }
  }, [canCaptureFullTrace, captureFullTrace, prompt, selectedImage, visionModelId]);

  const setCaptureFullTrace = useCallback(
    (value: boolean) => {
      if (canCaptureFullTrace) {
        setCaptureFullTraceState(value);
      }
    },
    [canCaptureFullTrace],
  );

  return {
    acceptedImageTypes,
    captureFullTrace,
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
    setCaptureFullTrace,
    setSelectedImage,
    setVisionModelId,
    visionModelId,
  };
}
