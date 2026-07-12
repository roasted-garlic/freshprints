import { Component, type ErrorInfo, type ReactNode } from "react";

import { Button } from "../../../shared/components/Button";

interface TestDataResetErrorBoundaryProps {
  children: ReactNode;
}

interface TestDataResetErrorBoundaryState {
  error: Error | null;
}

/**
 * Prevents a render crash on this page from blanking the entire Studio shell.
 */
export class TestDataResetErrorBoundary extends Component<
  TestDataResetErrorBoundaryProps,
  TestDataResetErrorBoundaryState
> {
  state: TestDataResetErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): TestDataResetErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[TestDataResetErrorBoundary]", error, errorInfo);
  }

  render() {
    if (this.state.error) {
      return (
        <main className="page-layout page-layout-shell test-data-reset-page">
          <section className="card test-data-reset-section">
            <h2 className="test-data-reset-title">Something went wrong on this page</h2>
            <p className="test-data-reset-copy" role="alert">
              {this.state.error.message || "Unable to render Test Data Reset."}
            </p>
            <Button
              onClick={() => {
                this.setState({ error: null });
              }}
              type="button"
              variant="secondary"
            >
              Try again
            </Button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
