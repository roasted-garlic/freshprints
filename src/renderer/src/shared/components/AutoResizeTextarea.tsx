import {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type ForwardedRef,
  type TextareaHTMLAttributes,
} from "react";

interface AutoResizeTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  maxAutoHeightPx?: number;
  name: string;
  scrollToCaretOnInput?: boolean;
}

const MIN_TEXTAREA_HEIGHT_PX = 80;
const SCROLL_EDGE_TOLERANCE_PX = 12;

function assignTextareaRef(
  ref: ForwardedRef<HTMLTextAreaElement>,
  textarea: HTMLTextAreaElement | null,
): void {
  if (typeof ref === "function") {
    ref(textarea);
    return;
  }

  if (ref) {
    (ref as unknown as { current: HTMLTextAreaElement | null }).current = textarea;
  }
}

export const AutoResizeTextarea = forwardRef<HTMLTextAreaElement, AutoResizeTextareaProps>(
  function AutoResizeTextarea(
    {
      className = "",
      id,
      label,
      maxAutoHeightPx,
      name,
      onChange,
      onScroll,
      scrollToCaretOnInput = false,
      value,
      ...props
    },
    forwardedRef,
  ) {
    const textareaId = id ?? name;
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const shouldFollowCaretRef = useRef(false);
    const isProgrammaticScrollRef = useRef(false);

    const resizeToContent = useCallback((shouldRestoreScroll = true) => {
      const textarea = textareaRef.current;

      if (!textarea) {
        return;
      }

      const previousScrollTop = textarea.scrollTop;
      const wasNearBottom =
        textarea.scrollHeight - textarea.scrollTop - textarea.clientHeight <=
        SCROLL_EDGE_TOLERANCE_PX;

      // Preserve page scroll position around the height = "auto" reset so the
      // page doesn't jump when a tall uncapped textarea reflows.
      const savedPageScrollY = window.scrollY;
      const hadExplicitHeight = textarea.style.height && textarea.style.height !== "auto";

      textarea.style.minHeight = `${MIN_TEXTAREA_HEIGHT_PX}px`;
      textarea.style.height = "auto";

      const contentHeight = Math.max(textarea.scrollHeight, MIN_TEXTAREA_HEIGHT_PX);
      const cappedHeight = maxAutoHeightPx
        ? Math.min(contentHeight, Math.max(maxAutoHeightPx, MIN_TEXTAREA_HEIGHT_PX))
        : contentHeight;
      const isCapped = Boolean(maxAutoHeightPx && contentHeight > cappedHeight);

      textarea.style.overflowY = isCapped ? "auto" : "hidden";
      const nextHeight = cappedHeight;
      textarea.style.minHeight = `${nextHeight}px`;
      textarea.style.height = `${nextHeight}px`;

      if (hadExplicitHeight && window.scrollY !== savedPageScrollY) {
        window.scrollTo({ top: savedPageScrollY, behavior: "instant" });
      }

      if (!shouldRestoreScroll || scrollToCaretOnInput) {
        return;
      }

      textarea.scrollTop = wasNearBottom
        ? textarea.scrollHeight
        : Math.min(previousScrollTop, textarea.scrollHeight - textarea.clientHeight);
    }, [maxAutoHeightPx, scrollToCaretOnInput]);

    useLayoutEffect(() => {
      resizeToContent();
    }, [resizeToContent, value]);

    useEffect(() => {
      function handleWindowResize() {
        resizeToContent();
      }

      window.addEventListener("resize", handleWindowResize);
      return () => window.removeEventListener("resize", handleWindowResize);
    }, [resizeToContent]);

    return (
      <div className="form-field">
        {label ? <label htmlFor={textareaId}>{label}</label> : null}
        <textarea
          className={["form-textarea", className].filter(Boolean).join(" ")}
          id={textareaId}
          name={name}
          onChange={(event) => {
            shouldFollowCaretRef.current = scrollToCaretOnInput;
            onChange?.(event);
            resizeToContent(false);

            if (scrollToCaretOnInput) {
              requestAnimationFrame(() => {
                const textarea = textareaRef.current;

                if (!textarea || !shouldFollowCaretRef.current) {
                  return;
                }

                isProgrammaticScrollRef.current = true;
                const { selectionStart, selectionEnd } = textarea;
                textarea.setSelectionRange(selectionStart, selectionEnd);
                requestAnimationFrame(() => {
                  isProgrammaticScrollRef.current = false;
                });
              });
            }
          }}
          onScroll={(event) => {
            if (!isProgrammaticScrollRef.current) {
              shouldFollowCaretRef.current = false;
            }

            onScroll?.(event);
          }}
          ref={(textarea) => {
            textareaRef.current = textarea;
            assignTextareaRef(forwardedRef, textarea);
          }}
          value={value}
          {...props}
        />
      </div>
    );
  },
);
