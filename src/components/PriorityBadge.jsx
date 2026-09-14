import React from "react";
import { cn } from "@/lib/utils";

const styles = {
  critique: "bg-red-50 text-red-700 border-red-200",
  important: "bg-orange-50 text-orange-700 border-orange-200",
  urgente: "bg-red-50 text-red-700 border-red-200",
  eleve: "bg-orange-50 text-orange-700 border-orange-200",
  elevee: "bg-orange-50 text-orange-700 border-orange-200",
  modere: "bg-amber-50 text-amber-700 border-amber-200",
  moyenne: "bg-amber-50 text-amber-700 border-amber-200",
  moyen: "bg-amber-50 text-amber-700 border-amber-200",
  faible: "bg-emerald-50 text-emerald-700 border-emerald-200",
  info: "bg-blue-50 text-blue-700 border-blue-200",
  positif: "bg-emerald-50 text-emerald-700 border-emerald-200",
  negatif: "bg-red-50 text-red-700 border-red-200",
  neutre: "bg-slate-50 text-slate-700 border-slate-200",
};

const labels = {
  critique: "Critique",
  important: "Important",
  urgente: "Urgente",
  eleve: "Élevé",
  elevee: "Élevée",
  modere: "Modéré",
  moyenne: "Moyenne",
  moyen: "Moyen",
  faible: "Faible",
  info: "Info",
  positif: "Positif",
  negatif: "Négatif",
  neutre: "Neutre",
};

export default function PriorityBadge({ level, className }) {
  const key = (level || "").toLowerCase();
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        styles[key] || "bg-slate-50 text-slate-700 border-slate-200",
        className
      )}
    >
      {labels[key] || level}
    </span>
  );
}