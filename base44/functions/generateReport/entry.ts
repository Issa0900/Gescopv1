import { createFixedClientFromRequest as createClientFromRequest } from "../../shared/client.ts";
import { buildBusinessContext } from "../../shared/businessContext.ts";

function getPeriodRanges(type, now) {
  if (type === "quotidien") {
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const curEnd = new Date(today);
    curEnd.setHours(23, 59, 59, 999);
    const prevEnd = new Date(today);
    prevEnd.setDate(prevEnd.getDate() - 1);
    prevEnd.setHours(23, 59, 59, 999);
    const prevStart = new Date(prevEnd);
    prevStart.setHours(0, 0, 0, 0);
    return {
      current: { start: today, end: curEnd, label: today.toLocaleDateString("fr-CA") },
      previous: { start: prevStart, end: prevEnd, label: prevStart.toLocaleDateString("fr-CA") },
    };
  }
  if (type === "hebdomadaire") {
    const curEnd = new Date(now);
    curEnd.setHours(23, 59, 59, 999);
    const curStart = new Date(curEnd);
    curStart.setDate(curStart.getDate() - 6);
    curStart.setHours(0, 0, 0, 0);
    const prevEnd = new Date(curStart);
    prevEnd.setDate(prevEnd.getDate() - 1);
    prevEnd.setHours(23, 59, 59, 999);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - 6);
    prevStart.setHours(0, 0, 0, 0);
    return {
      current: {
        start: curStart,
        end: curEnd,
        label: `${curStart.toLocaleDateString("fr-CA")} → ${curEnd.toLocaleDateString("fr-CA")}`,
      },
      previous: {
        start: prevStart,
        end: prevEnd,
        label: `${prevStart.toLocaleDateString("fr-CA")} → ${prevEnd.toLocaleDateString("fr-CA")}`,
      },
    };
  }
  // mensuel
  const curEnd = new Date(now);
  const curStart = new Date(curEnd.getFullYear(), curEnd.getMonth(), 1);
  const prevEnd = new Date(curStart.getFullYear(), curStart.getMonth(), 0);
  prevEnd.setHours(23, 59, 59, 999);
  const prevStart = new Date(prevEnd.getFullYear(), prevEnd.getMonth(), 1);
  return {
    current: {
      start: curStart,
      end: curEnd,
      label: curStart.toLocaleDateString("fr-CA", { month: "long", year: "numeric" }),
    },
    previous: {
      start: prevStart,
      end: prevEnd,
      label: prevStart.toLocaleDateString("fr-CA", { month: "long", year: "numeric" }),
    },
  };
}

function computeMetrics(ctx, start, end) {
  const inRange = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d >= start && d <= end;
  };

  const txns = ctx.transactions.filter((t) => inRange(t.date));
  const incomes = txns.filter((t) => t.type === "income").reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const expenses = txns.filter((t) => t.type === "expense").reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const margin = incomes - expenses;
  const marginPct = incomes > 0 ? Math.round((margin / incomes) * 100) : 0;

  const orders = ctx.orders.filter((o) => inRange(o.date));
  const orderCount = orders.length;
  const orderRevenue = orders.reduce((s, o) => s + (Number(o.total) || Number(o.revenue) || 0), 0);
  const aov = orderCount > 0 ? Math.round(orderRevenue / orderCount) : 0;
  const returns = orders.filter((o) => o.return_status && o.return_status !== "aucun");
  const returnRate = orderCount > 0 ? Math.round((returns.length / orderCount) * 100) : 0;

  const campaigns = ctx.campaigns.filter((c) => inRange(c.start_date) || inRange(c.end_date));
  const spend = campaigns.reduce((s, c) => s + (Number(c.spend) || 0), 0);
  const campRevenue = campaigns.reduce((s, c) => s + (Number(c.revenue) || 0), 0);
  const roas = spend > 0 ? Math.round((campRevenue / spend) * 100) / 100 : 0;

  const newCustomers = ctx.customers.filter((c) => inRange(c.acquisition_date)).length;

  const cf = ctx.cashflow
    .filter((c) => inRange(c.date))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  const cash = cf[0] ? Number(cf[0].closing_cash) || 0 : 0;

  return {
    revenus: incomes,
    depenses: expenses,
    marge: margin,
    margePct: marginPct,
    commandes: orderCount,
    revenuCommandes: orderRevenue,
    panierMoyen: aov,
    tauxRetour: returnRate,
    tresorerie: cash,
    marketing: spend,
    roas: roas,
    nouveauxClients: newCustomers,
  };
}

