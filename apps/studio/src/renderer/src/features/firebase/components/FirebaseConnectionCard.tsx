import { Card } from "../../../shared/components/Card";
import { Badge } from "../../../shared/components/Badge";
import { PageLoadingState } from "../../../shared/components/PageLoadingState";
import { useFirebaseConnectionStatus } from "../hooks/useFirebaseConnectionStatus";
import {
  getConnectionBadgeVariant,
  getConnectionStatusLabel,
  getOverallStatusLabel,
  getOverallSummaryMessage,
} from "../utils/firebaseConnectionDisplay";

export function FirebaseConnectionCard() {
  const { error, isLoading, result } = useFirebaseConnectionStatus();

  return (
    <Card className="firebase-connection-card" aria-labelledby="firebase-connection-title">
      <div>
        <p className="eyebrow">Setup verification</p>
        <h2 id="firebase-connection-title">Firebase connection</h2>
        <p>
          Phase 1 diagnostics for Firebase app, Auth, Firestore, and Storage. Permission denied from
          security rules means the service is reachable and protected, not broken.
        </p>
      </div>

      {isLoading ? (
        <PageLoadingState label="Checking Firebase connection" message="Checking Firebase services..." />
      ) : null}

      {error ? (
        <p className="auth-message auth-message-error" role="alert">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="connection-check-list">
          <p className={`connection-summary connection-summary-${result.status}`}>
            Overall status: {getOverallStatusLabel(result.status)}
          </p>
          <p className="connection-summary-detail">{getOverallSummaryMessage(result)}</p>
          {result.checks.map((check) => (
            <div className="connection-check" key={check.key}>
              <strong>{check.label}</strong>
              <Badge variant={getConnectionBadgeVariant(check.status)}>
                {getConnectionStatusLabel(check.status)}
              </Badge>
              <p>{check.message}</p>
            </div>
          ))}
        </div>
      ) : null}
    </Card>
  );
}
