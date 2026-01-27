import React from "react";

type ErrorBoundaryProps = { children: React.ReactNode };
type ErrorBoundaryState = { error?: Error };

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: undefined };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("APP ERROR", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 16, fontFamily: "system-ui" }}>
          <h2>Runtime error</h2>
          <pre style={{ whiteSpace: "pre-wrap" }}>
            {String(this.state.error?.stack || this.state.error)}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