function buildComparison(ctx, type, now) {
  const ranges = getPeriodRanges(type, now);
  const current = computeMetrics(ctx, ranges.current.start, ranges.current.end);
  const previous = computeMetrics(ctx, ranges.previous.start, ranges.previous.end);

  const labels = {
    revenus: "Revenus",
    depenses: "Dépenses",
    marge: "Marge brute",
    margePct: "Marge %",
    commandes: "Commandes",
    revenuCommandes: "Revenu commandes",
    panierMoyen: "Panier moyen",
    tauxRetour: "Taux de retour",
    tresorerie: "Trésorerie",
    marketing: "Dépenses marketing",
    roas: "ROAS",
    nouveauxClients: "Nouveaux clients",
  };
  const units = {
    revenus: "$",
    depenses: "$",
    marge: "$",
    margePct: "%",
    commandes: "",
    revenuCommandes: "$",
    panierMoyen: "$",
    tauxRetour: "%",
    tresorerie: "$",
    marketing: "$",
    roas: "",
    nouveauxClients: "",
  };
  // For these keys, lower is better (a decrease is positive)
  const invertKeys = ["depenses", "tauxRetour", "marketing"];

  const metrics = Object.keys(labels).map((key) => {
    const cur = Number(current[key]) || 0;
    const prev = Number(previous[key]) || 0;
    const delta = cur - prev;
    const deltaPct = prev !== 0 ? Math.round((delta / Math.abs(prev)) * 1000) / 10 : cur !== 0 ? 100 : 0;
    const invert = invertKeys.includes(key);
    let trend = "stable";
    if (delta > 0) trend = invert ? "down" : "up";
    else if (delta < 0) trend = invert ? "up" : "down";
    return {
      key,
      label: labels[key],
      current: cur,
      previous: prev,
      delta,
      deltaPct,
      trend,
      unit: units[key],
      invert,
    };
  });

  return {
    currentLabel: ranges.current.label,
    previousLabel: ranges.previous.label,
    currentRange: { start: ranges.current.start.toISOString(), end: ranges.current.end.toISOString() },
    previousRange: { start: ranges.previous.start.toISOString(), end: ranges.previous.end.toISOString() },
    metrics,
  };
}

function comparisonToText(comparison) {
  const lines = comparison.metrics.map((m) => {
    const arrow = m.trend === "up" ? "↑" : m.trend === "down" ? "↓" : "→";
    const sign = m.delta > 0 ? "+" : "";
    return `${m.label}: ${m.current}${m.unit} (précédent ${m.previous}${m.unit}, ${sign}${m.delta}${m.unit} ${arrow} ${m.deltaPct}%)`;
  });
  return lines.join("\n");
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Non autorisé" }, { status: 401 });

    const body = await req.json();
    const { type, comparison: wantComparison } = body;
    if (!type) return Response.json({ error: "type requis" }, { status: 400 });

    const ctx = await buildBusinessContext(base44);
    if (!ctx.company) {
      return Response.json({ error: "Configurez votre entreprise d'abord." }, { status: 400 });
    }

    const now = new Date();
    const period =
      type === "quotidien"
        ? now.toLocaleDateString("fr-CA")
        : type === "hebdomadaire"
        ? `semaine du ${now.toLocaleDateString("fr-CA")}`
        : now.toLocaleDateString("fr-CA", { month: "long", year: "numeric" });

    const reportSpecs = {
      quotidien: `Génère le rapport quotidien: résumé de l'état général, évolution et événements importants; performance en ventes, finance et opérations; principaux risques et opportunités; actualité externe pertinente; 3 à 5 actions prioritaires; automatisations disponibles.`,
      hebdomadaire: `Génère le rapport hebdomadaire: compare la semaine actuelle, la semaine précédente et la tendance historique sur la performance, les KPI, les anomalies, les risques, les opportunités, le marché, la concurrence, les actions réalisées, les actions restantes et les recommandations.`,
      mensuel: `Génère le rapport mensuel: approfondit les résultats financiers, les ventes, les clients, le marketing, les opérations, la trésorerie, la productivité, les risques, les opportunités et l'évolution externe. Termine par un résumé exécutif automatique.`,
    };

    const comparisonData = wantComparison ? buildComparison(ctx, type, now) : null;
    const comparisonBlock = comparisonData
      ? `\n\n=== COMPARAISON PÉRIODE CONTRE PÉRIODE (données calculées) ===\nPériode actuelle: ${comparisonData.currentLabel}\nPériode précédente: ${comparisonData.previousLabel}\n${comparisonToText(comparisonData)}\n\nAnalyse l'évolution de chaque indicateur: identifie les progressions et régressions significatives, et propose une explication probable pour les variations les plus marquantes.`
      : "";

    const prompt = `Tu es GESCOP. ${reportSpecs[type] || reportSpecs.quotidien}
${comparisonBlock}

${ctx.context}

Toutes les valeurs textuelles (résumé, contenu, sections, insights, etc.) doivent être rédigées en français.

Réponds avec un JSON contenant: summary (résumé exécutif en 2-3 phrases), content (le rapport complet en markdown bien structuré avec titres et sections), sections (un objet où chaque clé est un nom de section et la valeur est le contenu de cette section)${comparisonData ? ", evolutionSummary (un texte de 3-5 phrases qui analyse l'évolution des indicateurs clés entre la période actuelle et la période précédente), keyInsights (un tableau de 3 à 5 chaînes, chaque chaîne étant un insight sur l'évolution marquante d'un indicateur)" : ""}.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          summary: { type: "string" },
          content: { type: "string" },
          sections: { type: "object" },
          evolutionSummary: { type: "string" },
          keyInsights: { type: "array", items: { type: "string" } },
        },
      },
    });

    const data = typeof result === "string" ? JSON.parse(result) : result;

    const report = await base44.entities.Report.create({
      type,
      period,
      summary: data.summary || "",
      content: data.content || "",
      sections: data.sections || {},
      comparison: comparisonData
        ? {
            ...comparisonData,
            evolutionSummary: data.evolutionSummary || "",
            keyInsights: data.keyInsights || [],
          }
        : null,
    });

    return Response.json({ report, summary: data.summary, content: data.content });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
