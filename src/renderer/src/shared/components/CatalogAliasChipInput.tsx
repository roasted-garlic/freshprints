import { X } from "lucide-react";
import { useEffect, useId, useState, type KeyboardEvent } from "react";

import {
  MAX_CATALOG_TAG_LENGTH,
  normalizeCatalogTagToken,
} from "../../features/designs/utils/catalogTagNormalizer";

interface CatalogAliasChipInputProps {
  disabled?: boolean;
  label: string;
  name: string;
  onChange: (value: string) => void;
  value: string;
}

function parseAliasesInput(value: string): string[] {
  return value
    .split(",")
    .map((alias) => {
      try {
        return normalizeCatalogTagToken(alias, "Alias");
      } catch {
        return null;
      }
    })
    .filter((alias): alias is string => Boolean(alias));
}

function formatAliasesInput(aliases: readonly string[]): string {
  return aliases.join(", ");
}

export function CatalogAliasChipInput({
  disabled = false,
  label,
  name,
  onChange,
  value,
}: CatalogAliasChipInputProps) {
  const inputId = useId();
  const [inputValue, setInputValue] = useState("");
  const aliases = parseAliasesInput(value);

  useEffect(() => {
    setInputValue("");
  }, [value]);

  function emitAliases(nextAliases: string[]) {
    onChange(formatAliasesInput(nextAliases));
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

    const nextAliases = [...aliases];

    for (const token of tokens) {
      try {
        const normalizedAlias = normalizeCatalogTagToken(token, "Alias");

        if (!nextAliases.includes(normalizedAlias)) {
          nextAliases.push(normalizedAlias);
        }
      } catch {
        // Ignore invalid aliases while the user is typing.
      }
    }

    emitAliases(nextAliases);
    setInputValue("");
  }

  function removeAlias(aliasToRemove: string) {
    emitAliases(aliases.filter((alias) => alias !== aliasToRemove));
  }

  function handleInputChange(nextValue: string) {
    if (nextValue.includes(",")) {
      commitInput(nextValue);
      return;
    }

    if (nextValue.length > MAX_CATALOG_TAG_LENGTH) {
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

    if (event.key === "Backspace" && !inputValue && aliases.length > 0) {
      event.preventDefault();
      emitAliases(aliases.slice(0, -1));
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
        {aliases.map((alias) => (
          <span className="tag-chip" key={alias}>
            <span className="tag-chip-label">{alias}</span>
            {!disabled ? (
              <button
                aria-label={`Remove alias ${alias}`}
                className="tag-chip-remove"
                onClick={() => removeAlias(alias)}
                type="button"
              >
                <X aria-hidden="true" size={14} strokeWidth={2} />
              </button>
            ) : null}
          </span>
        ))}

        <input
          aria-label={aliases.length > 0 ? "Add another alias" : "Add aliases"}
          autoComplete="off"
          disabled={disabled}
          id={inputId}
          name={name}
          onBlur={() => {
            if (inputValue.trim()) {
              commitInput();
            }
          }}
          onChange={(event) => handleInputChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={aliases.length === 0 ? "Type an alias and press comma or Enter" : "Add alias"}
          type="text"
          value={inputValue}
        />
      </div>

      <p className="tag-chip-input-hint">
        Press comma, Enter, or Tab to add an alias. Aliases are stored lowercase.
      </p>
    </div>
  );
}
