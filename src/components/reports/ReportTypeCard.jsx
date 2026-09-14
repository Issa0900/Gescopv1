import React from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, Sun, CalendarDays, CalendarRange } from "lucide-react";

const config = {
  quotidien: {
    icon: Sun,
    label: "Quotidien",
    desc: "État général, performance, risques, actions prioritaires",
    gradient: "from-blue-500/10 to-blue-500/5",
    iconBg: "bg-blue-100 text-blue-600",
    accent: "text-blue-600",
  },
  hebdomadaire: {
    icon: CalendarRange,
    label: "Hebdomadaire",
    desc: "Comparaison semaine vs précédente, KPI, tendances",
    gradient: "from-violet-500/10 to-violet-500/5",
    iconBg: "bg-violet-100 text-violet-600",
    accent: "text-violet-600",
  },
  mensuel: {
    icon: CalendarDays,
    label: "Mensuel",
    desc: "Analyse approfondie, résumé exécutif automatique",
    gradient: "from-emerald-500/10 to-emerald-500/5",
    iconBg: "bg-emerald-100 text-emerald-600",
    accent: "text-emerald-600",
  },
};

export default function ReportTypeCard({ typeKey, onGenerate, isGenerating }) {
  const cfg = config[typeKey];
  const Icon = cfg.icon;

  return (
    <div className={`group relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br ${cfg.gradient} bg-card p-5 transition-all hover:shadow-md hover:border-border/80`}>
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-card shadow-sm">
        <Icon className={`h-5.5 w-5.5 ${cfg.accent}`} />
      </div>
      <h3 className="text-base font-bold tracking-tight">Rapport {cfg.label.toLowerCase()}</h3>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{cfg.desc}</p>
      <Button
        size="sm"
        className="mt-4 w-full"
        onClick={() => onGenerate(typeKey)}
        disabled={isGenerating}
      >
        {isGenerating ? (
          <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Génération…</>
        ) : (
          <><Calendar className="mr-1.5 h-3.5 w-3.5" /> Générer</>
        )}
      </Button>
    </div>
  );
}