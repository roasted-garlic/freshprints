export interface CurrentRef<T> {
  current: T;
}

export function requireCurrentSignedIn<TUser, TRouter>(input: {
  userRef: CurrentRef<TUser | null>;
  routerRef: CurrentRef<TRouter>;
  designId?: string;
  returnTo?: string;
  redirect: (router: TRouter, returnTo?: string) => void;
}): boolean {
  if (input.userRef.current) {
    return true;
  }
  const returnTo =
    input.returnTo ??
    (input.designId
      ? `/catalog?designId=${encodeURIComponent(input.designId)}`
      : undefined);
  input.redirect(input.routerRef.current, returnTo);
  return false;
}

export function announceCurrentDesignAdded(input: {
  title: string;
  showSuccessRef: CurrentRef<
    (
      message: string,
      options: { action: { label: string; onClick: () => void } },
    ) => void
  >;
  onUndo: () => void;
}): void {
  input.showSuccessRef.current(`Added “${input.title}” to your Current Request.`, {
    action: {
      label: "Undo",
      onClick: input.onUndo,
    },
  });
}
