import React from "react";
import { TrendingDown, AlertTriangle, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

const styles = {
  red: { bg: "border-red-200 bg-red-50/40", icon: "text-red-600", dot: "bg-red-500" },
  orange: { bg: "border-orange-200 bg-orange-50/40", icon: "text-orange-600", dot: "bg-orange-500" },
  green: { bg: "border-emerald-200 bg-emerald-50/40", icon: "text-emerald-600", dot: "bg-emerald-500" },
};
const icons = { red: TrendingDown, orange: AlertTriangle, green: TrendingUp };

export default function TodayHighlights({ items }) {
  if (!items || items.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">À retenir aujourd'hui</h2>
        <p className="text-sm text-muted-foreground">Aucun élément particulier ne nécessite votre attention.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">À retenir aujourd'hui</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {items.map((item, i) => {
          const s = styles[item.color];
          const Icon = icons[item.color];
          return (
            <Link key={i} to={item.link || "#"} className={cn("rounded-xl border p-4 transition-colors hover:bg-muted/30", s.bg)}>
              <div className="mb-2 flex items-center gap-2">
                <div className={cn("h-2 w-2 rounded-full", s.dot)} />
                <Icon className={cn("h-4 w-4", s.icon)} />
              </div>
              <p className="text-sm font-semibold leading-tight">{item.title}</p>
              {item.subtitle && <p className="mt-1 text-xs leading-snug text-muted-foreground line-clamp-2">{item.subtitle}</p>}
              {item.impact && <p className={cn("mt-1.5 text-sm font-bold", s.icon)}>{item.impact}</p>}
            </Link>
          );
        })}
      </div>
    </div>
  );
}