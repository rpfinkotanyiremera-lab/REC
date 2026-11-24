import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let readable = error.message;
    try {
      const parsed = JSON.parse(error.message) as { error?: string; path?: string };
      if (parsed.error) {
        readable = parsed.path
          ? `${parsed.error} (Resource: ${parsed.path})`
          : parsed.error;
      }
    } catch {
      // Keep original message
    }
    return { hasError: true, errorMessage: readable };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Remera EcoCare ErrorBoundary:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F8FAF9] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-emerald-950/10 rounded-xl p-8 shadow-sm">
            <div className="flex items-center gap-3 text-red-700 mb-4">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h1 className="text-lg font-semibold text-[#1F2937]">
                Unable to complete request
              </h1>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed mb-6 break-words">
              {this.state.errorMessage || 'An unexpected application error occurred.'}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#15803D] hover:bg-[#166534] text-white text-sm font-medium rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reload Application</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
