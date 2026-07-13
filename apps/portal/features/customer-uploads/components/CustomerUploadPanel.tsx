'use client';

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';

import {
  CUSTOMER_UPLOAD_MAX_CONCURRENT_FINALIZE,
  CUSTOMER_UPLOAD_MAX_SINGLE_IMAGE_BYTES,
  CUSTOMER_UPLOAD_MAX_ZIP_COMPRESSED_BYTES,
} from '@fresh-prints/shared/constants/customerUpload/customerUploadLimits.constants';
import type { CustomerUploadPurpose } from '@fresh-prints/shared/types/customerUpload/customerUpload.enums';
import { formatFileSize } from '@fresh-prints/shared/utils/formatFileSize';

import { ArrowLeftIcon, PlusIcon, XIcon } from '../../shared/components/PortalIcons';
import { useCustomerUploadBatch } from '../hooks/useCustomerUploadBatch';
import { customerUploadService } from '../services/customerUploadService';

interface CustomerUploadPanelProps {
  /** Print-request attach success (ignored when purpose is catalog_donation). */
  onAttached?: (printRequestId: string) => void;
  /** Donation submit success. */
  onDonated?: () => void;
  onClose: () => void;
  purpose?: CustomerUploadPurpose;
  /** modal = near-fullscreen overlay (legacy); embedded = page content */
  variant?: 'modal' | 'embedded';
}

