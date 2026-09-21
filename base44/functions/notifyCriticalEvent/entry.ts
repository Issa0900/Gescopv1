import { createFixedClientFromRequest as createClientFromRequest } from "../../shared/client.ts";

const ENTITY_NAMES: Record<string, string> = { anomaly: "Anomaly", risk: "Risk" };

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: "Non autorisé" }, { status: 401 });

    const body = await req.json();
    const { entity_type, entity_id } = body;

    const entityName = ENTITY_NAMES[entity_type];
    if (!entityName || !entity_id) {
      return Response.json({ error: "entity_type et entity_id requis" }, { status: 400 });
    }

    // Re-fetch the record through the CALLER's own client (not asServiceRole):
    // Anomaly/Risk RLS only allows reading rows the caller created, so this
    // fails for any entity_id the caller doesn't own. That's what closes the
    // IDOR — user_id, title, description, detail and financial_impact all
    // used to be taken straight from the request body, letting any
    // authenticated caller pick an arbitrary user_id to email and to plant a
    // fake "risque majeur"/"anomalie critique" alert on. Now the recipient
    // and the notification content both come only from the verified record.
    let record;
    try {
      record = await base44.entities[entityName].get(entity_id);
    } catch {
      record = null;
    }
    if (!record || record.created_by_id !== caller.id) {
      return Response.json({ error: "Introuvable" }, { status: 404 });
    }

    const user = await base44.asServiceRole.entities.User.get(caller.id);
    if (!user || !user.email) {
      return Response.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    const title = record.title;
    const description = record.description;
    const detail = entity_type === "anomaly" ? record.explanation : record.category;
    const financial_impact = record.financial_impact;

    const impactStr = financial_impact
      ? `Impact financier estimé: ${financial_impact > 0 ? "+" : ""}${Math.round(financial_impact).toLocaleString("fr-CA")} $`
      : "";

    const typeLabel = entity_type === "anomaly" ? "Anomalie critique" : "Risque majeur";
    const subject = `[GESCOP] ${typeLabel} détectée : ${title}`;
    const emailBody = [
      `Bonjour,`,
      ``,
      `GESCOP a détecté un élément nécessitant votre attention immédiate :`,
      ``,
      `Type: ${typeLabel}`,
      `Titre: ${title}`,
      description ? `Description: ${description}` : "",
      detail ? `Détails: ${detail}` : "",
      impactStr,
      ``,
      `Connectez-vous à votre tableau de bord GESCOP pour consulter les détails et les actions recommandées.`,
      ``,
      `Cordialement,`,
      `L'équipe GESCOP`,
    ].filter(Boolean).join("\n");

    // Send email notification
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: user.email,
      subject,
      body: emailBody,
    });

    // Create an in-app Alert record (visible to the user)
    await base44.asServiceRole.entities.Alert.create({
      title,
      message: description || detail || typeLabel,
      level: "critique",
      category: entity_type,
      status: "non_lue",
      link_type: entity_type,
      link_id: entity_id,
      created_by_id: caller.id,
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
