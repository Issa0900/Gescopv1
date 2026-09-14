import React from "react";
import { ArrowRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function OpportunityCard({ title, description, impact, category, link, onCreateAction }) {
  return (
    <div className="animate-slide-up flex flex-col rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          {category && <p className="text-xs font-medium text-muted-foreground">{category}</p>}
          {impact && <p className="mt-1 text-2xl font-bold text-emerald-600">{impact}</p>}
        </div>
      </div>
      <p className="mt-2 text-sm font-semibold leading-snug">{title}</p>
      {description && <p className="mt-1 text-sm leading-snug text-muted-foreground">{description}</p>}
      <div className="mt-4 flex items-center gap-2">
        {link && (
          <Button size="sm" variant="outline" asChild>
            <Link to={link}>Voir pourquoi <ArrowRight className="ml-1 h-3 w-3" /></Link>
          </Button>
        )}
        {onCreateAction && (
          <Button size="sm" variant="ghost" onClick={onCreateAction}>
            <Plus className="mr-1 h-3 w-3" /> Créer une action
          </Button>
        )}
      </div>
    </div>
  );
}