'use client';

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';

import {
  CUSTOMER_UPLOAD_MAX_CONCURRENT_FINALIZE,
} from '@fresh-prints/shared/constants/customerUpload/customerUploadLimits.constants';
import type { GetCustomerUploadDailyQuotaResponse } from '@fresh-prints/shared/types/customerUpload/customerUploadDailyQuota.types';
import type { CustomerUploadPurpose } from '@fresh-prints/shared/types/customerUpload/customerUpload.enums';
import { formatFileSize } from '@fresh-prints/shared/utils/formatFileSize';
import {
  formatWorkingRequestFullUploadOverlayBody,
  formatWorkingRequestFullUploadOverlayTitle,
  formatWorkingRequestUploadRoomHint,
  resolveWorkingRequestLimitBannerTone,
  type WorkingRequestLimitBannerTone,
} from '@fresh-prints/shared/utils/printRequestWorkingRequestMax';
import {
  ArrowLeftIcon,
  CircleHelpIcon,
  PlusIcon,
  XIcon,
} from '../../shared/components/PortalIcons';
import { useLiveQuotaRefresh } from '../../shared/hooks/useLiveQuotaRefresh';
import { useAuth } from '../../auth/context/AuthContext';
import { usePortalPrintRequests } from '../../print-requests/context/PortalPrintRequestContext';
import { useCustomerUploadBatch } from '../hooks/useCustomerUploadBatch';
import {
  customerUploadService,
  defaultCustomerUploadSizeLimits,
} from '../services/customerUploadService';
import {
  buildReadyPreviewFetchKey,
  resolvePreviewUrlsLimited,
} from '../utils/resolvePreviewUrlsLimited';
import { formatCustomerUploadDailyQuota } from '../utils/formatCustomerUploadDailyQuota';
import { resolveCustomerUploadAttachDisabledReason } from '../utils/resolveCustomerUploadAttachDisabledReason';

const PREVIEW_URL_FETCH_CONCURRENCY = 3;

