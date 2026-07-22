import type { Unsubscribe } from "firebase/firestore";

import {
  traceFirestoreListenerAttach,
  traceWrappedUnsubscribe,
} from "@fresh-prints/shared/utils/firestoreUsageTrace";

type SharedListener<T> = {
  onChange: (value: T) => void;
  onError?: (message: string) => void;
};

/**
 * Ref-counted Firestore listener fan-out: multiple UI subscribers share one SDK subscription.
 */
export function createSharedFirestoreSubscription<T>(options: {
  traceKey: string;
  start: (emit: {
    next: (value: T) => void;
    error: (message: string) => void;
  }) => Unsubscribe;
}): {
  subscribe: (onChange: (value: T) => void, onError?: (message: string) => void) => Unsubscribe;
} {
  let firebaseUnsubscribe: Unsubscribe | null = null;
  let wrappedUnsubscribe: Unsubscribe | null = null;
  let lastValue: T | undefined;
  let hasValue = false;
  const listeners = new Set<SharedListener<T>>();

  const emitNext = (value: T) => {
    lastValue = value;
    hasValue = true;
    for (const listener of listeners) {
      listener.onChange(value);
    }
  };

  const emitError = (message: string) => {
    for (const listener of listeners) {
      listener.onError?.(message);
    }
  };

  return {
    subscribe(onChange, onError) {
      const listener: SharedListener<T> = { onChange, onError };
      listeners.add(listener);

      if (hasValue) {
        onChange(lastValue as T);
      }

      if (!firebaseUnsubscribe) {
        traceFirestoreListenerAttach(options.traceKey);
        firebaseUnsubscribe = options.start({ next: emitNext, error: emitError });
        wrappedUnsubscribe = traceWrappedUnsubscribe(options.traceKey, () => {
          firebaseUnsubscribe?.();
          firebaseUnsubscribe = null;
          wrappedUnsubscribe = null;
          hasValue = false;
          lastValue = undefined;
        });
      }

      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && wrappedUnsubscribe) {
          wrappedUnsubscribe();
        }
      };
    },
  };
}
