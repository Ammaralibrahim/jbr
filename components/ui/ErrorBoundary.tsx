'use client';

import React from 'react';
import { Alert, AlertDescription, AlertTitle } from './alert';
import { Button } from './button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[400px] p-6">
          <Alert variant="destructive" className="max-w-md">
            <AlertTriangle className="h-6 w-6" />
            <AlertTitle className="text-lg font-bold">حدث خطأ غير متوقع</AlertTitle>
            <AlertDescription className="mt-2">
              <p className="mb-4">
                {this.state.error?.message || 'حدث خطأ أثناء تحميل الصفحة'}
              </p>
              <Button onClick={this.handleReset} variant="outline">
                <RefreshCw className="h-4 w-4 ml-2" />
                إعادة المحاولة
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}