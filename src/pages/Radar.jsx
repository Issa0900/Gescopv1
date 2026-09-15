import React from "react";
import CompetitorsManager from "@/components/settings/CompetitorsManager";
import { Crosshair, Info } from "lucide-react";

export default function Radar() {
  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2">
          <Crosshair className="h-5 w-5 text-primary" aria-hidden="true" />
          <h1 className="text-2xl font-bold tracking-tight">Suivi des concurrents</h1>
        </div>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Un outil simple et maîtrisé : vous choisissez les concurrents, leurs informations et les critères à surveiller.
        </p>
      </div>
      <div className="flex gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        <Info className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <p>
          GESCOP n'ajoute plus de concurrents ou de signaux aléatoires. Les données affichées ici proviennent uniquement de vos entrées.
        </p>
      </div>
      <CompetitorsManager />
    </div>
  );
}
