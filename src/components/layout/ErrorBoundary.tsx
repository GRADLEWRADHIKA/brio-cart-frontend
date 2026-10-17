import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RefreshCw, WifiOff } from 'lucide-react';

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<{ children: ReactNode; resetKey?: string }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('UI error:', error.message, info.componentStack?.split('\n')[1]);
  }

  componentDidUpdate(prev: { resetKey?: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    const chunk = /dynamically imported module|Loading chunk|Failed to fetch/i.test(this.state.error.message);
    return (
      <div className="container-page flex min-h-[50vh] flex-col items-center justify-center py-16 text-center">
        <span className="grid size-16 place-items-center rounded-full bg-tomato-100 text-tomato-500">
          <WifiOff className="size-7" />
        </span>
        <h1 className="mt-5 font-display text-3xl font-semibold text-forest-900">{chunk ? 'Connection hiccup' : 'Something went wrong'}</h1>
        <p className="mt-2 max-w-md text-charcoal-500">
          {chunk ? 'Part of the app could not load. Check your connection and try again.' : 'This page ran into a problem. Your cart is safe.'}
        </p>
        <button type="button" onClick={() => window.location.reload()} className="mt-6 inline-flex items-center gap-2 rounded-full bg-forest-800 px-6 py-3 font-bold text-ivory-50">
          <RefreshCw className="size-4" /> Reload
        </button>
      </div>
    );
  }
}
