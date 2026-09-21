import React, { useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { currentMonthKey } from "@/lib/periods";

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
 * @param {Array<{name?: string, value?: number, color?: string, fill?: string}>} [props.payload]
 * @param {string} [props.label]
 */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-foreground">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-1.5" style={{ color: p.color || p.fill }}>
          <span className="font-medium">{p.name}:</span>
          <span>{Number(p.value).toLocaleString("fr-CA")}</span>
        </p>
      ))}
    </div>
  );
}

export default function ProductSalesTrend({ orders }) {
  const data = useMemo(() => {
    // The month in progress holds only a few days of orders. Plotted as the
    // last point of the curve it looks like sales just collapsed, when it is
    // simply not over yet - so it is left out, as everywhere else in the app.
    const cm = currentMonthKey();
    const map = {};
    (orders || []).forEach((o) => {
      const m = (o.date || "").slice(0, 7);
      if (!m || m === cm) return;
      if (!map[m]) map[m] = { month: m, quantite: 0, revenu: 0, commandes: 0 };
      map[m].quantite += Number(o.quantity) || 0;
      // total_revenue is the field the import pipeline actually populates.
      map[m].revenu += Number(o.total_revenue) || Number(o.total) || 0;
      map[m].commandes += 1;
    });
    return Object.values(map)
      .sort((a, b) => (a.month < b.month ? -1 : 1))
      .slice(-12)
      .map((d) => ({ ...d, monthLabel: formatMonth(d.month) }));
  }, [orders]);

  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
        Aucune donnée de vente
      </div>
    );
  }

  // Quantité et revenu vivent sur des échelles différentes (unités vs $) : les
  // superposer sur un graphique à double axe rend l'un des deux illisible et
  // oblige à deviner quelle courbe appartient à quel axe. Deux petits
  // multiples côte à côte, un axe chacun, se lisent sans ambiguïté.
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">Quantité vendue</p>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
            <defs>
              <linearGradient id="qtyGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2a78d6" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#2a78d6" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} width={40} />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: "hsl(var(--border))" }} />
            <Area type="monotone" dataKey="quantite" name="Quantité vendue" stroke="#2a78d6" strokeWidth={2.5} fill="url(#qtyGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">Revenu ($)</p>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1baf7a" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#1baf7a" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} width={50}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: "hsl(var(--border))" }} />
            <Area type="monotone" dataKey="revenu" name="Revenu ($)" stroke="#1baf7a" strokeWidth={2.5} fill="url(#revGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}