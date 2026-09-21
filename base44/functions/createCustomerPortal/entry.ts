import { createFixedClientFromRequest as createClientFromRequest } from "../../shared/client.ts";

export default async function(req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { return_url } = body;

    const stripeSecretKey = Deno?.env?.get("STRIPE_SECRET_KEY") || (globalThis as any)?.process?.env?.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return Response.json({ mock: true, message: "Stripe n'est pas encore configuré (STRIPE_SECRET_KEY requise)." });
    }

    // Récupérer l'abonnement actif
    const subscriptions = await base44.entities.Subscription.list("-created_date", 1);
    const sub = subscriptions && subscriptions[0] ? subscriptions[0] : null;

    if (!sub || !sub.customer_id) {
      return Response.json({ error: "Aucun profil client de facturation trouvé." }, { status: 404 });
    }

    const params = new URLSearchParams();
    params.append("customer", sub.customer_id);
    params.append("return_url", return_url || "https://smart-pilot-gescop.base44.app/parametres/facturation");

    const stripeRes = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const portal = await stripeRes.json();
    if (!stripeRes.ok) {
      return Response.json({ error: portal.error?.message || "Erreur Stripe Portal" }, { status: stripeRes.status });
    }

    return Response.json({ portal_url: portal.url });
  } catch (error: any) {
    return Response.json({ error: error.message || "Erreur interne" }, { status: 500 });
  }
}

