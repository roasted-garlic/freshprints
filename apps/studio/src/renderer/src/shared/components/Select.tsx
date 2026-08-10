import { ChevronDown } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type KeyboardEvent,
  type SelectHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";

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
  value,
}: SelectProps) {
  const selectId = id ?? name;
  const listboxId = useId();
  const shellRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [opensUpward, setOpensUpward] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);

  const selectedValue = value !== undefined && value !== null ? String(value) : (options[0]?.value ?? "");
  const selectedIndex = options.findIndex((option) => option.value === selectedValue);
  const resolvedIndex = selectedIndex >= 0 ? selectedIndex : 0;
  const selectedOption = options[resolvedIndex];

  const closeMenu = useCallback(() => {
    setIsOpen(false);
    setMenuPosition(null);
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
      const option = options[index];

      if (!option) {
        return;
      }
      if (option.disabled) {
        return;
      }

      emitChange(option.value);
      closeMenu();
    },
    [closeMenu, emitChange, options],
  );

  useLayoutEffect(() => {
    if (!isOpen) {
      return;
    }

    updateMenuPosition();
  }, [isOpen, updateMenuPosition]);

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
      <ul
        aria-labelledby={selectId}
        className={`form-select-menu form-select-menu--portal${
          opensUpward ? " form-select-menu--upward" : ""
        }`}
        id={listboxId}
        ref={menuRef}
        role="listbox"
        style={menuStyle}
      >
        {options.map((option, index) => {
          const isSelected = option.value === selectedValue;
          const isHighlighted = index === highlightedIndex;

          return (
            <li
              key={option.value}
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
        })}
      </ul>
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