export function CustomerUploadPanel({
  onAttached,
  onDonated,
  onClose,
  purpose = 'print_request',
  variant = 'modal',
}: CustomerUploadPanelProps) {
  const isDonation = purpose === 'catalog_donation';
  const {
    rows,
    isProcessing,
    isAttaching,
    ownershipConfirmed,
    catalogUseAcknowledged,
    setOwnershipConfirmed,
    setCatalogUseAcknowledged,
    bannerError,
    batchNotes,
    readyCount,
    failedCount,
    uploadingCount,
    processingCount,
    canAttach,
    addFiles,
    removeRow,
    retryFailed,
    attachToRequest,
    submitDonation,
    reset,
  } = useCustomerUploadBatch({ purpose });

  const imageInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string | null>>({});

  const isBusy = isProcessing || isAttaching;

  useEffect(() => {
    if (variant !== 'modal') {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [variant]);

  useEffect(() => {
    if (variant !== 'modal') {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isBusy) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isBusy, onClose, variant]);

  useEffect(() => {
    let cancelled = false;
    async function loadPreviews() {
      const next: Record<string, string | null> = {};
      await Promise.all(
        rows.map(async (row) => {
          if (row.phase !== 'ready' || !row.previewStoragePath) {
            return;
          }
          next[row.localId] = await customerUploadService.getDownloadUrl(row.previewStoragePath);
        }),
      );
      if (!cancelled) {
        setPreviewUrls((current) => ({ ...current, ...next }));
      }
    }
    void loadPreviews();
    return () => {
      cancelled = true;
    };
  }, [rows]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      void addFiles(files);
    }
    event.target.value = '';
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer.files?.length) {
      void addFiles(event.dataTransfer.files);
    }
  };

  const handleSubmit = async () => {
    if (isDonation) {
      const ok = await submitDonation();
      if (ok) {
        onDonated?.();
        reset();
      }
      return;
    }

    const printRequestId = await attachToRequest();
    if (printRequestId) {
      onAttached?.(printRequestId);
      reset();
    }
  };

  const handleClose = () => {
    if (!isBusy) {
      onClose();
    }
  };

  const panelBody = (
    <>
        <header className="modal-header portal-customer-upload-modal-header">
          <div>
            <h2 id="portal-customer-upload-title">
              {variant === 'embedded' ? 'Choose files' : isDonation ? 'Donate designs' : 'Upload artwork'}
            </h2>
            <p className="portal-muted">
              {variant === 'embedded' ? (
                <>
                  PNG or WebP · up to {formatFileSize(CUSTOMER_UPLOAD_MAX_SINGLE_IMAGE_BYTES)} each ·
                  ZIP up to {formatFileSize(CUSTOMER_UPLOAD_MAX_ZIP_COMPRESSED_BYTES)} (images are
                  discovered and listed, then processed) ·{' '}
                  {CUSTOMER_UPLOAD_MAX_CONCURRENT_FINALIZE} at a time
                </>
              ) : (
                <>
                  Add PNG or WebP files, a folder, or one ZIP. Images up to{' '}
                  {formatFileSize(CUSTOMER_UPLOAD_MAX_SINGLE_IMAGE_BYTES)} each; ZIPs up to{' '}
                  {formatFileSize(CUSTOMER_UPLOAD_MAX_ZIP_COMPRESSED_BYTES)}. Upload up to{' '}
                  {CUSTOMER_UPLOAD_MAX_CONCURRENT_FINALIZE} images at a time.
                  {isDonation
                    ? ' Submitted donations go to Fresh Prints for review before any catalog listing.'
                    : ' Passing technical checks only means your file can print — it is not added to our design library unless approved.'}
                </>
              )}
            </p>
          </div>
          {variant === 'modal' ? (
            <button
              aria-label="Close"
              className="modal-close-button"
              disabled={isBusy}
              onClick={handleClose}
              type="button"
            >
              <XIcon size={14} />
            </button>
          ) : null}
        </header>

        <div className="modal-body portal-customer-upload-modal-body">
          <div
            className={`portal-customer-upload-dropzone${isDragging ? ' is-dragging' : ''}`}
            onDragEnter={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              setIsDragging(false);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
          >
            <p>Drop files here, or choose:</p>
            <div className="portal-customer-upload-actions">
              <button
                className="portal-button portal-button-secondary"
                disabled={isBusy}
                onClick={() => imageInputRef.current?.click()}
                type="button"
              >
                Images
              </button>
              <button
                className="portal-button portal-button-secondary"
                disabled={isBusy}
                onClick={() => folderInputRef.current?.click()}
                type="button"
              >
                Folder
              </button>
              <button
                className="portal-button portal-button-secondary"
                disabled={isBusy}
                onClick={() => zipInputRef.current?.click()}
                type="button"
              >
                ZIP
              </button>
            </div>
            <input
              accept=".png,.webp,image/png,image/webp"
              hidden
              multiple
              onChange={handleFileChange}
              ref={imageInputRef}
              type="file"
            />
            <input
              accept=".png,.webp,image/png,image/webp"
              hidden
              // @ts-expect-error webkitdirectory is supported in Chromium browsers
              webkitdirectory=""
              multiple
              onChange={handleFileChange}
              ref={folderInputRef}
              type="file"
            />
            <input
              accept=".zip,application/zip"
              hidden
              onChange={handleFileChange}
              ref={zipInputRef}
              type="file"
            />
          </div>

          {bannerError ? (
            <p className="portal-error" role="alert">
              {bannerError}
            </p>
          ) : null}

          {batchNotes.length > 0 ? (
            <ul className="portal-customer-upload-notes">
              {batchNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          ) : null}

          {rows.length > 0 ? (
            <div className="portal-customer-upload-summary" aria-live="polite">
              <span>{uploadingCount} uploading</span>
              <span>{processingCount} processing</span>
              <span>{readyCount} ready</span>
              <span>{failedCount} failed</span>
            </div>
          ) : null}

          <ul className="portal-customer-upload-file-list">
            {rows.map((row) => (
              <li className={`portal-customer-upload-file-row is-${row.phase}`} key={row.localId}>
                <div className="portal-customer-upload-file-preview">
                  {previewUrls[row.localId] ? (
                    <img alt="" src={previewUrls[row.localId] ?? undefined} />
                  ) : (
                    <span className="portal-customer-upload-file-preview-fallback" aria-hidden>
                      ART
                    </span>
                  )}
                </div>

                <div className="portal-customer-upload-file-main">
                  <div className="portal-customer-upload-file-copy">
                    <p className="portal-customer-upload-file-name" title={row.filename}>
                      {row.filename}
                    </p>
                    {typeof row.fileSizeBytes === 'number' ? (
                      <p className="portal-muted portal-customer-upload-file-size">
                        {formatFileSize(row.fileSizeBytes)}
                      </p>
                    ) : null}
                    <p className="portal-muted portal-customer-upload-stage">{row.progressLabel}</p>
                    {row.phase === 'uploading' && typeof row.uploadPercent === 'number' ? (
                      <div
                        aria-valuemax={100}
                        aria-valuemin={0}
                        aria-valuenow={row.uploadPercent}
                        className="portal-customer-upload-progress"
                        role="progressbar"
                      >
                        <span style={{ width: `${row.uploadPercent}%` }} />
                      </div>
                    ) : null}
                    {row.phase === 'validating' ||
                    row.phase === 'processing' ||
                    row.phase === 'uploaded' ? (
                      <div
                        aria-label="Server processing"
                        className="portal-customer-upload-progress is-indeterminate"
                        role="progressbar"
                      >
                        <span />
                      </div>
                    ) : null}
                    {row.errorMessage ? <p className="portal-error">{row.errorMessage}</p> : null}
                  </div>
                </div>

                {row.phase === 'queued' || row.phase === 'ready' || row.phase === 'failed' ? (
                  <button
                    className="portal-button portal-button-secondary portal-customer-upload-file-remove"
                    disabled={
                      isAttaching || (isProcessing && row.phase !== 'failed' && row.phase !== 'ready')
                    }
                    onClick={() => removeRow(row.localId)}
                    type="button"
                  >
                    Remove
                  </button>
                ) : null}
              </li>
            ))}
          </ul>

          {failedCount > 0 ? (
            <button
              className="portal-button portal-button-secondary"
              disabled={isBusy}
              onClick={() => void retryFailed()}
              type="button"
            >
              Retry failed
            </button>
          ) : null}

          <fieldset className="portal-customer-upload-confirmations">
            <legend>Confirmations</legend>
            {variant === 'modal' && !isDonation ? (
              <p className="portal-muted portal-customer-upload-confirm-help">
                Confirm you have the right to print this artwork. You can also allow Fresh Prints to
                consider it for our shared design library.
              </p>
            ) : null}
            {isDonation ? (
              <p className="portal-muted portal-customer-upload-confirm-help">
                Donations are not added to your Current Request. Both confirmations are required to
                submit.
              </p>
            ) : null}
            <label className="form-checkbox">
              <input
                checked={ownershipConfirmed}
                disabled={isBusy}
                onChange={(event) => setOwnershipConfirmed(event.target.checked)}
                type="checkbox"
              />
              <span>
                {isDonation
                  ? 'I own this artwork or have permission to donate it for catalog use.'
                  : 'I own this artwork or have permission to print it.'}
              </span>
            </label>
            <label className="form-checkbox">
              <input
                checked={catalogUseAcknowledged}
                disabled={isBusy}
                onChange={(event) => setCatalogUseAcknowledged(event.target.checked)}
                type="checkbox"
              />
              <span>
                {isDonation
                  ? 'I understand I am donating these images to Fresh Prints. If approved, they may be listed in the Design Library for other customers to request.'
                  : 'Fresh Prints may use this artwork in our design library for other customers.'}
              </span>
            </label>
          </fieldset>
        </div>

        <footer className="modal-footer portal-customer-upload-footer">
          <button
            className="portal-button portal-button-secondary portal-button-leading-icon"
            disabled={isBusy}
            onClick={handleClose}
            type="button"
          >
            <ArrowLeftIcon size={16} />
            {variant === 'embedded' ? 'Back' : 'Cancel'}
          </button>
          <button
            className="portal-button portal-button-primary portal-button-leading-icon"
            disabled={!canAttach}
            onClick={() => void handleSubmit()}
            type="button"
          >
            <PlusIcon size={16} />
            {isDonation
              ? isAttaching
                ? 'Submitting…'
                : 'Submit donation'
              : isAttaching
                ? 'Adding…'
                : 'Add to Current Request'}
          </button>
        </footer>
    </>
  );

  if (variant === 'embedded') {
    return (
      <section
        aria-labelledby="portal-customer-upload-title"
        className="portal-customer-upload-embedded"
      >
        {panelBody}
      </section>
    );
  }

  return (
    <div
      aria-labelledby="portal-customer-upload-title"
      aria-modal="true"
      className="modal-overlay modal-overlay-blur portal-customer-upload-overlay"
      onClick={handleClose}
      role="dialog"
    >
      <div
        className="modal-panel portal-customer-upload-modal"
        onClick={(event) => event.stopPropagation()}
      >
        {panelBody}
      </div>
    </div>
  );
}
