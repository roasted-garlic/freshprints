import type { InputHTMLAttributes } from "react";

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  name: string;
}

export function Checkbox({ id, label, name, ...props }: CheckboxProps) {
  const inputId = id ?? name;

  return (
    <div className="form-checkbox">
      <input id={inputId} name={name} type="checkbox" {...props} />
      <label htmlFor={inputId}>{label}</label>
    </div>
  );
}
