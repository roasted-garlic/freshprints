'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { ChevronDown } from 'lucide-react';

export interface PortalSelectOption {
  label: string;
  value: string;
}

interface PortalSelectProps {
  className?: string;
  disabled?: boolean;
  label: string;
  name: string;
  onChange: (value: string) => void;
  options: PortalSelectOption[];
  value: string;
}

export function PortalSelect({
  className = '',
  disabled = false,
  label,
  name,
  onChange,
  options,
  value,
}: PortalSelectProps) {
  const selectId = useId();
  const listboxId = useId();
  const shellRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const selectedIndex = options.findIndex((option) => option.value === value);
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

  const selectOption = useCallback(
    (index: number) => {
      const option = options[index];

      if (!option) {
        return;
      }

      if (option.value !== value) {
        onChange(option.value);
      }

      closeMenu();
    },
    [closeMenu, onChange, options, value],
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

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [closeMenu, isOpen]);

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) {
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!isOpen) {
          openMenu();
          return;
        }
        setHighlightedIndex((current) => Math.min(current + 1, options.length - 1));
        return;
      case 'ArrowUp':
        event.preventDefault();
        if (!isOpen) {
          openMenu();
          return;
        }
        setHighlightedIndex((current) => Math.max(current - 1, 0));
        return;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (isOpen) {
          selectOption(highlightedIndex);
          return;
        }
        openMenu();
        return;
      case 'Escape':
        event.preventDefault();
        closeMenu();
        return;
      default:
        return;
    }
  }

  return (
    <div className={`portal-select${className ? ` ${className}` : ''}`}>
      <label className="portal-select-label" htmlFor={selectId}>
        {label}
      </label>
      <div className="portal-select-shell" ref={shellRef}>
        <button
          aria-controls={listboxId}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-label={label}
          className={`portal-select-trigger${isOpen ? ' is-open' : ''}`}
          disabled={disabled || options.length === 0}
          id={selectId}
          name={name}
          onClick={() => {
            if (isOpen) {
              closeMenu();
              return;
            }
            openMenu();
          }}
          onKeyDown={handleTriggerKeyDown}
          type="button"
        >
          <span className="portal-select-value">{selectedOption?.label ?? 'Select…'}</span>
          <ChevronDown aria-hidden className="portal-select-chevron" size={16} strokeWidth={2} />
        </button>

        {isOpen ? (
          <ul className="portal-select-menu" id={listboxId} role="listbox">
            {options.map((option, index) => {
              const isSelected = option.value === selectedOption?.value;
              const isHighlighted = index === highlightedIndex;

              return (
                <li
                  aria-selected={isSelected}
                  className={`portal-select-option${isSelected ? ' is-selected' : ''}${isHighlighted ? ' is-highlighted' : ''}`}
                  key={option.value || 'all'}
                  onClick={() => selectOption(index)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  role="option"
                >
                  <span className="portal-select-option-label">{option.label}</span>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
