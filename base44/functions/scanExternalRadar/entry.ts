import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";

// Radar externe — scan DEDIE, declenche a la demande.
// Il etait auparavant produit par le diagnostic general : chaque analyse
// regenerait des signaux sans acces au web, donc sans source verifiable et
// sans lien reel avec le secteur. Ici : recherche web, filtre secteur strict,
// et rejet de tout signal sans source consultable.
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

    const prompt = `Tu es le radar externe de GESCOP. Recherche sur le web les informations RECENTES qui concernent directement l'entreprise décrite ci-dessous.

ENTREPRISE
Nom : ${company.name}
Secteur d'activité : ${company.sector}
Localisation : ${company.location || "non précisée"}
Modèle d'affaires : ${company.business_model || "non précisé"}
Produits : ${company.products || "non précisés"}
Services : ${company.services || "non précisés"}
Clientèle : ${company.clientele || "non précisée"}
Fournisseurs : ${company.suppliers || "non précisés"}
Concurrents suivis : ${compNames.length ? compNames.join(", ") : "aucun"}
Date du jour : ${today}

RÈGLES DE DÉCLENCHEMENT (un signal qui n'y répond pas ne doit PAS être renvoyé)
1. PERTINENCE SECTORIELLE OBLIGATOIRE : l'information doit concerner explicitement ce secteur d'activité, cette localisation, ces produits/services, cette clientèle, ces fournisseurs ou l'un des concurrents nommés. Une actualité économique générale, nationale ou mondiale, qui ne touche pas spécifiquement ce secteur, est à écarter.
2. FRAÎCHEUR : uniquement des informations publiées dans les 90 derniers jours. Indique la date de publication réelle (format AAAA-MM-JJ).
3. SOURCE CONSULTABLE OBLIGATOIRE : chaque signal doit citer le nom du média ou de l'organisme (source) ET l'URL exacte et publique de la page d'origine (url, commençant par https://). Si tu n'as pas d'URL réelle, n'inclus pas le signal. N'invente jamais une URL.
4. SEUIL : ne renvoie que les signaux dont relevance_score est au moins 60. Mieux vaut 3 signaux solides que 15 approximatifs. Maximum 12 signaux.
5. Aucun chiffre de marché, part de marché ou statistique inventée : ne cite un chiffre que s'il figure dans la source citée.
6. relevance_reason explique en une ou deux phrases le lien concret avec CETTE entreprise. recommended_action donne une action concrète et proportionnée.

Rédige tout le contenu en français. Réponds uniquement en JSON valide.`;

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
                family: { type: "string" },
                relevance_score: { type: "number" },
                impact: { type: "string" },
                source: { type: "string" },
                url: { type: "string" },
                date: { type: "string" },
                relevance_reason: { type: "string" },
                recommended_action: { type: "string" },
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
    const raw = (data && Array.isArray(data.signals)) ? data.signals : null;
    if (!raw) {
      return Response.json({
        error: "Le radar n'a pas abouti. Vos signaux précédents ont été conservés, relancez le scan.",
      }, { status: 502 });
    }

    const families = ["gouvernement", "economie", "marche", "concurrence", "fournisseurs", "consommateurs", "actualites"];
    const impacts = ["positif", "neutre", "negatif"];
    // Filtre de sortie : sans URL publique et sans pertinence suffisante, le
    // signal n'est pas consultable — il n'entre pas dans le radar.
    const kept = raw.filter((s) =>
      s && s.title && typeof s.url === "string" && /^https?:\/\/\S+$/i.test(s.url.trim())
      && (Number(s.relevance_score) || 0) >= 60
    ).map((s) => ({
      title: String(s.title).slice(0, 300),
      description: s.description || "",
      family: families.includes(s.family) ? s.family : "actualites",
      relevance_score: Math.min(100, Math.round(Number(s.relevance_score) || 60)),
      impact: impacts.includes(s.impact) ? s.impact : "neutre",
      source: s.source || "",
      url: s.url.trim(),
      date: /^\d{4}-\d{2}-\d{2}$/.test(s.date || "") ? s.date : today,
      relevance_reason: s.relevance_reason || "",
      recommended_action: s.recommended_action || "",
      status: "nouveau",
    }));

    // Seuls les signaux produits par le radar (sans import_id) sont remplacés :
    // les signaux importés par l'utilisateur restent intacts.
    await base44.entities.ExternalSignal.deleteMany({ import_id: null });
    for (let i = 0; i < kept.length; i += 100) {
      await base44.entities.ExternalSignal.bulkCreate(kept.slice(i, i + 100));
    }

    return Response.json({ created: kept.length, rejected: raw.length - kept.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}