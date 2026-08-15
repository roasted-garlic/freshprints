import { ChevronDown } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type KeyboardEvent,
  type SelectHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";

import { filterSelectOptionsByLabel } from "./selectOptionFilter";

/** Matches the CSS max-height for .form-select-menu — used to decide whether the menu should open upward. */
const SELECT_MENU_ESTIMATED_HEIGHT_PX = 256;
const SELECT_MENU_GAP_PX = 4;

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange" | "children"> {
  label: string;
  name: string;
  onChange?: SelectHTMLAttributes<HTMLSelectElement>["onChange"];
  options: SelectOption[];
  /** When true, open menu includes a local search field. Default false. */
  searchable?: boolean;
  /** Placeholder for the searchable input. Only used when searchable. */
  searchPlaceholder?: string;
  /** Quiet empty state when a search matches nothing. Only used when searchable. */
  searchEmptyMessage?: string;
}

interface MenuPosition {
  left: number;
  width: number;
  top?: number;
  bottom?: number;
}

function resolveMenuPosition(shellRect: DOMRect): { opensUpward: boolean; position: MenuPosition } {
  const spaceBelow = window.innerHeight - shellRect.bottom;
  const spaceAbove = shellRect.top;
  const opensUpward =
    spaceBelow < SELECT_MENU_ESTIMATED_HEIGHT_PX && spaceAbove > spaceBelow;

  if (opensUpward) {
    return {
      opensUpward: true,
      position: {
        left: shellRect.left,
        width: shellRect.width,
        bottom: window.innerHeight - shellRect.top + SELECT_MENU_GAP_PX,
      },
    };
  }

  return {
    opensUpward: false,
    position: {
      left: shellRect.left,
      width: shellRect.width,
      top: shellRect.bottom + SELECT_MENU_GAP_PX,
    },
  };
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
  searchable = false,
  searchPlaceholder = "Search...",
  searchEmptyMessage = "No options found",
  value,
}: SelectProps) {
  const selectId = id ?? name;
  const listboxId = useId();
  const searchInputId = useId();
  const shellRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [opensUpward, setOpensUpward] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);

  const selectedValue = value !== undefined && value !== null ? String(value) : (options[0]?.value ?? "");
  const selectedIndex = options.findIndex((option) => option.value === selectedValue);
  const resolvedIndex = selectedIndex >= 0 ? selectedIndex : 0;
  const selectedOption = options[resolvedIndex];

  const visibleOptions = useMemo(
    () => (searchable ? filterSelectOptionsByLabel(options, searchQuery) : options),
    [options, searchable, searchQuery],
  );

  const closeMenu = useCallback(() => {
    setIsOpen(false);
    setMenuPosition(null);
    setSearchQuery("");
  }, []);

  const updateMenuPosition = useCallback(() => {
    const shellRect = shellRef.current?.getBoundingClientRect();
    if (!shellRect) {
      return;
    }

    const resolved = resolveMenuPosition(shellRect);
    setOpensUpward(resolved.opensUpward);
    setMenuPosition(resolved.position);
  }, []);

  const openMenu = useCallback(() => {
    if (disabled || options.length === 0) {
      return;
    }

    updateMenuPosition();
    setSearchQuery("");
    setHighlightedIndex(resolvedIndex);
    setIsOpen(true);
  }, [disabled, options.length, resolvedIndex, updateMenuPosition]);

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
      const option = visibleOptions[index];

      if (!option) {
        return;
      }
      if (option.disabled) {
        return;
      }

      emitChange(option.value);
      closeMenu();
    },
    [closeMenu, emitChange, visibleOptions],
  );

  useLayoutEffect(() => {
    if (!isOpen) {
      return;
    }

    updateMenuPosition();
  }, [isOpen, updateMenuPosition]);

  useEffect(() => {
    if (!isOpen || !searchable) {
      return;
    }

    searchInputRef.current?.focus();
  }, [isOpen, searchable]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (shellRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }

      closeMenu();
    }

    function handleViewportChange() {
      updateMenuPosition();
    }

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("resize", handleViewportChange);
    // Capture scroll from nested overflow ancestors (e.g. modal body) so the portaled menu stays aligned.
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [closeMenu, isOpen, updateMenuPosition]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (visibleOptions.length === 0) {
      setHighlightedIndex(0);
      return;
    }

    setHighlightedIndex((currentIndex) => Math.min(currentIndex, visibleOptions.length - 1));
  }, [isOpen, visibleOptions.length]);

  function moveHighlight(delta: number) {
    if (visibleOptions.length === 0) {
      return;
    }

    setHighlightedIndex((currentIndex) => {
      const nextIndex = currentIndex + delta;
      if (nextIndex < 0) {
        return 0;
      }
      if (nextIndex > visibleOptions.length - 1) {
        return visibleOptions.length - 1;
      }
      return nextIndex;
    });
  }

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

        moveHighlight(1);
        return;
      case "ArrowUp":
        event.preventDefault();
        if (!isOpen) {
          openMenu();
          return;
        }

        moveHighlight(-1);
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
        if (!isOpen || visibleOptions.length === 0) {
          return;
        }

        event.preventDefault();
        setHighlightedIndex(0);
        return;
      case "End":
        if (!isOpen || visibleOptions.length === 0) {
          return;
        }

        event.preventDefault();
        setHighlightedIndex(visibleOptions.length - 1);
        return;
      default:
        return;
    }
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        moveHighlight(1);
        return;
      case "ArrowUp":
        event.preventDefault();
        moveHighlight(-1);
        return;
      case "Enter":
        event.preventDefault();
        selectOption(highlightedIndex);
        return;
      case "Escape":
        event.preventDefault();
        closeMenu();
        return;
      case "Home":
        if (visibleOptions.length === 0) {
          return;
        }
        event.preventDefault();
        setHighlightedIndex(0);
        return;
      case "End":
        if (visibleOptions.length === 0) {
          return;
        }
        event.preventDefault();
        setHighlightedIndex(visibleOptions.length - 1);
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

  const menuStyle: CSSProperties | undefined = menuPosition
    ? {
        left: menuPosition.left,
        width: menuPosition.width,
        top: menuPosition.top,
        bottom: menuPosition.bottom,
      }
    : undefined;

  const menu =
    isOpen && menuPosition ? (
      <div
        className={`form-select-menu form-select-menu--portal${
          opensUpward ? " form-select-menu--upward" : ""
        }${searchable ? " form-select-menu--searchable" : ""}`}
        ref={menuRef}
        style={menuStyle}
      >
        {searchable ? (
          <div className="form-select-search-wrap">
            <label className="visually-hidden" htmlFor={searchInputId}>
              {searchPlaceholder}
            </label>
            <input
              aria-autocomplete="list"
              aria-controls={listboxId}
              autoComplete="off"
              className="form-select-search"
              id={searchInputId}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setHighlightedIndex(0);
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder={searchPlaceholder}
              ref={searchInputRef}
              type="search"
              value={searchQuery}
            />
          </div>
        ) : null}

        <ul
          aria-labelledby={selectId}
          className="form-select-options"
          id={listboxId}
          ref={listRef}
          role="listbox"
        >
          {visibleOptions.length === 0 ? (
            <li className="form-select-empty" role="presentation">
              {searchEmptyMessage}
            </li>
          ) : (
            visibleOptions.map((option, index) => {
              const isSelected = option.value === selectedValue;
              const isHighlighted = index === highlightedIndex;

              return (
                <li
                  key={`${option.value}::${option.label}`}
                  aria-selected={isSelected}
                  aria-disabled={option.disabled || undefined}
                  className={`form-select-option${isSelected ? " is-selected" : ""}${
                    isHighlighted ? " is-highlighted" : ""
                  }${option.disabled ? " is-disabled" : ""}`}
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
            })
          )}
        </ul>
      </div>
    ) : null;

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

        {typeof document !== "undefined" && menu ? createPortal(menu, document.body) : null}

        <input name={name} required={required} type="hidden" value={selectedValue} />
      </div>
    </div>
  );
}
