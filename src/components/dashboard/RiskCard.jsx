import React from "react";
import { ArrowRight, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const urgencyStyles = {
  elevee: "bg-red-50 text-red-700 border-red-200",
  moyenne: "bg-amber-50 text-amber-700 border-amber-200",
  faible: "bg-blue-50 text-blue-700 border-blue-200",
};

const urgencyLabels = {
  elevee: "Urgence élevée",
  moyenne: "Urgence moyenne",
  faible: "Urgence faible",
};

export default function RiskCard({ title, description, impact, category, urgency, score, link, onCreateAction }) {
  return (
    <div className="animate-slide-up flex flex-col rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50">
            <ShieldAlert className="h-4 w-4 text-red-600" />
          </div>
          {category && <p className="text-xs font-medium text-muted-foreground">{category}</p>}
        </div>
        {urgency && (
          <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${urgencyStyles[urgency] || urgencyStyles.faible}`}>
            {urgencyLabels[urgency] || urgency}
          </span>
        )}
      </div>
      <p className="mt-3 text-sm font-semibold leading-snug">{title}</p>
      {description && <p className="mt-1 text-sm leading-snug text-muted-foreground line-clamp-2">{description}</p>}
      {impact && <p className="mt-2 text-lg font-bold text-red-600">{impact}</p>}
      <div className="mt-4 flex items-center gap-2">
        {link && (
          <Button size="sm" variant="outline" asChild>
            <Link to={link}>Voir le détail <ArrowRight className="ml-1 h-3 w-3" /></Link>
          </Button>
        )}
        {onCreateAction && (
          <Button size="sm" variant="ghost" onClick={onCreateAction}>
            Créer une action
          </Button>
        )}
      </div>
    </div>
  );
}