import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import EmptyState from "@/components/EmptyState";
import KpiCard from "@/components/kpis/KpiCard";
import KpiTrendChart from "@/components/kpis/KpiTrendChart";
import DomainScoreList from "@/components/kpis/DomainScoreList";
import DomainScoreLegend from "@/components/kpis/DomainScoreLegend";
import { BarChart3, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadCSV } from "@/lib/exportUtils";
import { computeDomainScores } from "@/lib/domainScores";
import { fetchAll } from "@/lib/fetchAll";
import { useCompany } from "@/hooks/useCompany";
import { getStockAlertSettings, computeStockAlerts } from "@/lib/stockAlerts";
import {
  monthlyAggComplete,
  lastVal,
  prevVal,
  trendDir,
  sumLast,
  sumPrev,
} from "@/lib/periods";
import {
  aggregateMarginPct,
  previousMarginPct,
  netBurnRate,
  runwayMonths,
  latestCashBalance,
  churnStats,
  customerValue,
  roasWindow,
  previousRoasWindow,
  anyColumnPresent,
} from "@/lib/metrics";

const domainLabels = {
  finance: "Finance",
  tresorerie: "Trésorerie",
  ventes: "Ventes",
  marketing: "Marketing",
  operations: "Opérations",
  clients: "Clients",
};

const domainColors = {
  finance: "#2563eb",
  tresorerie: "#0ea5e9",
  ventes: "#16a34a",
  marketing: "#ea580c",
  operations: "#9333ea",
  clients: "#0891b2",
};

