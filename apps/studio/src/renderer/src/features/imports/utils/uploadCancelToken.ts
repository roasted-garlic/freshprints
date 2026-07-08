/**
 * Tracks whether an upload operation has been cancelled and any in-flight abortable Firebase
 * `UploadTask`s registered against it. A single token can span a whole batch: each file's
 * `uploadOriginalPng` call registers its task while in flight, and `cancel()` both aborts every
 * currently-registered task and flips `isCancelled` so the batch orchestration loop can skip
 * starting any file that hasn't begun uploading yet.
 */
export class UploadCancelToken {
  private cancelled = false;
  private readonly activeTasks = new Set<{ cancel: () => void }>();

  get isCancelled(): boolean {
    return this.cancelled;
  }

  registerTask(task: { cancel: () => void }): () => void {
    if (this.cancelled) {
      task.cancel();
    } else {
      this.activeTasks.add(task);
    }

    return () => {
      this.activeTasks.delete(task);
    };
  }

  cancel(): void {
    this.cancelled = true;

    for (const task of this.activeTasks) {
      task.cancel();
    }

    this.activeTasks.clear();
  }
}
