import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import SliderControl from "@/components/simulateur/SliderControl";
import EmptyState from "@/components/EmptyState";
import { Calculator, Upload, TrendingUp, TrendingDown } from "lucide-react";
import { Link } from "react-router-dom";
import { cn, formatPct } from "@/lib/utils";
import { currentMonthKey } from "@/lib/periods";
import { fetchAll } from "@/lib/fetchAll";
import { isIncome } from "@/lib/transactionClassifier";
import { useCompany } from "@/hooks/useCompany";
import { useKpiEngineTimeSeries } from "@/lib/useKpiEngine";
import { computeLiveAlerts } from "@/lib/liveAlerts";

export default function Simulateur() {
  const [priceChange, setPriceChange] = useState(0);
  const [volumeChange, setVolumeChange] = useState(0);
  const [expenseChange, setExpenseChange] = useState(0);
  const [variableShare, setVariableShare] = useState(60);

  const { data: transactions, isLoading } = useQuery({
    queryKey: ["transactions-sim"],
    queryFn: () => fetchAll(base44.entities.Transaction, "-date"),
  });

  // Phase 7: Fetch live alerts to provide contextual recommendations
  const { company } = useCompany();
  const { data: liveAlerts } = useQuery({
    queryKey: ["sim-alerts"],
    queryFn: async () => {
      const [customers, orders, campaignDaily, inventory, products, cashflow] = await Promise.all([
        fetchAll(base44.entities.Customer, "-created_date"),
        fetchAll(base44.entities.Order, "-date"),
        fetchAll(base44.entities.CampaignDaily, "-date"),
        fetchAll(base44.entities.Inventory, "-date"),
        fetchAll(base44.entities.Product),
        fetchAll(base44.entities.Cashflow, "-date")
      ]);
      return computeLiveAlerts({ transactions, orders, customers, campaignDaily, products, inventory, cashflow, company });
    },
    enabled: !!transactions
  });

  const semanticTimeSeries = useKpiEngineTimeSeries(
    { transactions: transactions || [] },
    ["total_revenue", "total_expense"],
    { includeCurrentMonth: false }
  );

  const current = useMemo(() => {
    if (!semanticTimeSeries.available || semanticTimeSeries.timeSeries.length === 0) return null;
    const ts = semanticTimeSeries.timeSeries;
    // Prends le dernier mois complet calculé par le moteur sémantique
    const last = ts[ts.length - 1];
    const baseMonth = last.date;
    const income = last.total_revenue || 0;
    const expense = last.total_expense || 0;
    const margin = income - expense;

    // Récupérer le volume depuis les transactions pour le mois de base (non fourni par le moteur financier)
    const baseTxns = (transactions || []).filter(t => (t.date || "").startsWith(baseMonth) && isIncome(t));
    const volume = baseTxns.length || 1;
    const avgPrice = income / volume;
    
    return { income, expense, margin, volume, avgPrice, baseMonth };
  }, [semanticTimeSeries, transactions]);

  const sim = useMemo(() => {
    if (!current) return null;
    const newPrice = current.avgPrice * (1 + priceChange / 100);
    const volumeFactor = 1 + volumeChange / 100;
    const newVolume = current.volume * volumeFactor;
    const newIncome = newPrice * newVolume;

    const share = Math.min(100, Math.max(0, variableShare)) / 100;
    const fixedCost = current.expense * (1 - share);
    const variableCost = current.expense * share * volumeFactor;
    const newExpense = (fixedCost + variableCost) * (1 + expenseChange / 100);

    const newMargin = newIncome - newExpense;
    const profitChange = newMargin - current.margin;
    const newMarginPct = newIncome > 0 ? (newMargin / newIncome) * 100 : 0;
    const currentMarginPct = current.income > 0 ? (current.margin / current.income) * 100 : 0;
    return {
      newPrice, newVolume, newIncome, newExpense, newMargin,
      profitChange, newMarginPct, currentMarginPct, fixedCost, variableCost,
    };
  }, [current, priceChange, volumeChange, expenseChange, variableShare]);

  if (isLoading) return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" /></div>;
  if (!transactions || transactions.length === 0) return <EmptyState icon={Upload} title="Aucune donnée à simuler" description="Importez vos transactions pour tester l'impact de vos décisions sur vos résultats." action={<Link to="/importer" className="text-primary hover:underline">Importer des données →</Link>} />;
  if (!current || !sim) return <EmptyState icon={Calculator} title="Données insuffisantes pour simuler" description="Il faut au moins un mois complet de données." action={<Link to="/importer" className="text-primary hover:underline">Vérifier l'import →</Link>} />;

  const fmt = (v) => `${Math.round(v).toLocaleString("fr-CA")} $`;
  const fmtPct = (v) => `${formatPct(v)}`;
  const rows = [
    { label: "Prix moyen", actual: fmt(current.avgPrice), sim: fmt(sim.newPrice) },
    { label: "Volume (nb de transactions de vente)", actual: Math.round(current.volume).toLocaleString("fr-CA"), sim: Math.round(sim.newVolume).toLocaleString("fr-CA") },
    { label: "Chiffre d'affaires", actual: fmt(current.income), sim: fmt(sim.newIncome) },
    { label: "Dépenses", actual: fmt(current.expense), sim: fmt(sim.newExpense) },
    { label: "— dont coûts fixes", actual: fmt(current.expense * (1 - Math.min(100, Math.max(0, variableShare)) / 100)), sim: fmt(sim.fixedCost * (1 + expenseChange / 100)) },
    { label: "— dont coûts variables", actual: fmt(current.expense * (Math.min(100, Math.max(0, variableShare)) / 100)), sim: fmt(sim.variableCost * (1 + expenseChange / 100)) },
    { label: "Marge nette", actual: fmt(current.margin), sim: fmt(sim.newMargin) },
    { label: "Taux de marge", actual: fmtPct(sim.currentMarginPct), sim: fmtPct(sim.newMarginPct) },
  ];
  const positive = sim.profitChange >= 0;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Simulateur « Et si ? »</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Testez l'impact de vos décisions avant de les prendre. Base de calcul : {current.baseMonth} (dernier mois complet).
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 rounded-2xl border border-border bg-card p-6 md:grid-cols-2 lg:grid-cols-4">
        <SliderControl label="Variation du prix" value={priceChange} onChange={setPriceChange} />
        <SliderControl label="Variation du volume" value={volumeChange} onChange={setVolumeChange} />
        <SliderControl label="Variation des dépenses" value={expenseChange} onChange={setExpenseChange} />
        <SliderControl
          label="Part des coûts variables"
          value={variableShare}
          onChange={setVariableShare}
          min={0}
          max={100}
          neutral={-1}
          hint="Part de vos dépenses qui suit le volume (achats, matière, livraison, commissions). Le reste est fixe (loyer, salaires, logiciels)."
        />
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 text-xs leading-relaxed text-amber-900">
        <span className="font-semibold">Limites du modèle — à lire avant de décider.</span> Le prix et le volume
        sont indépendants dans cette simulation : aucune élasticité n'est appliquée, donc une hausse de prix
        sans perte de volume est une hypothèse de votre part, pas une prévision. La base de calcul est un seul
        mois complet ({current.baseMonth}), sans saisonnalité. Ajustez la part des coûts variables à votre
        réalité : c'est elle qui détermine si une hausse de volume est rentable.
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Indicateur</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actuel</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Simulation</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={cn("border-b border-border last:border-0", i === rows.length - 1 && "bg-muted/20")}>
                <td className="px-4 py-3 text-sm font-medium">{r.label}</td>
                <td className="px-4 py-3 text-right text-sm">{r.actual}</td>
                <td className="px-4 py-3 text-right text-sm font-semibold">{r.sim}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={cn("flex items-center gap-3 rounded-2xl border p-6", positive ? "border-emerald-200 bg-emerald-50/50" : "border-red-200 bg-red-50/50")}>
        {positive ? <TrendingUp className="h-6 w-6 text-emerald-600" /> : <TrendingDown className="h-6 w-6 text-red-600" />}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Résultat de la simulation</p>
          <p className={cn("text-2xl font-bold", positive ? "text-emerald-700" : "text-red-700")}>
            {positive ? "+" : ""}{fmt(sim.profitChange)} / mois
          </p>
        </div>
      </div>

      {/* Phase 7: Contextual Recommendation based on Intelligence */}
      {(liveAlerts || []).some(a => a.category.includes("Finance") && a.title.toLowerCase().includes("marge")) && positive && sim.profitChange > 1000 && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-medium text-emerald-900">Recommandation validée</p>
          <p className="mt-1 text-xs text-emerald-700">Ce scénario corrige l'alerte actuelle concernant la dégradation de votre marge nette. Poursuivez cette stratégie.</p>
        </div>
      )}
    </div>
  );
}