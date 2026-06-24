import { LoadingSpinner } from "./LoadingSpinner";

interface PageLoadingStateProps {
  label: string;
  message?: string;
}

export function PageLoadingState({ label, message }: PageLoadingStateProps) {
  return (
    <div aria-live="polite" className="page-loading-state" role="status">
      <LoadingSpinner label={label} />
      <span>{message ?? label}</span>
    </div>
  );
}
