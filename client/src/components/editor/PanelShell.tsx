import React, { Suspense } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PanelErrorBoundaryProps {
  title: string;
  children: React.ReactNode;
}

interface PanelErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class PanelErrorBoundary extends React.Component<PanelErrorBoundaryProps, PanelErrorBoundaryState> {
  state: PanelErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): PanelErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error(`[PanelShell] ${this.props.title} crashed`, error);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full items-center justify-center bg-[var(--ecode-background)] p-4">
          <div className="max-w-sm text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <p className="mb-1 text-[13px] font-medium text-[var(--ecode-text)]">
              {this.props.title} failed to load
            </p>
            <p className="mb-4 text-[11px] text-[var(--ecode-text-muted)]">
              {this.state.error?.message || 'An unexpected panel error occurred.'}
            </p>
            <Button size="sm" variant="outline" onClick={this.handleRetry}>
              Retry
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function PanelLoader({ title }: { title: string }) {
  return (
    <div className="flex h-full items-center justify-center bg-[var(--ecode-background)] p-4">
      <div className="text-center">
        <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-[var(--ecode-accent)]" />
        <p className="text-[11px] text-[var(--ecode-text-muted)]">Loading {title.toLowerCase()}...</p>
      </div>
    </div>
  );
}

interface PanelShellProps {
  title: string;
  children: React.ReactNode;
}

export function PanelShell({ title, children }: PanelShellProps) {
  return (
    <PanelErrorBoundary title={title}>
      <Suspense fallback={<PanelLoader title={title} />}>
        {children}
      </Suspense>
    </PanelErrorBoundary>
  );
}
