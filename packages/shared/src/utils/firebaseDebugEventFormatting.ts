/**
 * Pure display-formatting helpers for the Firebase Debug panel's recent-events list. Extracted so
 * they're unit-testable without a DOM/React test harness (this repo has none configured).
 */

import type { FirestoreTraceEvent } from './firestoreUsageTrace';

/** The collection/callable/asset-class this event is "about", for a compact events table column. */
export function formatEventSubject(event: FirestoreTraceEvent): string {
  return event.collection ?? event.callableName ?? event.assetClass ?? '—';
}

export function formatEventRoute(event: FirestoreTraceEvent): string {
  return event.route ?? '—';
}

export function formatEventAction(event: FirestoreTraceEvent): string {
  return event.action ?? '(unattributed)';
}

export function formatElapsedMs(elapsedMs: number): string {
  if (elapsedMs < 1000) {
    return `${elapsedMs}ms`;
  }
  const totalSeconds = elapsedMs / 1000;
  if (totalSeconds < 60) {
    return `${totalSeconds.toFixed(1)}s`;
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  return `${minutes}m ${seconds}s`;
}

/** Newest-first, bounded to `limit` (default 100) for the panel's recent-events list. */
export function selectRecentEvents(
  events: readonly FirestoreTraceEvent[],
  limit = 100,
): FirestoreTraceEvent[] {
  return [...events].reverse().slice(0, Math.max(0, limit));
}
