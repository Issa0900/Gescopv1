import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { PLANS } from "@/lib/entitlements";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Sparkles, Zap, ShieldCheck, ArrowRight, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function Tarifs() {
  const { planId, isPro, isGescop, isFree, refetch } = useSubscription();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loadingPlan, setLoadingPlan] = useState(null);

  const handleSelectPlan = async (planKey) => {
    const targetPlan = PLANS[planKey];
    if (!targetPlan) return;

    if (!isAuthenticated) {
      navigate(`/register?returnTo=${encodeURIComponent("/tarifs")}`);
      return;
    }

    if (targetPlan.id === planId) {
      navigate("/parametres/facturation");
      return;
    }

    if (targetPlan.id === "PLAN_FREE") {
      navigate("/");
      return;
    }

    // Souscription à un plan payant (Stripe Checkout)
    setLoadingPlan(targetPlan.id);
    try {
      const res = await base44.functions.invoke("createCheckoutSession", {
        plan_id: targetPlan.id,
        success_url: `${window.location.origin}/parametres/facturation?success=true`,
        cancel_url: `${window.location.origin}/tarifs?canceled=true`,
      });

      const data = res.data || res;

      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else if (data.mock) {
        // Mode développement / test si les clés Stripe ne sont pas encore configurées
        toast({
          title: "Mode Test Simulation",
          description: `Stripe n'est pas encore branché avec vos clés réelles. Enregistrement temporaire du plan ${targetPlan.name}.`,
        });
        // Créer l'abonnement localement pour tester l'interface
        try {
          const existing = await base44.entities.Subscription.list("-created_date", 1);
          const d = new Date();
          d.setDate(d.getDate() + 30);
          const periodEnd = d.toISOString();

          if (existing && existing[0]) {
            await base44.entities.Subscription.update(existing[0].id, {
              plan_id: targetPlan.id,
              status: "active",
              cancel_at_period_end: false,
              current_period_end: periodEnd,
            });
          } else {
            await base44.entities.Subscription.create({
              plan_id: targetPlan.id,
              status: "active",
              provider: "test_mode",
              cancel_at_period_end: false,
              current_period_end: periodEnd,
            });
          }

          // Enregistrer la facture associée
          try {
            await base44.entities.Invoice.create({
              amount: targetPlan.price,
              currency: "CAD",
              status: "paid",
              plan_id: targetPlan.id,
              invoice_number: `GESCOP-${Date.now().toString().slice(-6)}`,
              paid_at: new Date().toISOString(),
            });
          } catch (invErr) {
            console.warn("Erreur création facture simulation:", invErr);
          }

          await refetch();
          navigate("/parametres/facturation");
          navigate("/parametres/facturation?success=true");
        } catch (e) {
          console.error("Simulation error:", e);
        }
      } else if (data.error) {
        toast({ title: "Erreur", description: data.error, variant: "destructive" });
      }
    } catch (err) {
      toast({
        title: "Erreur de paiement",
        description: err.message || "Impossible d'initialiser le paiement.",
        variant: "destructive",
      });
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="space-y-10 pb-16">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <Badge variant="outline" className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary border-primary/30">
          Tarification transparente
        </Badge>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
          Choisissez l'offre adaptée à votre entreprise
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
          Transformez vos données en décisions stratégiques. Commencez gratuitement, évoluez selon vos besoins.
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
        {/* Diagnostic (Gratuit) */}
        <Card className={`flex flex-col relative rounded-2xl transition-all duration-200 ${planId === "PLAN_FREE" ? "border-primary/50 shadow-md ring-1 ring-primary/20" : "border-border/80 hover:border-border"}`}>
          {planId === "PLAN_FREE" && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge className="bg-slate-700 text-white hover:bg-slate-700 px-3 py-0.5 text-xs shadow-sm">
                Votre forfait actuel
              </Badge>
            </div>
          )}
          <CardHeader className="pt-8">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold">{PLANS.FREE.name}</CardTitle>
              <Badge variant="secondary" className="font-medium text-xs">{PLANS.FREE.badge}</Badge>
            </div>
            <CardDescription className="pt-2 text-sm min-h-[44px]">
              {PLANS.FREE.description}
            </CardDescription>
            <div className="pt-4 flex items-baseline gap-1">
              <span className="text-4xl font-extrabold tracking-tight">0 $</span>
              <span className="text-sm font-medium text-muted-foreground">CAD</span>
            </div>
          </CardHeader>
          <CardContent className="flex-1 space-y-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2 border-t border-border/60">
              Fonctionnalités incluses :
            </div>
            <ul className="space-y-2.5 text-sm">
              {PLANS.FREE.featuresList.map((f, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="text-foreground/90">{f}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter className="pt-4 pb-8">
            <Button
              variant={planId === "PLAN_FREE" ? "outline" : "secondary"}
              className="w-full h-11"
              disabled={planId === "PLAN_FREE"}
              onClick={() => handleSelectPlan("FREE")}
            >
              {planId === "PLAN_FREE" ? "Forfait actif" : PLANS.FREE.cta}
            </Button>
          </CardFooter>
        </Card>

        {/* GESCOP (49 CAD / mois) */}
        <Card className={`flex flex-col relative rounded-2xl transition-all duration-200 shadow-md ${planId === "PLAN_GESCOP" ? "border-primary ring-2 ring-primary/20" : "border-primary/40 hover:border-primary/60"}`}>
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <Badge className="bg-primary text-primary-foreground px-3 py-0.5 text-xs font-semibold shadow-sm flex items-center gap-1">
              <Zap className="h-3 w-3" /> Recommandé
            </Badge>
          </div>
          <CardHeader className="pt-8">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold">{PLANS.GESCOP.name}</CardTitle>
              <Badge variant="outline" className="font-medium text-xs border-primary/40 text-primary">{PLANS.GESCOP.badge}</Badge>
            </div>
            <CardDescription className="pt-2 text-sm min-h-[44px]">
              {PLANS.GESCOP.description}
            </CardDescription>
            <div className="pt-4 flex items-baseline gap-1">
              <span className="text-4xl font-extrabold tracking-tight">49 $</span>
              <span className="text-sm font-medium text-muted-foreground">CAD / mois</span>
            </div>
          </CardHeader>
          <CardContent className="flex-1 space-y-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2 border-t border-border/60">
              Tout le forfait Diagnostic, plus :
            </div>
            <ul className="space-y-2.5 text-sm">
              {PLANS.GESCOP.featuresList.map((f, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="text-foreground/90">{f}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter className="pt-4 pb-8">
            <Button
              className="w-full h-11 font-semibold shadow-sm"
              disabled={loadingPlan === "PLAN_GESCOP" || planId === "PLAN_GESCOP"}
              onClick={() => handleSelectPlan("GESCOP")}
            >
              {loadingPlan === "PLAN_GESCOP" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connexion Stripe...
                </>
              ) : planId === "PLAN_GESCOP" ? (
                "Forfait actif"
              ) : (
                PLANS.GESCOP.cta
              )}
            </Button>
          </CardFooter>
        </Card>

        {/* GESCOP PRO (99 CAD / mois) */}
        <Card className={`flex flex-col relative rounded-2xl transition-all duration-200 ${planId === "PLAN_PRO" ? "border-primary ring-2 ring-primary/20 shadow-lg" : "border-border/80 hover:border-border"}`}>
          {planId === "PLAN_PRO" ? (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge className="bg-primary text-primary-foreground px-3 py-0.5 text-xs font-semibold shadow-sm">
                Votre forfait actif
              </Badge>
            </div>
          ) : (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge variant="outline" className="bg-background text-foreground px-3 py-0.5 text-xs font-medium border-border shadow-xs flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-amber-500" /> Avancé & IA
              </Badge>
            </div>
          )}
          <CardHeader className="pt-8">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold">{PLANS.PRO.name}</CardTitle>
              <Badge variant="secondary" className="font-medium text-xs">{PLANS.PRO.badge}</Badge>
            </div>
            <CardDescription className="pt-2 text-sm min-h-[44px]">
              {PLANS.PRO.description}
            </CardDescription>
            <div className="pt-4 flex items-baseline gap-1">
              <span className="text-4xl font-extrabold tracking-tight">99 $</span>
              <span className="text-sm font-medium text-muted-foreground">CAD / mois</span>
            </div>
          </CardHeader>
          <CardContent className="flex-1 space-y-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2 border-t border-border/60">
              Tout le forfait GESCOP, plus :
            </div>
            <ul className="space-y-2.5 text-sm">
              {PLANS.PRO.featuresList.map((f, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="text-foreground/90 font-medium">{f}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter className="pt-4 pb-8">
            <Button
              variant={planId === "PLAN_PRO" ? "outline" : "default"}
              className="w-full h-11 font-semibold"
              disabled={loadingPlan === "PLAN_PRO" || planId === "PLAN_PRO"}
              onClick={() => handleSelectPlan("PRO")}
            >
              {loadingPlan === "PLAN_PRO" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connexion Stripe...
                </>
              ) : planId === "PLAN_PRO" ? (
                "Forfait actif"
              ) : (
                PLANS.PRO.cta
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Trust & FAQ Footer */}
      <div className="mt-12 pt-8 border-t border-border/60 text-center max-w-2xl mx-auto space-y-3">
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>Paiement sécurisé par Stripe · Facturation sans engagement · Annulation en 1 clic</span>
        </div>
        <p className="text-xs text-muted-foreground/80">
          Les prix sont indiqués en dollars canadiens (CAD) et hors taxes applicables (TPS/TVQ selon votre province).
        </p>
      </div>
    </div>
  );
}

