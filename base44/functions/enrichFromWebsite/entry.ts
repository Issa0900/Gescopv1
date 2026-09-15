import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { website_url, company_name } = body;

    if (!website_url) {
      return Response.json({ error: 'URL du site web requise' }, { status: 400 });
    }

    let url = String(website_url).trim();
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }

    const prompt = `Tu es un assistant qui analyse le site web d'une entreprise pour en extraire des informations structurées.

${company_name ? `Nom de l'entreprise: ${company_name}\n` : ''}URL du site web à analyser: ${url}

Recherche et visite ce site web. Lis attentivement le contenu (page d'accueil, pages "À propos", "Services", "Produits", "Contact", etc.) et extrais les informations suivantes en français:

- name: Le nom officiel de l'entreprise tel qu'affiché sur le site
- sector: Le secteur d'activité principal (ex. Commerce de détail, Services professionnels, Restauration, Construction, Manufacturier, Technologie, Santé, Autre)
- location: La localisation géographique (ville, province/pays) si mentionnée
- business_model: Le modèle d'affaires (ex. Vente au détail, B2B, Abonnement, Freemium, Services à la demande)
- products: Description concise des principaux produits vendus
- services: Description concise des principaux services offerts
- clientele: La clientèle cible / les types de clients (ex. particuliers, entreprises, institutions)

Sois précis et concis. Si une information n'est pas trouvable sur le site, laisse le champ vide (chaîne vide). Ne devine pas.`;

    const schema = {
      type: "object",
      properties: {
        name: { type: "string" },
        sector: { type: "string" },
        location: { type: "string" },
        business_model: { type: "string" },
        products: { type: "string" },
        services: { type: "string" },
        clientele: { type: "string" }
      }
    };

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      model: "gemini_3_8_flash",
      response_json_schema: schema
    });

    let companyInfo = {};
    if (typeof result === 'string') {
      try {
        companyInfo = JSON.parse(result);
      } catch (e) {
        console.error("Failed to parse LLM response:", result);
      }
    } else {
      companyInfo = result;
    }

    return Response.json({ company_info: companyInfo });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}