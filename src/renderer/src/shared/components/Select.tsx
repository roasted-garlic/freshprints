import { ChevronDown } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type SelectHTMLAttributes,
} from "react";

export interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange" | "children"> {
  label: string;
  name: string;
  onChange?: SelectHTMLAttributes<HTMLSelectElement>["onChange"];
  options: SelectOption[];
}

export function Select({
  className,
  disabled,
  id,
  label,
  name,
  onChange,
  options,
  required,
  value,
}: SelectProps) {
  const selectId = id ?? name;
  const listboxId = useId();
  const shellRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const selectedValue = value !== undefined && value !== null ? String(value) : (options[0]?.value ?? "");
  const selectedIndex = options.findIndex((option) => option.value === selectedValue);
  const resolvedIndex = selectedIndex >= 0 ? selectedIndex : 0;
  const selectedOption = options[resolvedIndex];

  const closeMenu = useCallback(() => {
    setIsOpen(false);
  }, []);

  const openMenu = useCallback(() => {
    if (disabled || options.length === 0) {
      return;
    }

    setHighlightedIndex(resolvedIndex);
    setIsOpen(true);
  }, [disabled, options.length, resolvedIndex]);

  const emitChange = useCallback(
    (nextValue: string) => {
      if (nextValue === selectedValue) {
        return;
      }

      onChange?.({
        target: { name, value: nextValue },
        currentTarget: { name, value: nextValue },
      } as ChangeEvent<HTMLSelectElement>);
    },
    [name, onChange, selectedValue],
  );

  const selectOption = useCallback(
    (index: number) => {
      const option = options[index];

      if (!option) {
        return;
      }

      emitChange(option.value);
      closeMenu();
    },
    [closeMenu, emitChange, options],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!shellRef.current?.contains(event.target as Node)) {
        closeMenu();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [closeMenu, isOpen]);

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) {
      return;
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!isOpen) {
          openMenu();
          return;
        }

        setHighlightedIndex((currentIndex) => Math.min(currentIndex + 1, options.length - 1));
        return;
      case "ArrowUp":
        event.preventDefault();
        if (!isOpen) {
          openMenu();
          return;
        }

        setHighlightedIndex((currentIndex) => Math.max(currentIndex - 1, 0));
        return;
      case "Enter":
      case " ":
        event.preventDefault();
        if (isOpen) {
          selectOption(highlightedIndex);
          return;
        }

        openMenu();
        return;
      case "Escape":
        event.preventDefault();
        closeMenu();
        return;
      case "Home":
        if (!isOpen) {
          return;
        }

        event.preventDefault();
        setHighlightedIndex(0);
        return;
      case "End":
        if (!isOpen) {
          return;
        }

        event.preventDefault();
        setHighlightedIndex(options.length - 1);
        return;
      default:
        return;
    }
  }

  function handleOptionKeyDown(event: KeyboardEvent<HTMLLIElement>, index: number) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectOption(index);
    }
  }

  return (
    <div className={`form-field${className ? ` ${className}` : ""}`}>
      <label htmlFor={selectId}>{label}</label>
      <div className="form-input-shell form-select-shell" ref={shellRef}>
        <button
          aria-controls={listboxId}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          className={`form-select-trigger${isOpen ? " is-open" : ""}`}
          disabled={disabled || options.length === 0}
          id={selectId}
          onClick={() => (isOpen ? closeMenu() : openMenu())}
          onKeyDown={handleTriggerKeyDown}
          type="button"
        >
          <span className="form-select-value">{selectedOption?.label ?? "Select an option"}</span>
          <ChevronDown aria-hidden="true" className="form-select-chevron" size={16} strokeWidth={2} />
        </button>

        {isOpen ? (
          <ul className="form-select-menu" id={listboxId} role="listbox" aria-labelledby={selectId}>
            {options.map((option, index) => {
              const isSelected = option.value === selectedValue;
              const isHighlighted = index === highlightedIndex;

              return (
                <li
                  key={option.value}
                  aria-selected={isSelected}
                  className={`form-select-option${isSelected ? " is-selected" : ""}${
                    isHighlighted ? " is-highlighted" : ""
                  }`}
                  onKeyDown={(event) => handleOptionKeyDown(event, index)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectOption(index)}
                  role="option"
                  tabIndex={-1}
                >
                  <span className="form-select-option-label">{option.label}</span>
                </li>
              );
            })}
          </ul>
        ) : null}

        <input name={name} required={required} type="hidden" value={selectedValue} />
      </div>
    </div>
  );
}
