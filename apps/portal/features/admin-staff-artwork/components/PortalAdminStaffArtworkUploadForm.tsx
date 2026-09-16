'use client';

import { useEffect, useState, useRef, type ChangeEvent } from 'react';

import { usePortalAdminStaffArtworkUpload } from '../hooks/usePortalAdminStaffArtworkUpload';
import type { PortalAdminStaffArtworkUploadStatus } from '../types/portalAdminStaffArtwork.types';

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}m ${remainder.toString().padStart(2, '0')}s`;
}

function statusLabel(
  status: PortalAdminStaffArtworkUploadStatus,
  progressPercent: number,
  processingElapsedSeconds: number,
): string {
  switch (status) {
    case 'uploading':
      return `Uploading · ${progressPercent}%`;
    case 'processing':
      return processingElapsedSeconds > 0
        ? `Processing · building derivatives · ${formatElapsed(processingElapsedSeconds)}`
        : 'Processing · building derivatives…';
    case 'ready':
      return 'Ready';
    case 'failed':
      return 'Failed';
    default:
      return 'Queued';
  }
}

function PortalAdminStaffArtworkFileThumbnail({ file }: { file: File }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  if (!previewUrl) {
    return <span aria-hidden="true" className="portal-admin-upload-thumb portal-admin-upload-thumb--empty" />;
  }

  return (
    // Filename is already announced in the row; keep the image decorative.
    // eslint-disable-next-line @next/next/no-img-element
    <img alt="" className="portal-admin-upload-thumb" src={previewUrl} />
  );
}

function PortalAdminStaffArtworkUploadItemStatus({
  status,
  progressPercent,
}: {
  status: PortalAdminStaffArtworkUploadStatus;
  progressPercent: number;
}) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (status !== 'processing') {
      setElapsedSeconds(0);
      return;
    }

    setElapsedSeconds(0);
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [status]);

  return (
    <span className={status === 'processing' ? 'portal-admin-upload-status is-processing' : undefined}>
      {statusLabel(status, progressPercent, elapsedSeconds)}
    </span>
  );
}

export function PortalAdminStaffArtworkUploadForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = usePortalAdminStaffArtworkUpload();

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    upload.addFiles(Array.from(event.target.files ?? []));
    event.target.value = '';
  };

  return (
    <section aria-labelledby="portal-admin-staff-artwork-title" className="portal-admin-upload-card">
      <div className="portal-admin-upload-heading">
        <div>
          <p className="portal-eyebrow">Private Staff Artwork</p>
          <h2 id="portal-admin-staff-artwork-title">Upload PNG artwork</h2>
          <p className="portal-lead">Upload one or more PNGs. Each file is processed independently and will appear in Studio when ready.</p>
        </div>
        <div className="portal-admin-upload-actions">
          <input
            accept="image/png,.png"
            className="portal-visually-hidden"
            multiple
            onChange={handleFileChange}
            ref={inputRef}
            type="file"
          />
          <button className="portal-button portal-button-secondary" onClick={() => inputRef.current?.click()} type="button">
            {upload.items.length > 0 ? 'Upload more' : 'Choose PNG files'}
          </button>
          <button
            className="portal-button portal-button-primary"
            disabled={upload.isProcessing || upload.queuedCount === 0}
            onClick={upload.startUpload}
            type="button"
          >
            {upload.isProcessing ? 'Working…' : 'Start upload'}
          </button>
        </div>
      </div>

      <p className="portal-muted">PNG only · up to 80 MB per file · unassigned · Auto background</p>
      {upload.selectionError ? <p className="portal-form-error" role="alert">{upload.selectionError}</p> : null}
      {upload.successMessage ? <p className="portal-form-success" role="status">{upload.successMessage}</p> : null}

      {upload.items.length > 0 ? (
        <>
          <div className="portal-admin-upload-list-toolbar">
            <p className="portal-muted portal-admin-upload-list-count">
              {upload.items.length} file{upload.items.length === 1 ? '' : 's'}
            </p>
            {upload.clearableCount > 0 ? (
              <button
                className="portal-link-button portal-admin-upload-clear-all"
                onClick={upload.clearAll}
                type="button"
              >
                Clear all
              </button>
            ) : null}
          </div>
          <ul aria-label="Staff Artwork upload files" className="portal-admin-upload-list">
            {upload.items.map((item) => (
              <li className={`portal-admin-upload-item is-${item.status}`} key={item.id}>
                <div className="portal-admin-upload-item-main">
                  <PortalAdminStaffArtworkFileThumbnail file={item.file} />
                  <div className="portal-admin-upload-item-copy">
                    <strong>{item.fileName}</strong>
                    <div className="portal-admin-upload-item-meta">
                      <PortalAdminStaffArtworkUploadItemStatus
                        progressPercent={item.progressPercent}
                        status={item.status}
                      />
                      {item.status === 'queued' || item.status === 'failed' ? (
                        <button
                          aria-label={`Remove ${item.fileName}`}
                          className="portal-admin-upload-remove"
                          onClick={() => upload.removeItem(item.id)}
                          type="button"
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
                {item.status === 'failed' && item.errorMessage ? <p className="portal-form-error">{item.errorMessage}</p> : null}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="portal-admin-upload-empty">Choose PNG files to begin.</div>
      )}

      {upload.failedCount > 0 ? (
        <div className="portal-admin-upload-retry">
          <p className="portal-form-error" role="alert">{upload.failedCount} file{upload.failedCount === 1 ? '' : 's'} failed. Retry only failed files.</p>
          <button className="portal-button portal-button-secondary" disabled={upload.isProcessing} onClick={upload.retryFailed} type="button">Retry failed</button>
        </div>
      ) : null}
    </section>
  );
}
