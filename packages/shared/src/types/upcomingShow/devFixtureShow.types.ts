/** Exact Studio Whatnot URL input sentinel for DEV fixture shows (fresh-prints-dev only). */
export const DEV_OVERRIDE_SHOW_URL_SENTINEL = "DEV-OVERRIDE";

export interface UpsertDevFixtureShowRequest {
  title?: string;
  /** ISO-8601 scheduled start instant. */
  scheduledStartAtIso: string;
  notes?: string;
  /** When set, updates an existing DEV fixture show instead of creating. */
  upcomingShowId?: string;
}

export interface UpsertDevFixtureShowResponse {
  showId: string;
}
