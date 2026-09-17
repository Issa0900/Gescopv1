import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import StatCard from "@/components/StatCard";
import EmptyState from "@/components/EmptyState";
import { Wallet, TrendingDown, TrendingUp, RefreshCw } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend,
} from "recharts";
import { fetchAll } from "@/lib/fetchAll";
import { useKpiEngine } from "@/lib/useKpiEngine";

export default function Tresorerie() {
  const { data: cashflow, isLoading: lcf } = useQuery({
    queryKey: ["cashflow-summary"],
    queryFn: () => fetchAll(base44.entities.Cashflow, "-date"),
  });
  const { data: expenses, isLoading: lex } = useQuery({
    queryKey: ["expenses-summary"],
    queryFn: () => fetchAll(base44.entities.Expense, "-date"),
  });
  const { data: payroll, isLoading: lp } = useQuery({
    queryKey: ["payroll-summary"],
    queryFn: () => fetchAll(base44.entities.Payroll, "-period"),
  });

  // GESCOP Phase 4 SSOT
  const { kpis: engineKpis } = useKpiEngine({ cashflow: cashflow || [] }, ["cash_closing"]);

  // These query keys are shared with the Dashboard, so this page can render
  // instantly if the user just navigated from there.
  const isLoading = lcf || lex || lp;
  
  if (isLoading) return <p className="text-sm text-muted-foreground">Chargement...</p>;
  if (!cashflow?.length && !expenses?.length && !payroll?.length) {
    return (
      <EmptyState
        icon={Wallet}
        title="Aucune donnée de trésorerie"
        description="Importez vos données de flux de trésorerie, dépenses ou paie pour suivre votre position et vos tendances."
      />
    );
  }

  // Consommation officielle SSOT
  const currentCash = engineKpis.get("cash_closing")?.value || 0;

  const expenseRows = expenses || [];
  const payrollRows = payroll || [];

  // Sorted explicitly rather than trusting the order the API happened to return.
  // Cashflow is imported one row per day. Showing the last 12 rows meant showing
  // 12 days labelled as an evolution, so flows are aggregated by month:
  // in/out are summed, the balance is the month's closing value.
  const sorted = [...(cashflow || [])].sort((a, b) => ((a.date || "") < (b.date || "") ? -1 : 1));
  const latestRow = sorted[sorted.length - 1];

  const byMonthCash = {};
  sorted.forEach((c) => {
    const m = (c.date || "").slice(0, 7);
    if (!byMonthCash[m]) {
      byMonthCash[m] = { in: 0, out: 0, solde: 0, net: 0 };
    }
    const flow = Number(c.net_cash_flow) || ((Number(c.cash_in) || 0) - (Number(c.cash_out) || 0));
    byMonthCash[m].in += Number(c.cash_in) || 0;
    byMonthCash[m].out += Number(c.cash_out) || 0;
    byMonthCash[m].net += flow;
    byMonthCash[m].solde = Number(c.closing_cash) || 0;
  });

  const monthsCash = Object.keys(byMonthCash).sort();
  // A raw sum over the whole imported history (positive = cash grew) presented
  // as a MONTHLY figure overstated it by the number of months covered, and a
  // stale assumption about the engine's sign convention flipped it negative on
  // top - a company whose cash grew steadily read as "burning $158k/month".
  const totalNetCash = monthsCash.reduce((s, m) => s + byMonthCash[m].net, 0);
  const avgNet = monthsCash.length > 0 ? totalNetCash / monthsCash.length : 0;
  const chartData = monthsCash.slice(-12).map((m) => ({
    mois: m,
    entrées: Math.round(byMonthCash[m].in),
    sorties: Math.round(byMonthCash[m].out),
    flux_net: Math.round(byMonthCash[m].net),
    solde: Math.round(byMonthCash[m].solde),
  }));

  // Payroll and recurring expenses span many months in the import: a raw sum
  // presented as a monthly figure inflates it by the number of months covered.
  const payrollPeriods = new Set(payrollRows.map((p) => p.period || (p.payroll_id || "").slice(0, 7)).filter(Boolean));
  const totalPayroll = payrollRows.reduce((s, p) => s + (Number(p.total_cost) || 0), 0);
  const avgMonthlyPayroll = payrollPeriods.size > 0 ? totalPayroll / payrollPeriods.size : 0;
  const payrollByPeriod = {};
  payrollRows.forEach((p) => {
    const per = p.period || (p.payroll_id || "").slice(0, 7);
    payrollByPeriod[per] = (payrollByPeriod[per] || 0) + (Number(p.total_cost) || 0);
  });
  const payrollChart = Object.entries(payrollByPeriod).sort((a, b) => (a[0] < b[0] ? -1 : 1)).slice(-8).map(([m, v]) => ({
    mois: m,
    paie: Math.round(v),
  }));

  const recurring = expenseRows.filter((e) => e.recurring);
  const recurringByCat = {};
  recurring.forEach((e) => {
    const c = e.category || e.description || "Autre";
    recurringByCat[c] = (recurringByCat[c] || 0) + (Number(e.amount) || 0);
  });
  const recurringMonths = new Set(recurring.map((e) => (e.date || "").slice(0, 7)).filter(Boolean));
  const recDiv = Math.max(1, recurringMonths.size);
  const recurringTotal = Object.values(recurringByCat).reduce((s, v) => s + v, 0) / recDiv;
  const recurringChart = Object.entries(recurringByCat).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([c, v]) => ({
    catégorie: c,
    montant: Math.round(v / recDiv),
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Trésorerie</h1>
        <p className="mt-1 text-muted-foreground">Position de trésorerie, flux net, coûts salariaux et abonnements récurrents.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Trésorerie actuelle" value={`${Math.round(currentCash).toLocaleString("fr-CA")} $`} sublabel={`au ${latestRow?.date || "-"}`} icon={Wallet} accent={currentCash < 0 ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"} />
        <StatCard label="Flux net moyen / mois" value={`${Math.round(avgNet).toLocaleString()} $`} sublabel={`moyenne sur ${monthsCash.length} mois`} icon={avgNet >= 0 ? TrendingUp : TrendingDown} accent={avgNet < 0 ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"} />
        <StatCard label="Coût paie / mois" value={`${Math.round(avgMonthlyPayroll).toLocaleString()} $`} sublabel={`moyenne sur ${payrollPeriods.size} périodes`} icon={RefreshCw} />
        <StatCard label="Abonnements/mois" value={`${Math.round(recurringTotal).toLocaleString()} $`} sublabel={`moyenne sur ${recDiv} mois`} icon={RefreshCw} accent={recurringTotal > 0 && currentCash > 0 && recurringTotal > currentCash * 0.15 ? "bg-red-50 text-red-600" : recurringTotal > 0 ? "bg-amber-50 text-amber-600" : "bg-muted text-muted-foreground"} />
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Évolution de la trésorerie</h2>
        <p className="mb-4 text-xs text-muted-foreground">Solde de fin de mois · {chartData.length} derniers mois</p>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData} margin={{ left: 10, right: 10 }}>
            <defs>
              <linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="mois" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => `${v.toLocaleString()} $`} />
            <Area type="monotone" dataKey="solde" stroke="#3b82f6" strokeWidth={2} fill="url(#cashGrad)" name="Solde" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Entrées vs sorties (par mois)</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData.slice(-8)} margin={{ left: 10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="mois" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => `${v.toLocaleString()} $`} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="entrées" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="sorties" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Coût salarial mensuel</h2>
          {payrollChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={payrollChart} margin={{ left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="mois" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => `${v.toLocaleString()} $`} />
                <Bar dataKey="paie" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground">Aucune donnée de paie</p>
          )}
        </div>
      </div>

      {recurringChart.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Abonnements récurrents</h2>
          <p className="mb-4 text-xs text-muted-foreground">Coût mensuel moyen par catégorie, calculé sur {recDiv} mois de dépenses récurrentes importées</p>
          <div className="space-y-2">
            {recurringChart.map((r) => (
              <div key={r.catégorie} className="flex items-center justify-between rounded-lg bg-muted/30 px-4 py-2.5">
                <span className="text-sm font-medium">{r.catégorie}</span>
                <span className="text-sm font-semibold">{r.montant.toLocaleString()} $/mois</span>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="text-sm font-semibold">Total mensuel</span>
              <span className="text-base font-bold">{Math.round(recurringTotal).toLocaleString()} $/mois</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}