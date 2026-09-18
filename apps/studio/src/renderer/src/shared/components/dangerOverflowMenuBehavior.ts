export type DangerOverflowMenuPlacement = "bottom" | "top";
export type DangerOverflowMenuAlign = "start" | "end";

export type DangerOverflowMenuEvent =
  | "trigger"
  | "outside"
  | "escape"
  | "select";

export interface DangerOverflowMenuTransition {
  open: boolean;
  restoreTriggerFocus: boolean;
}

export interface DangerOverflowMenuGeometry {
  trigger: { bottom: number; left: number; right: number; top: number };
  menuHeight: number;
  menuWidth: number;
  viewportHeight: number;
  viewportWidth: number;
  preferredPlacement?: DangerOverflowMenuPlacement;
  /** `start` grows to the right of the trigger; `end` grows to the left (default). */
  preferredAlign?: DangerOverflowMenuAlign;
  gap?: number;
  viewportMargin?: number;
}

export interface DangerOverflowMenuPosition {
  left: number;
  placement: DangerOverflowMenuPlacement;
  top: number;
}

export function resolveDangerOverflowMenuPosition({
  trigger,
  menuHeight,
  menuWidth,
  viewportHeight,
  viewportWidth,
  preferredPlacement = "bottom",
  preferredAlign = "end",
  gap = 6,
  viewportMargin = 8,
}: DangerOverflowMenuGeometry): DangerOverflowMenuPosition {
  const spaceBelow = viewportHeight - viewportMargin - trigger.bottom - gap;
  const spaceAbove = trigger.top - viewportMargin - gap;
  const placement =
    preferredPlacement === "bottom"
      ? spaceBelow < menuHeight && spaceAbove > spaceBelow
        ? "top"
        : "bottom"
      : spaceAbove < menuHeight && spaceBelow > spaceAbove
        ? "bottom"
        : "top";
  const desiredTop =
    placement === "bottom" ? trigger.bottom + gap : trigger.top - gap - menuHeight;
  const maxTop = Math.max(viewportMargin, viewportHeight - viewportMargin - menuHeight);
  const top = Math.min(Math.max(desiredTop, viewportMargin), maxTop);
  const desiredLeft =
    preferredAlign === "start" ? trigger.left : trigger.right - menuWidth;
  const maxLeft = Math.max(viewportMargin, viewportWidth - viewportMargin - menuWidth);
  const left = Math.min(Math.max(desiredLeft, viewportMargin), maxLeft);

  return { left, placement, top };
}

export function transitionDangerOverflowMenu(
  open: boolean,
  event: DangerOverflowMenuEvent,
  disabled = false,
): DangerOverflowMenuTransition {
  if (event === "trigger") {
    return {
      open: disabled ? false : !open,
      restoreTriggerFocus: false,
    };
  }

  return {
    open: false,
    restoreTriggerFocus: event === "escape" && open,
  };
}

export function getDangerOverflowMenuPanelClass(
  placement: DangerOverflowMenuPlacement,
): string {
  return `danger-overflow-menu-panel danger-overflow-menu-panel--${placement}`;
}
