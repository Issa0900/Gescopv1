import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import StatCard from "@/components/StatCard";
import EmptyState from "@/components/EmptyState";
import { DollarSign, PieChart, TrendingUp, TrendingDown } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend,
} from "recharts";
import { fetchAll } from "@/lib/fetchAll";
import { financialMonthlySeries } from "@/lib/financialData";
import { useKpiEngine } from "@/lib/useKpiEngine";
import DataErrorState from "@/components/DataErrorState";

export default function Finance() {
  const { data: transactions, isLoading: ltx, isError, refetch } = useQuery({
    queryKey: ["transactions-summary"],
    queryFn: () => fetchAll(base44.entities.Transaction, "-date"),
  });

  // Costs can live in expense-typed Transaction rows, in the dedicated
  // Expense entity, or both - both are fed in so "Dépenses totales" never
  // reads 0 $ just because a company's costs sit in the other one.
  const { data: expenses } = useQuery({
    queryKey: ["expenses-summary"],
    queryFn: () => fetchAll(base44.entities.Expense, "-date"),
  });

  // GESCOP Phase 4 SSOT — net_income/net_margin_pct (revenu - TOUTES les
  // dépenses), pas gross_margin_amount (revenu - COGS produit, qui a besoin
  // de commandes avec un coût, jamais présent sur de simples transactions).
  // Les deux existent dans kpiRegistry.js pour des questions différentes ;
  // "Résultat Net" sur cette page a toujours voulu dire la première.
  const { kpis: engineKpis } = useKpiEngine({ transactions: transactions || [], expenses: expenses || [] }, ["total_revenue", "total_expense", "net_income", "net_margin_pct"]);

  if (ltx) return <p className="text-sm text-muted-foreground">Chargement...</p>;
  if (isError) return <DataErrorState onRetry={refetch} />;
  if (!transactions?.length && !expenses?.length) {
    return (
      <EmptyState
        icon={DollarSign}
        title="Aucune donnée financière"
        description="Importez vos transactions ou vos dépenses pour analyser votre santé financière."
      />
    );
  }

  // Consommation officielle de la SSOT. "Résultat Net" = revenus - TOUTES
  // les dépenses (net_income), pas la marge brute (qui ne retranche que le
  // coût des marchandises vendues - une donnée qu'on n'a pas ici, ce qui
  // aurait affiché 100 % de marge dès que les vraies dépenses existaient).
  // netIncome/marginPct restent `null` (pas 0) quand les dépenses n'ont
  // jamais été importées : voir le rendu des StatCard plus bas, qui affiche
  // "N/A" plutôt qu'un 0% trompeur.
  const summary = {
    revenue: engineKpis.get("total_revenue")?.value || 0,
    expense: engineKpis.get("total_expense")?.value || 0,
    netIncome: engineKpis.get("net_income")?.value ?? null,
    marginPct: engineKpis.get("net_margin_pct")?.value ?? null,
  };
  const monthly = financialMonthlySeries(transactions, expenses);
  const chartData = monthly.slice(-12).map((point) => {
    return {
      date: point.month,
      revenus: Math.round(point.income),
      dépenses: Math.round(point.expense),
      résultat: Math.round(point.margin),
      marge: point.income > 0 ? Math.round((point.margin / point.income) * 100) : 0,
    };
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Finance</h1>
        <p className="mt-1 text-muted-foreground">Analyse globale de la rentabilité, des revenus et des dépenses.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Chiffre d'affaires" value={`${Math.round(summary.revenue).toLocaleString("fr-CA")} $`} icon={TrendingUp} accent="bg-emerald-50 text-emerald-600" />
        <StatCard label="Dépenses totales" value={`${Math.round(summary.expense).toLocaleString("fr-CA")} $`} icon={TrendingDown} accent="bg-red-50 text-red-600" />
        <StatCard label="Résultat Net" value={summary.netIncome == null ? "N/A" : `${Math.round(summary.netIncome).toLocaleString("fr-CA")} $`} icon={DollarSign} accent={summary.netIncome == null ? "bg-slate-100 text-slate-500" : summary.netIncome < 0 ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"} />
        <StatCard label="Marge Nette" value={summary.marginPct == null ? "N/A" : `${summary.marginPct.toFixed(1)} %`} icon={PieChart} accent={summary.marginPct == null ? "bg-slate-100 text-slate-500" : summary.marginPct < 0 ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"} />
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
