export interface FirebaseDebugWindowLike {
  close(): void;
  focus(): void;
  isDestroyed(): boolean;
  isMinimized(): boolean;
  restore(): void;
  show(): void;
}

export class FirebaseDebugWindowLifecycle<T extends FirebaseDebugWindowLike> {
  private current: T | null = null;

  get(): T | null {
    return this.current && !this.current.isDestroyed() ? this.current : null;
  }

  open(factory: () => T): { created: boolean; window: T } {
    const existing = this.get();
    if (existing) {
      if (existing.isMinimized()) existing.restore();
      existing.show();
      existing.focus();
      return { created: false, window: existing };
    }
    const window = factory();
    this.current = window;
    return { created: true, window };
  }

  clear(window: T): void {
    if (this.current === window) this.current = null;
  }

  close(): void {
    const window = this.get();
    this.current = null;
    if (window) window.close();
  }
}
