import React from 'react';
import { Trophy } from 'lucide-react';

interface State { hasError: boolean; }

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full flex flex-col items-center justify-center gap-5 bg-[#1A1A1E] px-8">
          <div className="w-12 h-12 border-2 border-[#E8321A] flex items-center justify-center">
            <Trophy size={20} className="text-[#E8321A]" />
          </div>
          <div className="text-center">
            <p className="text-[#F2EFE8] font-display text-lg uppercase tracking-widest mb-1">Something went wrong</p>
            <p className="text-[#555555] font-mono text-xs">An unexpected error occurred in this view.</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-8 py-2.5 bg-[#E8321A] hover:bg-[#C82818] text-white font-mono text-xs uppercase tracking-widest transition-colors"
          >
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
