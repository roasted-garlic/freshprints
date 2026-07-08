interface PortalLoadingPanelProps {
  label: string;
}

export function PortalLoadingPanel({ label }: PortalLoadingPanelProps) {
  return (
    <div aria-busy="true" className="portal-loading-panel" role="status">
      <span aria-hidden="true" className="portal-loading-spinner" />
      <span>{label}</span>
    </div>
  );
}
