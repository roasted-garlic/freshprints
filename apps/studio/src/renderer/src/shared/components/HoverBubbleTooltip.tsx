import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

type HoverBubbleTooltipTone = "default" | "warning" | "error";
type HoverBubbleTooltipAlign = "start" | "center" | "end";

type HoverBubbleTooltipPlacement = "above" | "below";

interface HoverBubbleTooltipPosition {
  arrowLeft: number;
  left: number;
  placement: HoverBubbleTooltipPlacement;
  top: number;
}

interface HoverBubbleTooltipProps {
  align?: HoverBubbleTooltipAlign;
  bubble?: string;
  children: ReactNode;
  className?: string;
  /** Hover open delay in ms. Keyboard focus still opens after a short delay. */
  showDelayMs?: number;
  tone?: HoverBubbleTooltipTone;
}

const VIEWPORT_PADDING_PX = 8;
const BUBBLE_GAP_PX = 8;
const DEFAULT_HOVER_SHOW_DELAY_MS = 700;
const FOCUS_SHOW_DELAY_MS = 400;

export function HoverBubbleTooltip({
  align = "start",
  bubble,
  children,
  className = "",
  showDelayMs = DEFAULT_HOVER_SHOW_DELAY_MS,
  tone = "default",
}: HoverBubbleTooltipProps) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const bubbleRef = useRef<HTMLSpanElement>(null);
  const showTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<HoverBubbleTooltipPosition | null>(null);

  useEffect(() => {
    setIsMounted(true);
    return () => {
      if (showTimeoutRef.current !== null) {
        clearTimeout(showTimeoutRef.current);
      }
    };
  }, []);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    const bubbleElement = bubbleRef.current;
    if (!trigger || !bubbleElement) {
      return;
    }

    const triggerRect = trigger.getBoundingClientRect();
    const bubbleWidth = bubbleElement.offsetWidth;
    const bubbleHeight = bubbleElement.offsetHeight;

    let left = triggerRect.left;
    if (align === "center") {
      left = triggerRect.left + triggerRect.width / 2 - bubbleWidth / 2;
    } else if (align === "end") {
      left = triggerRect.right - bubbleWidth;
    }

    left = Math.max(
      VIEWPORT_PADDING_PX,
      Math.min(left, window.innerWidth - bubbleWidth - VIEWPORT_PADDING_PX),
    );

    const preferredTopAbove = triggerRect.top - bubbleHeight - BUBBLE_GAP_PX;
    const preferredTopBelow = triggerRect.bottom + BUBBLE_GAP_PX;
    const fitsAbove = preferredTopAbove >= VIEWPORT_PADDING_PX;
    const fitsBelow =
      preferredTopBelow + bubbleHeight <= window.innerHeight - VIEWPORT_PADDING_PX;

    // Prefer above; flip below when the header/top of viewport would clamp the bubble
    // over the trigger (the Auto toggle case).
    let placement: HoverBubbleTooltipPlacement = "above";
    let top = preferredTopAbove;
    if (!fitsAbove && fitsBelow) {
      placement = "below";
      top = preferredTopBelow;
    } else if (!fitsAbove && !fitsBelow) {
      const spaceAbove = triggerRect.top - VIEWPORT_PADDING_PX;
      const spaceBelow = window.innerHeight - triggerRect.bottom - VIEWPORT_PADDING_PX;
      if (spaceBelow > spaceAbove) {
        placement = "below";
        top = Math.min(
          preferredTopBelow,
          window.innerHeight - bubbleHeight - VIEWPORT_PADDING_PX,
        );
      } else {
        top = VIEWPORT_PADDING_PX;
      }
    }

    const arrowLeft = Math.min(
      Math.max(triggerRect.left + triggerRect.width / 2 - left, 12),
      bubbleWidth - 12,
    );

    setPosition({ arrowLeft, left, placement, top });
  }, [align]);

  useLayoutEffect(() => {
    if (!isVisible || !bubble) {
      setPosition(null);
      return;
    }

    updatePosition();
  }, [bubble, isVisible, updatePosition]);

  useEffect(() => {
    if (!isVisible || !bubble) {
      return;
    }

    updatePosition();
  }, [bubble, isVisible, updatePosition]);

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    const handleReposition = () => {
      updatePosition();
    };

    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);
    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [isVisible, updatePosition]);

  const clearShowTimeout = () => {
    if (showTimeoutRef.current !== null) {
      clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = null;
    }
  };

  const hide = () => {
    clearShowTimeout();
    setIsVisible(false);
  };

  const scheduleShow = (delayMs: number) => {
    clearShowTimeout();
    showTimeoutRef.current = setTimeout(() => {
      showTimeoutRef.current = null;
      setIsVisible(true);
    }, delayMs);
  };

  const handleBlur = (event: FocusEvent<HTMLSpanElement>) => {
    if (!triggerRef.current?.contains(event.relatedTarget as Node | null)) {
      hide();
    }
  };

  if (!bubble) {
    return <>{children}</>;
  }

  const placementClass = position?.placement === "below" ? "is-below" : "is-above";

  const portalBubble =
    isMounted && isVisible
      ? createPortal(
          <span
            className={`hover-bubble-tooltip__bubble is-portal is-${tone} ${placementClass}`}
            ref={bubbleRef}
            role="tooltip"
            style={{
              left: position?.left ?? -9999,
              top: position?.top ?? -9999,
              visibility: position ? "visible" : "hidden",
            }}
          >
            {bubble}
            <span
              aria-hidden="true"
              className="hover-bubble-tooltip__arrow"
              style={{ left: position?.arrowLeft ?? 12 }}
            />
          </span>,
          document.body,
        )
      : null;

  return (
    <>
      <span
        className={`hover-bubble-tooltip ${className}`.trim()}
        onBlur={handleBlur}
        onFocusCapture={() => scheduleShow(FOCUS_SHOW_DELAY_MS)}
        onMouseEnter={() => scheduleShow(showDelayMs)}
        onMouseLeave={hide}
        ref={triggerRef}
      >
        {children}
      </span>
      {portalBubble}
    </>
  );
}
