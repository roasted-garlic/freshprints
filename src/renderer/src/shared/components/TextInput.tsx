import type { InputHTMLAttributes, ReactNode } from "react";

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
  trailingControl?: ReactNode;
}

export function TextInput({ id, label, name, trailingControl, ...props }: TextInputProps) {
  const inputId = id ?? name;

  return (
    <div className="form-field">
      <label htmlFor={inputId}>{label}</label>
      <div className={trailingControl ? "form-input-shell form-input-shell-with-action" : "form-input-shell"}>
        <input id={inputId} name={name} {...props} />
        {trailingControl ? <div className="form-input-action">{trailingControl}</div> : null}
      </div>
    </div>
  );
}
