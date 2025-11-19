/**
 * Enterprise Error Boundary
 * Fortune 500-grade error handling and recovery
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { analytics } from '@/lib/analytics';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: any[];
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    analytics.trackError(error, 'critical', { componentStack: errorInfo.componentStack });
    this.props.onError?.(error, errorInfo);
    this.setState({ error, errorInfo });
  }

  resetError = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      // Default user-friendly error UI
      return (
        <div
          style={{
            background: '#fff',
            border: '1px solid #f00',
            borderRadius: 8,
            padding: 32,
            margin: '40px auto',
            maxWidth: 480,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            textAlign: 'center',
          }}
        >
          <h2 style={{ color: '#d32f2f', marginBottom: 16 }}>Something went wrong</h2>
          <p style={{ marginBottom: 24 }}>
            An unexpected error has occurred. Please try again.
          </p>
          <button
            onClick={this.resetError}
            style={{
              background: '#d32f2f',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              padding: '8px 24px',
              cursor: 'pointer',
              fontSize: 16,
            }}
          >
            Retry
          </button>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <div
              style={{
                marginTop: 32,
                textAlign: 'left',
                background: '#f9f9f9',
                color: '#333',
                padding: 16,
                borderRadius: 4,
                fontFamily: 'monospace',
                fontSize: 14,
                overflowX: 'auto',
              }}
            >
              <strong>Error:</strong> {this.state.error.toString()}
              <br />
              {this.state.errorInfo && (
                <>
                  <strong>Stack trace:</strong>
                  <pre style={{ whiteSpace: 'pre-wrap' }}>
                    {this.state.errorInfo.componentStack}
                  </pre>
                </>
              )}
            </div>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
