import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

function Sparkline({ data, color = "hsl(var(--primary))" }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((v - min) / range) * 90 - 5;
    return `${x},${y}`;
  });
  const areaPts = `0,100 ${pts.join(" ")} 100,100`;
  const gid = `sl-${Math.random().toString(36).slice(2, 8)}`;
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-10 w-full">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.15} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={areaPts} fill={`url(#${gid})`} />
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth={1.5} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

const trendConfig = {
  up: { icon: TrendingUp, color: "text-emerald-600" },
  down: { icon: TrendingDown, color: "text-red-600" },
  stable: { icon: Minus, color: "text-muted-foreground" },
};

const statusStyles = {
  good: "text-emerald-600 bg-emerald-50",
  warning: "text-orange-600 bg-orange-50",
  critical: "text-red-600 bg-red-50",
  neutral: "text-blue-600 bg-blue-50",
};

export default function KpiCard({ label, value, change, changeDir, sparkline, status, statusLabel, onClick }) {
  const tc = trendConfig[changeDir] || trendConfig.stable;
  const TIcon = tc.icon;
  return (
    <div
      onClick={onClick}
      className={cn(
        "animate-slide-up rounded-xl border border-border bg-card p-5 transition-all duration-300",
        onClick && "cursor-pointer hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20"
      )}
    >
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {status && (
          <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide", statusStyles[status] || statusStyles.neutral)}>
            {statusLabel || status}
          </span>
        )}
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        {change && (
          <span className={cn("flex items-center gap-1 text-xs font-semibold", tc.color)}>
            <TIcon className="h-3 w-3" />
            {change}
          </span>
        )}
      </div>
      <div className="mt-3">
        <Sparkline data={sparkline} />
      </div>
    </div>
  );
}