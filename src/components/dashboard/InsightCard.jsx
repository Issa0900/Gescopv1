import React, { useState } from "react";
import { AlertTriangle, TrendingDown, TrendingUp, Lightbulb, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

const typeConfig = {
  risk: { icon: AlertTriangle, color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200", label: "Risque" },
  anomaly: { icon: TrendingDown, color: "text-red-600", bg: "bg-red-50", border: "border-red-200", label: "Anomalie" },
  opportunity: { icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", label: "Opportunité" },
  info: { icon: Lightbulb, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200", label: "Information" },
};

export default function InsightCard({ type, title, why, impact, action, link, onDismiss }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const cfg = typeConfig[type] || typeConfig.info;
  const Icon = cfg.icon;

  return (
    <div className={cn("animate-slide-up rounded-2xl border bg-card p-5 transition-shadow hover:shadow-md", cfg.border)}>
      <div className="flex items-center gap-2">
        <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg", cfg.bg)}>
          <Icon className={cn("h-4 w-4", cfg.color)} />
        </div>
        <span className={cn("text-xs font-semibold uppercase tracking-wider", cfg.color)}>{cfg.label}</span>
      </div>
      <div className="mt-4 space-y-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Quoi ?</p>
          <p className="mt-0.5 text-sm font-semibold leading-snug text-foreground">{title}</p>
        </div>
        {why && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Pourquoi ?</p>
            <p className="mt-0.5 text-sm leading-snug text-muted-foreground">{why}</p>
          </div>
        )}
        {impact && (
          <div className="rounded-lg bg-muted/50 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Impact estimé</p>
            <p className={cn("mt-0.5 text-base font-bold", cfg.color)}>{impact}</p>
          </div>
        )}
        {action && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Action recommandée</p>
            <p className="mt-0.5 text-sm leading-snug text-foreground">{action}</p>
          </div>
        )}
      </div>
      <div className="mt-4 flex items-center gap-2">
        {link && (
          <Button size="sm" variant="outline" asChild>
            <Link to={link}>Voir l'analyse <ArrowRight className="ml-1 h-3 w-3" /></Link>
          </Button>
        )}
        {onDismiss && (
          <Button size="sm" variant="ghost" onClick={() => { setDismissed(true); onDismiss(); }}>
            <X className="mr-1 h-3 w-3" /> Ignorer
          </Button>
        )}
      </div>
    </div>
  );
}