import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

type HoverBubbleTooltipTone = 'default' | 'warning' | 'error';
type HoverBubbleTooltipAlign = 'start' | 'center' | 'end';

interface HoverBubbleTooltipPosition {
  arrowLeft: number;
  left: number;
  top: number;
}

interface HoverBubbleTooltipProps {
  align?: HoverBubbleTooltipAlign;
  bubble?: string;
  children: ReactNode;
  className?: string;
  tone?: HoverBubbleTooltipTone;
}

const VIEWPORT_PADDING_PX = 8;
const BUBBLE_GAP_PX = 8;
const HOVER_SHOW_DELAY_MS = 500;

export function HoverBubbleTooltip({
  align = 'start',
  bubble,
  children,
  className = '',
  tone = 'default',
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
    if (align === 'center') {
      left = triggerRect.left + triggerRect.width / 2 - bubbleWidth / 2;
    } else if (align === 'end') {
      left = triggerRect.right - bubbleWidth;
    }

    left = Math.max(
      VIEWPORT_PADDING_PX,
      Math.min(left, window.innerWidth - bubbleWidth - VIEWPORT_PADDING_PX),
    );

    const preferredTop = triggerRect.top - bubbleHeight - BUBBLE_GAP_PX;
    const top = Math.max(VIEWPORT_PADDING_PX, preferredTop);
    const arrowLeft = Math.min(
      Math.max(triggerRect.left + triggerRect.width / 2 - left, 12),
      bubbleWidth - 12,
    );

    setPosition({ arrowLeft, left, top });
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

    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);
    return () => {
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [isVisible, updatePosition]);

  const clearShowTimeout = () => {
    if (showTimeoutRef.current !== null) {
      clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = null;
    }
  };

  const show = () => {
    clearShowTimeout();
    setIsVisible(true);
  };

  const hide = () => {
    clearShowTimeout();
    setIsVisible(false);
  };

  const scheduleShow = () => {
    clearShowTimeout();
    showTimeoutRef.current = setTimeout(() => {
      showTimeoutRef.current = null;
      setIsVisible(true);
    }, HOVER_SHOW_DELAY_MS);
  };

  const handleBlur = (event: FocusEvent<HTMLSpanElement>) => {
    if (!triggerRef.current?.contains(event.relatedTarget as Node | null)) {
      hide();
    }
  };

  if (!bubble) {
    return <>{children}</>;
  }

  const portalBubble =
    isMounted && isVisible
      ? createPortal(
          <span
            className={`hover-bubble-tooltip__bubble is-portal is-${tone}`}
            ref={bubbleRef}
            role="tooltip"
            style={{
              left: position?.left ?? -9999,
              top: position?.top ?? -9999,
              visibility: position ? 'visible' : 'hidden',
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
        onFocusCapture={show}
        onMouseEnter={scheduleShow}
        onMouseLeave={hide}
        ref={triggerRef}
      >
        {children}
      </span>
      {portalBubble}
    </>
  );
}
