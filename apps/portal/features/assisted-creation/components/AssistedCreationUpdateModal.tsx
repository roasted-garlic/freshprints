'use client';

import { useEffect, useMemo, useState } from 'react';

import {
  ASSISTED_CREATION_FIELD_LIMITS,
  ASSISTED_CREATION_MAX_REFERENCE_IMAGES,
} from '@fresh-prints/shared/constants/assistedCreation/assistedCreation.constants';
import type {
  AssistedCreationAnswers,
  AssistedCreationReferenceImage,
  AssistedCreationRequest,
} from '@fresh-prints/shared/types/assistedCreation/assistedCreation.types';

import { assistedCreationService } from '../services/assistedCreationService';
import { AssistedCreationMediaThumbs } from './AssistedCreationMediaThumbs';
import { AssistedCreationReferenceUpload } from './AssistedCreationReferenceUpload';

interface AssistedCreationUpdateModalProps {
  isOpen: boolean;
  request: AssistedCreationRequest;
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
  onClose: () => void;
  onError: (message: string | null) => void;
  onSaved?: () => void;
}

function withReferenceFlags(
  answers: AssistedCreationAnswers,
  keptCount: number,
  newFileCount: number,
): AssistedCreationAnswers {
  const total = keptCount + newFileCount;
  if (total === 0) {
    const keepShareLater = answers.referenceUsage.includes('will_share_later');
    return {
      ...answers,
      hasReferences: keepShareLater ? answers.hasReferences : false,
      referenceUsage: keepShareLater ? answers.referenceUsage : [],
    };
  }

  const usage =
    answers.referenceUsage.length > 0
      ? answers.referenceUsage
      : (['style_inspiration'] as AssistedCreationAnswers['referenceUsage']);

  return {
    ...answers,
    hasReferences: true,
    referenceUsage: usage,
  };
}

