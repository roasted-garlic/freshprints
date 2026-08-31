import { FirebaseError } from 'firebase/app';

function isGenericCallableMessage(message: string): boolean {
  return new Set([
    'internal',
    'unknown',
    'unavailable',
    'failed-precondition',
    'invalid-argument',
    'permission-denied',
    'not-found',
  ]).has(message.trim().toLowerCase());
}

export function resolveArtworkEnhanceCallableErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    const message = error.message?.trim() ?? '';

    switch (error.code) {
      case 'functions/unauthenticated':
        return 'You must be signed in to change improve-resolution settings.';
      case 'functions/permission-denied':
        return message && !isGenericCallableMessage(message)
          ? message
          : 'You do not have permission to change improve-resolution settings.';
      case 'functions/invalid-argument':
      case 'functions/failed-precondition':
        return message && !isGenericCallableMessage(message)
          ? message
          : 'Improve resolution could not be updated for this item.';
      case 'functions/unavailable':
      case 'functions/not-found':
      case 'functions/internal':
        return 'Improve resolution is unavailable right now. Please try again in a moment.';
      case 'functions/deadline-exceeded':
        return 'Upscaling is taking longer than expected. It may still finish — refresh this request in a moment.';
      default:
        if (message && !isGenericCallableMessage(message)) {
          return message;
        }
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  return 'Unable to update improve-resolution setting.';
}
