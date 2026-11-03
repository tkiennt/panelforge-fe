import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className='flex-1 min-h-[50vh] flex items-center justify-center p-6'>
          <div className='max-w-md w-full bg-white border border-red-200 rounded-2xl p-6 shadow-lg text-center space-y-4'>
            <div className='w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto'>
              <AlertTriangle className='w-6 h-6' />
            </div>
            <div>
              <h2 className='text-base font-bold text-zinc-900'>
                {this.props.fallbackTitle || 'Đã xảy ra lỗi hiển thị giao diện'}
              </h2>
              <p className='text-xs text-zinc-600 mt-1 font-mono break-words bg-zinc-50 p-2.5 rounded-lg border border-zinc-200 text-left max-h-40 overflow-y-auto'>
                {this.state.error?.message || 'Lỗi không xác định'}
              </p>
            </div>
            <button
              type='button'
              onClick={this.handleReset}
              className='inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer'
            >
              <RefreshCw className='w-3.5 h-3.5' />
              <span>Tải lại trang</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

