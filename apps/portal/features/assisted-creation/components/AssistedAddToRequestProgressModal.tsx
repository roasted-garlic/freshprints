'use client';

import { useEffect, useRef, useState } from 'react';

import type {
  AssistedCreationAddToRequestProgress,
  AssistedCreationAddToRequestProgressStage,
} from '@fresh-prints/shared/types/assistedCreation/assistedCreation.types';

export type AssistedAddToRequestProgressPhase =
  | 'preparing'
  | 'adding'
  | 'done'
  | 'error';

export type AssistedAddToRequestProgressArtworkKind = 'final' | 'proof';

export interface AssistedAddToRequestProgressModalProps {
  artworkKind?: AssistedAddToRequestProgressArtworkKind;
  errorMessage?: string | null;
  isOpen: boolean;
  onDismiss: () => void;
  phase: AssistedAddToRequestProgressPhase;
  serverProgress?: AssistedCreationAddToRequestProgress | null;
}

const PROGRESS_STEPS = [
  { key: 'resolve', label: 'Locate approved artwork' },
  { key: 'download', label: 'Load artwork' },
  { key: 'process', label: 'Prepare artwork' },
  { key: 'save', label: 'Save prepared artwork' },
  { key: 'attach', label: 'Add to request' },
] as const;

const PROCESSING_STAGES = new Set<AssistedCreationAddToRequestProgressStage>([
  'checking_format',
  'checking_transparency',
  'converting_format',
  'trimming',
  'upscaling',
  'preparing_artwork',
  'checking_print_size',
  'creating_previews',
]);

function progressStepForStage(stage: AssistedCreationAddToRequestProgressStage): number {
  if (stage === 'resolving_proof') {
    return 1;
  }
  if (stage === 'downloading') {
    return 2;
  }
  if (PROCESSING_STAGES.has(stage)) {
    return 3;
  }
  if (stage === 'saving') {
    return 4;
  }
  return 5;
}

function customerLabelForStage(
  stage: AssistedCreationAddToRequestProgressStage,
  artworkKind: AssistedAddToRequestProgressArtworkKind,
): string {
  switch (stage) {
    case 'resolving_proof':
      return 'Locating approved artwork';
    case 'downloading':
      return 'Loading artwork';
    case 'converting_format':
      return 'Converting artwork';
    case 'trimming':
      return 'Trimming artwork';
    case 'upscaling':
      return 'Optimizing artwork';
    case 'creating_previews':
      return 'Creating print previews';
    case 'saving':
      return 'Saving prepared artwork';
    case 'attaching':
      return 'Adding to your request';
    case 'checking_format':
    case 'checking_transparency':
    case 'checking_print_size':
    case 'preparing_artwork':
      return artworkKind === 'final' ? 'Preparing final artwork' : 'Preparing artwork';
    default:
      return artworkKind === 'final' ? 'Preparing final artwork' : 'Preparing artwork';
  }
}

