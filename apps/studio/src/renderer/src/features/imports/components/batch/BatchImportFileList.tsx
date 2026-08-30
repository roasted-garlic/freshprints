import { useEffect, useRef, useState } from "react";

import type {
  BatchImportFileManifestEntry,
  BatchImportJobId,
} from "@fresh-prints/shared/types/import/batchImport.types";
import type { ImportPngWarning } from "@fresh-prints/shared/types/import/importIpc.types";
import type {
  ImportArtworkBackgroundMode,
  ImportHalftoneMode,
} from "@fresh-prints/shared/types/design/artworkBackgroundSource.types";
import type { ImportItemBackgroundOverride } from "@fresh-prints/shared/utils/resolveImportArtworkBackgroundDecision";
import type { ImportItemHalftoneOverride } from "@fresh-prints/shared/utils/resolveImportArtworkBackgroundDecision";
import { resolveImportPreviewBackgroundCssHex } from "@fresh-prints/shared/utils/resolveImportArtworkBackgroundDecision";

import { Badge } from "../../../../shared/components/Badge";
import { Button } from "../../../../shared/components/Button";
import { importDesktopService } from "../../services/importDesktopService";
import { isValidatedFileIncluded } from "../../utils/batchImportDisplay";
import { ImportPreviewControls } from "../ImportPreviewControls";
import { ImportPreviewLightbox } from "../ImportPreviewLightbox";
import { ImportValidationWarningsTrigger } from "../ImportValidationWarningsTrigger";

interface BatchImportFileListProps {
  backgroundMode?: ImportArtworkBackgroundMode;
  emptyMessage?: string;
  excludedFilePaths?: ReadonlySet<string>;
  files: BatchImportFileManifestEntry[];
  halftoneMode?: ImportHalftoneMode;
  itemBackgroundOverrides?: Readonly<Record<string, ImportItemBackgroundOverride>>;
  itemHalftoneOverrides?: Readonly<Record<string, ImportItemHalftoneOverride>>;
  jobId?: BatchImportJobId;
  onItemBackgroundOverrideChange?: (
    filePath: string,
    value: ImportItemBackgroundOverride,
  ) => void;
  onItemHalftoneOverrideChange?: (
    filePath: string,
    value: ImportItemHalftoneOverride,
  ) => void;
  onSuggestDarkDetected?: (filePath: string, suggestDark: boolean) => void;
  onToggleFileIncluded?: (filePath: string) => void;
  omittedWarningCodes?: ReadonlySet<ImportPngWarning["code"]>;
  suggestDarkByPath?: Readonly<Record<string, boolean>>;
  title: string;
  variant?: "default" | "rejected" | "validated";
}

function getFileLabel(file: BatchImportFileManifestEntry): string {
  return file.relativePath ?? file.displayName;
}

function getFileMeta(file: BatchImportFileManifestEntry): string | null {
  if (file.outcome === "rejected" && file.rejection) {
    return file.rejection.message;
  }

  if (file.skipReason) {
    return file.skipReason;
  }

  return null;
}

function BatchImportFilePreview({
  backgroundMode,
  file,
  halftoneMode,
  itemBackgroundOverride,
  itemHalftoneOverride,
  jobId,
  onSuggestDarkDetected,
  suggestDark,
}: {
  backgroundMode: ImportArtworkBackgroundMode;
  file: BatchImportFileManifestEntry;
  halftoneMode: ImportHalftoneMode;
  itemBackgroundOverride: ImportItemBackgroundOverride;
  itemHalftoneOverride: ImportItemHalftoneOverride;
  jobId: BatchImportJobId | undefined;
  onSuggestDarkDetected?: (filePath: string, suggestDark: boolean) => void;
  suggestDark: boolean;
}) {
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [localSuggestDark, setLocalSuggestDark] = useState(suggestDark);
  const fileLabel = getFileLabel(file);
  const effectiveSuggestDark = suggestDark || localSuggestDark;
  const matHex = resolveImportPreviewBackgroundCssHex({
    backgroundMode,
    halftoneMode,
    autoSuggestsDark: effectiveSuggestDark,
    itemBackgroundOverride,
    itemHalftoneOverride,
  });

  useEffect(() => {
    setLocalSuggestDark(suggestDark);
  }, [suggestDark]);

  useEffect(() => {
    const previewElement = previewRef.current;

    if (!previewElement || hasBeenVisible) {
      return;
    }

    if (!("IntersectionObserver" in window)) {
      setHasBeenVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setHasBeenVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "120px" },
    );

    observer.observe(previewElement);

    return () => {
      observer.disconnect();
    };
  }, [hasBeenVisible]);

  useEffect(() => {
    if (!jobId || !hasBeenVisible || previewDataUrl !== null) {
      return;
    }

    let isActive = true;

    void importDesktopService
      .getSelectedPngPreview({
        filePath: file.filePath,
        jobId,
      })
      .then((previewResult) => {
        if (!isActive || !previewResult.success) {
          return;
        }

        const detected = previewResult.data.suggestDarkArtworkBackground === true;
        setPreviewDataUrl(previewResult.data.dataUrl);
        setLocalSuggestDark(detected);
        onSuggestDarkDetected?.(file.filePath, detected);
      })
      .catch(() => {
        if (isActive) {
          setPreviewDataUrl(null);
        }
      });

    return () => {
      isActive = false;
    };
  }, [file.filePath, hasBeenVisible, jobId, onSuggestDarkDetected, previewDataUrl]);

  return (
    <div className="batch-import-file-preview-shell" ref={previewRef}>
      {previewDataUrl ? (
        <button
          aria-label={`Open preview of ${fileLabel}`}
          className="batch-import-file-preview-button"
          onClick={() => setIsPreviewOpen(true)}
          style={{ background: matHex }}
          type="button"
        >
          <img
            alt={`Preview of ${fileLabel}`}
            className="batch-import-file-preview-image"
            src={previewDataUrl}
            style={{ background: matHex }}
          />
        </button>
      ) : (
        <div
          aria-hidden="true"
          className="batch-import-file-preview-placeholder"
          style={{ background: matHex }}
        />
      )}
      <ImportPreviewLightbox
        alt={`Preview of ${fileLabel}`}
        backgroundCssHex={matHex}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        previewDataUrl={previewDataUrl}
        title={fileLabel}
      />
    </div>
  );
}

