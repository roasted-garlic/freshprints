interface ProgressBarProps {
  label?: string;
  value: number;
}

export function ProgressBar({ label = "Progress", value }: ProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div
      aria-label={label}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={clampedValue}
      className="progress-bar"
      role="progressbar"
    >
      <div className="progress-bar-fill" style={{ width: `${clampedValue}%` }} />
    </div>
  );
}
