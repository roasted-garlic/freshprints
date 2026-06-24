interface ErrorStateProps {
  eyebrow?: string;
  title: string;
  message: string;
}

export function ErrorState({ eyebrow = "Unavailable", title, message }: ErrorStateProps) {
  return (
    <div className="error-state" role="alert">
      <p className="eyebrow">{eyebrow}</p>
      <h3>{title}</h3>
      <p>{message}</p>
    </div>
  );
}
