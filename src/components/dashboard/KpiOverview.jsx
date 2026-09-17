import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "@/lib/fake-framer-motion.jsx";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, AreaChart, Area, RadialBarChart, RadialBar, PolarAngleAxis,
  Legend, Cell,
} from "recharts";
import { TrendingUp, TrendingDown, Wallet, Receipt, Percent } from "lucide-react";
import { cn } from "@/lib/utils";

const formatK = (v) => `${(v / 1000).toFixed(0)}k`;
const formatMoney = (v) => `${Math.round(v).toLocaleString("fr-CA")} $`;

function ChartTooltip({ active, payload, label, suffix = "$" }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="animate-scale-in rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-foreground">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-1.5" style={{ color: p.color || p.fill }}>
          <span className="font-medium">{p.name}:</span>
          <span>{Number(p.value).toLocaleString("fr-CA")}{suffix}</span>
        </p>
      ))}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="animate-shimmer h-4 w-32 rounded-md" />
      <div className="mt-4 h-56 w-full rounded-lg animate-shimmer" />
    </div>
  );
}

export default function KpiOverview({ monthlyData, isLoading, dimensions }) {
  const [view, setView] = useState("combined");

  const combinedData = useMemo(() => {
    const rev = (monthlyData?.revenue || []).slice(-6);
    const costs = (monthlyData?.costs || []).slice(-6);
    const margin = (monthlyData?.margin || []).slice(-6);
    return rev.map((r) => {
      const c = costs.find((x) => x.month === r.month);
      const m = margin.find((x) => x.month === r.month);
      return {
        month: r.month.slice(5),
        revenue: Math.round(r.val),
        expenses: c ? Math.round(c.val) : 0,
        margin: m ? Math.round(m.val) : 0,
      };
    });
  }, [monthlyData]);

  const cashData = useMemo(() => {
    return (monthlyData?.cash || []).slice(-6).map((d) => ({
      month: d.month.slice(5),
      cash: Math.round(d.val),
    }));
  }, [monthlyData]);

  const radarData = useMemo(() => {
    const dims = dimensions?.filter((d) => ["finance", "ventes", "tresorerie", "clients", "operations", "marketing"].includes(d.key)) || [];
    return dims.map((d) => ({ name: d.label, value: d.score || 0, fill: "hsl(var(--chart-1))" }));
  }, [dimensions]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  const hasCombined = combinedData.length > 0;
  const hasCash = cashData.length > 0;
  const hasRadar = radarData.length > 0;

  return (
    <div className="space-y-4">
      {/* View toggle */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { key: "combined", label: "Revenus vs Dépenses", icon: Receipt },
          { key: "cash", label: "Trésorerie", icon: Wallet },
          { key: "radar", label: "Scores par domaine", icon: Percent },
        ].map((v) => (
          <button
            key={v.key}
            onClick={() => setView(v.key)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200",
              view === v.key
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/70"
            )}
          >
            <v.icon className="h-3.5 w-3.5" />
            {v.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Main chart */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {view === "combined" && hasCombined && (
              <motion.div
                key="combined"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="rounded-2xl border border-border bg-card p-6"
              >
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Revenus & Dépenses</h3>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-chart-1" />Revenus</span>
                    <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-chart-5" />Dépenses</span>
                  </div>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={combinedData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} width={45} tickFormatter={formatK} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted) / 0.4)" }} />
                      <Bar dataKey="revenue" name="Revenus" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} barSize={18} animationDuration={800} />
                      <Bar dataKey="expenses" name="Dépenses" fill="hsl(var(--chart-5))" radius={[4, 4, 0, 0]} barSize={18} animationDuration={800} animationBegin={200} />
                      <Line type="monotone" dataKey="margin" name="Marge %" stroke="hsl(var(--chart-2))" strokeWidth={2.5} dot={{ r: 3 }} animationDuration={1000} animationBegin={400} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            )}

            {view === "cash" && hasCash && (
              <motion.div
                key="cash"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="rounded-2xl border border-border bg-card p-6"
              >
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Évolution de la trésorerie</h3>
                  <span className="text-xs text-muted-foreground">6 derniers mois</span>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={cashData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                      <defs>
                        <linearGradient id="cashGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} width={45} tickFormatter={formatK} />
                      <Tooltip content={<ChartTooltip />} cursor={{ stroke: "hsl(var(--border))" }} />
                      <Area type="monotone" dataKey="cash" name="Trésorerie" stroke="hsl(var(--chart-1))" strokeWidth={2.5} fill="url(#cashGradient)" animationDuration={900} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            )}

            {view === "radar" && hasRadar && (
              <motion.div
                key="radar"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="rounded-2xl border border-border bg-card p-6"
              >
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Scores par domaine</h3>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart data={radarData} innerRadius="20%" outerRadius="100%" startAngle={90} endAngle={-270}>
                      <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                      <RadialBar dataKey="value" background={{ fill: "hsl(var(--muted))" }} cornerRadius={6} animationDuration={900}>
                        {radarData.map((entry, i) => (
                          <Cell key={i} fill={`hsl(var(--chart-${(i % 5) + 1}))`} />
                        ))}
                      </RadialBar>
                      <Legend iconType="circle" layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                    </RadialBarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!hasCombined && view === "combined" && (
            <div className="flex h-72 items-center justify-center rounded-2xl border border-border bg-card text-sm text-muted-foreground">Données insuffisantes</div>
          )}
          {!hasCash && view === "cash" && (
            <div className="flex h-72 items-center justify-center rounded-2xl border border-border bg-card text-sm text-muted-foreground">Données insuffisantes</div>
          )}
          {!hasRadar && view === "radar" && (
            <div className="flex h-72 items-center justify-center rounded-2xl border border-border bg-card text-sm text-muted-foreground">Données insuffisantes</div>
          )}
        </div>

        {/* Side stats */}
        <div className="space-y-4">
          {(() => {
            const lastRev = combinedData[combinedData.length - 1]?.revenue || 0;
            const prevRev = combinedData[combinedData.length - 2]?.revenue || 0;
            const revDelta = prevRev > 0 ? ((lastRev - prevRev) / prevRev) * 100 : 0;
            const lastCash = cashData[cashData.length - 1]?.cash || 0;
            const prevCash = cashData[cashData.length - 2]?.cash || 0;
            const cashDelta = prevCash > 0 ? ((lastCash - prevCash) / prevCash) * 100 : 0;
            const lastMargin = combinedData[combinedData.length - 1]?.margin || 0;

            const stats = [
              { label: "Revenus (mois)", value: formatMoney(lastRev), delta: revDelta, icon: TrendingUp, color: "text-chart-1" },
              { label: "Trésorerie", value: formatMoney(lastCash), delta: cashDelta, icon: Wallet, color: "text-chart-2" },
              { label: "Marge brute", value: `${lastMargin}%`, delta: null, icon: Percent, color: "text-chart-3" },
            ];

            return stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, delay: i * 0.08, ease: "easeOut" }}
                className="rounded-2xl border border-border bg-card p-5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{s.label}</span>
                  <s.icon className={cn("h-4 w-4", s.color)} />
                </div>
                <p className="mt-2 text-2xl font-bold tracking-tight">{s.value}</p>
                {s.delta !== null && (
                  <div className={cn("mt-1 flex items-center gap-1 text-xs font-medium", s.delta >= 0 ? "text-emerald-600" : "text-red-500")}>
                    {s.delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {Math.abs(s.delta).toFixed(1)}% vs mois précédent
                  </div>
                )}
              </motion.div>
            ));
          })()}
        </div>
      </div>
    </div>
  );
}