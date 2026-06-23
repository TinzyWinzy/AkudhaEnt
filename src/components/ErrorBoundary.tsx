import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Akudha Error Boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-rose-500 mb-4" />
          <h2 className="font-display text-lg font-bold text-charcoal-900 mb-2">Something went wrong</h2>
          <p className="text-sm text-charcoal-600 mb-4 max-w-md">
            {this.state.error?.message ?? 'An unexpected error occurred in this panel.'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="flex items-center gap-2 rounded-lg bg-charcoal-900 px-4 py-2 text-xs font-bold text-white hover:bg-ochre-500 hover:text-charcoal-900 transition-all uppercase"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
