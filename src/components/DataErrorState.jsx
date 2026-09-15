import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function DataErrorState({ title = "Données indisponibles", description, onRetry }) {
  return (
    <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50/70 p-6 text-center">
      <AlertCircle className="mx-auto h-7 w-7 text-rose-600" aria-hidden="true" />
      <h2 className="mt-3 font-semibold text-rose-950">{title}</h2>
      <p className="mx-auto mt-1 max-w-lg text-sm text-rose-800">
        {description || "La source de données n'a pas répondu. Réessayez ou consultez l'audit des calculs."}
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {onRetry && (
          <Button variant="outline" onClick={onRetry} className="border-rose-300 bg-white">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Réessayer
          </Button>
        )}
        <Button asChild variant="link" className="text-rose-800">
          <Link to="/audit">Voir l'audit des calculs</Link>
        </Button>
      </div>
    </div>
  );
}
