import React from "react";
import { cn } from "@/lib/utils";

// Fond pastel + texte contraste + puce pleine (pas seulement la couleur) pour
// rester lisible en deutéranopie/protanopie (WCAG 1.4.1 - la couleur seule ne
// porte jamais l'information).
const styles = {
  good: "bg-emerald-50 text-emerald-800",
  warning: "bg-amber-50 text-amber-800",
  critical: "bg-red-50 text-red-800",
  info: "bg-blue-50 text-blue-800",
  neutral: "bg-muted text-muted-foreground",
};

const dotColors = {
  good: "bg-emerald-600",
  warning: "bg-amber-600",
  critical: "bg-red-600",
  info: "bg-blue-600",
  neutral: "bg-muted-foreground",
};

/**
 * @param {Object} props
 * @param {'good'|'warning'|'critical'|'info'|'neutral'} [props.status]
 * @param {React.ReactNode} props.children
 * @param {string} [props.className]
 */
export default function BadgeStatus({ status = "neutral", children, className }) {
  const variant = styles[status] ? status : "neutral";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
        styles[variant],
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dotColors[variant])} aria-hidden="true" />
      {children}
    </span>
  );
}
