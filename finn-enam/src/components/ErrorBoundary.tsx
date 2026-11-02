import React from 'react';
import { AlertTriangle } from 'lucide-react';

/** Last-resort boundary: a render error shows a recoverable message instead of a blank screen. */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[finn] render error:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 bg-cream dark:bg-ink-bg px-6 text-center">
        <AlertTriangle size={28} className="text-fin-red" />
        <h1 className="font-serif text-2xl text-ink dark:text-white">Something went wrong</h1>
        <p className="max-w-sm text-sm text-ink-muted">{this.state.error.message}</p>
        <button
          onClick={() => window.location.reload()}
          className="min-h-[44px] rounded-xl bg-forest px-5 text-sm font-semibold text-white hover:bg-forest-light"
        >
          Reload FINN
        </button>
      </div>
    );
  }
}
