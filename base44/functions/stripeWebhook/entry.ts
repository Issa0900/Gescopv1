import { createFixedClientFromRequest as createClientFromRequest } from "../../shared/client.ts";

export default async function(req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const event = await req.json();

    const eventType = event?.type;
    const dataObject = event?.data?.object;

    if (!eventType || !dataObject) {
      return Response.json({ error: "Payload webhook invalide" }, { status: 400 });
    }

    console.log(`[Stripe Webhook] Événement reçu : ${eventType}`);

    // Gestion idempotente selon le type d'événement
    if (eventType === "checkout.session.completed") {
      const companyId = dataObject.client_reference_id || dataObject.metadata?.company_id;
      const userId = dataObject.metadata?.user_id;
      const planId = dataObject.metadata?.plan_id || "PLAN_GESCOP";
      const customerId = dataObject.customer;
      const subscriptionId = dataObject.subscription;

      if (companyId) {
        // Vérifier si un enregistrement Subscription existe déjà
        const existing = await base44.asServiceRole.entities.Subscription.filter(
          { company_id: companyId },
          "-created_date",
          1
        );

        if (existing && existing.length > 0) {
          await base44.asServiceRole.entities.Subscription.update(existing[0].id, {
            plan_id: planId,
            status: "active",
            customer_id: customerId,
            subscription_id: subscriptionId,
            cancel_at_period_end: false,
          });
        } else {
          await base44.asServiceRole.entities.Subscription.create({
            company_id: companyId,
            user_id: userId,
            plan_id: planId,
            status: "active",
            customer_id: customerId,
            subscription_id: subscriptionId,
            cancel_at_period_end: false,
          });
        }
      }
    } else if (eventType === "customer.subscription.updated") {
      const subscriptionId = dataObject.id;
      const customerId = dataObject.customer;
      const status = dataObject.status; // active, past_due, canceled, trialing, etc.
      const cancelAtPeriodEnd = dataObject.cancel_at_period_end === true;
      const currentPeriodEnd = dataObject.current_period_end
        ? new Date(dataObject.current_period_end * 1000).toISOString()
        : undefined;

      // Identifier le plan via le prix
      const priceGescop = Deno?.env?.get("STRIPE_PRICE_GESCOP") || (globalThis as any)?.process?.env?.STRIPE_PRICE_GESCOP;
      const pricePro = Deno?.env?.get("STRIPE_PRICE_PRO") || (globalThis as any)?.process?.env?.STRIPE_PRICE_PRO;
      const itemPriceId = dataObject.items?.data?.[0]?.price?.id;

      let planId: string | undefined = undefined;
      if (itemPriceId === pricePro) planId = "PLAN_PRO";
      else if (itemPriceId === priceGescop) planId = "PLAN_GESCOP";

      const existing = await base44.asServiceRole.entities.Subscription.filter(
        { subscription_id: subscriptionId },
        "-created_date",
        1
      );

      if (existing && existing.length > 0) {
        const updatePayload: any = {
          status: status === "active" || status === "trialing" ? status : status === "canceled" ? "canceled" : status,
          cancel_at_period_end: cancelAtPeriodEnd,
        };
        if (currentPeriodEnd) updatePayload.current_period_end = currentPeriodEnd;
        if (planId) updatePayload.plan_id = planId;

        await base44.asServiceRole.entities.Subscription.update(existing[0].id, updatePayload);
      }
    } else if (eventType === "customer.subscription.deleted") {
      const subscriptionId = dataObject.id;
      const existing = await base44.asServiceRole.entities.Subscription.filter(
        { subscription_id: subscriptionId },
        "-created_date",
        1
      );

      if (existing && existing.length > 0) {
        await base44.asServiceRole.entities.Subscription.update(existing[0].id, {
          status: "canceled",
          plan_id: "PLAN_FREE",
          cancel_at_period_end: true,
        });
      }
    } else if (eventType === "invoice.payment_failed") {
      const subscriptionId = dataObject.subscription;
      if (subscriptionId) {
        const existing = await base44.asServiceRole.entities.Subscription.filter(
          { subscription_id: subscriptionId },
          "-created_date",
          1
        );
        if (existing && existing.length > 0) {
          await base44.asServiceRole.entities.Subscription.update(existing[0].id, {
            status: "past_due",
          });
        }
      }
    } else if (eventType === "invoice.paid" || eventType === "invoice.payment_succeeded") {
      const subscriptionId = dataObject.subscription;
      const amountPaid = (dataObject.amount_paid || 0) / 100;
      const currency = (dataObject.currency || "cad").toUpperCase();
      const invoicePdf = dataObject.invoice_pdf || "";
      const hostedInvoiceUrl = dataObject.hosted_invoice_url || "";
      const invoiceNumber = dataObject.number || "";
      const stripeInvoiceId = dataObject.id || "";
      const paidAt = dataObject.status_transitions?.paid_at
        ? new Date(dataObject.status_transitions.paid_at * 1000).toISOString()
        : new Date().toISOString();

      if (subscriptionId) {
        const existing = await base44.asServiceRole.entities.Subscription.filter(
          { subscription_id: subscriptionId },
          "-created_date",
          1
        );
        if (existing && existing.length > 0) {
          const sub = existing[0];
          await base44.asServiceRole.entities.Subscription.update(sub.id, {
            status: "active",
          });

          try {
            await base44.asServiceRole.entities.Invoice.create({
              company_id: sub.company_id,
              user_id: sub.user_id,
              stripe_invoice_id: stripeInvoiceId,
              invoice_number: invoiceNumber,
              amount: amountPaid,
              currency,
              status: "paid",
              plan_id: sub.plan_id || "PLAN_GESCOP",
              invoice_pdf: invoicePdf,
              hosted_invoice_url: hostedInvoiceUrl,
              paid_at: paidAt,
            });
          } catch (e) {
            console.error("[Stripe Webhook] Erreur création Invoice:", e);
          }
        }
      }
    }

    return Response.json({ received: true, event: eventType });
  } catch (error: any) {
    console.error("[Stripe Webhook] Erreur:", error);
    return Response.json({ error: error.message || "Erreur interne webhook" }, { status: 500 });
  }
}