function timestampMillis(value: unknown): number | null {
  if (value && typeof value === 'object' && 'toMillis' in value && typeof value.toMillis === 'function') {
    const millis = value.toMillis();
    return typeof millis === 'number' && Number.isFinite(millis) ? millis : null;
  }
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    const date = value.toDate();
    return date instanceof Date && !Number.isNaN(date.getTime()) ? date.getTime() : null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function formatElapsed(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function messageForPhase(
  phase: AssistedAddToRequestProgressPhase,
  artworkKind: AssistedAddToRequestProgressArtworkKind,
  errorMessage?: string | null,
): string {
  const preparingLabel =
    artworkKind === 'final'
      ? 'Preparing final artwork for print…'
      : 'Preparing artwork for print…';

  switch (phase) {
    case 'preparing':
      return preparingLabel;
    case 'adding':
      return 'Adding to your request…';
    case 'done':
      return 'Done. Added to your Current Request.';
    case 'error':
      return errorMessage?.trim() || 'Unable to add to request.';
    default:
      return 'Working…';
  }
}

/**
 * Status dialog shown while Assisted Add to Request awaits the callable.
 * Stage labels come from the server's whitelisted processing progress; elapsed time is client
 * rendered from the trusted server start timestamp.
 */
export function AssistedAddToRequestProgressModal({
  artworkKind = 'proof',
  errorMessage = null,
  isOpen,
  onDismiss,
  phase,
  serverProgress = null,
}: AssistedAddToRequestProgressModalProps) {
  const isBusy = phase === 'preparing' || phase === 'adding';
  const canDismiss = phase === 'error' || phase === 'done';
  const [nowMillis, setNowMillis] = useState(() => Date.now());
  const [lastServerProgress, setLastServerProgress] =
    useState<AssistedCreationAddToRequestProgress | null>(null);
  const openedAtMillisRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) {
      openedAtMillisRef.current = null;
      setLastServerProgress(null);
      return;
    }
    if (openedAtMillisRef.current == null) {
      openedAtMillisRef.current = Date.now();
    }
  }, [isOpen]);

  useEffect(() => {
    if (serverProgress) {
      setLastServerProgress(serverProgress);
    } else if (!isOpen || !isBusy) {
      setLastServerProgress(null);
    }
  }, [isBusy, isOpen, serverProgress]);

  useEffect(() => {
    if (!isOpen || !isBusy) {
      return;
    }
    const tick = () => setNowMillis(Date.now());
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [isBusy, isOpen]);

  const observedProgress = serverProgress ?? lastServerProgress;
  const displayStage: AssistedCreationAddToRequestProgressStage =
    phase === 'adding' ? 'attaching' : observedProgress?.stage ?? 'resolving_proof';
  const currentStep = progressStepForStage(displayStage);
  const remainingSteps = Math.max(0, PROGRESS_STEPS.length - currentStep);
  const startedAtMillis =
    timestampMillis(observedProgress?.startedAt) ?? openedAtMillisRef.current ?? nowMillis;
  const elapsedMillis = Math.max(0, nowMillis - startedAtMillis);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && canDismiss) {
        onDismiss();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canDismiss, isOpen, onDismiss]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      aria-busy={isBusy || undefined}
      aria-labelledby="assisted-add-to-request-progress-title"
      aria-live="polite"
      aria-modal="true"
      className="modal-overlay modal-overlay-blur"
      onClick={() => {
        if (canDismiss) {
          onDismiss();
        }
      }}
      role="dialog"
    >
      <div
        className="modal-panel portal-confirm-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <h2 id="assisted-add-to-request-progress-title">
            {phase === 'error' ? 'Could not add design' : 'Adding to Request'}
          </h2>
        </header>
        <div className="modal-body">
          <p className="portal-muted portal-confirm-modal-message assisted-add-progress-message">
            {messageForPhase(phase, artworkKind, errorMessage)}
          </p>
          {isBusy ? (
            <div className="assisted-add-progress-details" aria-live="polite">
              <p className="assisted-add-progress-current">
                {customerLabelForStage(displayStage, artworkKind)}
              </p>
              <p>Step {currentStep} of {PROGRESS_STEPS.length}</p>
              <p>Elapsed: {formatElapsed(elapsedMillis)}</p>
              <p>
                {remainingSteps > 0
                  ? `${remainingSteps} ${remainingSteps === 1 ? 'step' : 'steps'} remaining`
                  : 'Finishing this step…'}
              </p>
              <p className="assisted-add-progress-variability">
                Timing varies with artwork size. We’ll keep updating this as each step completes.
              </p>
            </div>
          ) : null}
          {isBusy ? (
            <ol className="assisted-add-progress-steps">
              {PROGRESS_STEPS.map((step, index) => (
                <li
                  className={
                    index + 1 === currentStep
                      ? 'is-current'
                      : index + 1 < currentStep
                        ? 'is-done'
                        : ''
                  }
                  key={step.key}
                >
                  {index + 1}. {step.label}
                </li>
              ))}
            </ol>
          ) : null}
        </div>
        {canDismiss ? (
          <footer className="modal-footer">
            <button
              className="portal-button portal-button-primary"
              onClick={onDismiss}
              type="button"
            >
              {phase === 'done' ? 'OK' : 'Close'}
            </button>
          </footer>
        ) : null}
      </div>
    </div>
  );
}