export function BatchImportFileList({
  backgroundMode = "auto",
  emptyMessage = "No files to display.",
  excludedFilePaths,
  files,
  halftoneMode = "normal",
  itemBackgroundOverrides,
  itemHalftoneOverrides,
  jobId,
  onItemBackgroundOverrideChange,
  onItemHalftoneOverrideChange,
  onSuggestDarkDetected,
  onToggleFileIncluded,
  omittedWarningCodes,
  suggestDarkByPath,
  title,
  variant = "default",
}: BatchImportFileListProps) {
  const items = files;

  if (files.length === 0) {
    return (
      <div className="batch-import-file-list">
        <h4>{title}</h4>
        <p className="batch-import-file-list-remaining">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="batch-import-file-list">
      {title ? <h4>{title}</h4> : null}
      <ul>
        {items.map((file) => {
          const meta = getFileMeta(file);
          const fileLabel = getFileLabel(file);
          const validationWarnings =
            variant === "validated" && file.validation
              ? file.validation.warnings.filter((warning) => !omittedWarningCodes?.has(warning.code))
              : [];
          const isIncluded =
            variant !== "validated" ||
            !excludedFilePaths ||
            isValidatedFileIncluded(file.filePath, excludedFilePaths);
          const itemBackgroundOverride = itemBackgroundOverrides?.[file.filePath] ?? "auto";
          const itemHalftoneOverride = itemHalftoneOverrides?.[file.filePath] ?? "auto";
          const suggestDark = suggestDarkByPath?.[file.filePath] === true;
          const showRowControls =
            variant === "validated" &&
            (Boolean(onItemBackgroundOverrideChange) || Boolean(onItemHalftoneOverrideChange));

          return (
            <li
              className={
                variant === "validated" && !isIncluded
                  ? "batch-import-file-list-item-excluded"
                  : undefined
              }
              key={file.filePath}
            >
              {variant === "validated" ? (
                <BatchImportFilePreview
                  backgroundMode={backgroundMode}
                  file={file}
                  halftoneMode={halftoneMode}
                  itemBackgroundOverride={itemBackgroundOverride}
                  itemHalftoneOverride={itemHalftoneOverride}
                  jobId={jobId}
                  onSuggestDarkDetected={onSuggestDarkDetected}
                  suggestDark={suggestDark}
                />
              ) : null}

              {showRowControls ? (
                <div className="batch-import-file-list-controls-row">
                  <ImportPreviewControls
                    autoSuggestsDark={suggestDark}
                    backgroundMode={backgroundMode}
                    halftoneMode={halftoneMode}
                    itemBackgroundOverride={itemBackgroundOverride}
                    itemHalftoneOverride={itemHalftoneOverride}
                    layout="inline"
                    onItemBackgroundOverrideChange={
                      onItemBackgroundOverrideChange
                        ? (value) => onItemBackgroundOverrideChange(file.filePath, value)
                        : undefined
                    }
                    onItemHalftoneOverrideChange={
                      onItemHalftoneOverrideChange
                        ? (value) => onItemHalftoneOverrideChange(file.filePath, value)
                        : undefined
                    }
                    showBackgroundPicker={Boolean(onItemBackgroundOverrideChange)}
                  />
                  <ImportValidationWarningsTrigger
                    fileLabel={fileLabel}
                    warnings={validationWarnings}
                  />
                </div>
              ) : (
                <div className="batch-import-file-list-entry">
                  <div className="batch-import-file-list-name">
                    <div>{fileLabel}</div>
                    {meta ? <div className="batch-import-file-list-meta">{meta}</div> : null}
                  </div>
                </div>
              )}

              <div className="batch-import-file-list-actions">
                {variant === "validated" && !isIncluded ? (
                  <Badge variant="default">Not uploading</Badge>
                ) : null}
                {variant === "validated" ? <Badge variant="success">Validated</Badge> : null}
                {variant === "rejected" ? <Badge variant="danger">Rejected</Badge> : null}
                {variant === "validated" && onToggleFileIncluded ? (
                  <Button
                    aria-pressed={!isIncluded}
                    onClick={() => onToggleFileIncluded(file.filePath)}
                    size="sm"
                    variant={isIncluded ? "ghost" : "secondary"}
                  >
                    {isIncluded ? "Exclude" : "Include"}
                  </Button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
