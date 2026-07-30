const tails = new Map<string, Promise<void>>();

/**
 * Serializes mutations that contend on the same print-request transaction while allowing
 * unrelated requests to proceed independently. A rejection never poisons the following task.
 */
export async function enqueuePortalPrintRequestMutation<T>(
  printRequestId: string,
  task: () => Promise<T>,
): Promise<T> {
  const key = printRequestId.trim();
  const previous = tails.get(key) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  tails.set(key, current);

  await previous.catch(() => undefined);
  try {
    return await task();
  } finally {
    release();
    if (tails.get(key) === current) {
      tails.delete(key);
    }
  }
}

export function clearPortalPrintRequestMutationQueuesForTests(): void {
  tails.clear();
}

