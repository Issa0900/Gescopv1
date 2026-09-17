import { createFixedClientFromRequest as createClientFromRequest } from "../../shared/client.ts";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    // Every other Base44 function in this app gates on auth.me() before doing
    // anything (sec17 of the audit). This one used asServiceRole for the
    // email send and the Alert write further down without ever checking who
    // was calling, so any request carrying a valid Base44-App-Id — no user
    // session required — could make GESCOP send a real email and create an
    // Alert for an arbitrary user_id taken straight from the request body.
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: "Non autorisé" }, { status: 401 });

    const body = await req.json();
    const { entity_type, entity_id, title, description, detail, financial_impact, user_id } = body;

    if (!entity_type || !entity_id || !user_id) {
      return Response.json({ error: "entity_type, entity_id et user_id requis" }, { status: 400 });
    }

    // Fetch the user (owner of the record) to get their email
    const user = await base44.asServiceRole.entities.User.get(user_id);
    if (!user || !user.email) {
      return Response.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

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
      created_by_id: user_id,
    });

    return Response.json({ success: true, notified: user.email });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
