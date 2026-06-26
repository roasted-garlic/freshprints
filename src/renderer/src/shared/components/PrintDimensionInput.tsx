import { Minus, Plus } from "lucide-react";
import type { FocusEvent } from "react";

interface PrintDimensionInputProps {
  disabled?: boolean;
  label: string;
  name: string;
  onBlur: (value: string) => void;
  onChange: (value: string) => void;
  onStep: (direction: "decrease" | "increase") => void;
  step?: number;
  value: string;
}

export function PrintDimensionInput({
  disabled = false,
  label,
  name,
  onBlur,
  onChange,
  onStep,
  step = 0.25,
  value,
}: PrintDimensionInputProps) {
  const inputId = name;

  function handleFocus(event: FocusEvent<HTMLInputElement>) {
    event.target.select();
  }

  return (
    <div className="form-field">
      <label htmlFor={inputId}>{label}</label>
      <div className="print-dimension-input-shell">
        <button
          aria-label={`Decrease ${label} by ${step} inches`}
          className="print-dimension-step-button"
          disabled={disabled}
          onClick={() => onStep("decrease")}
          type="button"
        >
          <Minus aria-hidden="true" size={16} strokeWidth={2.2} />
        </button>
        <input
          autoComplete="off"
          className="print-dimension-input"
          disabled={disabled}
          id={inputId}
          inputMode="decimal"
          name={name}
          onBlur={(event) => onBlur(event.target.value)}
          onChange={(event) => onChange(event.target.value)}
          onFocus={handleFocus}
          type="text"
          value={value}
        />
        <button
          aria-label={`Increase ${label} by ${step} inches`}
          className="print-dimension-step-button"
          disabled={disabled}
          onClick={() => onStep("increase")}
          type="button"
        >
          <Plus aria-hidden="true" size={16} strokeWidth={2.2} />
        </button>
      </div>
    </div>
  );
}
