import React from 'react';

interface AppErrorBoundaryProps {
  children: React.ReactNode;
}

interface AppErrorBoundaryState {
  error: Error | null;
}

/**
 * Last resort above the router.
 *
 * A throw inside any page used to unmount the whole tree and leave a white document with
 * nothing on screen and nothing said — indistinguishable, for the user, from a map that
 * simply failed to load. The copy is deliberately not localised: the locale provider lives
 * inside this boundary, so it may be exactly what failed.
 */
class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Unhandled render error', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="max-w-md space-y-3 text-center">
          <h1 className="text-lg font-semibold text-foreground">
            L’application a rencontré une erreur — the application hit an error
          </h1>
          <p className="text-sm text-muted-foreground">
            Recharger la page suffit en général. Reloading usually clears it.
          </p>
          <p className="break-words text-xs text-muted-foreground">{error.message}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-md border border-border px-3 py-1.5 text-sm text-foreground hover:bg-accent"
          >
            Recharger / Reload
          </button>
        </div>
      </div>
    );
  }
}

export default AppErrorBoundary;
