import { useEffect, useRef, useState } from "react";

import type {
  BatchImportFileManifestEntry,
  BatchImportJobId,
} from "../../../../../../../shared/types/import/batchImport.types";
import type { ImportPngWarning } from "../../../../../../../shared/types/import/importIpc.types";

import { Badge } from "../../../../shared/components/Badge";
import { Button } from "../../../../shared/components/Button";
import { importDesktopService } from "../../services/importDesktopService";
import { isValidatedFileIncluded } from "../../utils/batchImportDisplay";
import { BatchImportFileValidationWarnings } from "./BatchImportFileValidationWarnings";

interface BatchImportFileListProps {
  emptyMessage?: string;
  excludedFilePaths?: ReadonlySet<string>;
  files: BatchImportFileManifestEntry[];
  jobId?: BatchImportJobId;
  onToggleFileIncluded?: (filePath: string) => void;
  omittedWarningCodes?: ReadonlySet<ImportPngWarning["code"]>;
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
  file,
  jobId,
}: {
  file: BatchImportFileManifestEntry;
  jobId: BatchImportJobId | undefined;
}) {
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);

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

        setPreviewDataUrl(previewResult.data.dataUrl);
      })
      .catch(() => {
        if (isActive) {
          setPreviewDataUrl(null);
        }
      });

    return () => {
      isActive = false;
    };
  }, [file.filePath, hasBeenVisible, jobId, previewDataUrl]);

  if (!previewDataUrl) {
    return (
      <div
        aria-hidden="true"
        className="batch-import-file-preview-placeholder"
        ref={previewRef}
      />
    );
  }

  return (
    <img
      alt={`Preview of ${getFileLabel(file)}`}
      className="batch-import-file-preview-image"
      src={previewDataUrl}
    />
  );
}

export function BatchImportFileList({
  emptyMessage = "No files to display.",
  excludedFilePaths,
  files,
  jobId,
  onToggleFileIncluded,
  omittedWarningCodes,
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
          const validationWarnings =
            variant === "validated" && file.validation
              ? file.validation.warnings.filter((warning) => !omittedWarningCodes?.has(warning.code))
              : [];
          const isIncluded =
            variant !== "validated" ||
            !excludedFilePaths ||
            isValidatedFileIncluded(file.filePath, excludedFilePaths);

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
                <BatchImportFilePreview file={file} jobId={jobId} />
              ) : null}

              <div className="batch-import-file-list-entry">
                {variant === "validated" ? (
                  <div className="batch-import-file-list-name-row">
                    <span aria-hidden="true" className="batch-import-file-list-validated-mark">
                      ✓
                    </span>
                    <span className="batch-import-file-list-label">{getFileLabel(file)}</span>
                  </div>
                ) : (
                  <div className="batch-import-file-list-name">
                    <div>{getFileLabel(file)}</div>
                    {meta ? <div className="batch-import-file-list-meta">{meta}</div> : null}
                  </div>
                )}

                {variant === "validated" ? (
                  <BatchImportFileValidationWarnings warnings={validationWarnings} />
                ) : null}
              </div>

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
