import { useState } from "react";
import type { AiEnrichmentSemanticReviewPlaygroundRequest } from "@fresh-prints/shared/types/ai/aiEnrichmentPlayground.types";
import { Button } from "../../../shared/components/Button";
import { aiEnrichmentSemanticReviewPlaygroundService } from "../services/aiEnrichmentSemanticReviewPlaygroundService";

export function SemanticReviewPlaygroundPanel() {
  const [payload, setPayload] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  async function run() {
    setRunning(true); setError(null); setResult(null);
    try {
      const response = await aiEnrichmentSemanticReviewPlaygroundService.runReview(
        JSON.parse(payload) as AiEnrichmentSemanticReviewPlaygroundRequest,
      );
      setResult(JSON.stringify(response, null, 2));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to run semantic review."); }
    finally { setRunning(false); }
  }
  return <section className="settings-section" aria-labelledby="semantic-review-playground-heading">
    <h3 id="semantic-review-playground-heading">Manual Pass 2 Semantic Review</h3>
    <p>Paste the exact displayed Pass 1 payload and blockers to run one text-only review.</p>
    <textarea className="settings-textarea" rows={8} value={payload} onChange={(event) => setPayload(event.target.value)} />
    <Button onClick={() => void run()} disabled={running || !payload.trim()}>{running ? "Running…" : "Run Pass 2"}</Button>
    {error ? <p className="auth-message auth-message-error" role="alert">{error}</p> : null}
    {result ? <pre className="settings-code-block">{result}</pre> : null}
  </section>;
}
