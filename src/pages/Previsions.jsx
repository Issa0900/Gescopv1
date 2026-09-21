import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import ForecastCard from "@/components/previsions/ForecastCard";
import EmptyState from "@/components/EmptyState";
import { TrendingUp, AlertTriangle, Upload } from "lucide-react";
import { Link } from "react-router-dom";
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import { fetchAll } from "@/lib/fetchAll";
import { financialMonthlySeries } from "@/lib/financialData";
import { monthlyAggComplete } from "@/lib/periods";
import { useCompany } from "@/hooks/useCompany";
import { computeLiveAlerts } from "@/lib/liveAlerts";
import DataErrorState from "@/components/DataErrorState";
import FeatureGate from "@/components/FeatureGate";

/**
 * Ordinary least squares plus everything needed for a HONEST forecast band.
 *
 * The page used to draw `value ± stderr` at all three horizons: a flat ribbon
 * that claimed the same precision 90 days out as 30 days out, and that was
 * narrower than a real interval at every point. A prediction interval widens
 * with distance from the centre of the data, and that is what is returned here.
 * r2 is exposed so the UI can refuse to dress up a trend that explains nothing.
 */
function fit(xs, ys) {
  const n = xs.length;
  const finiteYs = ys.map((value) => Number.isFinite(value) ? value : 0);
  if (n < 2) return { slope: 0, intercept: finiteYs[0] || 0, stderr: 0, r2: 0, mx: 0, sxx: 0, n };
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = finiteYs.reduce((a, b) => a + b, 0) / n;
  const num = xs.reduce((s, x, i) => s + (x - mx) * (finiteYs[i] - my), 0);
  const sxx = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  const slope = sxx === 0 ? 0 : num / sxx;
  const intercept = my - slope * mx;
  const residuals = xs.map((x, i) => finiteYs[i] - (slope * x + intercept));
  const ssRes = residuals.reduce((s, r) => s + r * r, 0);
  const ssTot = finiteYs.reduce((s, y) => s + (y - my) ** 2, 0);
  const stderr = Math.sqrt(ssRes / Math.max(1, n - 2));
  const r2 = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;
  return { slope, intercept, stderr, r2, mx, sxx, n };
}

/**
 * Forecast at x with a prediction interval that grows with the horizon:
 *   SE(x) = s * sqrt(1 + 1/n + (x - x̄)² / Sxx)
 * The "1 +" is what makes it a PREDICTION interval (a future single month)
 * rather than a confidence interval on the mean - the latter is far too narrow
 * to put in front of someone making a cash decision.
 */
function forecastAt(f, x) {
  const rawValue = f.slope * x + f.intercept;
  const value = Number.isFinite(rawValue) ? rawValue : 0;
  if (!f.n || f.n < 3 || f.sxx === 0) return { value, lower: value, upper: value, se: 0 };
  const rawSe = f.stderr * Math.sqrt(1 + 1 / f.n + ((x - f.mx) ** 2) / f.sxx);
  const se = Number.isFinite(rawSe) ? rawSe : 0;
  return { value, lower: value - se, upper: value + se, se };
}

const metrics = [
  { key: "ca", label: "Chiffre d'affaires" },
  { key: "marge", label: "Marge nette" },
  { key: "tresorerie", label: "Trésorerie" },
];

