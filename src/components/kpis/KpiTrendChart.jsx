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

  // Revenus/panier moyen ($) et marge (%) ne partagent pas d'échelle : les
  // forcer sur un même graphique à double axe rendait l'une des deux courbes
  // illisible. Deux panneaux à axe unique, l'un pour les montants, l'autre
  // pour le pourcentage.
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="mb-1 font-semibold">Tendance des indicateurs clés</h2>
      <p className="mb-4 text-sm text-muted-foreground">Revenus, panier moyen et marge brute</p>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2a78d6" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#2a78d6" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="monthLabel" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} width={50}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted) / 0.4)" }} />
              <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
              <Bar dataKey="revenue" name="Revenus" fill="url(#revGrad)" stroke="#2a78d6" strokeWidth={1.5} radius={[4, 4, 0, 0]} barSize={24} />
              <Line type="monotone" dataKey="aov" stroke="#eb6834" strokeWidth={2.5} dot={{ r: 3 }} name="Panier moyen" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">Marge (%)</p>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="monthLabel" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} width={40}
                tickFormatter={(v) => `${v}%`} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted) / 0.4)" }} />
              <Line type="monotone" dataKey="margin" stroke="#1baf7a" strokeWidth={2.5} dot={{ r: 3 }} name="Marge (%)" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}