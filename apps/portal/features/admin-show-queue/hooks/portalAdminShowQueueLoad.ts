export interface MutableRef<T> {
  current: T;
}

export interface PortalAdminShowQueueLoadOptions<Response> {
  isAdminSession: boolean;
  inFlightRef: MutableRef<Promise<void> | null>;
  mountedRef: MutableRef<boolean>;
  load: () => Promise<Response>;
  setData: (data: Response | null) => void;
  setError: (error: string | null) => void;
  setIsLoading: (isLoading: boolean) => void;
}

/** Re-arm the mounted guard on every effect setup, including React development remounts. */
export function armPortalAdminShowQueueMount(mountedRef: MutableRef<boolean>): () => void {
  mountedRef.current = true;
  return () => {
    mountedRef.current = false;
  };
}

/** Run one coalesced queue load and settle every loading/error state deterministically. */
export function refreshPortalAdminShowQueue<Response>(
  options: PortalAdminShowQueueLoadOptions<Response>,
): Promise<void> {
  const {
    isAdminSession,
    inFlightRef,
    mountedRef,
    load,
    setData,
    setError,
    setIsLoading,
  } = options;

  if (!isAdminSession) {
    if (mountedRef.current) {
      setData(null);
      setError(null);
      setIsLoading(false);
    }
    return Promise.resolve();
  }
  if (inFlightRef.current) {
    return inFlightRef.current;
  }

  setIsLoading(true);
  setError(null);
  const request = load()
    .then((nextData) => {
      if (mountedRef.current) {
        setData(nextData);
      }
    })
    .catch((reason: unknown) => {
      if (mountedRef.current) {
        setError(reason instanceof Error ? reason.message : 'Unable to load the Show Queue.');
      }
    })
    .finally(() => {
      inFlightRef.current = null;
      if (mountedRef.current) {
        setIsLoading(false);
      }
    });
  inFlightRef.current = request;
  return request;
}
