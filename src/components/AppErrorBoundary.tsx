import React from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';

interface AppErrorBoundaryProps {
  children: React.ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('Application render error', error);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,hsl(204_42%_97%),hsl(198_45%_94%))] px-4 py-8">
        <div className="card-surface w-full max-w-md rounded-[28px] border border-border/70 p-6 text-center shadow-xl">
          <div className="mx-auto inline-flex rounded-2xl bg-primary/8 p-3">
            <Logo size="lg" />
          </div>
          <div className="mt-5 flex justify-center text-destructive">
            <AlertTriangle size={34} />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-foreground">Something went wrong</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            The page did not load correctly. Refresh once and try again. If this keeps happening, open the link again from the admin panel.
          </p>
          <Button className="mt-6 h-11 w-full rounded-xl" onClick={() => window.location.reload()}>
            <RefreshCcw size={16} />
            Reload Page
          </Button>
        </div>
      </div>
    );
  }
}
