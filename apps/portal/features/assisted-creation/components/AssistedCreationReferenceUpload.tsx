'use client';

import { useEffect, useMemo, useRef } from 'react';

import {
  ASSISTED_CREATION_MAX_REFERENCE_BYTES,
  ASSISTED_CREATION_MAX_REFERENCE_IMAGES,
} from '@fresh-prints/shared/constants/assistedCreation/assistedCreation.constants';

interface AssistedCreationReferenceUploadProps {
  files: File[];
  error: string | null;
  onChange: (files: File[]) => void;
}

export function AssistedCreationReferenceUpload({
  files,
  error,
  onChange,
}: AssistedCreationReferenceUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const previews = useMemo(
    () =>
      files.map((file) => ({
        file,
        url: URL.createObjectURL(file),
      })),
    [files],
  );

  useEffect(() => {
    return () => {
      for (const preview of previews) {
        URL.revokeObjectURL(preview.url);
      }
    };
  }, [previews]);

  return (
    <div className="assisted-creation-reference-upload">
      <div className="assisted-creation-reference-dropzone">
        <p className="assisted-creation-reference-dropzone-title">Upload reference images</p>
        <p className="portal-muted assisted-creation-field-note">
          Up to {ASSISTED_CREATION_MAX_REFERENCE_IMAGES} images, JPEG/PNG/WebP,{' '}
          {Math.round(ASSISTED_CREATION_MAX_REFERENCE_BYTES / (1024 * 1024))} MB each. Staff can view
          and download these in Studio. Clone-with-subtle-changes requires at least one upload.
        </p>
        <input
          accept="image/jpeg,image/png,image/webp"
          className="portal-visually-hidden"
          multiple
          onChange={(event) => {
            const selected = Array.from(event.target.files ?? []);
            const next = [...files, ...selected].slice(0, ASSISTED_CREATION_MAX_REFERENCE_IMAGES);
            onChange(next);
            event.target.value = '';
          }}
          ref={inputRef}
          type="file"
        />
        <button
          className="portal-button portal-button-secondary"
          onClick={() => inputRef.current?.click()}
          type="button"
        >
          Choose images
        </button>
      </div>

      {error ? <p className="portal-form-error">{error}</p> : null}

      {previews.length > 0 ? (
        <ul className="assisted-creation-reference-preview-list">
          {previews.map((preview, index) => (
            <li key={`${preview.file.name}-${preview.file.size}-${index}`}>
              <img alt="" src={preview.url} />
              <button
                className="portal-button portal-button-secondary"
                onClick={() => onChange(files.filter((_, i) => i !== index))}
                type="button"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
