import React from "react";
import { cn } from "@/lib/utils";

/**
 * @param {Object} props
 * @param {string} props.label
 * @param {string|number} props.value
 * @param {string} [props.sublabel]
 * @param {React.ComponentType<{className?: string}>} [props.icon]
 * @param {React.ReactNode} [props.trend]
 * @param {string} [props.accent]
 */
export default function StatCard({ label, value, sublabel, icon: Icon, trend, accent }) {
  return (
    <div className="animate-slide-up rounded-xl border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
          {sublabel && <p className="mt-1 text-xs text-muted-foreground">{sublabel}</p>}
        </div>
        {Icon && (
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg",
              accent || "bg-muted text-muted-foreground"
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
      {trend && (
        <div className="mt-3 text-xs font-medium text-muted-foreground">{trend}</div>
      )}
    </div>
  );
}