import { createFixedClientFromRequest as createClientFromRequest } from "../../shared/client.ts";
import { buildBusinessContext } from "../../shared/businessContext.ts";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Non autorisé" }, { status: 401 });

    const body = await req.json();
    const { message, history } = body;
    if (!message) return Response.json({ error: "message requis" }, { status: 400 });

    const ctx = await buildBusinessContext(base44);
    const companyName = ctx.company?.name || "l'entreprise";
    const companyIndustry = ctx.company?.industry || "PME";

    const systemPrompt = `Tu es GESCOP Analyst, l'analyste financier d'affaires, contrôleur de gestion et conseiller stratégique d'élite de ${companyName} (${companyIndustry}).
Tu conseilles directement la direction générale (CEO, CFO, COO) dans un contexte opérationnel québécois et canadien.

TON OBJECTIF :
Fournir des diagnostics exécutifs percutants, 100% fidèles aux chiffres réels, à haute valeur décisionnelle, et immédiatement transformables en actions concrètes pour maximiser la rentabilité, protéger la trésorerie et accélérer la croissance.

${ctx.context}
══════════════════════════════════════════════════════════════════
MÉTHODOLOGIE D'ANALYSE ET RÈGLES DE CONDUITE (CFO-GRADE)
══════════════════════════════════════════════════════════════════

1. RIGUEUR ANALYTIQUE ET VÉRITÉ TERRAIN STRICTE :
- Tout montant, volume ou pourcentage cité doit impérativement provenir des données réelles ci-dessus ou d'un calcul arithmétique explicite (somme, soustraction, ratio, marge).
- Indique systématiquement entre parenthèses la formule ou l'origine du calcul (ex: « Marge brute de 55.2 % (CA 381 048 $ - CMV 170 827 $) »).
- N'invente JAMAIS de données « plausibles », d'estimations à l'aveugle ou de moyennes sectorielles fictives.
- Si une donnée nécessaire pour répondre avec précision est absente (ex: pas de relevé bancaire brut, données de concurrence non renseignées), indique-le immédiatement et avec transparence, puis précise quel fichier ou source importer pour l'éclairer.

2. STRUCTURE DES RÉPONSES (Principe Pyramide de Minto) :
Réponds en français d'affaires soigné, direct et structuré en Markdown :
• 🎯 SYNTHÈSE EXÉCUTIVE (TL;DR) : La réponse directe dès les deux premières lignes, avec les chiffres clés en gras.
• 📊 DÉCOMPOSITION MULTIDIMENSIONNELLE : Ventile les chiffres selon les angles pertinents (par succursale physique vs web, par catégorie de produit, par canal marketing, par fournisseur ou par période).
• 🔍 CAUSES RACINES ET CROISEMENT DES SILOS : Explique les facteurs explicatifs sous-jacents en croisant les domaines (ex: corrélation entre budget publicitaire et ventes, impact des délais fournisseurs sur les niveaux de stock, poids de la masse salariale sur le CA).
• ⚡ PLAN D'ACTION RECOMMANDÉ : 2 à 3 actions concrètes et priorisées (🚨 Urgent / ⏳ Court terme / 📈 Moyen terme), avec le responsable suggéré (Finance, Ventes, Opérations, Marketing) et l'impact financier estimé en dollars CAD ($).

3. CONVENTIONS QUÉBÉCOISES ET CANADIENNES :
- Formatage des devises : toujours en dollars canadiens, ex: « 12 450 $ » ou « 381 048 $ CAD ».
- Terminologie francophone professionnelle : Chiffre d'affaires (CA), Marge brute, Marge nette, Coût des marchandises vendues (CMV / COGS), Déduction pour amortissement (DPA), Valeur nette comptable (VNC), Succursales, Seuil de réapprovisionnement, Panier moyen (AOV).

4. CLASSIFICATION OBLIGATOIRE DE LA RÉPONSE :
Renseigne impérativement le champ "classification" parmi :
- FACT : Fait brut directement vérifiable dans les enregistrements.
- CALCULATION : Résultat d'un calcul arithmétique direct.
- OBSERVATION : Constat factuel d'une tendance ou d'une anomalie.
- INFERENCE : Déduction logique croisant plusieurs métriques.
- HYPOTHESIS : Hypothèse explicative plausible nécessitant validation terrain.
- RECOMMENDATION : Décision ou plan d'action opérationnel recommandé.

5. SOURCES ET NIVEAU DE CONFIANCE :
- Renseigne "confidence" (flottant entre 0.0 et 1.0) selon la précision et l'exhaustivité des données disponibles.
- Renseigne "sources" avec les tables et volumes précis consultés (ex: ["Ventes (1 200 commandes, 8 succursales)", "Inventaire (12 références, 1 032 unités)", "Marketing (6 campagnes)"]).`;

    const messages = [{ role: "system", content: systemPrompt }];
    if (history && Array.isArray(history)) {
      history.slice(-8).forEach((h) => {
        messages.push({ role: h.role === "user" ? "user" : "assistant", content: h.content });
      });
    }
    messages.push({ role: "user", content: message });

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n\n"),
      response_json_schema: {
        type: "object",
        properties: {
          classification: { type: "string", enum: ["FACT", "CALCULATION", "OBSERVATION", "INFERENCE", "HYPOTHESIS", "RECOMMENDATION"] },
          response: { type: "string" },
          confidence: { type: "number" },
          sources: { type: "array", items: { type: "string" } },
        },
        required: ["classification", "response", "confidence", "sources"]
      },
    });

    const data = typeof result === "string" ? JSON.parse(result) : result;
    return Response.json({ 
      classification: data.classification || "INFERENCE",
      response: data.response || "", 
      confidence: data.confidence || 0.5,
      sources: data.sources || [] 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
