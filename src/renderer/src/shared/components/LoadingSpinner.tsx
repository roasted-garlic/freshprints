interface LoadingSpinnerProps {
  label?: string;
}

export function LoadingSpinner({ label = "Loading" }: LoadingSpinnerProps) {
  return (
    <span className="loading-spinner" role="status" aria-label={label}>
      <span aria-hidden="true" className="loading-spinner-indicator" />
    </span>
  );
}
