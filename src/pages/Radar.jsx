import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import SignalCard from "@/components/radar/SignalCard";
import EmptyState from "@/components/EmptyState";
import { Radar as RadarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import RadarScanButton from "@/components/radar/RadarScanButton";

const familyLabels = {
  gouvernement: "Gouvernement", economie: "Économie", marche: "Marché",
  concurrence: "Concurrence", fournisseurs: "Fournisseurs",
  consommateurs: "Consommateurs", actualites: "Actualités",
};
const familyColors = {
  gouvernement: "bg-blue-50 text-blue-700", economie: "bg-purple-50 text-purple-700",
  marche: "bg-emerald-50 text-emerald-700", concurrence: "bg-red-50 text-red-700",
  fournisseurs: "bg-amber-50 text-amber-700", consommateurs: "bg-pink-50 text-pink-700",
  actualites: "bg-slate-50 text-slate-700",
};

export default function Radar() {
  const { data: signals, isLoading } = useQuery({
    queryKey: ["signals"],
    queryFn: async () => {
      const list = await base44.entities.ExternalSignal.list("-relevance_score", 50);
      return (list || []).sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
    },
  });

  if (isLoading) return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" /></div>;
  if (!signals || signals.length === 0) return <EmptyState icon={RadarIcon} title="Radar externe vide" description="Le radar ne se déclenche qu'à votre demande. Il ne retient qu'une information liée à votre secteur, votre localisation ou vos concurrents, et uniquement si elle cite une source consultable." action={<RadarScanButton />} />;

  const top3 = signals.slice(0, 3);
  const rest = signals.slice(3);
  const byFamily = {};
  rest.forEach((s) => { if (!byFamily[s.family]) byFamily[s.family] = []; byFamily[s.family].push(s); });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <RadarIcon className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Radar externe</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Scan à la demande. Seules les informations liées à votre secteur, votre localisation ou vos concurrents sont retenues, et chaque signal renvoie à sa source d'origine.
          </p>
        </div>
        <RadarScanButton variant="outline" />
      </div>

      {top3.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">{top3.length} signal{top3.length > 1 ? "s" : ""} prioritaire{top3.length > 1 ? "s" : ""}</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {top3.map((s) => <SignalCard key={s.id} signal={s} prominent />)}
          </div>
        </div>
      )}

      {Object.keys(familyLabels).map((family) => {
        const items = byFamily[family];
        if (!items || items.length === 0) return null;
        return (
          <div key={family}>
            <div className="mb-3 flex items-center gap-2">
              <span className={cn("rounded-full px-3 py-1 text-xs font-medium", familyColors[family])}>{familyLabels[family]}</span>
              <span className="text-xs text-muted-foreground">{items.length} signal{items.length > 1 ? "s" : ""}</span>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {items.map((s) => <SignalCard key={s.id} signal={s} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}