import React from "react";
import { AlertTriangle, House, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Erreur d'affichage GESCOP:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-7 w-7 text-destructive" aria-hidden="true" />
          </div>
          <h1 className="mt-5 text-xl font-bold">Cette page n'a pas pu s'afficher</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Vos données ne sont pas perdues. Réessayez ou revenez au tableau de bord.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button onClick={this.handleRetry}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Réessayer
            </Button>
            <Button asChild variant="outline">
              <Link to="/">
                <House className="h-4 w-4" aria-hidden="true" />
                Tableau de bord
              </Link>
            </Button>
          </div>
          {this.state.error?.message && (
            <details className="mt-6 text-left text-xs text-muted-foreground">
              <summary className="cursor-pointer">Détails techniques</summary>
              <p className="mt-2 break-words rounded-lg bg-muted p-3">{this.state.error.message}</p>
            </details>
          )}
        </div>
      </div>
    );
  }
}
