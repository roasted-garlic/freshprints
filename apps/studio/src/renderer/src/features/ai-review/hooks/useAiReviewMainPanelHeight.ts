import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";

interface UseAiReviewMainPanelHeightResult {
  layoutStyle: CSSProperties | undefined;
  mainPanelHeight: number | null;
  mainPanelRef: RefObject<HTMLElement>;
}

export function useAiReviewMainPanelHeight(): UseAiReviewMainPanelHeightResult {
  const mainPanelRef = useRef<HTMLElement>(null);
  const [mainPanelHeight, setMainPanelHeight] = useState<number | null>(null);

  useEffect(() => {
    const element = mainPanelRef.current;

    if (!element || typeof ResizeObserver === "undefined") {
      return;
    }

    const updateHeight = () => {
      const height = Math.round(element.getBoundingClientRect().height);

      setMainPanelHeight(height > 0 ? height : null);
    };

    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(element);
    window.addEventListener("resize", updateHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateHeight);
    };
  }, []);

  const layoutStyle =
    mainPanelHeight !== null
      ? ({ "--ai-review-main-panel-height": `${mainPanelHeight}px` } as CSSProperties)
      : undefined;

  return { layoutStyle, mainPanelHeight, mainPanelRef };
}