export default function Kpis() {
  // The stock threshold is a company setting, so these KPIs follow it like the
  // Produits page does instead of hard-coding their own shortage rule.
  const { company } = useCompany();
  const stockSettings = getStockAlertSettings(company);
  const { data: kpisLLM, isLoading } = useQuery({
    queryKey: ["kpis"],
    queryFn: async () => {
      const list = await base44.entities.Kpi.list();
      return list || [];
    },
    staleTime: 0,
  });

  const { data: transactions } = useQuery({
    queryKey: ["transactions-kpi"],
    queryFn: async () => {
      const list = await fetchAll(base44.entities.Transaction, "-date");
      return list || [];
    },
    staleTime: 0,
  });
  const { data: orders } = useQuery({
    queryKey: ["orders-kpi"],
    queryFn: async () => {
      const list = await fetchAll(base44.entities.Order, "-date");
      return list || [];
    },
    staleTime: 0,
  });
  const { data: customers } = useQuery({
    queryKey: ["customers-kpi"],
    queryFn: async () => {
      const list = await fetchAll(base44.entities.Customer);
      return list || [];
    },
    staleTime: 0,
  });
  const { data: campaigns } = useQuery({
    queryKey: ["campaigns-kpi"],
    queryFn: async () => {
      const list = await fetchAll(base44.entities.Campaign);
      return list || [];
    },
    staleTime: 0,
  });
  const { data: products } = useQuery({
    queryKey: ["products-kpi"],
    queryFn: async () => {
      const list = await fetchAll(base44.entities.Product);
      return list || [];
    },
    staleTime: 0,
  });
  const { data: inventory } = useQuery({
    queryKey: ["inventory-kpi"],
    queryFn: async () => {
      const list = await fetchAll(base44.entities.Inventory, "-date");
      return list || [];
    },
    staleTime: 0,
  });
  const { data: cashflow } = useQuery({
    queryKey: ["cashflow-kpi"],
    queryFn: async () => {
      const list = await fetchAll(base44.entities.Cashflow, "-date");
      return list || [];
    },
    staleTime: 0,
  });
  const { data: campaignDaily } = useQuery({
    queryKey: ["campaign-daily-kpi"],
    queryFn: async () => {
      const list = await fetchAll(base44.entities.CampaignDaily, "-date");
      return list || [];
    },
    staleTime: 0,
  });

  const computedKpis = useMemo(() => {
    const result = [];
    // Computed in the FINANCE block below and reused by CLIENTS to turn revenue
    // per customer into an actual LTV. Null when there is no margin to apply.
    let margin3Overall = null;

    // === FINANCE === (only if transactions exist)
    // All month-over-month figures use COMPLETE months: the in-progress month
    // holds only a few days of data and would look like a collapse.
    if ((transactions || []).length > 0) {
      const incomes = transactions.filter((t) => t.type === "income");
      const expenses = transactions.filter((t) => t.type === "expense");

      const revMonthly = monthlyAggComplete(incomes, "date", "amount");
      const expMonthly = monthlyAggComplete(expenses, "date", "amount");
      const currRev = lastVal(revMonthly);
      const prevRev = prevVal(revMonthly);
      const currExp = lastVal(expMonthly);
      const prevExp = prevVal(expMonthly);
      const currMarginPct = currRev > 0 ? ((currRev - currExp) / currRev) * 100 : 0;
      const prevMarginPct = prevRev > 0 ? ((prevRev - prevExp) / prevRev) * 100 : 0;
      // Aggregated 3-month margin — the same figure the audit page traces.
      const margin3 = aggregateMarginPct(revMonthly, expMonthly, 3);
      const marginPrev3 = previousMarginPct(revMonthly, expMonthly, 3);
      margin3Overall = margin3;

      // Cash: latest balance, compared on a 7-day average to avoid daily noise.
      const cfSorted = (cashflow || []).slice().sort((a, b) => ((a.date || "") < (b.date || "") ? 1 : -1));
      const avgCash = (arr) =>
        arr.length > 0 ? arr.reduce((s, c) => s + (Number(c.closing_cash) || 0), 0) / arr.length : 0;
      const latestCash = latestCashBalance(cashflow);
      const cash7 = avgCash(cfSorted.slice(0, 7));
      // Only compare against a full prior week, never against 2 stray rows.
      const cashPrev7 = cfSorted.length >= 14 ? avgCash(cfSorted.slice(7, 14)) : null;

      result.push({ name: "Revenus encaissés (dernier mois complet)", domain: "finance", value: Math.round(currRev), previous: Math.round(prevRev), trend: trendDir(currRev, prevRev), unit: "$" });
      result.push({ name: "Dépenses enregistrées (dernier mois complet)", domain: "finance", value: Math.round(currExp), previous: Math.round(prevExp), trend: trendDir(currExp, prevExp), unit: "$" });
      // "Marge nette" and not "brute": the denominator here is ALL expenses
      // recorded as transactions, not just the cost of goods sold. Calling it
      // gross margin made the figure irreconcilable with the accountant's.
      result.push({ name: "Marge nette (dernier mois complet)", domain: "finance", value: Math.round(currMarginPct), previous: Math.round(prevMarginPct), trend: trendDir(currMarginPct, prevMarginPct), unit: "%" });
      if (margin3 !== null) {
        result.push({ name: "Marge nette (3 mois)", domain: "finance", value: Math.round(margin3), previous: marginPrev3 !== null ? Math.round(marginPrev3) : null, trend: trendDir(margin3, marginPrev3), unit: "%" });
      }
      if (latestCash !== null) {
        result.push({ name: "Trésorerie actuelle", domain: "finance", value: Math.round(latestCash), previous: cashPrev7 !== null ? Math.round(cashPrev7) : null, trend: trendDir(cash7, cashPrev7, 1), unit: "$" });
        // Runway on NET burn: a profitable business is not 3 months from the wall.
        const burn = netBurnRate(revMonthly, expMonthly, 3);
        const runway = runwayMonths(latestCash, burn);
        if (runway === Infinity) {
          result.push({ name: "Autonomie de trésorerie", domain: "finance", value: "Autofinancée", previous: null, trend: "stable", unit: "" });
        } else if (runway !== null && Number.isFinite(runway)) {
          // No previous window is computed for runway, so no arrow is shown.
          result.push({ name: "Autonomie de trésorerie", domain: "finance", value: Math.round(runway * 10) / 10, previous: null, trend: "stable", unit: " mois" });
        }
      }
    }

    // Les indicateurs Ventes proviennent des commandes (entite Order), tandis
    // que les indicateurs Finance proviennent des transactions encaissees
    // (entite Transaction). Les deux ne se reconcilient pas : une PME peut
    // encaisser sans commande saisie, et inversement. Les libelles nomment
    // donc explicitement la source pour qu'un ecart ne passe pas pour une erreur.
    // === VENTES === (only if orders exist)
    if ((orders || []).length > 0) {
      const orderRevMonthly = monthlyAggComplete(orders, "date", "total");
      const orderCntMonthly = monthlyAggComplete(orders, "date", "total", "count");
      const currOrders = lastVal(orderCntMonthly);
      const prevOrders = prevVal(orderCntMonthly);
      const currOrderRev = lastVal(orderRevMonthly);
      const prevOrderRev = prevVal(orderRevMonthly);
      const currAOV = currOrders > 0 ? currOrderRev / currOrders : 0;
      const prevAOV = prevOrders > 0 ? prevOrderRev / prevOrders : 0;
      const totalOrderRev = orders.reduce((s, o) => s + (Number(o.total) || 0), 0);
      const returns = orders.filter((o) =>
        (o.return_status && o.return_status !== "aucun") ||
        o.payment_status === "rembourse" ||
        o.fulfillment_status === "retourne"
      );
      // 0 % only means "no returns" when at least one column could have
      // reported one. If all three are absent from the import, the rate is
      // unknown and the KPI is withheld rather than shown as a clean zero.
      const hasReturnSignal = anyColumnPresent(orders, ["return_status", "payment_status", "fulfillment_status"]);
      const returnRate = orders.length > 0 ? (returns.length / orders.length) * 100 : 0;

      // 3-month blocks: less sensitive to a single outlier month than 1-vs-1.
      const rev3 = sumLast(orderRevMonthly, 3);
      const revPrev3 = sumPrev(orderRevMonthly, 3);

      result.push({ name: "Panier moyen (commandes)", domain: "ventes", value: Math.round(currAOV), previous: Math.round(prevAOV), trend: trendDir(currAOV, prevAOV), unit: "$" });
      result.push({ name: "Commandes enregistrées (dernier mois complet)", domain: "ventes", value: currOrders, previous: prevOrders, trend: trendDir(currOrders, prevOrders), unit: "" });
      // No previous window is computed for the return rate, so no arrow:
      // a trend must come from a change over time, never from the level.
      if (hasReturnSignal) {
        result.push({ name: "Taux de retour", domain: "ventes", value: Math.round(returnRate * 10) / 10, previous: null, trend: "stable", unit: "%" });
      }
      if (rev3 !== null) {
        result.push({ name: "CA facturé sur 3 mois (commandes)", domain: "ventes", value: Math.round(rev3), previous: revPrev3 !== null ? Math.round(revPrev3) : null, trend: trendDir(rev3, revPrev3), unit: "$" });
      }
      result.push({ name: "Revenu total (commandes)", domain: "ventes", value: Math.round(totalOrderRev), previous: null, trend: "stable", unit: "$" });
    }

    // === MARKETING === (only if campaigns exist)
    if ((campaigns || []).length > 0) {
      const totalSpend = campaigns.reduce((s, c) => s + (Number(c.spend) || 0), 0);
      const totalNewCust = campaigns.reduce((s, c) => s + (Number(c.new_customers) || 0), 0);
      const totalConv = campaigns.reduce((s, c) => s + (Number(c.conversions) || 0), 0);
      const totalCampRev = campaigns.reduce((s, c) => s + (Number(c.revenue) || 0), 0);
      const totalClicks = campaigns.reduce((s, c) => s + (Number(c.clicks) || 0), 0);
      const totalImpressions = campaigns.reduce((s, c) => s + (Number(c.impressions) || 0), 0);
      // Same fallback as the Marketing page: an absent "new_customers" column
      // must not turn into a CAC of 0 € next to a large spend. Conversions are
      // the standard proxy; when neither exists the KPI is simply not shown.
      const cacBasis = totalNewCust > 0 ? "clients" : totalConv > 0 ? "conversions" : null;
      const cac = cacBasis === "clients" ? totalSpend / totalNewCust
        : cacBasis === "conversions" ? totalSpend / totalConv
          : null;
      const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
      const convRate = totalClicks > 0 ? (totalConv / totalClicks) * 100 : 0;

      // ROAS on a recent window with a real computed trend, from dated daily
      // rows when available; campaign totals are all-time and have no trend.
      const spendM = monthlyAggComplete(campaignDaily || [], "date", "spend");
      const cRevM = monthlyAggComplete(campaignDaily || [], "date", "revenue");
      const windowRoas = roasWindow(spendM, cRevM, 3);
      const roasPrev = previousRoasWindow(spendM, cRevM, 3);
      const roas = windowRoas !== null ? windowRoas : totalSpend > 0 ? totalCampRev / totalSpend : null;

      if (roas !== null) {
        result.push({
          name: windowRoas !== null ? "ROAS (3 derniers mois)" : "ROAS cumulé (non daté)",
          domain: "marketing",
          value: Math.round(roas * 10) / 10,
          previous: roasPrev !== null ? Math.round(roasPrev * 10) / 10 : null,
          trend: trendDir(roas, roasPrev),
          unit: "x",
        });
      }
      // These three are all-time cumulative figures: campaign rows carry no date,
      // so they cannot be windowed and must not pretend to have a trend.
      if (cac !== null) {
        result.push({
          name: cacBasis === "conversions" ? "Coût par conversion (cumul)" : "CAC moyen (cumul)",
          domain: "marketing",
          value: Math.round(cac),
          previous: null,
          trend: "stable",
          unit: "$",
        });
      }
      result.push({ name: "Taux de clic (CTR, cumul)", domain: "marketing", value: Math.round(ctr * 100) / 100, previous: null, trend: "stable", unit: "%" });
      result.push({ name: "Taux de conversion (cumul)", domain: "marketing", value: Math.round(convRate * 10) / 10, previous: null, trend: "stable", unit: "%" });
    }

    // === OPÉRATIONS === (only if products or inventory exist)
    if ((products || []).length > 0 || (inventory || []).length > 0) {
      // Same shortage definition as the Produits page and the alert centre —
      // the company threshold included. "Alertes rupture" used to read the
      // imported stock_status alone and never moved when the user changed their
      // threshold, so the two screens disagreed on the same rows.
      const stock = computeStockAlerts(products, inventory, stockSettings, orders);
      const avgMargin = (products || []).length > 0
        ? (products || []).reduce((s, p) => s + (Number(p.gross_margin) || 0), 0) / (products || []).length
        : 0;

      result.push({ name: "Marge produit moyenne", domain: "operations", value: Math.round(avgMargin * 10) / 10, previous: null, trend: "stable", unit: "%" });
      // Counts, not trends: there is no previous snapshot to compare against.
      // Les deux compteurs ci-dessous mesurent des choses differentes et
      // s'affichent cote a cote : alertCount = produits AU OU SOUS leur seuil de
      // reapprovisionnement, outOfStockCount = produits a stock nul. Nommer les
      // deux "rupture" faisait lire "24 ruptures" a cote de "0 rupture".
      result.push({ name: `Stock dormant (${stock.dormantMonths} mois sans vente)`, domain: "operations", value: stock.dormantCount, previous: null, trend: "stable", unit: "" });
      result.push({ name: "Stock à réapprovisionner", domain: "operations", value: stock.alertCount, previous: null, trend: "stable", unit: "" });
      result.push({ name: "Produits en rupture (stock nul)", domain: "operations", value: stock.outOfStockCount, previous: null, trend: "stable", unit: "" });
    }

    // === CLIENTS === (only if customers exist)
    if ((customers || []).length > 0) {
      // One shared churn definition (status only — "a_risque" is not churn).
      const churn = churnStats(customers, orders);
      const custMonthly = monthlyAggComplete(customers, "acquisition_date", "customer_id", "count");
      const newCustomers = lastVal(custMonthly);
      const prevNewCustomers = prevVal(custMonthly);
      // Revenue per customer: the numerator covers every buyer, so the
      // denominator must too. Dividing all-customer revenue by ACTIVE customers
      // only was inflating this by 1/(share of active) — 2x at 50% churn.
      const value = customerValue(orders, customers, margin3Overall);

      result.push({ name: "Clients actifs", domain: "clients", value: churn.active, previous: null, trend: "stable", unit: "" });
      // Cumulative share of the base ever lost — named as such, because it is
      // not a rate over a period and can never go down.
      result.push({ name: "Clients perdus (cumul)", domain: "clients", value: Math.round((churn.rate || 0) * 10) / 10, previous: null, trend: "stable", unit: "%" });
      // The actionable one: attrition measured on real purchase behaviour.
      if (churn.behaviourRate !== null) {
        result.push({ name: `Inactifs depuis ${churn.inactiveMonths} mois`, domain: "clients", value: Math.round(churn.behaviourRate * 10) / 10, previous: null, trend: "stable", unit: "%" });
      }
      if (churn.atRisk > 0) {
        result.push({ name: "Clients actifs à risque", domain: "clients", value: churn.atRisk, previous: null, trend: "stable", unit: "" });
      }
      result.push({ name: "Nouveaux clients (dernier mois complet)", domain: "clients", value: newCustomers, previous: prevNewCustomers, trend: trendDir(newCustomers, prevNewCustomers), unit: "" });
      if (value.avgRevenue !== null) {
        result.push({ name: "Revenu moyen par client", domain: "clients", value: Math.round(value.avgRevenue), previous: null, trend: "stable", unit: "$" });
      }
      // A real LTV is value, not turnover — only shown when a margin is known.
      if (value.ltv !== null) {
        result.push({ name: "Valeur vie client (LTV, marge)", domain: "clients", value: Math.round(value.ltv), previous: null, trend: "stable", unit: "$" });
      }
    }

    return result;
  }, [transactions, orders, customers, campaigns, campaignDaily, products, inventory, cashflow, stockSettings.threshold, stockSettings.useReorderPoint]);

  // Merge: computed KPIs first, then LLM-generated ones that aren't duplicated
  const allKpis = useMemo(() => {
    const computedNames = new Set(computedKpis.map((k) => k.name.toLowerCase()));
    const llmExtras = (kpisLLM || []).filter((k) => !computedNames.has((k.name || "").toLowerCase()));
    return [...computedKpis, ...llmExtras];
  }, [computedKpis, kpisLLM]);

  const byDomain = useMemo(() => {
    const groups = {};
    allKpis.forEach((k) => {
      if (!groups[k.domain]) groups[k.domain] = [];
      groups[k.domain].push(k);
    });
    return groups;
  }, [allKpis]);

  const rtScores = useMemo(() => computeDomainScores({
    transactions, orders, customers, campaigns, campaignDaily, products, inventory, cashflow, company,
  }), [transactions, orders, customers, campaigns, campaignDaily, products, inventory, cashflow, company]);

  // Trend chart data: revenue, AOV, margin % by month.
  // The in-progress month is excluded — a partial month renders as a false cliff.
  const trendData = useMemo(() => {
    const revMonthly = monthlyAggComplete((transactions || []).filter((t) => t.type === "income"), "date", "amount");
    const expMonthly = monthlyAggComplete((transactions || []).filter((t) => t.type === "expense"), "date", "amount");
    const orderRevMonthly = monthlyAggComplete(orders || [], "date", "total");
    const orderCntMonthly = monthlyAggComplete(orders || [], "date", "total", "count");

    const months = new Set([
      ...revMonthly.map((m) => m.month),
      ...orderRevMonthly.map((m) => m.month),
    ]);
    return Array.from(months).sort().slice(-8).map((month) => {
      const rev = revMonthly.find((m) => m.month === month)?.val || 0;
      const exp = expMonthly.find((m) => m.month === month)?.val || 0;
      const oRev = orderRevMonthly.find((m) => m.month === month)?.val || 0;
      const oCnt = orderCntMonthly.find((m) => m.month === month)?.val || 0;
      const aov = oCnt > 0 ? oRev / oCnt : 0;
      const margin = rev > 0 ? ((rev - exp) / rev) * 100 : 0;
      return { month, revenue: Math.round(rev), aov: Math.round(aov), margin: Math.round(margin) };
    });
  }, [transactions, orders]);

  const exportKpis = () => {
    const rows = allKpis.map((k) => ({
      Domaine: domainLabels[k.domain] || k.domain,
      Indicateur: k.name,
      Valeur: k.value,
      Unite: k.unit || "",
      Precedent: k.previous ?? "",
      Tendance: k.trend || "",
    }));
    downloadCSV(`GESCOP_KPIs_${new Date().toISOString().slice(0, 10)}`, rows, {
      Domaine: "Domaine",
      Indicateur: "Indicateur",
      Valeur: "Valeur",
      Unite: "Unité",
      Precedent: "Précédent",
      Tendance: "Tendance",
    });
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Chargement…</p>;

  if (allKpis.length === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Aucun KPI disponible"
        description="Importez vos données pour voir vos indicateurs clés calculés automatiquement."
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Indicateurs clés (KPI)</h1>
          <p className="mt-1 text-muted-foreground">Indicateurs calculés en temps réel à partir de vos données, par domaine.</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportKpis} disabled={allKpis.length === 0}>
          <Download className="mr-1.5 h-4 w-4" /> Exporter CSV
        </Button>
      </div>

      {trendData.length > 0 && <KpiTrendChart data={trendData} />}

      <div>
        <h2 className="mb-1 text-lg font-semibold">Vue d'ensemble des domaines</h2>
        <p className="mb-4 text-sm text-muted-foreground">Du plus faible au plus fort · score sur 100</p>
        <DomainScoreList
          domains={Object.entries(domainLabels)
            .filter(([key]) => rtScores[key])
            .map(([key, label]) => ({
              key,
              label,
              score: rtScores[key].score,
              measured: rtScores[key].measured !== false,
              trend: rtScores[key].trend,
              explanation: rtScores[key].explanation,
            }))}
        />
        <DomainScoreLegend />
      </div>

      {Object.entries(domainLabels).map(([domain, label]) => {
        const items = byDomain[domain];
        if (!items || items.length === 0) return null;
        return (
          <div key={domain}>
            <h2 className="mb-4 text-lg font-semibold">{label}</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {items.map((k, idx) => (
                <KpiCard key={`${k.name}-${idx}`} kpi={k} domainColor={domainColors[domain]} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}