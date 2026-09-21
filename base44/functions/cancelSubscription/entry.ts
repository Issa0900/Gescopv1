import { createFixedClientFromRequest as createClientFromRequest } from "../../shared/client.ts";

export default async function(req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { action = "cancel", reason = "", immediate = false } = body;

    // Récupérer l'abonnement en cours
    const subscriptions = await base44.entities.Subscription.list("-created_date", 1);
    const sub = subscriptions && subscriptions[0] ? subscriptions[0] : null;

    if (!sub) {
      return Response.json({ error: "Aucun abonnement trouvé pour cette entreprise." }, { status: 404 });
    }

    if (sub.plan_id === "PLAN_FREE") {
      return Response.json({ error: "Le forfait actuel est déjà le forfait gratuit Diagnostic." }, { status: 400 });
    }

    const stripeSecretKey = Deno?.env?.get("STRIPE_SECRET_KEY") || (globalThis as any)?.process?.env?.STRIPE_SECRET_KEY;

    if (action === "cancel") {
      let stripeUpdated = false;

      // 1. Appel API Stripe si un identifiant d'abonnement Stripe existe et clé configurée
      if (stripeSecretKey && sub.subscription_id) {
        if (immediate) {
          const res = await fetch(`https://api.stripe.com/v1/subscriptions/${sub.subscription_id}`, {
            method: "DELETE",
            headers: {
              "Authorization": `Bearer ${stripeSecretKey}`,
            },
          });
          if (res.ok) stripeUpdated = true;
        } else {
          const params = new URLSearchParams();
          params.append("cancel_at_period_end", "true");
          const res = await fetch(`https://api.stripe.com/v1/subscriptions/${sub.subscription_id}`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${stripeSecretKey}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: params.toString(),
          });
          if (res.ok) stripeUpdated = true;
        }
      }

      // 2. Mise à jour de l'enregistrement dans la base de données Base44
      let targetPeriodEnd = sub.current_period_end;
      if (!targetPeriodEnd) {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        targetPeriodEnd = d.toISOString();
      }

      const updateData: any = immediate
        ? {
            status: "canceled",
            plan_id: "PLAN_FREE",
            cancel_at_period_end: true,
          }
        : {
            cancel_at_period_end: true,
            current_period_end: targetPeriodEnd,
          };

      const updated = await base44.entities.Subscription.update(sub.id, updateData);

      return Response.json({
        success: true,
        action: "cancel",
        immediate,
        subscription: updated,
        stripe_synced: stripeUpdated,
        message: immediate
          ? "Votre abonnement a été résilié immédiatement."
          : `Votre abonnement sera résilié à la fin de votre période de facturation (${new Date(targetPeriodEnd).toLocaleDateString("fr-CA")}). Vos accès restent actifs jusqu'à cette date.`
      });
    } else if (action === "resume") {
      // Annulation de la résiliation programmée (Réactivation)
      let stripeUpdated = false;
      if (stripeSecretKey && sub.subscription_id) {
        const params = new URLSearchParams();
        params.append("cancel_at_period_end", "false");
        const res = await fetch(`https://api.stripe.com/v1/subscriptions/${sub.subscription_id}`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${stripeSecretKey}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: params.toString(),
        });
        if (res.ok) stripeUpdated = true;
      }

      const updated = await base44.entities.Subscription.update(sub.id, {
        cancel_at_period_end: false,
        status: "active",
      });

      return Response.json({
        success: true,
        action: "resume",
        subscription: updated,
        stripe_synced: stripeUpdated,
        message: "La résiliation a été annulée. Votre abonnement continuera de se renouveler normalement."
      });
    }

    return Response.json({ error: "Action inconnue (doit être 'cancel' ou 'resume')" }, { status: 400 });
  } catch (error: any) {
    console.error("[cancelSubscription] Erreur:", error);
    return Response.json({ error: error.message || "Erreur interne" }, { status: 500 });
  }
}

