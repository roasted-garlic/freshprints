import { useEffect, useId, useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";

import { formatTagsInput, tryParseTagsInput } from "../../features/designs/utils/designFormMapper";
import { MAX_DESIGN_TAG_LENGTH, MAX_DESIGN_TAGS, normalizeDesignTags } from "../../features/designs/utils/designTagNormalizer";

interface TagChipInputProps {
  adjustmentHint?: string;
  disabled?: boolean;
  label: string;
  name: string;
  onBlur?: () => void;
  onChange: (value: string) => void;
  onFocus?: () => void;
  value: string;
}

function tryNormalizeTag(rawTag: string): string | null {
  const trimmedTag = rawTag.trim();

  if (!trimmedTag) {
    return null;
  }

  try {
    const [normalizedTag] = normalizeDesignTags([trimmedTag]);
    return normalizedTag ?? null;
  } catch {
    return null;
  }
}

export function TagChipInput({
  adjustmentHint,
  disabled = false,
  label,
  name,
  onBlur,
  onChange,
  onFocus,
  value,
}: TagChipInputProps) {
  const inputId = useId();
  const [inputValue, setInputValue] = useState("");
  const tags = tryParseTagsInput(value);

  useEffect(() => {
    setInputValue("");
  }, [value]);

  function emitTags(nextTags: string[]) {
    onChange(formatTagsInput(nextTags));
  }

  function commitInput(rawValue: string = inputValue) {
    const tokens = rawValue
      .split(",")
      .map((token) => token.trim())
      .filter(Boolean);

    if (tokens.length === 0) {
      setInputValue("");
      return;
    }

    const nextTags = [...tags];

    for (const token of tokens) {
      const normalizedTag = tryNormalizeTag(token);

      if (!normalizedTag || nextTags.includes(normalizedTag)) {
        continue;
      }

      if (nextTags.length >= MAX_DESIGN_TAGS) {
        break;
      }

      nextTags.push(normalizedTag);
    }

    emitTags(nextTags);
    setInputValue("");
  }

  function removeTag(tagToRemove: string) {
    emitTags(tags.filter((tag) => tag !== tagToRemove));
  }

  function handleInputChange(nextValue: string) {
    if (nextValue.includes(",")) {
      const [firstToken, ...restTokens] = nextValue.split(",");
      commitInput([firstToken, ...restTokens].join(","));
      return;
    }

    if (nextValue.length > MAX_DESIGN_TAG_LENGTH) {
      return;
    }

    setInputValue(nextValue);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (disabled) {
      return;
    }

    if (event.key === "Enter" || event.key === "Tab" || event.key === ",") {
      if (inputValue.trim()) {
        event.preventDefault();
        commitInput();
      }

      return;
    }

    if (event.key === "Backspace" && !inputValue && tags.length > 0) {
      event.preventDefault();
      emitTags(tags.slice(0, -1));
    }
  }

  return (
    <div className="form-field tag-chip-input-field">
      <label htmlFor={inputId}>{label}</label>

      <div
        className={[
          "tag-chip-input",
          disabled ? "tag-chip-input--disabled" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {tags.map((tag) => (
          <span className="tag-chip" key={tag}>
            <span className="tag-chip-label">{tag}</span>
            {!disabled ? (
              <button
                aria-label={`Remove tag ${tag}`}
                className="tag-chip-remove"
                onClick={() => removeTag(tag)}
                type="button"
              >
                <X aria-hidden="true" size={14} strokeWidth={2} />
              </button>
            ) : null}
          </span>
        ))}

        <input
          aria-label={tags.length > 0 ? "Add another tag" : "Add tags"}
          autoComplete="off"
          disabled={disabled}
          id={inputId}
          name={name}
          onBlur={() => {
            if (inputValue.trim()) {
              commitInput();
            }

            onBlur?.();
          }}
          onChange={(event) => handleInputChange(event.target.value)}
          onFocus={onFocus}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? "Type a tag and press comma or Enter" : "Add tag"}
          type="text"
          value={inputValue}
        />
      </div>

      <p className="tag-chip-input-hint">
        Press comma, Enter, or Tab to add a tag. Tags are stored lowercase.
      </p>
      {adjustmentHint ? (
        <p className="tag-chip-input-hint tag-chip-input-hint--warning">{adjustmentHint}</p>
      ) : null}
    </div>
  );
}
