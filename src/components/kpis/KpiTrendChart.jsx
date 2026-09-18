import React from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

const monthLabels = {
  "01": "jan", "02": "fév", "03": "mar", "04": "avr",
  "05": "mai", "06": "jun", "07": "jul", "08": "aoû",
  "09": "sep", "10": "oct", "11": "nov", "12": "déc",
};

function formatMonth(m) {
  const [, mm] = (m || "").split("-");
  return monthLabels[mm] || m;
}

/**
 * @param {Object} props
 * @param {boolean} [props.active]
 * @param {Array<{name?: string, value?: number, color?: string, fill?: string, dataKey?: string}>} [props.payload]
 * @param {string} [props.label]
 */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="animate-scale-in rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-foreground">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-1.5" style={{ color: p.color || p.fill }}>
          <span className="font-medium">{p.name}:</span>
          <span>
            {p.dataKey === "margin"
              ? `${Math.round(p.value)}%`
              : `${Math.round(p.value).toLocaleString("fr-CA")} $`}
          </span>
        </p>
      ))}
    </div>
  );
}

export default function KpiTrendChart({ data }) {
  if (!data || data.length === 0) return null;

  const chartData = data.map((d) => ({ ...d, monthLabel: formatMonth(d.month) }));

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="mb-1 font-semibold">Tendance des indicateurs clés</h2>
      <p className="mb-4 text-sm text-muted-foreground">Revenus et panier moyen ($, axe gauche) - marge brute (%, axe droit)</p>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
          <defs>
            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.25} />
              <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="monthLabel" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
          <YAxis yAxisId="left" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} width={50}
            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} width={40}
            tickFormatter={(v) => `${v}%`} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted) / 0.4)" }} />
          <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
          <Bar yAxisId="left" dataKey="revenue" name="Revenus" fill="url(#revGrad)" stroke="hsl(var(--chart-1))" strokeWidth={1.5} radius={[4, 4, 0, 0]} barSize={24} />
          <Line yAxisId="left" type="monotone" dataKey="aov" stroke="hsl(var(--chart-2))" strokeWidth={2.5} dot={{ r: 3 }} name="Panier moyen" />
          <Line yAxisId="right" type="monotone" dataKey="margin" stroke="hsl(var(--chart-3))" strokeWidth={2.5} dot={{ r: 3 }} name="Marge (%)" strokeDasharray="5 5" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}