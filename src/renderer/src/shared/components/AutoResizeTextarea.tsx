import { useCallback, useEffect, useLayoutEffect, useRef, type TextareaHTMLAttributes } from "react";

interface AutoResizeTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  name: string;
}

const MIN_TEXTAREA_HEIGHT_PX = 80;

export function AutoResizeTextarea({
  className = "",
  id,
  label,
  name,
  onChange,
  value,
  ...props
}: AutoResizeTextareaProps) {
  const textareaId = id ?? name;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resizeToContent = useCallback(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.minHeight = `${MIN_TEXTAREA_HEIGHT_PX}px`;
    textarea.style.height = "auto";

    const nextHeight = Math.max(textarea.scrollHeight, MIN_TEXTAREA_HEIGHT_PX);
    textarea.style.minHeight = `${nextHeight}px`;
    textarea.style.height = `${nextHeight}px`;
  }, []);

  useLayoutEffect(() => {
    resizeToContent();
  }, [resizeToContent, value]);

  useEffect(() => {
    window.addEventListener("resize", resizeToContent);
    return () => window.removeEventListener("resize", resizeToContent);
  }, [resizeToContent]);

  return (
    <div className="form-field">
      <label htmlFor={textareaId}>{label}</label>
      <textarea
        className={["form-textarea", className].filter(Boolean).join(" ")}
        id={textareaId}
        name={name}
        onChange={(event) => {
          onChange?.(event);
          resizeToContent();
        }}
        ref={textareaRef}
        value={value}
        {...props}
      />
    </div>
  );
}
