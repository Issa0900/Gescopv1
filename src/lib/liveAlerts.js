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
import { warnIfDataMissing } from "@/lib/core/dataCompleteness";
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
  validSalesOrders,
} from "@/lib/metrics";

function alert(level, category, title, message) {
  return { id: `live-${category}-${title}`, level, category, title, message, live: true, status: "non_lue" };
}

export function computeLiveAlerts(data) {
  warnIfDataMissing("computeLiveAlerts", data, [
    "transactions", "orders", "customers", "campaignDaily",
    "products", "inventory", "cashflow", "expenses", "company",
  ]);
  const { transactions, orders, customers, campaignDaily, products, inventory, cashflow, expenses, company } = data;
  const out = [];

  const incomes = (transactions || []).filter((t) => t.type === "income");
  const txnExpenses = (transactions || []).filter((t) => t.type === "expense");
  const revMonthly = monthlyAggComplete(incomes, "date", "amount");
  // Costs can live in expense-typed Transaction rows, in the dedicated
  // Expense entity, or both - both are read so the runway/margin alerts
  // above never miss real costs recorded in the other one.
  const expMonthly = monthlyAggComplete(
    [...txnExpenses, ...(expenses || []).map((e) => ({ ...e, amount: Number(e.amount) || 0 }))],
    "date", "amount"
  );

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
  // pas "+100 %" - la lecture relative déclenchait des alertes sur du bruit.
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

  // =====================================================================
  // PHASE 4 : INTERCONNEXIONS MÉTIER SÉMANTIQUES (Croisement de domaines)
  // =====================================================================
  
  // 1. Marketing -> Finance : La baisse de l'efficacité publicitaire détruit la marge
  const roasPrevVal = previousRoasWindow(spendM, revM, 3);
  const roasTrendVal = trendPct(roas, roasPrevVal);
  if (roasTrendVal !== null && roasTrendVal < -15 && marginDrop !== null && marginDrop < -2) {
    out.push(
      alert(
        "critique",
        "Finance & Marketing",
        "Le marketing dégrade votre marge nette",
        `L'inefficacité publicitaire (ROAS en baisse de ${Math.abs(roasTrendVal).toFixed(0)}%) pèse directement sur votre rentabilité globale (marge en baisse de ${Math.abs(marginDrop).toFixed(1)} points). Optimisez vos campagnes en urgence.`
      )
    );
  }

  // 2. Produits -> Ventes : Rupture sur les produits phares
  // Identifier si les ruptures concernent les produits qui génèrent le plus de CA
  if (ruptures.length > 0 && orders && orders.length > 0) {
    // Refunded orders' money went back to the customer - counting them here
    // could crown a heavily-returned product "top seller" and misdirect this alert.
    const salesOrders = validSalesOrders(orders);
    const revenueByProduct = {};
    salesOrders.forEach(o => {
      const pid = o.product_id;
      // total_revenue is the field the import pipeline actually populates.
      if (pid) revenueByProduct[pid] = (revenueByProduct[pid] || 0) + (Number(o.total_revenue) || Number(o.total) || 0);
    });
    // Trier les produits en rupture par leur revenu historique
    const rupturesWithRev = ruptures.map(r => ({ ...r, rev: revenueByProduct[r.product_id] || 0 }));
    rupturesWithRev.sort((a, b) => b.rev - a.rev);

    // Si le produit en rupture générait des revenus significatifs (> 5% du revenu total ou juste un top 5 absolu)
    const totalOrderRev = salesOrders.reduce((sum, o) => sum + (Number(o.total_revenue) || Number(o.total) || 0), 0);
    if (totalOrderRev > 0 && rupturesWithRev[0].rev > (totalOrderRev * 0.02)) {
      out.push(
        alert(
          "critique",
          "Ventes & Opérations",
          "Rupture sur un produit phare (Top Ventes)",
          `Le produit "${rupturesWithRev[0].product_name}" est en rupture de stock. Il représente historiquement une part importante de vos revenus. L'impact sur les Ventes sera immédiat.`
        )
      );
    }
  }

  // 3. Clients -> Trésorerie : L'attrition menace le runway
  if (churn.behaviourRate !== null && churn.behaviourRate >= 30 && latestCash !== null && recentBurn !== null && recentBurn > 0) {
    const runwayCheck = runwayMonths(latestCash, recentBurn);
    if (runwayCheck < 6) {
      out.push(
        alert(
          "critique",
          "Trésorerie & Clients",
          "Attrition dangereuse pour la trésorerie",
          `Forte perte d'acheteurs actifs (${Math.round(churn.behaviourRate)}%) alors que votre couverture de trésorerie est tendue (${runwayCheck.toFixed(1)} mois). Priorité absolue : réactiver vos clients existants.`
        )
      );
    }
  }

  return out;
}