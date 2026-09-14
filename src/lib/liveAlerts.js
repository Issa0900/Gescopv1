// Alerts derived live from current data, so the alert centre reflects the
// business right now instead of only what the last AI analysis happened to save.
// Same period rules as the scores: recent windows, complete months only.

import {
  monthlyAggComplete,
  trendPct,
  sumLast,
  sumPrev,
  hasWindow,
} from "@/lib/periods";
import { getStockAlertSettings, computeStockAlerts } from "@/lib/stockAlerts";
import {
  aggregateMarginPct,
  previousMarginPct,
  marginDeltaPoints,
  netBurnRate,
  runwayMonths,
  latestCashBalance,
  churnStats,
  roasWindow,
  previousRoasWindow,
} from "@/lib/metrics";

function alert(level, category, title, message) {
  return { id: `live-${category}-${title}`, level, category, title, message, live: true, status: "non_lue" };
}

export function computeLiveAlerts(data) {
  const { transactions, orders, customers, campaignDaily, products, inventory, cashflow, company } = data;
  const out = [];

  const incomes = (transactions || []).filter((t) => t.type === "income");
  const txnExpenses = (transactions || []).filter((t) => t.type === "expense");
  const revMonthly = monthlyAggComplete(incomes, "date", "amount");
  const expMonthly = monthlyAggComplete(txnExpenses, "date", "amount");

  // --- Trésorerie : runway sur le burn NET ---
  // Une entreprise rentable n'a pas de problème d'autonomie : comparer le solde
  // aux dépenses BRUTES déclenchait une alerte critique sur une société qui
  // encaissait plus qu'elle ne dépensait.
  const latestCash = latestCashBalance(cashflow);
  const recentBurn = netBurnRate(revMonthly, expMonthly, 3);
  if (latestCash !== null && recentBurn !== null && recentBurn > 0) {
    const runway = runwayMonths(latestCash, recentBurn);
    if (runway < 3) {
      out.push(
        alert(
          "critique",
          "Trésorerie",
          "Trésorerie sous 3 mois de couverture",
          `Solde de ${Math.round(latestCash).toLocaleString("fr-CA")} $ pour une sortie moyenne de ${Math.round(recentBurn).toLocaleString("fr-CA")} $/mois, soit ${runway.toFixed(1)} mois de marge de manœuvre.`
        )
      );
    } else if (runway < 6) {
      out.push(
        alert(
          "important",
          "Trésorerie",
          "Couverture de trésorerie à surveiller",
          `${runway.toFixed(1)} mois de couverture au rythme de dépenses actuel.`
        )
      );
    }
  }
  if (latestCash < 0) {
    out.push(alert("critique", "Trésorerie", "Solde de trésorerie négatif", `Solde actuel : ${Math.round(latestCash).toLocaleString("fr-CA")} $.`));
  }

  // --- Finance : marge agrégée sur 3 mois complets ---
  // Agrégée, pas une moyenne de pourcentages mensuels : un mois à 2 000 $ de
  // revenus ne doit pas peser autant qu'un mois à 100 000 $.
  const recentMargin = aggregateMarginPct(revMonthly, expMonthly, 3);
  const priorMargin = previousMarginPct(revMonthly, expMonthly, 3);
  if (recentMargin !== null) {
    if (recentMargin < 0) {
      out.push(alert("critique", "Finance", "Marge négative sur 3 mois", `La marge sur les 3 derniers mois complets est de ${recentMargin.toFixed(0)} %.`));
    } else if (recentMargin < 10) {
      out.push(alert("important", "Finance", "Marge faible", `Marge de ${recentMargin.toFixed(0)} % sur les 3 derniers mois complets.`));
    }
  }
  // Variation de marge exprimée en POINTS : passer de 2 % à 4 % est +2 points,
  // pas "+100 %" — la lecture relative déclenchait des alertes sur du bruit.
  const marginDrop = marginDeltaPoints(recentMargin, priorMargin);
  if (marginDrop !== null && marginDrop < -5) {
    out.push(
      alert(
        "important",
        "Finance",
        "Recul de la marge",
        `La marge est passée de ${priorMargin.toFixed(0)} % à ${recentMargin.toFixed(0)} % (${marginDrop.toFixed(1)} points) entre les deux derniers trimestres complets.`
      )
    );
  }

  // --- Ventes ---
  const ordRev = monthlyAggComplete(orders || [], "date", "total");
  if (hasWindow(ordRev, 3)) {
    const rev3 = sumLast(ordRev, 3);
    const revPrev3 = sumPrev(ordRev, 3);
    const salesTrend = trendPct(rev3, revPrev3);
    if (salesTrend !== null && salesTrend < -20) {
      out.push(
        alert(
          "critique",
          "Ventes",
          "Recul marqué du chiffre d'affaires",
          `Les ventes des 3 derniers mois complets reculent de ${Math.abs(salesTrend).toFixed(0)} % par rapport aux 3 mois précédents.`
        )
      );
    } else if (salesTrend !== null && salesTrend < -8) {
      out.push(alert("important", "Ventes", "Ventes en repli", `Repli de ${Math.abs(salesTrend).toFixed(0)} % sur 3 mois.`));
    }
  }

  // --- Opérations : même définition de rupture que la page Produits et les KPI,
  // seuil de l'entreprise compris. Ces alertes ignoraient le seuil réglé par
  // l'utilisateur et ne lisaient que le statut importé. ---
  const stock = computeStockAlerts(products, inventory, getStockAlertSettings(company), orders);
  const ruptures = stock.rows.filter((r) => r.status === "rupture");
  const proches = stock.alerts.filter((r) => r.status !== "rupture");
  const dormants = stock.rows.filter((r) => r.dormant);
  if (ruptures.length > 0) {
    out.push(
      alert(
        ruptures.length >= 10 ? "critique" : "important",
        "Opérations",
        `${ruptures.length} produit${ruptures.length > 1 ? "s" : ""} en rupture de stock`,
        "Ventes perdues tant que le réapprovisionnement n'est pas fait."
      )
    );
  }
  if (proches.length >= 10) {
    out.push(alert("modere", "Opérations", `${proches.length} produits sous votre seuil d'alerte`, "À réapprovisionner pour éviter la rupture."));
  }
  if (dormants.length > 0) {
    const dormantValue = dormants.reduce((s, r) => s + (Number(r.snapshot?.inventory_value) || 0), 0);
    out.push(
      alert(
        "modere",
        "Opérations",
        `${dormants.length} produits dormants (aucune vente depuis ${stock.dormantMonths} mois)`,
        dormantValue > 0
          ? `${Math.round(dormantValue).toLocaleString("fr-CA")} $ de capital immobilisé.`
          : "Capital immobilisé sans rotation."
      )
    );
  }

  // --- Clients : churn (définition unique, partagée avec les KPI et l'audit) ---
  const churn = churnStats(customers, orders);
  if (churn.rate !== null) {
    if (churn.rate >= 20) {
      out.push(alert("critique", "Clients", "Taux d'attrition élevé", `${churn.rate.toFixed(0)} % des clients sont inactifs ou perdus (${churn.churned} sur ${churn.total}).`));
    } else if (churn.rate >= 10) {
      out.push(alert("important", "Clients", "Attrition à surveiller", `${churn.rate.toFixed(0)} % des clients sont inactifs ou perdus.`));
    }
    if (churn.atRisk > 0) {
      out.push(alert("important", "Clients", `${churn.atRisk} clients actifs à risque de départ`, "Risque de départ élevé : une relance est recommandée."));
    }
  }
  // Attrition réelle, mesurée sur les achats : celle-là peut s'améliorer, donc
  // elle mérite une alerte séparée du cumul historique.
  if (churn.behaviourRate !== null && churn.behaviourRate >= 40 && churn.buyers >= 10) {
    out.push(alert(
      "important",
      "Clients",
      `${churn.lapsed} clients n'ont plus commandé depuis ${churn.inactiveMonths} mois`,
      `${Math.round(churn.behaviourRate)} % des clients ayant déjà commandé se sont arrêtés : une campagne de réactivation est le levier le plus rentable.`,
    ));
  }

  // --- Marketing : ROAS ---
  const spendM = monthlyAggComplete(campaignDaily || [], "date", "spend");
  const revM = monthlyAggComplete(campaignDaily || [], "date", "revenue");
  const roas = roasWindow(spendM, revM, 3);
  if (roas !== null) {
    const roasPrev = previousRoasWindow(spendM, revM, 3);
    const roasTrend = trendPct(roas, roasPrev);
    if (roas < 1) {
      out.push(alert("critique", "Marketing", "ROAS inférieur à 1", `Chaque dollar investi rapporte ${roas.toFixed(2)} $ : les campagnes détruisent de la valeur.`));
    } else if (roasTrend !== null && roasTrend < -25) {
      out.push(
        alert(
          "important",
          "Marketing",
          "Rentabilité publicitaire en baisse",
          `ROAS passé de ${roasPrev.toFixed(1)}x à ${roas.toFixed(1)}x sur les 3 derniers mois complets.`
        )
      );
    }
  }

  return out;
}