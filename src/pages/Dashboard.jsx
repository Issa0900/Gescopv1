import React, { useState, useMemo } from "react";
import { motion } from "@/lib/fake-framer-motion.jsx";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { formatPct } from "@/lib/utils";
import { useCompany } from "@/hooks/useCompany";
import { useObservations } from "@/hooks/useObservations";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/EmptyState";
import { useToast } from "@/components/ui/use-toast";
import { Sparkles, RefreshCw, ArrowRight, Check, Loader2, ChevronDown, Upload, Bell, ClipboardCheck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { useKpiEngine } from "@/lib/useKpiEngine";
import { financialMonthlySeries } from "@/lib/financialData";
import { latestCashBalance, validSalesOrders } from "@/lib/metrics";
import { validateChartAggregation, METRIC_TYPES } from "@/components/ChartValidation";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import HealthHero from "@/components/dashboard/HealthHero";
import InsightCard from "@/components/dashboard/InsightCard";
import KpiCard from "@/components/dashboard/KpiCard";
import DomainScoreCard from "@/components/dashboard/DomainScoreCard";
import PerformanceChart from "@/components/dashboard/PerformanceChart";
import KpiOverview from "@/components/dashboard/KpiOverview";
import OpportunityCard from "@/components/dashboard/OpportunityCard";
import RiskCard from "@/components/dashboard/RiskCard";
import ForecastCard from "@/components/dashboard/ForecastCard";
import ActionCard from "@/components/dashboard/ActionCard";
import OnboardingHero from "@/components/dashboard/OnboardingHero";
import TodayPriorities from "@/components/dashboard/TodayPriorities";
import TimeFilter from "@/components/dashboard/TimeFilter";
import AnalysisEmptyState from "@/components/dashboard/AnalysisEmptyState";
import { computeDomainScores } from "@/lib/domainScores";
import { fetchAll } from "@/lib/fetchAll";
import { monthlyAgg, monthlyAggComplete, lastVal, prevVal, trendPct } from "@/lib/periods";

const analysisSteps = [
  "Vérification des données", "Calcul des tendances", "Détection des anomalies",
  "Évaluation des risques", "Génération des recommandations",
];

const dimLabels = {
  finance: "Finance", ventes: "Ventes", tresorerie: "Trésorerie", clients: "Clients",
  operations: "Opérations", marketing: "Marketing", productivite: "Productivité",
  risques: "Risques", croissance: "Croissance",
};

const formatImpact = (amount) => {
  if (!amount || amount === 0) return null;
  const v = Math.round(Math.abs(amount)).toLocaleString("fr-CA");
  return amount > 0 ? `+${v} $` : `-${v} $`;
};

const formatRelativeTime = (date) => {
  if (!date) return null;
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours} h`;
  return `il y a ${Math.floor(hours / 24)} j`;
};

export default function Dashboard() {
  const { company, isLoading: loadingCompany } = useCompany();
  const { toast } = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);

  const { data: observations } = useObservations();

  // Every source below is read with fetchAll: a single list() call caps at 500
  // rows, so passing 500 or 1000 silently truncated the history and left this
  // page disagreeing with the Audit page, which already read everything.
  // Truncation also cut the OLDEST month of each window, turning it into a
  // partial month at the far end of every trend.
  const { data: transactions } = useQuery({
    queryKey: ["transactions-summary"],
    queryFn: () => fetchAll(base44.entities.Transaction, "-date"),
  });
  const { data: orders } = useQuery({
    queryKey: ["orders-summary"],
    queryFn: () => fetchAll(base44.entities.Order, "-date"),
  });
  const { data: customers } = useQuery({
    queryKey: ["customers-summary"],
    queryFn: () => fetchAll(base44.entities.Customer),
  });
  const { data: cashflow } = useQuery({
    queryKey: ["cashflow-summary"],
    // Shared with the Trésorerie page — same key, same complete history.
    queryFn: () => fetchAll(base44.entities.Cashflow, "-date"),
  });
  const { data: expenseRecords } = useQuery({
    queryKey: ["expenses-summary"],
    queryFn: () => fetchAll(base44.entities.Expense, "-date"),
  });
  const { data: anomalies } = useQuery({
    queryKey: ["anomalies"],
    queryFn: async () => { const l = await base44.entities.Anomaly.list("-created_date", 20); return l || []; },
  });
  const { data: risks } = useQuery({
    queryKey: ["risks-active"],
    queryFn: async () => { const l = await base44.entities.Risk.filter({ status: "actif" }); return l || []; },
  });
  const { data: opportunities } = useQuery({
    queryKey: ["opportunities-new"],
    queryFn: async () => { const l = await base44.entities.Opportunity.filter({ status: "nouvelle" }); return l || []; },
  });
  const { data: recommendations } = useQuery({
    queryKey: ["recommendations"],
    queryFn: async () => { const l = await base44.entities.Recommendation.list("-created_date", 10); return l || []; },
  });
  const { data: analysisRuns } = useQuery({
    queryKey: ["analysis-runs"],
    queryFn: async () => { const l = await base44.entities.AnalysisRun.list("-created_date", 5); return l || []; },
  });
  const { data: tasks } = useQuery({
    queryKey: ["tasks-dashboard"],
    queryFn: async () => { const l = await base44.entities.Task.list("-created_date", 50); return l || []; },
  });
  const { data: products } = useQuery({
    queryKey: ["products-dashboard"],
    queryFn: () => fetchAll(base44.entities.Product),
  });
  const { data: inventory } = useQuery({
    queryKey: ["inventory-dashboard"],
    queryFn: () => fetchAll(base44.entities.Inventory, "-date"),
  });
  const { data: campaigns } = useQuery({
    queryKey: ["campaigns-summary"],
    queryFn: () => fetchAll(base44.entities.Campaign),
  });
  const { data: campaignDaily } = useQuery({
    queryKey: ["campaign-daily-summary"],
    queryFn: () => fetchAll(base44.entities.CampaignDaily, "-date"),
  });
  const [showDetails, setShowDetails] = useState(false);
  const [period, setPeriod] = useState("month");

  const periodDays = { day: 1, month: 30, quarter: 90, year: 365 };
  const cutoffDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - periodDays[period]);
    return d.toISOString().slice(0, 10);
  }, [period]);

  const inPeriod = (dateStr) => !dateStr || dateStr >= cutoffDate;

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setProgress(0);
    const interval = setInterval(() => setProgress((p) => Math.min(p + 1, analysisSteps.length - 1)), 2500);
    try {
      const res = await base44.functions.invoke("analyzeBusiness", {});
      const data = res.data || res;
      if (data.error) {
        toast({ title: data.error, variant: "destructive" });
      } else {
        toast({ title: "Analyse terminée", description: data.health_score == null ? "Aucune dimension n'a pu être mesurée — importez des données pour obtenir un score." : `Score de santé: ${data.health_score}/100` });
        qc.invalidateQueries();
      }
    } catch (e) {
      toast({ title: "Erreur: " + (e.response?.data?.error || e.message), variant: "destructive" });
    } finally {
      clearInterval(interval);
      setAnalyzing(false);
      setProgress(0);
    }
  };

  // GESCOP Phase 4 SSOT : Centralisation
  const fTxn = useMemo(() => (transactions || []).filter((t) => inPeriod(t.date)), [transactions, cutoffDate]);
  const fOrders = useMemo(() => (orders || []).filter((o) => inPeriod(o.date)), [orders, cutoffDate]);
  const fExpenses = useMemo(() => (expenseRecords || []).filter((e) => inPeriod(e.date)), [expenseRecords, cutoffDate]);
  const fCustomers = useMemo(() => (customers || []).filter((c) => inPeriod(c.acquisition_date)), [customers, cutoffDate]);
  const fObservations = useMemo(() => (observations || []).filter((o) => inPeriod(o.date)), [observations, cutoffDate]);

  const { kpis: engineKpis } = useKpiEngine({
    transactions: fTxn,
    orders: fOrders,
    expenses: fExpenses,
    customers: fCustomers,
    observations: fObservations,
    cashflow: cashflow || []
  }, ["total_revenue", "total_expense", "net_income", "net_margin_pct", "aov", "active_customers", "customer_sentiment_score"]);

  // === COMPUTATIONS (Hybride : Ancien + Nouveau) ===
  const computed = useMemo(() => {
    // Consommation officielle de la SSOT (KPI Engine)
    const totalIncome = engineKpis.get("total_revenue")?.value || 0;
    const totalExpensesTxn = engineKpis.get("total_expense")?.value || 0;
    // "Marge nette" = revenus - TOUTES les dépenses (net_income), pas la
    // marge brute (coût des marchandises vendues uniquement).
    const margin = engineKpis.get("net_income")?.value || 0;
    const marginPct = engineKpis.get("net_margin_pct")?.value || 0;
    
    const aov = engineKpis.get("aov")?.value || 0;
    const activeCustomers = engineKpis.get("active_customers")?.value || 0;
    const customerSentiment = engineKpis.get("customer_sentiment_score")?.value ?? null;
    const totalExpenseAmount = totalExpensesTxn;

    // Trésorerie : cashflow ne se filtre pas par période car c'est un stock continu
    let latestCash = latestCashBalance(cashflow) || 0;
    
    // Fallback temporaire pour les statistiques non couvertes
    const orderCount = fOrders.length;
    const orderRevenue = fOrders.reduce((s, o) => s + (Number(o.total) || 0), 0);

    // Full monthly data (ALL records, not period-filtered) for charts and trends
    const financialMonthly = financialMonthlySeries(transactions || [], expenseRecords || []);
    const revenueMonthly = financialMonthly.map((pt) => ({ month: pt.month, val: pt.income }));
    const expenseMonthly = financialMonthly.map((pt) => ({ month: pt.month, val: pt.expense }));
    const marginMonthly = financialMonthly.map((pt) => ({
      month: pt.month,
      val: pt.income > 0 ? (pt.margin / pt.income) * 100 : 0,
    }));
    
    // Cash is a balance, not a flow: the running month's closing balance is valid.
    const cashMode = validateChartAggregation(METRIC_TYPES.STOCK, "last", "Cash");
    const cashMonthly = monthlyAgg(cashflow || [], "date", "closing_cash", cashMode.toLowerCase());
    
    const costMode = validateChartAggregation(METRIC_TYPES.FLOW, "sum", "Costs");
    const costsMonthly = monthlyAggComplete(expenseRecords || [], "date", "amount", costMode.toLowerCase());
    
    const clientMode = validateChartAggregation(METRIC_TYPES.STOCK, "count", "Clients"); // or FLOW
    const clientsMonthly = monthlyAggComplete(customers || [], "acquisition_date", "customer_id", "count");

    const sparkCount = { day: 3, month: 3, quarter: 6, year: 12 }[period];
    const spark = (arr) => arr.slice(-sparkCount).map((d) => d.val);

    const revTrend = trendPct(lastVal(revenueMonthly), prevVal(revenueMonthly));
    const marginTrend = trendPct(lastVal(marginMonthly), prevVal(marginMonthly));
    const cashTrend = trendPct(lastVal(cashMonthly), prevVal(cashMonthly));
    
    // Refunded orders' money went back to the customer - excluded so a
    // refund-heavy month doesn't inflate the basket-size trend shown here.
    const aovOrders = validSalesOrders(orders);
    const aovRevMode = validateChartAggregation(METRIC_TYPES.FLOW, "sum", "Order Revenue");
    const aovRevMonthly = monthlyAggComplete(aovOrders, "date", "total", aovRevMode.toLowerCase());
    const aovCntMonthly = monthlyAggComplete(aovOrders, "date", "total", "count");
    const aovMonthly = aovRevMonthly.map((m) => {
      const cnt = aovCntMonthly.find((c) => c.month === m.month);
      return { month: m.month, val: cnt && cnt.val > 0 ? m.val / cnt.val : 0 };
    });
    const aovTrend = trendPct(lastVal(aovMonthly), prevVal(aovMonthly));
    const clientTrend = trendPct(lastVal(clientsMonthly), prevVal(clientsMonthly));
    const costTrend = trendPct(lastVal(costsMonthly), prevVal(costsMonthly));

    const monthlyData = { revenue: revenueMonthly, margin: marginMonthly, cash: cashMonthly, clients: clientsMonthly, costs: costsMonthly };

    // Forecasts — bounds based on historical variance, not hardcoded %
    const revGrowth = revenueMonthly.length >= 2 ? (lastVal(revenueMonthly) - prevVal(revenueMonthly)) / Math.max(1, prevVal(revenueMonthly)) : 0;
    const projectedRevenue = Math.round(lastVal(revenueMonthly) * (1 + revGrowth));
    const cashGrowth = cashMonthly.length >= 2 ? (lastVal(cashMonthly) - prevVal(cashMonthly)) / Math.max(1, Math.abs(prevVal(cashMonthly))) : 0;
    const projectedCash = Math.round(latestCash * (1 + cashGrowth));

    // Compute standard deviation of recent revenue for data-driven confidence bounds
    const revRecent = revenueMonthly.slice(-6).map((d) => d.val);
    const revMean = revRecent.length > 0 ? revRecent.reduce((a, b) => a + b, 0) / revRecent.length : 0;
    const revStd = revRecent.length > 1 ? Math.sqrt(revRecent.reduce((s, v) => s + (v - revMean) ** 2, 0) / (revRecent.length - 1)) : Math.max(1, Math.abs(revMean) * 0.1);
    const revBand = Math.max(revStd, Math.abs(revMean) * 0.05);

    const cashRecent = cashMonthly.slice(-6).map((d) => d.val);
    const cashMean = cashRecent.length > 0 ? cashRecent.reduce((a, b) => a + b, 0) / cashRecent.length : 0;
    const cashStd = cashRecent.length > 1 ? Math.sqrt(cashRecent.reduce((s, v) => s + (v - cashMean) ** 2, 0) / (cashRecent.length - 1)) : Math.max(1, Math.abs(cashMean) * 0.15);
    const cashBand = Math.max(cashStd, Math.abs(cashMean) * 0.05);

    const forecastRevData = [
      ...revenueMonthly.slice(-3).map((d) => ({ month: d.month, val: d.val, upper: d.val, lower: d.val })),
      { month: "Prév.", val: projectedRevenue, upper: Math.round(projectedRevenue + revBand), lower: Math.round(projectedRevenue - revBand) },
    ];
    const forecastCashData = [
      ...cashMonthly.slice(-3).map((d) => ({ month: d.month, val: d.val, upper: d.val, lower: d.val })),
      { month: "Prév.", val: projectedCash, upper: Math.round(projectedCash + cashBand), lower: Math.round(projectedCash - cashBand) },
    ];

    const avgMonthlyCost = costsMonthly.length > 0
      ? costsMonthly.slice(-3).reduce((s, m) => s + m.val, 0) / Math.min(3, costsMonthly.length)
      : 0;
    // Probability based on coefficient of variation (lower variance = higher confidence)
    const revCV = revMean > 0 ? revStd / revMean : 1;
    const revProbability = revenueMonthly.length < 2 ? 30
      : revCV < 0.1 ? 85
      : revCV < 0.2 ? 75
      : revCV < 0.35 ? 62
      : revCV < 0.5 ? 50
      : 38;
    const cashRisk = projectedCash < 0 ? "élevé" : avgMonthlyCost > 0 && projectedCash < avgMonthlyCost * 2 ? "modéré" : "faible";

    return {
      totalIncome, totalExpensesTxn, margin, marginPct, orderRevenue, orderCount, aov,
      activeCustomers, latestCash, totalExpenseAmount, customerSentiment,
      monthlyData, spark, aovMonthly,
      revTrend, marginTrend, cashTrend, aovTrend, clientTrend, costTrend,
      projectedRevenue, projectedCash, forecastRevData, forecastCashData,
      revProbability, cashRisk,
    };
  }, [transactions, orders, customers, cashflow, expenseRecords, period, cutoffDate]);

  // === INSIGHTS ===
  const insights = useMemo(() => {
    const recs = (recommendations || []).filter((r) => r.status === "nouvelle").slice(0, 3).map((r) => ({
      type: r.source_type === "risk" ? "risk" : r.source_type === "opportunity" ? "opportunity" : "anomaly",
      title: r.title,
      why: r.situation || r.analysis,
      impact: r.financial_impact ? `${formatImpact(r.financial_impact)} / mois` : null,
      action: r.action,
      link: "/recommandations",
    }));
    const critAnoms = (anomalies || []).filter((a) => a.severity === "critique" && (recs || []).length < 4).slice(0, 2).map((a) => ({
      type: "anomaly",
      title: a.title,
      why: a.explanation || a.description,
      impact: a.financial_impact ? `${formatImpact(a.financial_impact)} / mois` : null,
      action: null,
      link: "/anomalies",
    }));
    return [...recs, ...critAnoms].slice(0, 5);
  }, [recommendations, anomalies]);

  // === DIMENSIONS ===
  const rtScores = useMemo(() => computeDomainScores({
    transactions, orders, customers, campaigns, campaignDaily, products, inventory, cashflow, expenses: expenseRecords, company,
  }), [transactions, orders, customers, campaigns, campaignDaily, products, inventory, cashflow, expenseRecords, company]);

  const dimTrendDeltas = useMemo(() => {
    if (!analysisRuns || analysisRuns.length === 0) return {};
    const lastAnalysisScores = analysisRuns[0].dimension_scores || {};
    const deltas = {};
    Object.keys(rtScores).forEach((key) => {
      const currScore = rtScores[key]?.score || 0;
      const prevScore = lastAnalysisScores[key]?.score || 0;
      if (prevScore > 0) deltas[key] = Math.round(currScore - prevScore);
    });
    return deltas;
  }, [rtScores, analysisRuns]);

  const dimensions = useMemo(() => {
    return Object.keys(dimLabels).map((key) => ({
      key, label: dimLabels[key],
      score: rtScores[key]?.score || 0,
      measured: rtScores[key]?.measured !== false,
      trend: rtScores[key]?.trend || "stable",
      explanation: rtScores[key]?.explanation || "",
    }));
  }, [rtScores]);

  const rtHealthScore = useMemo(() => {
    const keys = ["finance", "ventes", "tresorerie", "clients", "operations", "marketing"];
    const measuredKeys = keys.filter((k) => rtScores[k]?.measured !== false);
    const scores = measuredKeys
      .map((k) => rtScores[k]?.score || 0)
      .filter((s) => s > 0);
    
    if (scores.length === 0) return 0;

    let baseScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

    // Vérifier les anomalies critiques et la présence des piliers financiers
    const criticalAnomalies = (anomalies || []).filter((a) => a.severity === "critique" || a.level === "critique");
    const hasCoreFinance = rtScores.finance?.measured !== false || rtScores.ventes?.measured !== false || rtScores.tresorerie?.measured !== false;

    // Si des anomalies critiques sont ouvertes, plafonner le score en zone de vigilance
    if (criticalAnomalies.length > 0) {
      baseScore = Math.min(baseScore, 48);
    } else if (!hasCoreFinance && scores.length < 3) {
      // Données financières fondamentales absentes : modérer le score global
      baseScore = Math.min(baseScore, 55);
    }

    return baseScore;
  }, [rtScores, anomalies]);

  // === SUMMARY ===
  const summary = useMemo(() => {
    const score = rtHealthScore;
    const criticalAnomalies = (anomalies || []).filter((a) => a.severity === "critique" || a.level === "critique");
    const hasCoreFinance = rtScores.finance?.measured !== false || rtScores.ventes?.measured !== false || rtScores.tresorerie?.measured !== false;

    if (criticalAnomalies.length > 0) {
      return `Attention : ${criticalAnomalies.length} anomalie(s) critique(s) détectée(s). Une intervention immédiate est requise.`;
    }
    if (!hasCoreFinance) {
      return "Données financières partielles : importez vos ventes, transactions ou flux de trésorerie pour consolider le score de santé.";
    }

    const scored = dimensions
      .filter((d) => d.measured !== false && (d.score || 0) > 0)
      .sort((a, b) => (a.score || 0) - (b.score || 0));
    const lowest = scored.slice(0, 2).map((d) => d.label.toLowerCase());
    if (score >= 75) return "Votre entreprise est en bonne santé. Continuez à surveiller les indicateurs clés.";
    if (score >= 50) return `Votre entreprise progresse, mais ${lowest.join(" et ")} nécessitent une attention particulière.`;
    return `Votre entreprise rencontre des difficultés. Une intervention est recommandée sur ${lowest.join(" et ")}.`;
  }, [rtHealthScore, dimensions, anomalies, rtScores]);

  // === TREND ===
  const healthTrend = useMemo(() => {
    const current = rtHealthScore;
    const prev = analysisRuns && analysisRuns.length > 0 ? analysisRuns[0].health_score : null;
    if (prev == null) return null;
    const delta = Math.round(current - prev);
    if (delta > 0) return { direction: "up", text: `+${delta} pts depuis la dernière analyse` };
    if (delta < 0) return { direction: "down", text: `${delta} pts depuis la dernière analyse` };
    return { direction: "stable", text: "Stable depuis la dernière analyse" };
  }, [rtHealthScore, analysisRuns]);

  // === ACTIONS ===
  const actions = useMemo(() => {
    const pOrder = { urgente: 0, elevee: 1, moyenne: 2, faible: 3 };
    return (recommendations || []).filter((r) => r.status === "nouvelle").sort((a, b) => (pOrder[a.priority] || 4) - (pOrder[b.priority] || 4)).slice(0, 4).map((r) => ({
      id: r.id, title: r.title, priority: r.priority,
      impact: r.financial_impact ? `${formatImpact(r.financial_impact)} / mois` : null,
      action: r.action,
    }));
  }, [recommendations]);

  // === RENDER ===
  if (loadingCompany) {
    return <div className="flex h-96 items-center justify-center"><RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!company) {
    return (
      <EmptyState icon={Sparkles} title="Bienvenue dans GESCOP" description="Configurez votre entreprise pour commencer à recevoir des analyses et des recommandations."
        action={<Button asChild><Link to="/onboarding">Configurer mon entreprise <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>} />
    );
  }

  const hasData = (transactions?.length || 0) + (orders?.length || 0) + (cashflow?.length || 0) + (customers?.length || 0) > 0;
  const hasAnalysis = (anomalies?.length || 0) + (risks?.length || 0) + (opportunities?.length || 0) + (recommendations?.length || 0) > 0;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";
  const today = new Date().toLocaleDateString("fr-CA", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const lastAnalysis = formatRelativeTime(company.last_analysis_date);

  return (
    <div className="space-y-6">
      <DashboardHeader greeting={greeting} date={today} lastAnalysis={lastAnalysis} onAnalyze={handleAnalyze} analyzing={analyzing} hasData={hasData} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="Actions rapides">
        {[
          { label: "Importer des données", to: "/importer", icon: Upload, hint: "Ajouter ou synchroniser un fichier" },
          { label: "Voir les alertes", to: "/alertes", icon: Bell, hint: "Risques et anomalies à traiter" },
          { label: "Contrôler la qualité", to: "/audit", icon: ClipboardCheck, hint: "Vérifier les données et calculs" },
        ].map(({ label, to, icon: Icon, hint }) => (
          <Link key={to} to={to} className="group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:border-primary/40 hover:bg-primary/5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{label}</span>
              <span className="block truncate text-xs text-muted-foreground">{hint}</span>
            </span>
            <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        ))}
      </div>

      {hasData && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut", delay: 0.08 }}
          className="flex flex-wrap items-center justify-between gap-3"
        >
          <p className="text-sm font-medium text-muted-foreground">
            Tendances des {period === "day" ? "dernières 24 heures" : period === "month" ? "30 derniers jours" : period === "quarter" ? "90 derniers jours" : "12 derniers mois"}
          </p>
          <TimeFilter period={period} onChange={setPeriod} />
        </motion.div>
      )}

      {analyzing && (
        <div className="animate-fade-in rounded-2xl border border-border bg-card p-6">
          <div className="space-y-2.5">
            {analysisSteps.map((step, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                {i < progress ? <Check className="h-4 w-4 text-emerald-600" />
                  : i === progress ? <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  : <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/20" />}
                <span className={i <= progress ? "text-foreground" : "text-muted-foreground"}>{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!hasData && <OnboardingHero />}

      {hasData && !hasAnalysis && !analyzing && (
        <div className="py-6">
          <AnalysisEmptyState onStart={handleAnalyze} />
        </div>
      )}

      {hasData && hasAnalysis && (
        <div className="space-y-6">
          {/* 1. PRIORITÉS CRITIQUES DU JOUR */}
          <TodayPriorities recommendations={recommendations} anomalies={anomalies} risks={risks} tasks={tasks} />

          {/* 2. ÉTAT GLOBAL */}
          <HealthHero score={rtHealthScore} dimensions={dimensions} summary={summary} trend={healthTrend} onDomainClick={() => navigate("/kpis")} />

          {/* 3. KPI ESSENTIELS (top 3) */}
          <div>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Indicateurs clés</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <KpiCard label="Trésorerie"
                value={(cashflow?.length || 0) > 0 ? `${Math.round(computed.latestCash).toLocaleString("fr-CA")} $` : "—"}
                change={(cashflow?.length || 0) > 1 ? `${formatPct(Math.abs(computed.cashTrend))}` : null}
                changeDir={computed.cashTrend >= 0 ? "up" : "down"}
                sparkline={computed.spark(computed.monthlyData.cash)}
                status={(cashflow?.length || 0) > 0 ? (computed.latestCash > 0 ? "good" : "critical") : "unmeasured"}
                statusLabel={(cashflow?.length || 0) > 0 ? (computed.latestCash > 0 ? "Bon" : "Critique") : "Non mesuré"}
                onClick={() => navigate("/tresorerie")} />
              <KpiCard label="Chiffre d'affaires"
                value={((transactions?.length || 0) + (orders?.length || 0)) > 0 ? `${Math.round(computed.totalIncome).toLocaleString("fr-CA")} $` : "—"}
                change={((transactions?.length || 0) + (orders?.length || 0)) > 0 && computed.monthlyData.revenue.length > 1 ? `${formatPct(Math.abs(computed.revTrend))}` : null}
                changeDir={computed.revTrend >= 0 ? "up" : "down"}
                sparkline={computed.spark(computed.monthlyData.revenue)}
                status={((transactions?.length || 0) + (orders?.length || 0)) > 0 ? (computed.revTrend >= 0 ? "good" : "warning") : "unmeasured"}
                statusLabel={((transactions?.length || 0) + (orders?.length || 0)) > 0 ? (computed.revTrend >= 0 ? "Bon" : "Attention") : "Non mesuré"}
                onClick={() => navigate("/kpis")} />
              <KpiCard label="Marge nette"
                value={((transactions?.length || 0) + (orders?.length || 0)) > 0 ? `${formatPct(computed.marginPct)}` : "—"}
                change={((transactions?.length || 0) + (orders?.length || 0)) > 0 && computed.monthlyData.margin.length > 1 ? `${formatPct(Math.abs(computed.marginTrend))}` : null}
                changeDir={computed.marginTrend >= 0 ? "up" : "down"}
                sparkline={computed.spark(computed.monthlyData.margin)}
                status={((transactions?.length || 0) + (orders?.length || 0)) > 0 ? (computed.marginPct >= 30 && computed.marginTrend >= 0 ? "good" : computed.marginPct < 10 ? "critical" : "warning") : "unmeasured"}
                statusLabel={((transactions?.length || 0) + (orders?.length || 0)) > 0 ? (computed.marginPct >= 30 && computed.marginTrend >= 0 ? "Bon" : computed.marginPct < 10 ? "Critique" : "Attention") : "Non mesuré"}
                onClick={() => navigate("/kpis")} />
            </div>
          </div>

          {/* 4. SECTION DÉTAILS (repliable) */}
          <div className="rounded-2xl border border-border bg-card">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex w-full items-center justify-between p-4"
            >
              <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Plus de détails — domaines, tendances, risques, opportunités et prévisions
              </span>
              <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${showDetails ? "rotate-180" : ""}`} />
            </button>

            {showDetails && (
              <div className="space-y-6 border-t border-border p-4">
                {/* KPI secondaires */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <KpiCard label="Coûts opérationnels"
                    value={(expenseRecords?.length || 0) > 0 ? `${Math.round(computed.totalExpenseAmount).toLocaleString("fr-CA")} $` : "—"}
                    change={(expenseRecords?.length || 0) > 1 ? `${formatPct(Math.abs(computed.costTrend))}` : null}
                    changeDir={computed.costTrend >= 0 ? "up" : "down"}
                    sparkline={computed.spark(computed.monthlyData.costs)}
                    status={(expenseRecords?.length || 0) > 0 ? (computed.costTrend > 5 ? "warning" : "neutral") : "unmeasured"}
                    statusLabel={(expenseRecords?.length || 0) > 0 ? (computed.costTrend > 5 ? "Attention" : "Stable") : "Non mesuré"}
                    onClick={() => navigate("/tresorerie")} />
                  <KpiCard label="Clients actifs"
                    value={(customers?.length || 0) > 0 ? computed.activeCustomers.toLocaleString("fr-CA") : "—"}
                    change={(customers?.length || 0) > 1 ? `${formatPct(Math.abs(computed.clientTrend))}` : null}
                    changeDir={computed.clientTrend >= 0 ? "up" : "down"}
                    sparkline={computed.spark(computed.monthlyData.clients)}
                    status={(customers?.length || 0) > 0 ? (computed.clientTrend >= 0 ? "good" : "warning") : "unmeasured"}
                    statusLabel={(customers?.length || 0) > 0 ? (computed.clientTrend >= 0 ? "Bon" : "Attention") : "Non mesuré"}
                    onClick={() => navigate("/clients")} />
                  <KpiCard label="Panier moyen"
                    value={(orders?.length || 0) > 0 && computed.aov > 0 ? `${computed.aov.toFixed(2)} $` : "—"}
                    change={(orders?.length || 0) > 1 ? `${formatPct(Math.abs(computed.aovTrend))}` : null}
                    changeDir={computed.aovTrend >= 0 ? "up" : "down"}
                    sparkline={computed.spark(computed.aovMonthly)}
                    status={(orders?.length || 0) > 0 && computed.aov > 0 ? (computed.aovTrend >= 0 ? "neutral" : "warning") : "unmeasured"}
                    statusLabel={(orders?.length || 0) > 0 && computed.aov > 0 ? (computed.aovTrend >= 0 ? "Stable" : "Attention") : "Non mesuré"}
                    onClick={() => navigate("/clients")} />
                  <KpiCard label="Sentiment Client"
                    value={computed.customerSentiment != null ? `${computed.customerSentiment.toFixed(1)}/10` : "—"}
                    change={null} changeDir="stable"
                    sparkline={[]}
                    status={computed.customerSentiment != null ? (computed.customerSentiment >= 7 ? "good" : computed.customerSentiment <= 4 ? "critical" : "warning") : "unmeasured"}
                    statusLabel={computed.customerSentiment != null ? (computed.customerSentiment >= 7 ? "Bon" : computed.customerSentiment <= 4 ? "Critique" : "Moyen") : "Non mesuré"}
                    onClick={() => navigate("/kpis")} />
                </div>

                {/* Insights */}
                {insights.length > 0 && (
                  <div>
                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Ce qui mérite votre attention</h3>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {insights.map((ins, i) => (
                        <InsightCard key={i} {...ins} onDismiss={() => qc.invalidateQueries()} />
                      ))}
                    </div>
                  </div>
                )}

                <KpiOverview monthlyData={computed.monthlyData} dimensions={dimensions} />

                {/* Domain scores */}
                <div>
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Vue d'ensemble des domaines</h3>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                    {dimensions.filter((d) => ["finance", "ventes", "tresorerie", "clients", "operations", "marketing"].includes(d.key)).map((d) => (
                      <DomainScoreCard key={d.key} domainKey={d.key} score={d.score} trend={d.trend} trendDelta={dimTrendDeltas[d.key] || 0} problem={d.explanation} onAnalyze={() => navigate("/kpis")} />
                    ))}
                  </div>
                </div>

                <PerformanceChart monthlyData={computed.monthlyData} />

                {/* Risques */}
                {(risks || []).length > 0 && (
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Risques actifs</h3>
                      <Button variant="ghost" size="sm" asChild><Link to="/risques">Voir tout <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link></Button>
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {[...(risks || [])].sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 3).map((r) => (
                        <RiskCard key={r.id} title={r.title} description={r.description}
                          impact={r.financial_impact ? formatImpact(r.financial_impact) : null}
                          category={r.category} urgency={r.urgency} score={r.score}
                          link="/risques" onCreateAction={() => navigate("/taches")} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Opportunités */}
                {(opportunities || []).length > 0 && (
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Opportunités détectées</h3>
                      <Button variant="ghost" size="sm" asChild><Link to="/risques">Voir tout <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link></Button>
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      {(opportunities || []).slice(0, 3).map((o) => (
                        <OpportunityCard key={o.id} title={o.title} description={o.description}
                          impact={o.financial_impact ? formatImpact(o.financial_impact) : null}
                          category={o.category} link="/risques" onCreateAction={() => navigate("/taches")} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Prévisions */}
                <div>
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Ce qui pourrait arriver</h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <ForecastCard metric="Chiffre d'affaires prévu (30j)" value={`${computed.projectedRevenue.toLocaleString("fr-CA")} $`} probability={computed.revProbability} chartData={computed.forecastRevData} />
                    <ForecastCard metric="Trésorerie prévue (30j)" value={`${computed.projectedCash.toLocaleString("fr-CA")} $`} risk={computed.cashRisk} chartData={computed.forecastCashData} />
                  </div>
                </div>

                {/* Actions */}
                {actions.length > 0 && (
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Actions recommandées</h3>
                      <Button variant="ghost" size="sm" asChild><Link to="/recommandations">Voir tout <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link></Button>
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                      {actions.map((a) => (
                        <ActionCard key={a.id} title={a.title} impact={a.impact} priority={a.priority}
                          onExamine={() => navigate("/recommandations")} onApprove={() => navigate("/recommandations")} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}