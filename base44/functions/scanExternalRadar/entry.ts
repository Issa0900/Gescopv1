import { createFixedClientFromRequest as createClientFromRequest } from "../../shared/client.ts";

// ─────────────────────────────────────────────────────────────────────────────
// GESCOP Universal Radar Engine — Scan Externe Intelligent Multi-Domaines
// Version 1.0 — Septembre 2026 (Référentiel des Domaines du Radar)
// ─────────────────────────────────────────────────────────────────────────────

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Non autorisé" }, { status: 401 });

    const companies = await base44.entities.Company.list();
    const company = (companies || [])[0];
    if (!company || !company.sector) {
      return Response.json({
        error: "Renseignez le secteur d'activité de votre entreprise pour activer le radar externe.",
      }, { status: 400 });
    }

    const competitors = await base44.entities.Competitor.list();
    const compNames = (competitors || []).map((c) => c.name).filter(Boolean).slice(0, 15);
    const today = new Date().toISOString().slice(0, 10);

    const prompt = `Tu es le radar externe universel de GESCOP. Recherche sur le web les informations et signaux récents influençant directement l'entreprise décrite ci-dessous.

ENTREPRISE
Nom : ${company.name}
Secteur d'activité : ${company.sector}
Localisation : ${company.location || "non précisée"}
Modèle d'affaires : ${company.business_model || "non précisé"}
Produits / Services : ${(company.products || "") + " " + (company.services || "")}
Clientèle : ${company.clientele || "non précisée"}
Fournisseurs : ${company.suppliers || "non précisés"}
Concurrents suivis : ${compNames.length ? compNames.join(", ") : "aucun"}
Date du jour : ${today}

LE RADAR EST ORGANISÉ EN 8 FAMILLES ET 12 DOMAINES MAJEURS :
1. FAMILLE "market" (Marché & demande, Clients & comportements, Prix & offres du marché, Produits & services)
2. FAMILLE "competitors" (Concurrence directe, expansions, fermetures, nouveaux entrants)
3. FAMILLE "commercial" (Marketing, campagnes publicitaires, canaux, promotions)
4. FAMILLE "tech" (Technologie, IA, logiciels sectoriels, automatisation)
5. FAMILLE "economy" (Économie, taux d'intérêt, inflation, pouvoir d'achat, coûts)
6. FAMILLE "legal" (Réglementation, normes de travail, fiscalité, décrets)
7. FAMILLE "territory_resources" (Territoire local, zones commerciales, météo/climat, approvisionnement/fret)
8. FAMILLE "ecosystem" (Partenaires, talents/salaires/recrutement, écosystème d'affaires)

POUR CHAQUE SIGNAL DÉTECTÉ, RÉPONDS OBLIGATOIREMENT AUX 5 QUESTIONS FONDAMENTALES :
1. Qu'est-ce qui change ? (Le FAIT précis observé, sans spéculation)
2. Où ? (Localisation géographique ou marché ciblé)
3. Depuis quand ? (Date réelle de publication dans les 90 derniers jours)
4. Quel est l'impact potentiel ? (INFÉRENCE non affirmative : "Une baisse de marge pourrait survenir si...", "Une opportunité d'accélération est envisageable...")
5. Que faut-il surveiller ? (Indicateur clé ou prochaine observation)

RÈGLES STRICTES :
1. PERTINENCE SECTORIELLE OU TERRITORIALE : l'information doit concerner ce secteur ou cette zone. Pas d'actualités mondiales déconnectées.
2. FRAÎCHEUR : dernières 90 jours. Date format AAAA-MM-JJ.
3. SOURCE RÉELLE CONSULTABLE : chaque signal DOIT avoir un nom de média/organisme et une URL publique (https://). N'invente jamais d'URL.
4. DISTINCTION FAIT vs INFÉRENCE : ne présente JAMAIS une hypothèse comme un fait établi.
5. Minimum score de pertinence : 50. Maximum 12 signaux au total.

Rédige tout en français et réponds en JSON respectant le schéma.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      model: "gemini_3_8_flash",
      response_json_schema: {
        type: "object",
        properties: {
          signals: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                family: {
                  type: "string",
                  enum: ["market", "competitors", "commercial", "tech", "economy", "legal", "territory_resources", "ecosystem"],
                },
                domain: { type: "string" },
                event: { type: "string" },
                location: { type: "string" },
                fact: { type: "string" },
                inference: { type: "string" },
                monitoring_tip: { type: "string" },
                affected_kpis: { type: "string" },
                relevance_score: { type: "number" },
                confidence: { type: "number" },
                impact: { type: "string", enum: ["positif", "neutre", "negatif"] },
                source: { type: "string" },
                url: { type: "string" },
                date: { type: "string" },
                relevance_reason: { type: "string" },
                recommended_action: { type: "string" },
              },
              required: ["title", "family", "fact", "inference", "monitoring_tip", "source", "url"],
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
    const raw = (data && Array.isArray(data.signals)) ? data.signals : null;
    if (!raw) {
      return Response.json({
        error: "Le radar n'a pas pu collecter de signaux conformes. Vos données actuelles sont conservées.",
      }, { status: 502 });
    }

    const validFamilies = ["market", "competitors", "commercial", "tech", "economy", "legal", "territory_resources", "ecosystem"];
    const validImpacts = ["positif", "neutre", "negatif"];

    const kept = raw.filter((s) =>
      s && s.title && typeof s.url === "string" && /^https?:\/\/\S+$/i.test(s.url.trim())
      && (Number(s.relevance_score) || 60) >= 50
    ).map((s) => ({
      title: String(s.title).slice(0, 300),
      description: s.description || s.fact || "",
      family: validFamilies.includes(s.family) ? s.family : "market",
      domain: s.domain || "concurrence",
      event: s.event || "SIGNAL_OBSERVED",
      location: s.location || company.location || "Québec",
      fact: s.fact || s.title,
      inference: s.inference || s.relevance_reason || "",
      monitoring_tip: s.monitoring_tip || "Surveiller les volumes et l'évolution des prix sur les 30 prochains jours.",
      affected_kpis: s.affected_kpis || "Chiffre d'affaires, Marge brute",
      relevance_score: Math.min(100, Math.round(Number(s.relevance_score) || 75)),
      confidence: Math.min(100, Math.round(Number(s.confidence) || 85)),
      impact: validImpacts.includes(s.impact) ? s.impact : "neutre",
      source: s.source || "",
      url: s.url.trim(),
      date: /^\d{4}-\d{2}-\d{2}$/.test(s.date || "") ? s.date : today,
      relevance_reason: s.relevance_reason || s.inference || "",
      recommended_action: s.recommended_action || "",
      status: "nouveau",
    }));

    // On remplace les signaux pour n'afficher que des signaux frais et vérifiés
    await base44.entities.ExternalSignal.deleteMany({});
    for (let i = 0; i < kept.length; i += 100) {
      await base44.entities.ExternalSignal.bulkCreate(kept.slice(i, i + 100));
    }

    return Response.json({ created: kept.length, rejected: raw.length - kept.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
