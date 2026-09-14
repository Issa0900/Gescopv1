import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { buildBusinessContext } from "../../shared/businessContext.ts";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Non autorisé" }, { status: 401 });

    const ctx = await buildBusinessContext(base44);
    const { company, transactions, context, totals } = ctx;

    if (!company) {
      return Response.json({ error: "Veuillez configurer votre entreprise d'abord." }, { status: 400 });
    }
    if (!transactions || transactions.length < 3) {
      return Response.json({
        error: "Données insuffisantes. Importez au moins quelques transactions avant l'analyse.",
      }, { status: 400 });
    }

    const prompt = `Tu es GESCOP, un système intelligent de pilotage pour PME. Analyse les données multi-sources de cette entreprise et produis un diagnostic complet en croisant toutes les sources disponibles.

${context}

RÈGLES ABSOLUES SUR LES CHIFFRES (priorité sur tout le reste)
Tu n'es PAS autorisé à inventer, estimer au hasard, extrapoler ou compléter un chiffre.
1. Tout nombre que tu écris doit soit apparaître littéralement dans les DONNÉES ci-dessus, soit être le résultat d'un calcul simple (somme, différence, moyenne, ratio, pourcentage de variation) effectué UNIQUEMENT sur des nombres présents ci-dessus.
2. Dans chaque description, explanation ou analysis qui cite un chiffre, indique entre parenthèses son origine : la valeur source ou le calcul. Exemple : « marge de 38 % (CA 120 000 $ - coûts 74 400 $) / 120 000 $ ».
3. Si une donnée nécessaire est absente ou insuffisante, tu NE produis PAS l'élément concerné. N'utilise aucune valeur de référence sectorielle, aucune moyenne de marché, aucun ordre de grandeur « typique ».
4. financial_impact : mets 0 si le montant ne peut pas être calculé depuis les données. Ne mets jamais un montant arrondi « plausible ».
5. KPI : n'inclus un KPI que si sa value est calculable depuis les données. previous doit être la valeur réellement observée sur la période précédente, sinon égale à value. target uniquement s'il provient des objectifs fournis, sinon 0.
6. deviation_pct, probability, score, confidence_pct : ce sont des appréciations, pas des mesures — n'y insère aucun montant en dollars.
7. Signaux externes : décris uniquement des tendances qualitatives liées au secteur et à la localisation. N'y inscris aucun chiffre de marché, part de marché, ni statistique externe.
Un élément mieux vaut absent que chiffré à l'aveugle.

INSTRUCTIONS
Tu as accès aux données de: finance (transactions), ventes (commandes), clients, produits, inventaire, fournisseurs, achats, marketing (campagnes + quotidien), paie, dépenses, trésorerie, interactions clients, concurrents, objectifs et événements. Croise ces sources pour détecter des patterns que une seule source ne révélerait pas.

1. Calcule un score de santé global sur 100 et un score pour chacune des 9 dimensions: finance, ventes, tresorerie, clients, operations, marketing, productivite, risques, croissance. Chaque score entre 0 et 100. Pour chaque dimension donne aussi une tendance (up/down/stable) et une explication courte. Base les scores sur les données réelles, pas sur des suppositions.

2. Détecte les anomalies en croisant les sources. Cherche notamment:
   - Dépenses inhabituelles ou montants aberrants (transactions)
   - Baisse soudaine des ventes sur une période (commandes mensuelles)
   - Hausse anormale des remboursements (commandes return_status)
   - Hausse des plaintes clients (interactions type=plainte)
   - Dépenses marketing en hausse plus rapide que les ventes (campagnes vs commandes)
   - Coûts fournisseurs en hausse (achats mensuels)
   - Abonnements récurrents potentiellement inutilisés (dépenses recurring=true)
   - Doublons ou valeurs incohérentes
   Pour chaque anomalie: title, description, dimension, severity (critique/important/modere/faible), deviation_pct, explanation, financial_impact (impact financier mensuel estimé en dollars CAD, négatif pour une perte, positif pour un gain, 0 si non applicable), confidence_pct (0-100).

3. Identifie les risques en croisant les sources. Cherche notamment:
   - Tension de trésorerie future (cashflow trend + accounts_payable)
   - Concentration excessive de la clientèle (top 5 clients % du CA)
   - Hausse du CAC et dégradation du ROAS (marketing)
   - Fournisseurs avec délais croissants ou qualité en baisse
   - Hausse des coûts salariaux (paie)
   - Stock dormant immobilisant de la trésorerie (produits + inventaire)
   - Produits proches de la rupture (inventaire)
   - Clients auparavant actifs devenant inactifs (churn)
   Pour chaque risque: title, description, category, probability (0-100), impact (faible/moyen/eleve), urgency (faible/moyenne/elevee), confidence (faible/moyenne/elevee), horizon, score (0-100), financial_impact (toujours négatif ou 0), confidence_pct (0-100).

4. Identifie les opportunités en croisant les sources. Cherche notamment:
   - Produits très rentables mais sous-commercialisés (marge élevée + ventes faibles)
   - Segments clients à fort potentiel non exploités
   - Campagnes très rentables à scale (ROAS élevé)
   - Réallocation budgétaire marketing vers les canaux performants
   - Produits à fort volume mais marge optimisable
   Pour chaque opportunité: title, description, category, potential (faible/moyen/eleve), probability (0-100), horizon, confidence (faible/moyenne/elevee), score (0-100), financial_impact (toujours positif ou 0), confidence_pct (0-100).

5. Pour chaque risque et opportunité majeur, produis une recommandation structurée et actionnable: title, situation (que se passe-t-il), analysis (pourquoi, avec référence aux données), impact (quel effet possible), action (que faire concrètement), priority (faible/moyenne/elevee/urgente), source_type (risk/opportunity/anomaly), financial_impact (impact financier estimé de l'action en dollars CAD), confidence_pct (0-100).

6. Sélectionne les KPI pertinents, organisés en 4 domaines (finance, ventes, operations, marketing). Inclus des KPI calculés à partir des données: CA total, marge brute %, panier moyen, taux de retour, ROAS, CAC, taux de churn, concentration client, valeur inventaire, taux de plaintes, coût paie mensuel. Pour chaque KPI: name, domain, value, target, previous, trend (up/down/stable), unit.

Toutes les valeurs textuelles (titres, descriptions, explications, analyses, actions, etc.) doivent être rédigées en français.

Réponds UNIQUEMENT avec un JSON valide respectant ce schéma. Aucun texte hors JSON.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      // The default fast model skimmed this long multi-source brief and declared
      // whole sections "données absentes" — trésorerie, clients, marketing — even
      // though the figures were right there in the prompt. A stronger model
      // actually reads them, which is the difference between a diagnostic and a
      // page of false gaps.
      model: "gemini_3_1_pro",
      response_json_schema: {
        type: "object",
        properties: {
          health_score: { type: "number" },
          dimensions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                score: { type: "number" },
                trend: { type: "string" },
                explanation: { type: "string" },
              },
            },
          },
          anomalies: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                dimension: { type: "string" },
                severity: { type: "string" },
                deviation_pct: { type: "number" },
                explanation: { type: "string" },
                financial_impact: { type: "number" },
                confidence_pct: { type: "number" },
              },
            },
          },
          risks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                category: { type: "string" },
                probability: { type: "number" },
                impact: { type: "string" },
                urgency: { type: "string" },
                confidence: { type: "string" },
                horizon: { type: "string" },
                score: { type: "number" },
                financial_impact: { type: "number" },
                confidence_pct: { type: "number" },
              },
            },
          },
          opportunities: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                category: { type: "string" },
                potential: { type: "string" },
                probability: { type: "number" },
                horizon: { type: "string" },
                confidence: { type: "string" },
                score: { type: "number" },
                financial_impact: { type: "number" },
                confidence_pct: { type: "number" },
              },
            },
          },
          recommendations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                situation: { type: "string" },
                analysis: { type: "string" },
                impact: { type: "string" },
                action: { type: "string" },
                priority: { type: "string" },
                source_type: { type: "string" },
                financial_impact: { type: "number" },
                confidence_pct: { type: "number" },
              },
            },
          },
          kpis: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                domain: { type: "string" },
                value: { type: "number" },
                target: { type: "number" },
                previous: { type: "number" },
                trend: { type: "string" },
                unit: { type: "string" },
              },
            },
          },
        },
      },
    });

    let data;
    try {
      data = typeof result === "string" ? JSON.parse(result) : result;
    } catch {
      data = null;
    }
    // Nothing usable came back: stop here, WITHOUT touching the existing
    // analysis. Wiping first meant a failed model call left the dashboard empty
    // and the diagnostic looked like it never completed.
    if (!data || !Array.isArray(data.dimensions) || data.dimensions.length === 0) {
      return Response.json({
        error: "L'analyse n'a pas abouti : le moteur d'IA n'a pas renvoyé de diagnostic exploitable. "
          + "Votre analyse précédente a été conservée. Relancez le diagnostic.",
      }, { status: 502 });
    }

    // The model answers with labels ("Finance", "Trésorerie"); the app reads
    // canonical keys ("finance", "tresorerie"). Unnormalized, every score was
    // stored under a key nothing looked up, so trends read as absent.
    const dimKey = (name) => String(name || "")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().trim().replace(/\s+/g, "_");

    // Only now that we hold a valid diagnostic: clear the previous artifacts.
    // Anomaly / Risk / Opportunity / Kpi are produced ONLY by this function, so
    // wiping them wholesale is safe. Recommendation is already scoped by source_type
    // because users can create their own.
    await base44.entities.Anomaly.deleteMany({});
    await base44.entities.Risk.deleteMany({});
    await base44.entities.Opportunity.deleteMany({});
    await base44.entities.Recommendation.deleteMany({ source_type: { $in: ["risk", "opportunity", "anomaly"] } });
    await base44.entities.Kpi.deleteMany({});
    // ExternalSignal n'est plus touché ici : le radar externe a sa propre
    // fonction (scanExternalRadar), déclenchée à la demande avec recherche web
    // et sources consultables. Le diagnostic ne doit plus écraser ces signaux.

    // Update company health
    const dimScores = {};
    (data.dimensions || []).forEach((d) => {
      dimScores[dimKey(d.name)] = { score: d.score, trend: d.trend, explanation: d.explanation };
    });
    await base44.entities.Company.update(company.id, {
      health_score: data.health_score,
      dimension_scores: dimScores,
      last_analysis_date: new Date().toISOString(),
    });

    // Create anomalies
    if (data.anomalies && data.anomalies.length) {
      for (let i = 0; i < data.anomalies.length; i += 100) {
        const batch = data.anomalies.slice(i, i + 100).map((a) => ({
          title: a.title,
          description: a.description || "",
          dimension: a.dimension || "",
          severity: a.severity || "modere",
          deviation_pct: a.deviation_pct || 0,
          explanation: a.explanation || "",
          financial_impact: a.financial_impact || 0,
          confidence_pct: a.confidence_pct || 0,
          status: "nouveau",
          detected_date: new Date().toISOString().slice(0, 10),
        }));
        await base44.entities.Anomaly.bulkCreate(batch);
      }
    }

    // Create risks
    if (data.risks && data.risks.length) {
      for (let i = 0; i < data.risks.length; i += 100) {
        const batch = data.risks.slice(i, i + 100).map((r) => ({
          title: r.title,
          description: r.description || "",
          category: r.category || "",
          probability: r.probability || 50,
          impact: r.impact || "moyen",
          urgency: r.urgency || "moyenne",
          confidence: r.confidence || "moyenne",
          horizon: r.horizon || "",
          score: r.score || 50,
          financial_impact: r.financial_impact || 0,
          confidence_pct: r.confidence_pct || 0,
          status: "actif",
        }));
        await base44.entities.Risk.bulkCreate(batch);
      }
    }

    // Create opportunities
    if (data.opportunities && data.opportunities.length) {
      for (let i = 0; i < data.opportunities.length; i += 100) {
        const batch = data.opportunities.slice(i, i + 100).map((o) => ({
          title: o.title,
          description: o.description || "",
          category: o.category || "",
          potential: o.potential || "moyen",
          probability: o.probability || 50,
          horizon: o.horizon || "",
          confidence: o.confidence || "moyenne",
          score: o.score || 50,
          financial_impact: o.financial_impact || 0,
          confidence_pct: o.confidence_pct || 0,
          status: "nouvelle",
        }));
        await base44.entities.Opportunity.bulkCreate(batch);
      }
    }

    // Create recommendations
    if (data.recommendations && data.recommendations.length) {
      for (let i = 0; i < data.recommendations.length; i += 100) {
        const batch = data.recommendations.slice(i, i + 100).map((r) => ({
          title: r.title,
          situation: r.situation || "",
          analysis: r.analysis || "",
          impact: r.impact || "",
          action: r.action || "",
          priority: r.priority || "moyenne",
          source_type: r.source_type || "risk",
          financial_impact: r.financial_impact || 0,
          confidence_pct: r.confidence_pct || 0,
          status: "nouvelle",
        }));
        await base44.entities.Recommendation.bulkCreate(batch);
      }
    }

    // Create KPIs
    if (data.kpis && data.kpis.length) {
      for (let i = 0; i < data.kpis.length; i += 100) {
        const batch = data.kpis.slice(i, i + 100).map((k) => ({
          name: k.name,
          domain: k.domain || "finance",
          value: k.value || 0,
          target: k.target || 0,
          previous: k.previous || 0,
          trend: k.trend || "stable",
          unit: k.unit || "",
          period: new Date().toISOString().slice(0, 7),
        }));
        await base44.entities.Kpi.bulkCreate(batch);
      }
    }

    // Create alerts for critical items
    const alerts = [];
    (data.anomalies || []).filter((a) => a.severity === "critique").forEach((a) =>
      alerts.push({ title: a.title, message: a.description || a.explanation || "", level: "critique", category: "anomalie", status: "non_lue" })
    );
    (data.risks || []).filter((r) => (r.score || 0) >= 75).forEach((r) =>
      alerts.push({ title: r.title, message: r.description || "", level: "important", category: "risque", status: "non_lue" })
    );
    (data.opportunities || []).filter((o) => (o.score || 0) >= 75).forEach((o) =>
      alerts.push({ title: o.title, message: o.description || "", level: "info", category: "opportunite", status: "non_lue" })
    );
    if (alerts.length) {
      for (let i = 0; i < alerts.length; i += 100) {
        await base44.entities.Alert.bulkCreate(alerts.slice(i, i + 100));
      }
    }

    await base44.entities.AnalysisRun.create({
      health_score: data.health_score,
      dimension_scores: dimScores,
      counts: {
        anomalies: (data.anomalies || []).length,
        risks: (data.risks || []).length,
        opportunities: (data.opportunities || []).length,
        recommendations: (data.recommendations || []).length,
        kpis: (data.kpis || []).length,
      },
      run_date: new Date().toISOString(),
    });

    return Response.json({
      health_score: data.health_score,
      dimensions: data.dimensions || [],
      counts: {
        anomalies: (data.anomalies || []).length,
        risks: (data.risks || []).length,
        opportunities: (data.opportunities || []).length,
        recommendations: (data.recommendations || []).length,
        kpis: (data.kpis || []).length,
        alerts: alerts.length,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}