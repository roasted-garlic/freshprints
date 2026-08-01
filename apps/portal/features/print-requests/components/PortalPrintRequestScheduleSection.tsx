interface PortalPrintRequestScheduleSectionProps {
  labels: string[];
}

export function PortalPrintRequestScheduleSection({ labels }: PortalPrintRequestScheduleSectionProps) {
  if (labels.length === 0) return null;
  const heading = labels.length === 1 ? 'Scheduled show' : 'Scheduled shows';

  return (
    <div className="portal-print-progress-schedules">
      <p className="portal-eyebrow">{heading}</p>
      <ul className="portal-print-progress-schedule-list">
        {labels.map((label, index) => (
          <li key={`${label}-${index}`}>{label}</li>
        ))}
      </ul>
    </div>
  );
}