function quotaToneClassName(tone: WorkingRequestLimitBannerTone): string {
  if (tone === 'exhausted') {
    return 'is-exhausted';
  }
  if (tone === 'warning') {
    return 'is-warning';
  }
  return 'is-healthy';
}

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
  const { firebaseUser } = useAuth();
  const { workingRequestLimit } = usePortalPrintRequests();
  const isQuotaReady = isDonation || workingRequestLimit.isReady;
  const isQuotaPending = !isDonation && !workingRequestLimit.isReady;
  const isRequestFull =
    !isDonation && workingRequestLimit.isReady && workingRequestLimit.isRequestFull;
  const printSlotsRemaining =
    !isDonation && workingRequestLimit.isReady && workingRequestLimit.limit != null
      ? workingRequestLimit.roomRemaining
      : null;
  const [dailyQuota, setDailyQuota] = useState<GetCustomerUploadDailyQuotaResponse | null>(null);
  const sizeLimits = dailyQuota
    ? {
        maxSingleImageBytes: dailyQuota.maxSingleImageBytes,
        maxZipBytes: dailyQuota.maxZipBytes,
      }
    : defaultCustomerUploadSizeLimits(purpose);
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
    addFiles,
    removeRow,
    retryFailed,
    attachToRequest,
    submitDonation,
    respondToHalftone,
    reset,
    abandonUnconfirmedUploads,
  } = useCustomerUploadBatch({
    purpose,
    sizeLimits,
    maxImagesForRequest: printSlotsRemaining,
  });

  const imageInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string | null>>({});
  const [isHalftoneHelpOpen, setIsHalftoneHelpOpen] = useState(false);
  const wasProcessingRef = useRef(false);

  const isBusy = isProcessing || isAttaching;

  const refreshDailyQuota = useCallback(async () => {
    if (!firebaseUser) {
      setDailyQuota(null);
      return;
    }
    try {
      const next = await customerUploadService.getDailyQuota(purpose);
      setDailyQuota(next);
    } catch {
      // Soft-fail: do not block uploads if remaining display cannot load.
    }
  }, [firebaseUser, purpose]);

  useLiveQuotaRefresh(refreshDailyQuota, { enabled: Boolean(firebaseUser) });

  useEffect(() => {
    if (wasProcessingRef.current && !isProcessing) {
      customerUploadService.invalidateDailyQuota();
      void refreshDailyQuota();
    }
    wasProcessingRef.current = isProcessing;
  }, [isProcessing, refreshDailyQuota]);

  useEffect(() => {
    if (variant !== 'modal' && !isHalftoneHelpOpen) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isHalftoneHelpOpen, variant]);

  // Do not create object URLs for every queued file — large PNG batches (30–60MB × dozens)
  // exhaust browser memory and break half the thumbnails. Show ART until a server preview is ready.
  const readyPreviewKey = buildReadyPreviewFetchKey(rows);

  useEffect(() => {
    if (!readyPreviewKey) {
      return;
    }
    let cancelled = false;
    const items = rows
      .filter((row) => row.phase === 'ready' && row.previewStoragePath)
      .map((row) => ({
        localId: row.localId,
        previewStoragePath: row.previewStoragePath as string,
      }));

    void (async () => {
      const resolved = await resolvePreviewUrlsLimited({
        alreadyHave: previewUrls,
        concurrency: PREVIEW_URL_FETCH_CONCURRENCY,
        getDownloadUrl: async (storagePath) => {
          const url = await customerUploadService.getDownloadUrl(storagePath);
          if (!url) {
            throw new Error('Preview URL unavailable');
          }
          return url;
        },
        items,
      });
      if (cancelled || Object.keys(resolved).length === 0) {
        return;
      }
      setPreviewUrls((current) => ({ ...current, ...resolved }));
    })();

    return () => {
      cancelled = true;
    };
    // previewUrls intentionally omitted — we pass a snapshot via alreadyHave and skip cached ids
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by readyPreviewKey
  }, [readyPreviewKey]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (isRequestFull || isQuotaPending) {
      event.target.value = '';
      return;
    }
    const files = event.target.files;
    if (files && files.length > 0) {
      void addFiles(files);
    }
    event.target.value = '';
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (isRequestFull || isQuotaPending) {
      return;
    }
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

  const handleClose = useCallback(() => {
    if (isBusy) {
      return;
    }
    void (async () => {
      await abandonUnconfirmedUploads();
      await refreshDailyQuota();
      onClose();
    })();
  }, [abandonUnconfirmedUploads, isBusy, onClose, refreshDailyQuota]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }
      if (isHalftoneHelpOpen) {
        setIsHalftoneHelpOpen(false);
        return;
      }
      if (variant === 'modal' && !isBusy) {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose, isBusy, isHalftoneHelpOpen, variant]);

  const uploadBlocked = isBusy || isRequestFull || isQuotaPending;
  const attachDisabledReason = resolveCustomerUploadAttachDisabledReason({
    isDonation,
    readyCount,
    ownershipConfirmed,
    catalogUseAcknowledged,
    isProcessing,
    isAttaching,
    isQuotaReady,
    isRequestFull,
    canAddPrints: isDonation ? true : workingRequestLimit.canAddPrints,
    exhaustedStatusText: workingRequestLimit.exhaustedStatusText,
    maxImagesForRequest: printSlotsRemaining,
  });
  const isAttachDisabled = attachDisabledReason != null;
  const needsOwnershipToAttach =
    readyCount > 0 &&
    !ownershipConfirmed &&
    !isBusy &&
    !isRequestFull &&
    !isQuotaPending &&
    (isDonation || workingRequestLimit.canAddPrints);
  // When the full-request overlay is up, skip the footer hint — same copy would duplicate.
  const showAttachDisabledHint =
    isAttachDisabled &&
    Boolean(attachDisabledReason) &&
    !isAttaching &&
    !isRequestFull &&
    !isQuotaPending &&
    (readyCount > 0 ||
      (!isDonation && workingRequestLimit.isReady && !workingRequestLimit.canAddPrints));
  const requestRoomTone =
    !isDonation &&
    printSlotsRemaining != null &&
    workingRequestLimit.limit != null
      ? resolveWorkingRequestLimitBannerTone(printSlotsRemaining, workingRequestLimit.limit)
      : null;
  const donateQuotaTone =
    isDonation && dailyQuota
      ? resolveWorkingRequestLimitBannerTone(dailyQuota.images.remaining, dailyQuota.images.limit)
      : null;
  const fullOverlayTitle =
    workingRequestLimit.limit != null
      ? formatWorkingRequestFullUploadOverlayTitle(workingRequestLimit.limit)
      : 'This request is full';
  const fullOverlayBody = formatWorkingRequestFullUploadOverlayBody();

  const panelBody = (
    <>
        {variant === 'modal' ? (
          <header className="modal-header portal-customer-upload-modal-header">
            <div>
              <h2 id="portal-customer-upload-title">
                {isDonation ? 'Donate designs' : 'Upload artwork'}
              </h2>
              <p className="portal-muted">
                {isDonation
                  ? 'Submitted donations go to Fresh Prints for review before any catalog listing.'
                  : 'Passing technical checks only means your file can print. It is not added to our design library unless approved.'}
              </p>
            </div>
            <button
              aria-label="Close"
              className="modal-close-button"
              disabled={isBusy}
              onClick={handleClose}
              type="button"
            >
              <XIcon size={14} />
            </button>
          </header>
        ) : null}

        <div className="portal-customer-upload-interactive">
          {isQuotaPending ? (
            <div
              aria-busy="true"
              aria-live="polite"
              className="portal-customer-upload-request-full-overlay portal-customer-upload-quota-pending-overlay"
              role="status"
            >
              <div className="portal-customer-upload-quota-pending-card">
                <p>Checking print limits…</p>
              </div>
            </div>
          ) : null}
          {isRequestFull ? (
            <div
              aria-describedby="portal-customer-upload-full-body"
              aria-labelledby="portal-customer-upload-full-title"
              aria-modal="true"
              className="portal-customer-upload-request-full-overlay"
              role="alertdialog"
            >
              <div className="portal-customer-upload-request-full-card">
                <h2 id="portal-customer-upload-full-title">{fullOverlayTitle}</h2>
                <p id="portal-customer-upload-full-body">{fullOverlayBody}</p>
                <button
                  className="portal-button portal-button-secondary portal-button-leading-icon"
                  onClick={handleClose}
                  type="button"
                >
                  <ArrowLeftIcon size={16} />
                  {variant === 'embedded' ? 'Back' : 'Close'}
                </button>
              </div>
            </div>
          ) : null}

          <div
            aria-hidden={isRequestFull || isQuotaPending ? true : undefined}
            className={`modal-body portal-customer-upload-modal-body${isRequestFull || isQuotaPending ? ' is-request-full-blocked' : ''}`}
          >
          <div
            className={`portal-customer-upload-dropzone${isDragging ? ' is-dragging' : ''}${isRequestFull || isQuotaPending ? ' is-disabled' : ''}`}
            onDragEnter={(event) => {
              if (isRequestFull || isQuotaPending) {
                return;
              }
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              setIsDragging(false);
            }}
            onDragOver={(event) => {
              if (isRequestFull || isQuotaPending) {
                return;
              }
              event.preventDefault();
            }}
            onDrop={handleDrop}
          >
            <p className="portal-customer-upload-file-limits">
              PNG or WebP · up to {formatFileSize(sizeLimits.maxSingleImageBytes)} each · ZIP up to{' '}
              {formatFileSize(sizeLimits.maxZipBytes)} (images are discovered and listed, then
              processed) ·{' '}
              {dailyQuota?.maxConcurrentFinalize ?? CUSTOMER_UPLOAD_MAX_CONCURRENT_FINALIZE} at a
              time
            </p>
            <p>Drop files here, or choose:</p>
            <div className="portal-customer-upload-actions">
              <button
                className="portal-button portal-button-secondary"
                disabled={uploadBlocked}
                onClick={() => imageInputRef.current?.click()}
                type="button"
              >
                Images
              </button>
              <button
                className="portal-button portal-button-secondary"
                disabled={uploadBlocked}
                onClick={() => folderInputRef.current?.click()}
                type="button"
              >
                Folder
              </button>
              <button
                className="portal-button portal-button-secondary"
                disabled={uploadBlocked}
                onClick={() => zipInputRef.current?.click()}
                type="button"
              >
                ZIP
              </button>
            </div>
            <input
              accept=".png,.webp,image/png,image/webp"
              disabled={isRequestFull}
              hidden
              multiple
              onChange={handleFileChange}
              ref={imageInputRef}
              type="file"
            />
            <input
              accept=".png,.webp,image/png,image/webp"
              disabled={isRequestFull}
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
              disabled={isRequestFull}
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
                    <img
                      alt=""
                      loading="lazy"
                      decoding="async"
                      src={previewUrls[row.localId] ?? undefined}
                    />
                  ) : (
                    <span className="portal-customer-upload-file-preview-fallback" aria-hidden>
                      ART
                    </span>
                  )}
                </div>

                <div className="portal-customer-upload-file-main">
                  <p className="portal-customer-upload-file-name" title={row.filename}>
                    {row.filename}
                  </p>

                  <div className="portal-customer-upload-file-copy">
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

                {row.phase === 'ready' ? (
                  <div className="portal-customer-upload-halftone-confirm">
                    <div className="portal-customer-upload-halftone-control">
                      <label className="portal-customer-upload-halftone-label">
                        <input
                          checked={row.halftoneResponseDraft === 'yes'}
                          disabled={isAttaching || isRequestFull}
                          onChange={(event) => {
                            respondToHalftone(
                              row.localId,
                              event.target.checked ? 'yes' : 'no',
                            );
                          }}
                          type="checkbox"
                        />
                        <span>This artwork is a halftone design.</span>
                      </label>
                      <button
                        aria-haspopup="dialog"
                        aria-label="What is a halftone design?"
                        className="portal-customer-upload-halftone-help-toggle"
                        disabled={isRequestFull}
                        onClick={() => {
                          setIsHalftoneHelpOpen(true);
                        }}
                        type="button"
                      >
                        <CircleHelpIcon size={16} />
                      </button>
                    </div>
                    {row.halftoneResponseError ? (
                      <p className="portal-error" role="alert">
                        {row.halftoneResponseError}{' '}
                        <button
                          className="portal-customer-upload-halftone-retry"
                          disabled={isAttaching || isRequestFull}
                          onClick={() => {
                            respondToHalftone(
                              row.localId,
                              row.halftoneResponseDraft === 'yes' ? 'yes' : 'no',
                            );
                          }}
                          type="button"
                        >
                          Retry
                        </button>
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {row.phase === 'queued' || row.phase === 'ready' || row.phase === 'failed' ? (
                  <button
                    className="portal-button portal-button-secondary portal-customer-upload-file-remove"
                    disabled={
                      isRequestFull ||
                      isAttaching ||
                      (isProcessing && row.phase !== 'failed' && row.phase !== 'ready')
                    }
                    onClick={() => {
                      void (async () => {
                        await removeRow(row.localId);
                        await refreshDailyQuota();
                      })();
                    }}
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
              disabled={uploadBlocked}
              onClick={() => void retryFailed()}
              type="button"
            >
              Retry failed
            </button>
          ) : null}

          <fieldset
            className={`portal-customer-upload-confirmations${
              needsOwnershipToAttach ? ' is-required-attention' : ''
            }`}
            disabled={isRequestFull}
          >
            <legend>Confirmations</legend>
            {!isDonation ? (
              <p className="portal-muted portal-customer-upload-confirm-help">
                Check that you have the right to print this artwork before adding it to your
                request. Library use is optional.
              </p>
            ) : (
              <p className="portal-muted portal-customer-upload-confirm-help">
                Donations are not added to Current Request. Both confirmations are required to
                submit.
              </p>
            )}
            <label
              className={`form-checkbox${needsOwnershipToAttach ? ' is-required-attention' : ''}`}
            >
              <input
                checked={ownershipConfirmed}
                disabled={uploadBlocked}
                onChange={(event) => setOwnershipConfirmed(event.target.checked)}
                type="checkbox"
              />
              <span>
                {isDonation
                  ? 'I own this artwork or have permission to donate it for catalog use.'
                  : 'I own this artwork or have permission to print it.'}{' '}
                <span className="portal-customer-upload-required-mark">(required)</span>
              </span>
            </label>
            <label className="form-checkbox">
              <input
                checked={catalogUseAcknowledged}
                disabled={uploadBlocked}
                onChange={(event) => setCatalogUseAcknowledged(event.target.checked)}
                type="checkbox"
              />
              <span>
                {isDonation
                  ? 'I understand I am donating these images to Fresh Prints. If approved, they may be listed in the Design Library for other customers to request.'
                  : 'Fresh Prints may use this artwork in our design library for other customers.'}
                {isDonation ? (
                  <>
                    {' '}
                    <span className="portal-customer-upload-required-mark">(required)</span>
                  </>
                ) : null}
              </span>
            </label>
          </fieldset>
          </div>
        </div>

        <footer className="modal-footer portal-customer-upload-footer">
          {isDonation && dailyQuota && donateQuotaTone ? (
            <p
              className={`portal-customer-upload-quota ${quotaToneClassName(donateQuotaTone)}`}
              role="status"
            >
              {formatCustomerUploadDailyQuota(dailyQuota)}
            </p>
          ) : null}
          {!isDonation &&
          !isRequestFull &&
          workingRequestLimit.isReady &&
          printSlotsRemaining != null &&
          requestRoomTone ? (
            <p
              className={`portal-customer-upload-quota ${quotaToneClassName(requestRoomTone)}`}
              role="status"
            >
              {formatWorkingRequestUploadRoomHint(printSlotsRemaining)}
            </p>
          ) : null}
          <div className="portal-customer-upload-footer-actions">
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
              aria-describedby={
                showAttachDisabledHint ? 'portal-customer-upload-attach-hint' : undefined
              }
              className="portal-button portal-button-primary portal-button-leading-icon"
              disabled={isAttachDisabled}
              onClick={() => void handleSubmit()}
              title={attachDisabledReason ?? undefined}
              type="button"
            >
              <PlusIcon size={16} />
              {isDonation
                ? isAttaching
                  ? 'Submitting…'
                  : 'Submit donation'
                : isAttaching
                  ? 'Adding…'
                  : 'Add to Request'}
            </button>
          </div>
          {showAttachDisabledHint ? (
            <p
              className="portal-muted portal-customer-upload-attach-hint"
              id="portal-customer-upload-attach-hint"
              role="status"
            >
              {attachDisabledReason}
            </p>
          ) : null}
        </footer>
    </>
  );

  const halftoneHelpModal = isHalftoneHelpOpen ? (
    <div
      aria-labelledby="portal-halftone-help-title"
      aria-modal="true"
      className="modal-overlay modal-overlay-blur portal-customer-upload-halftone-help-overlay"
      onClick={() => {
        setIsHalftoneHelpOpen(false);
      }}
      role="dialog"
    >
      <div
        className="modal-panel portal-customer-upload-halftone-help-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <h2 id="portal-halftone-help-title">What is a halftone design?</h2>
          <button
            aria-label="Close"
            className="modal-close-button"
            onClick={() => {
              setIsHalftoneHelpOpen(false);
            }}
            type="button"
          >
            <XIcon size={18} />
          </button>
        </header>
        <div className="modal-body">
          <p className="portal-customer-upload-halftone-help-copy">
            Halftone artwork uses many small dots, holes, or openings to create shading and detail.
            Mark this only if you know the design is a true halftone.
          </p>
          <p className="portal-muted portal-customer-upload-halftone-help-copy">
            This selection is optional and does not block upload, donation, or submission.
          </p>
        </div>
        <footer className="modal-footer">
          <button
            className="portal-button portal-button-primary"
            onClick={() => {
              setIsHalftoneHelpOpen(false);
            }}
            type="button"
          >
            Got it
          </button>
        </footer>
      </div>
    </div>
  ) : null;

  if (variant === 'embedded') {
    return (
      <>
        <section
          aria-label={isDonation ? 'Donate designs' : 'Upload artwork'}
          className={`portal-customer-upload-embedded${isRequestFull ? ' is-request-full' : ''}${isQuotaPending ? ' is-quota-pending' : ''}`}
        >
          {panelBody}
        </section>
        {halftoneHelpModal}
      </>
    );
  }

  return (
    <>
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
      {halftoneHelpModal}
    </>
  );
}
