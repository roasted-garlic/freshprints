import { Component, type ErrorInfo, type ReactNode } from "react";

import { Button } from "../../../shared/components/Button";

interface AiReviewErrorBoundaryProps {
  children: ReactNode;
}

interface AiReviewErrorBoundaryState {
  errorMessage: string | null;
}

export class AiReviewErrorBoundary extends Component<
  AiReviewErrorBoundaryProps,
  AiReviewErrorBoundaryState
> {
  state: AiReviewErrorBoundaryState = {
    errorMessage: null,
  };

  static getDerivedStateFromError(error: Error): AiReviewErrorBoundaryState {
    return {
      errorMessage: error.message || "An unexpected error occurred in AI Processing.",
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error("[AI Review] render error", error, errorInfo.componentStack);
    }
  }

  private handleRetry = () => {
    this.setState({ errorMessage: null });
  };

  render() {
    if (this.state.errorMessage) {
      const isValidationError = /tags must be|at most \d+ tags/i.test(this.state.errorMessage);

      return (
        <section className="ai-review-page">
          <div className="ai-review-fallback-panel" role="alert">
            <h2 className="ai-review-fallback-title">
              {isValidationError
                ? "Could not display this design's catalog form"
                : "AI Processing is temporarily unavailable"}
            </h2>
            <p className="ai-review-fallback-copy">{this.state.errorMessage}</p>
            <Button onClick={this.handleRetry} type="button" variant="secondary">
              Try again
            </Button>
          </div>
        </section>
      );
    }

    return this.props.children;
  }
}
