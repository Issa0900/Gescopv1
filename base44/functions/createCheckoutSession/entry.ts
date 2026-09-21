import { createFixedClientFromRequest as createClientFromRequest } from "../../shared/client.ts";

export default async function(req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json();
    const { plan_id, success_url, cancel_url } = body;

    if (!plan_id || (plan_id !== "PLAN_GESCOP" && plan_id !== "PLAN_PRO")) {
      return Response.json({ error: "Plan invalide" }, { status: 400 });
    }

    // Récupérer l'entreprise de l'utilisateur
    const companies = await base44.entities.Company.list();
    const company = companies && companies[0] ? companies[0] : null;
    const companyId = company?.id || user.id;

    // Variables Stripe (côté serveur uniquement)
    const stripeSecretKey = Deno?.env?.get("STRIPE_SECRET_KEY") || (globalThis as any)?.process?.env?.STRIPE_SECRET_KEY;
    const priceGescop = Deno?.env?.get("STRIPE_PRICE_GESCOP") || (globalThis as any)?.process?.env?.STRIPE_PRICE_GESCOP;
    const pricePro = Deno?.env?.get("STRIPE_PRICE_PRO") || (globalThis as any)?.process?.env?.STRIPE_PRICE_PRO;

    // Si Stripe n'est pas encore configuré avec les clés réelles
    if (!stripeSecretKey) {
      return Response.json({
        mock: true,
        message: "Stripe n'est pas encore configuré (STRIPE_SECRET_KEY manquante). En mode test/développement, l'abonnement peut être simulé.",
        plan_id,
        company_id: companyId
      });
    }

    const priceId = plan_id === "PLAN_PRO" ? pricePro : priceGescop;
    if (!priceId) {
      return Response.json({ error: `Identifiant de prix Stripe manquant pour ${plan_id}` }, { status: 500 });
    }

    // Appel direct à l'API REST Stripe (aucune dépendance externe requise)
    const params = new URLSearchParams();
    params.append("mode", "subscription");
    params.append("payment_method_types[]", "card");
    params.append("line_items[0][price]", priceId);
    params.append("line_items[0][quantity]", "1");
    params.append("success_url", success_url || "https://smart-pilot-gescop.base44.app/parametres/facturation?session_id={CHECKOUT_SESSION_ID}&success=true");
    params.append("cancel_url", cancel_url || "https://smart-pilot-gescop.base44.app/tarifs?canceled=true");
    params.append("client_reference_id", companyId);
    params.append("customer_email", user.email || "");
    params.append("metadata[company_id]", companyId);
    params.append("metadata[user_id]", user.id);
    params.append("metadata[plan_id]", plan_id);

    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const session = await stripeRes.json();
    if (!stripeRes.ok) {
      return Response.json({ error: session.error?.message || "Erreur Stripe Checkout" }, { status: stripeRes.status });
    }

    return Response.json({ checkout_url: session.url, session_id: session.id });
  } catch (error: any) {
    return Response.json({ error: error.message || "Erreur interne" }, { status: 500 });
  }
}

