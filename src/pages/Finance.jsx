import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import StatCard from "@/components/StatCard";
import EmptyState from "@/components/EmptyState";
import { LineChart, DollarSign, PieChart, TrendingUp, TrendingDown } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend,
} from "recharts";
import { fetchAll } from "@/lib/fetchAll";
import { useKpiEngine } from "@/lib/useKpiEngine";

export default function Finance() {
  const { data: transactions, isLoading: ltx } = useQuery({
    queryKey: ["transactions-summary"],
    queryFn: () => fetchAll(base44.entities.Transaction, "-date"),
  });
  
  const semanticEngine = useKpiEngine(
    { transactions: transactions || [] },
    ["total_revenue", "total_expense", "net_income", "net_margin_pct"]
  );
  
  if (ltx) return <p className="text-sm text-muted-foreground">Chargement...</p>;
  if (!transactions || transactions.length === 0) {
    return (
      <EmptyState
        icon={DollarSign}
        title="Aucune donnée financière"
        description="Importez vos transactions pour analyser votre santé financière."
      />
    );
  }

  // Agregation par mois
  const byMonth = {};
  transactions.forEach((t) => {
    const m = (t.date || "").slice(0, 7);
    if (!m) return;
    if (!byMonth[m]) byMonth[m] = { in: 0, out: 0 };
    
    const s = String(t.type).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (["income", "entree", "credit", "revenu", "encaissement"].includes(s)) {
      byMonth[m].in += Number(t.amount) || Number(t.revenue_amount) || 0;
    } else if (["expense", "sortie", "debit", "depense", "decaissement", "charge"].includes(s)) {
      byMonth[m].out += Number(t.amount) || Number(t.expense_amount) || 0;
    }
  });
  
  const months = Object.keys(byMonth).sort();
  const chartData = months.slice(-12).map((m) => {
    const margin = byMonth[m].in > 0 ? ((byMonth[m].in - byMonth[m].out) / byMonth[m].in) * 100 : 0;
    return {
      date: m,
      revenus: Math.round(byMonth[m].in),
      dépenses: Math.round(byMonth[m].out),
      résultat: Math.round(byMonth[m].in - byMonth[m].out),
      marge: Math.round(margin)
    };
  });

  let totalRev = 0;
  let totalExp = 0;
  
  transactions.forEach(t => {
    const s = String(t.type).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (["income", "entree", "credit", "revenu", "encaissement"].includes(s)) {
      totalRev += Number(t.amount) || Number(t.revenue_amount) || 0;
    } else if (["expense", "sortie", "debit", "depense", "decaissement", "charge"].includes(s)) {
      totalExp += Number(t.amount) || Number(t.expense_amount) || 0;
    }
  });

  const netInc = totalRev - totalExp;
  const netMargin = totalRev > 0 ? (netInc / totalRev) * 100 : 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Finance</h1>
        <p className="mt-1 text-muted-foreground">Analyse globale de la rentabilité, des revenus et des dépenses.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Chiffre d'affaires" value={`${Math.round(totalRev).toLocaleString("fr-CA")} $`} icon={TrendingUp} accent="bg-emerald-50 text-emerald-600" />
        <StatCard label="Dépenses totales" value={`${Math.round(totalExp).toLocaleString("fr-CA")} $`} icon={TrendingDown} accent="bg-red-50 text-red-600" />
        <StatCard label="Résultat Net" value={`${Math.round(netInc).toLocaleString("fr-CA")} $`} icon={DollarSign} accent={netInc < 0 ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"} />
        <StatCard label="Marge Nette" value={`${netMargin.toFixed(1)} %`} icon={PieChart} accent={netMargin < 0 ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"} />
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Revenus vs Dépenses (Mensuel)</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ left: 10, right: 10 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip formatter={(v) => `${v.toLocaleString()} $`} cursor={{fill: '#f3f4f6'}} />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: '10px' }} />
            <Bar dataKey="revenus" fill="#10b981" radius={[4, 4, 0, 0]} name="Revenus" />
            <Bar dataKey="dépenses" fill="#ef4444" radius={[4, 4, 0, 0]} name="Dépenses" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Évolution du Résultat Net</h2>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chartData} margin={{ left: 10, right: 10 }}>
            <defs>
              <linearGradient id="colorRes" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip formatter={(v) => `${v.toLocaleString()} $`} />
            <Area type="monotone" dataKey="résultat" stroke="#3b82f6" strokeWidth={2} fill="url(#colorRes)" name="Résultat Net" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
