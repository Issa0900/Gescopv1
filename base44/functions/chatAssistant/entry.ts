import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
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

    const systemPrompt = `Tu es GESCOP, l'assistant intelligent de pilotage d'une PME. Tu réponds en français, de manière claire et concise, en te basant UNIQUEMENT sur les données disponibles de l'entreprise. Tu indiques toujours le type d'affirmation (fait, analyse, hypothèse, recommandation, prévision) et les sources utilisées quand pertinent.

${ctx.context}

RÈGLES
- Réponds à partir des données ci-dessus. Si l'information n'est pas disponible, dis-le clairement.
- Sois direct et actionnable. Le propriétaire veut savoir quoi faire.
- Quand tu fais une interprétation, précise qu'il s'agit d'une analyse, pas d'un fait établi.
- Pour les questions sur les risques, opportunités, priorités, appuie-toi sur les éléments détectés.
- Sois bref sauf si on te demande du détail.
- Réponds dans le champ "response" et liste les sources utilisées dans le champ "sources" (ex: "Données financières — 2481 transactions, sept. 2026", "Anomalies — 3 critiques", "KPI ventes — tendance baissière").`;

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
          response: { type: "string" },
          sources: { type: "array", items: { type: "string" } },
        },
      },
    });

    const data = typeof result === "string" ? JSON.parse(result) : result;
    return Response.json({ response: data.response || "", sources: data.sources || [] });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}