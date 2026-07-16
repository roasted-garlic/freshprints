'use client';

import type { ChangeEvent, KeyboardEvent } from 'react';

import {
  commitEtsyMultiValueDraft,
  parseEtsyMultiValueInput,
  serializeEtsyMultiValueInput,
} from '../utils/applyEtsySubjectSuggestion';

interface EtsyMultiValueInputProps {
  ariaDescribedBy: string;
  ariaInvalid?: boolean;
  ariaLabelledBy: string;
  id: string;
  maxItems: number;
  maxLength: number;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}

export function EtsyMultiValueInput({
  ariaDescribedBy,
  ariaInvalid,
  ariaLabelledBy,
  id,
  maxItems,
  maxLength,
  onChange,
  placeholder,
  value,
}: EtsyMultiValueInputProps) {
  const { selected, draft } = parseEtsyMultiValueInput(value);
  const atLimit = selected.length >= maxItems;

  const setValueIfWithinLimit = (next: string) => {
    if (next.length <= maxLength) {
      onChange(next);
    }
  };

  const updateDraft = (event: ChangeEvent<HTMLInputElement>) => {
    const typed = event.target.value;
    if (!typed.includes(',')) {
      setValueIfWithinLimit(serializeEtsyMultiValueInput(selected, typed));
      return;
    }

    let nextSelected = [...selected];
    const parts = typed.split(',');
    for (const part of parts.slice(0, -1)) {
      if (nextSelected.length >= maxItems) {
        break;
      }
      const trimmed = part.trim();
      if (!trimmed) {
        continue;
      }
      const key = trimmed.toLowerCase();
      if (nextSelected.some((item) => item.toLowerCase() === key)) {
        continue;
      }
      nextSelected = [...nextSelected, trimmed];
    }
    const trailing = nextSelected.length >= maxItems ? '' : (parts.at(-1) ?? '').trimStart();
    setValueIfWithinLimit(serializeEtsyMultiValueInput(nextSelected, trailing));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      setValueIfWithinLimit(commitEtsyMultiValueDraft(value, maxItems));
      return;
    }
    if (event.key === 'Backspace' && !draft && selected.length > 0) {
      event.preventDefault();
      setValueIfWithinLimit(serializeEtsyMultiValueInput(selected.slice(0, -1)));
    }
  };

  return (
    <div className="etsy-multi-value-input">
      {selected.map((item, index) => (
        <span className="etsy-multi-value-chip" key={`${item}-${index}`}>
          <span>{item}</span>
          <button
            aria-label={`Remove ${item}`}
            onClick={() =>
              setValueIfWithinLimit(
                serializeEtsyMultiValueInput(
                  selected.filter((_, itemIndex) => itemIndex !== index),
                  draft,
                ),
              )
            }
            type="button"
          >
            ×
          </button>
        </span>
      ))}
      <input
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid}
        aria-labelledby={ariaLabelledBy}
        autoComplete="off"
        disabled={atLimit}
        id={id}
        onChange={updateDraft}
        onKeyDown={handleKeyDown}
        placeholder={
          selected.length === 0 ? placeholder : atLimit ? `Maximum ${maxItems}` : 'Add another…'
        }
        type="text"
        value={draft}
      />
    </div>
  );
}
