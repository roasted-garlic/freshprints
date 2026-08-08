export interface PortalPrintRequestScheduleEntry {
  /** Stable identity for list reconciliation (e.g. upcomingShowId). Not displayed. */
  id: string;
  /** Customer-safe label (no show ids/titles). */
  label: string;
}

interface PortalPrintRequestScheduleSectionProps {
  entries: PortalPrintRequestScheduleEntry[];
}

export function PortalPrintRequestScheduleSection({ entries }: PortalPrintRequestScheduleSectionProps) {
  if (entries.length === 0) return null;
  const heading = entries.length === 1 ? 'Scheduled show' : 'Scheduled shows';

  return (
    <div className="portal-print-progress-schedules">
      <p className="portal-eyebrow">{heading}</p>
      <ul className="portal-print-progress-schedule-list">
        {entries.map((entry) => (
          <li key={entry.id}>{entry.label}</li>
        ))}
      </ul>
    </div>
  );
}