export function AssistedCreationUpdateModal({
  isOpen,
  request,
  busy,
  onBusyChange,
  onClose,
  onError,
  onSaved,
}: AssistedCreationUpdateModalProps) {
  const [description, setDescription] = useState('');
  const [primarySubject, setPrimarySubject] = useState('');
  const [exactText, setExactText] = useState('');
  const [updateNote, setUpdateNote] = useState('');
  const [keptReferences, setKeptReferences] = useState<AssistedCreationReferenceImage[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const answers = request.answers;
    setDescription(answers?.rawDescription ?? '');
    setPrimarySubject(answers?.primarySubject ?? '');
    setExactText(answers?.exactText ?? '');
    setUpdateNote('');
    setKeptReferences([...(request.referenceImages ?? [])]);
    setNewFiles([]);
    setUploadError(null);
    setSaveError(null);
    onError(null);
  }, [isOpen, onError, request]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [busy, isOpen, onClose]);

  const remainingSlots = useMemo(
    () => Math.max(0, ASSISTED_CREATION_MAX_REFERENCE_IMAGES - keptReferences.length),
    [keptReferences.length],
  );

  if (!isOpen) {
    return null;
  }

  return (
    <div
      aria-labelledby="assisted-creation-update-title"
      aria-modal="true"
      className="modal-overlay modal-overlay-blur assisted-creation-update-overlay"
      onClick={() => {
        if (!busy) {
          onClose();
        }
      }}
      role="dialog"
    >
      <div
        className="modal-panel assisted-creation-update-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-header assisted-creation-update-modal-header">
          <div className="assisted-creation-update-modal-heading">
            <h2 id="assisted-creation-update-title">Update request</h2>
            <p className="portal-muted assisted-creation-update-lead">
              You can add details or references until staff marks this request in progress.
            </p>
          </div>
        </header>

        <div className="modal-body assisted-creation-update-body">
          <label className="portal-field">
            <span>Brief</span>
            <textarea
              maxLength={ASSISTED_CREATION_FIELD_LIMITS.rawDescription}
              onChange={(event) => setDescription(event.target.value)}
              rows={5}
              value={description}
            />
          </label>

          <label className="portal-field">
            <span>Primary subject (optional)</span>
            <input
              maxLength={ASSISTED_CREATION_FIELD_LIMITS.subject}
              onChange={(event) => setPrimarySubject(event.target.value)}
              type="text"
              value={primarySubject}
            />
          </label>

          <label className="portal-field">
            <span>Exact wording (optional)</span>
            <textarea
              maxLength={ASSISTED_CREATION_FIELD_LIMITS.exactText}
              onChange={(event) => setExactText(event.target.value)}
              rows={2}
              value={exactText}
            />
          </label>

          <label className="portal-field">
            <span>Note for staff (optional)</span>
            <textarea
              maxLength={ASSISTED_CREATION_FIELD_LIMITS.revisionNote}
              onChange={(event) => setUpdateNote(event.target.value)}
              placeholder="What did you add or change?"
              rows={2}
              value={updateNote}
            />
          </label>

          <div className="assisted-creation-update-refs">
            <h3 className="assisted-creation-detail-block-title">
              References ({keptReferences.length + newFiles.length}/
              {ASSISTED_CREATION_MAX_REFERENCE_IMAGES})
            </h3>
            {keptReferences.length > 0 ? (
              <div className="assisted-creation-update-kept-refs">
                <AssistedCreationMediaThumbs
                  emptyLabel="No reference images."
                  items={keptReferences}
                  variant="reference"
                />
                <ul className="assisted-creation-update-kept-list">
                  {keptReferences.map((image) => (
                    <li key={image.id}>
                      <span>{image.fileName || 'Reference'}</span>
                      <button
                        className="portal-button portal-button-secondary"
                        disabled={busy}
                        onClick={() => {
                          const nextKept = keptReferences.filter((item) => item.id !== image.id);
                          setKeptReferences(nextKept);
                          const nextKeptBytes = nextKept.reduce(
                            (sum, item) => sum + item.sizeBytes,
                            0,
                          );
                          setUploadError(
                            assistedCreationService.validateReferenceFiles(newFiles, nextKeptBytes),
                          );
                        }}
                        type="button"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="portal-muted">No saved references yet.</p>
            )}

            {remainingSlots > 0 ? (
              <AssistedCreationReferenceUpload
                error={uploadError}
                files={newFiles}
                onChange={(files) => {
                  const next = files.slice(0, remainingSlots);
                  const keptBytes = keptReferences.reduce((sum, image) => sum + image.sizeBytes, 0);
                  const validation = assistedCreationService.validateReferenceFiles(next, keptBytes);
                  setUploadError(validation);
                  setNewFiles(next);
                }}
              />
            ) : (
              <p className="portal-muted">Reference limit reached. Remove one to add another.</p>
            )}
          </div>

          {saveError ? (
            <p className="portal-form-error assisted-creation-update-save-error" role="alert">
              {saveError}
            </p>
          ) : null}
        </div>

        <footer className="modal-footer">
          <button
            className="portal-button portal-button-secondary"
            disabled={busy}
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="portal-button portal-button-primary"
            disabled={busy || !description.trim() || Boolean(uploadError)}
            onClick={() => {
              const base = request.answers;
              if (!base) {
                setSaveError('This request is missing its brief.');
                return;
              }
              const nextAnswers = withReferenceFlags(
                {
                  ...base,
                  rawDescription: description.trim(),
                  primarySubject: primarySubject.trim(),
                  exactText: exactText.trim(),
                },
                keptReferences.length,
                newFiles.length,
              );

              onBusyChange(true);
              setSaveError(null);
              onError(null);
              void assistedCreationService
                .updateRequest({
                  requestId: request.id,
                  answers: nextAnswers,
                  keepReferences: keptReferences,
                  newReferenceFiles: newFiles,
                  updateNote: updateNote.trim() || undefined,
                })
                .then(() => {
                  setSaveError(null);
                  onError(null);
                  onSaved?.();
                  onClose();
                })
                .catch((error: unknown) => {
                  setSaveError(
                    error instanceof Error ? error.message : 'Unable to update request.',
                  );
                })
                .finally(() => onBusyChange(false));
            }}
            type="button"
          >
            {busy ? 'Saving…' : 'Save updates'}
          </button>
        </footer>
      </div>
    </div>
  );
}