export default function Previsions() {
  const [metric, setMetric] = useState("ca");

  const { data: transactions, isLoading: loadingTransactions, isError: transactionsError, refetch: refetchTransactions } = useQuery({
    queryKey: ["transactions-summary"],
    queryFn: () => fetchAll(base44.entities.Transaction, "-date"),
  });
  const { data: orders, isLoading: loadingOrders } = useQuery({
    queryKey: ["orders-summary"],
    queryFn: () => fetchAll(base44.entities.Order, "-date"),
  });
  const { data: executiveSummary, isLoading: loadingExecutiveSummary } = useQuery({
    queryKey: ["executive-summary"],
    queryFn: () => fetchAll(base44.entities.ExecutiveSummary, "-date"),
  });
  const { data: cashflow, isError: cashflowError, refetch: refetchCashflow } = useQuery({
    queryKey: ["cashflow-summary"],
    queryFn: () => fetchAll(base44.entities.Cashflow, "-date"),
  });
  const { data: expenses } = useQuery({
    queryKey: ["expenses-summary"],
    queryFn: () => fetchAll(base44.entities.Expense, "-date"),
  });

  const hasFinancialData = (transactions && transactions.length > 0) || (orders && orders.length > 0) || (executiveSummary && executiveSummary.length > 0);

  // Phase 7: Fetch live alerts to cross-reference with forecasts
  const { company } = useCompany();
  const { data: liveAlerts } = useQuery({
    queryKey: ["forecast-alerts"],
    queryFn: async () => {
      const [customers, rawOrders, campaignDaily, inventory, products] = await Promise.all([
        fetchAll(base44.entities.Customer, "-created_date"),
        orders || fetchAll(base44.entities.Order, "-date"),
        fetchAll(base44.entities.CampaignDaily, "-date"),
        fetchAll(base44.entities.Inventory, "-date"),
        fetchAll(base44.entities.Product),
      ]);
      return computeLiveAlerts({ transactions, orders: rawOrders, customers, campaignDaily, products, inventory, cashflow, expenses, company, executiveSummary });
    },
    enabled: hasFinancialData && !!cashflow
  });

  const result = useMemo(() => {
    const monthly = financialMonthlySeries(transactions || [], expenses || [], orders || [], executiveSummary || []).map((point, i) => ({ ...point, x: i }));
    if (monthly.length < 3) return null;

    const xs = monthly.map((d) => d.x);
    const incomeFit = fit(xs, monthly.map((d) => d.income));
    const marginFit = fit(xs, monthly.map((d) => d.margin));
    const lastX = xs[xs.length - 1];
    const incomeF = [1, 2, 3].map((i) => forecastAt(incomeFit, lastX + i));
    const marginF = [1, 2, 3].map((i) => forecastAt(marginFit, lastX + i));

    const cfSorted = (cashflow || []).slice().sort((a, b) => ((a.date || "") < (b.date || "") ? 1 : -1));
    const hasCash = cfSorted.length > 0;
    const cumulativeNow = hasCash
      ? Number(cfSorted[0].closing_cash) || 0
      : monthly.reduce((s, d) => s + d.margin, 0);
    const cashDate = hasCash ? cfSorted[0].date : null;

    const netFlowSeries = monthlyAggComplete(cashflow || [], "date", "net_cash_flow");
    const usesRealCashFlow = netFlowSeries.length >= 3;
    const cashFlowFit = usesRealCashFlow
      ? fit(netFlowSeries.map((_, i) => i), netFlowSeries.map((d) => d.val))
      : marginFit;
    const cashLastX = usesRealCashFlow ? netFlowSeries.length - 1 : lastX;
    const cashF = [1, 2, 3].map((i) => forecastAt(cashFlowFit, cashLastX + i));
    
    const cashHistory = [];
    if (hasCash) {
      const byM = {};
      cfSorted.slice().reverse().forEach((c) => {
        const m = (c.date || "").slice(0, 7);
        if (m) byM[m] = Number(c.closing_cash) || 0;
      });
      Object.keys(byM).sort().forEach((m) => cashHistory.push({ month: m, value: byM[m] }));
    }
    const forecastValue = (forecast) => Number.isFinite(forecast?.value) ? forecast.value : 0;
    const cash30 = cumulativeNow + forecastValue(cashF[0]);
    const cash90 = cumulativeNow + cashF.reduce((sum, forecast) => sum + forecastValue(forecast), 0);
    const latestMonth = monthly[monthly.length - 1] || { income: 0, margin: 0 };
    const currentIncome = Number.isFinite(latestMonth.income) ? latestMonth.income : 0;
    const currentMargin = Number.isFinite(latestMonth.margin) ? latestMonth.margin : 0;
    const projected90Margin = marginF.reduce((s, f) => s + forecastValue(f), 0);
    const shortfall = currentMargin * 3 - projected90Margin;
    return {
      monthly, incomeF, marginF, cashF, cash30, cash90, currentIncome, currentMargin,
      cumulativeNow, cashDate, cashHistory, shortfall, incomeFit, marginFit,
      cashFlowFit, usesRealCashFlow,
    };
  }, [transactions, cashflow, expenses]);

  const chartData = useMemo(() => {
    if (!result) return [];
    const { monthly, incomeF, marginF, cashF, cashHistory } = result;
    if (metric === "tresorerie") {
      let cum = 0;
      // Real monthly closing balances when treasury data was imported;
      // otherwise fall back to the cumulative margin.
    const hist = (cashHistory && cashHistory.length > 0)
        ? cashHistory.slice(-monthly.length).map((c) => { cum = c.value; return { month: c.month.slice(5), value: Math.round(c.value), forecast: null, range: null }; })
        : monthly.map((d) => { cum += d.margin; return { month: d.month.slice(5), value: Math.round(cum), forecast: null, range: null }; });
      const lastHist = hist[hist.length - 1];
      if (lastHist) {
        lastHist.forecast = lastHist.value;
        lastHist.range = [lastHist.value, lastHist.value];
      }
      let runCum = cum;
      const fcstMonths = ["+30j", "+60j", "+90j"];
      // Uncertainty on a CUMULATIVE balance compounds: the errors of each
      // projected month add up, so the band widens as sqrt of the sum of
      // variances rather than by a flat multiple.
      let varSum = 0;
      const fcst = cashF.map((f, i) => {
        runCum += Number.isFinite(f.value) ? f.value : 0;
        varSum += f.se * f.se;
        const err = Math.sqrt(varSum);
        return { month: fcstMonths[i], value: null, forecast: Math.round(runCum), range: [Math.round(runCum - err), Math.round(runCum + err)] };
      });
      return [...hist, ...fcst];
    }
    const f = metric === "ca" ? incomeF : marginF;
    const key = metric === "ca" ? "income" : "margin";
    const hist = monthly.map((d) => ({ month: d.month.slice(5), value: Math.round(d[key]), forecast: null, range: null }));
    const lastHist = hist[hist.length - 1];
    if (lastHist) {
      lastHist.forecast = lastHist.value;
      lastHist.range = [lastHist.value, lastHist.value];
    }
    const fcstMonths = ["+30j", "+60j", "+90j"];
    const fcst = f.map((p, i) => ({ month: fcstMonths[i], value: null, forecast: Math.round(p.value), range: [Math.round(p.lower), Math.round(p.upper)] }));
    return [...hist, ...fcst];
  }, [result, metric]);

  if (loadingTransactions || loadingOrders || loadingExecutiveSummary) return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" /></div>;
  if (transactionsError || cashflowError) {
    return <DataErrorState onRetry={() => Promise.all([refetchTransactions(), refetchCashflow()])} />;
  }
  if (!hasFinancialData) return <EmptyState icon={Upload} title="Aucune donnée à projeter" description="Importez vos transactions ou vos commandes de ventes pour que GESCOP calcule des prévisions basées sur vos tendances." action={<Link to="/importer" className="text-primary hover:underline">Importer des données →</Link>} />;
  if (!result) return <EmptyState icon={TrendingUp} title="Données insuffisantes" description="Il faut au moins 3 mois de données pour calculer des prévisions fiables." />;

  const fmt = (v) => `${Math.round(v).toLocaleString("fr-CA")} $`;
  const selectedLabel = metrics.find((m) => m.key === metric).label;

  // Phase 7: Extract critical cross-domain alerts to warn the user
  const criticalAlerts = (liveAlerts || []).filter(a => a.level === "critique" || (a.level === "important" && a.category.includes("&")));

  return (
    <FeatureGate feature="forecast">
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Prévisions</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Projections basées sur l'analyse de tendance de vos {result.monthly.length} derniers mois.</p>
        </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <ForecastCard label="Chiffre d'affaires" current={fmt(result.currentIncome)} f30={fmt(result.incomeF[0].value)} f90={fmt(result.incomeF[2].value)} />
        <ForecastCard label="Marge nette" current={fmt(result.currentMargin)} f30={fmt(result.marginF[0].value)} f90={fmt(result.marginF[2].value)} />
        <ForecastCard label={result.cashDate ? `Trésorerie (solde au ${result.cashDate})` : "Trésorerie projetée"} current={fmt(result.cumulativeNow)} f30={fmt(result.cash30)} f90={fmt(result.cash90)} />
      </div>

      <div className="rounded-xl border border-border bg-muted/30 p-4 text-xs leading-relaxed text-muted-foreground">
        <span className="font-semibold text-foreground">Fiabilité de ces projections.</span>{" "}
        Tendance linéaire ajustée sur {result.monthly.length} mois complets, sans saisonnalité.
        Qualité d'ajustement : R² de {(result.incomeFit.r2 * 100).toFixed(0)} % sur le chiffre d'affaires
        et {(result.marginFit.r2 * 100).toFixed(0)} % sur la marge
        {result.incomeFit.r2 < 0.5 || result.marginFit.r2 < 0.5
          ? " - en dessous de 50 %, la tendance explique moins de la moitié des variations : lisez la fourchette, pas le chiffre central."
          : " - la tendance explique l'essentiel des variations observées."}
        {" "}La fourchette grise est un intervalle de prédiction : elle s'élargit avec l'horizon, car une
        projection à 90 jours est mécaniquement moins précise qu'à 30 jours.
        {" "}{result.usesRealCashFlow
          ? "La trésorerie est projetée à partir des flux nets réels de votre fichier de trésorerie."
          : "Faute de flux nets datés dans le fichier de trésorerie, la projection de trésorerie utilise la marge comptable : elle ignore délais de paiement, taxes et investissements, et reste donc indicative."}
      </div>

      {criticalAlerts.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/50 p-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600" />
          <div>
            <p className="text-sm font-medium text-rose-900">Attention : Hypothèses Menacées</p>
            <p className="mt-0.5 text-xs text-rose-700">Ces prévisions mathématiques ignorent des événements métier critiques en cours :</p>
            <ul className="mt-2 list-inside list-disc text-xs text-rose-700">
              {criticalAlerts.map(a => (
                <li key={a.id}><span className="font-medium">{a.title}</span> : {a.message}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {result.shortfall > 0 && result.currentMargin > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-orange-200 bg-orange-50/50 p-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-orange-600" />
          <div>
            <p className="text-sm font-medium text-orange-900">Tendance à la baisse détectée</p>
            <p className="mt-0.5 text-xs text-orange-700">La tendance actuelle pourrait créer un manque à gagner de {fmt(result.shortfall)} sur les 90 prochains jours si aucune action n'est prise.</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {metrics.map((m) => (
          <button key={m.key} onClick={() => setMetric(m.key)} className={cn("rounded-full border px-3 py-1.5 text-xs font-medium transition-colors", metric === m.key ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:bg-muted/50")}>{m.label}</button>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">{selectedLabel}</h2>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v) => (v != null ? `${Math.round(Number(v)).toLocaleString("fr-CA")} $` : "-")} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Area dataKey="range" stroke="none" fill="rgba(59, 130, 246, 0.1)" />
            <Line dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} connectNulls={false} />
            <Line dataKey="forecast" stroke="rgba(59, 130, 246, 0.6)" strokeWidth={2} strokeDasharray="5 5" dot={false} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
        </div>
      </div>
    </FeatureGate>
  );
}