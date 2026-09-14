import React from "react";
import { cn } from "@/lib/utils";

const periods = [
  { key: "day", label: "Aujourd'hui" },
  { key: "month", label: "Mois" },
  { key: "quarter", label: "Trimestre" },
  { key: "year", label: "Année" },
];

export default function TimeFilter({ period, onChange }) {
  return (
    <div className="inline-flex items-center rounded-xl bg-white/70 p-1 shadow-sm backdrop-blur">
      {periods.map((p) => (
        <button
          key={p.key}
          onClick={() => onChange(p.key)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-150 ease-in-out",
            period === p.key
              ? "bg-[#10B981]/10 text-[#10B981]"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}