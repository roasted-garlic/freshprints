import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
  trailingControl?: ReactNode;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { id, label, name, trailingControl, ...props },
  ref,
) {
  const inputId = id ?? name;

  return (
    <div className="form-field">
      <label htmlFor={inputId}>{label}</label>
      <div className={trailingControl ? "form-input-shell form-input-shell-with-action" : "form-input-shell"}>
        <input id={inputId} name={name} ref={ref} {...props} />
        {trailingControl ? <div className="form-input-action">{trailingControl}</div> : null}
      </div>
    </div>
  );
});
