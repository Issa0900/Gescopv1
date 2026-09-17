import React, { useState, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { cn } from "@/lib/utils";

const metrics = [
  { key: "revenue", label: "Chiffre d'affaires", format: "currency" },
  { key: "margin", label: "Marge", format: "percent" },
  { key: "cash", label: "Trésorerie", format: "currency" },
  { key: "clients", label: "Clients", format: "count" },
  { key: "costs", label: "Coûts", format: "currency" },
];

const periods = [
  { key: "3m", label: "3 mois", months: 3 },
  { key: "6m", label: "6 mois", months: 6 },
  { key: "12m", label: "12 mois", months: 12 },
];

const monthLabels = {
  "01": "jan", "02": "fév", "03": "mar", "04": "avr",
  "05": "mai", "06": "jun", "07": "jul", "08": "aoû",
  "09": "sep", "10": "oct", "11": "nov", "12": "déc",
};

function formatMonth(m) {
  const [, mm] = (m || "").split("-");
  return monthLabels[mm] || m;
}

function formatValue(v, format) {
  if (v == null) return "-";
  if (format === "percent") return `${Math.round(v)}%`;
  if (format === "count") return Math.round(v).toLocaleString("fr-CA");
  return `${Math.round(v).toLocaleString("fr-CA")} $`;
}

function CustomTooltip({ active, payload, label, format }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-foreground">{label}</p>
      <p className="mt-1 text-primary">{formatValue(payload[0].value, format)}</p>
    </div>
  );
}

export default function PerformanceChart({ monthlyData }) {
  const [metric, setMetric] = useState("revenue");
  const [period, setPeriod] = useState("12m");

  const data = useMemo(() => {
    const series = (monthlyData || {})[metric] || [];
    const months = periods.find((p) => p.key === period)?.months || 12;
    return series.slice(-months).map((d) => ({ ...d, monthLabel: formatMonth(d.month) }));
  }, [monthlyData, metric, period]);

  const activeMetric = metrics.find((m) => m.key === metric);
  const fmt = activeMetric?.format || "currency";

  const yTickFormatter = (v) => {
    if (fmt === "percent") return `${v}%`;
    if (fmt === "count") return v.toLocaleString("fr-CA");
    return `${(v / 1000).toFixed(0)}k`;
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Évolution de l'entreprise</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {metrics.map((m) => (
          <button
            key={m.key}
            onClick={() => setMetric(m.key)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              metric === m.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
            )}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-3">
        {periods.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={cn(
              "text-xs font-medium transition-colors",
              period === p.key ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="mt-4 h-64">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} width={50} tickFormatter={yTickFormatter} />
              <Tooltip content={<CustomTooltip format={fmt} />} />
              <Line type="monotone" dataKey="val" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3, fill: "hsl(var(--primary))" }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Données insuffisantes</div>
        )}
      </div>
    </div>
  );
}