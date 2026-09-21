import React from "react";
import { Link } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";
import { getRequiredPlanForFeature } from "@/lib/entitlements";
import { Button } from "@/components/ui/button";
import { Sparkles, Lock, ArrowRight } from "lucide-react";

/**
 * FeatureGate
 * Protège une zone de l'application selon les droits du plan actif.
 * Si l'accès n'est pas autorisé, affiche un bloc élégant et bienveillant invitant à passer au forfait supérieur.
 * 
 * @param {Object} props
 * @param {string} props.feature - Clé de la fonctionnalité (ex: "forecast", "simulator", "radar")
 * @param {boolean} [props.requireFullAccess=false] - Si true, même un accès 'limited' est bloqué
 * @param {React.ReactNode} [props.fallback] - Rendu personnalisé en cas de restriction
 * @param {React.ReactNode} props.children - Contenu affiché si l'accès est autorisé
 */
export function FeatureGate({ feature, requireFullAccess = false, fallback, children }) {
  const { planId, canAccess, hasFullAccess, isLoading } = useSubscription();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const isAllowed = requireFullAccess ? hasFullAccess(feature) : canAccess(feature);

  if (isAllowed) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  const requiredPlan = getRequiredPlanForFeature(feature);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-b from-card/80 to-card p-8 text-center shadow-sm sm:p-12">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
        {requiredPlan.id === "PLAN_PRO" ? (
          <Sparkles className="h-7 w-7 text-primary" />
        ) : (
          <Lock className="h-6 w-6 text-primary" />
        )}
      </div>

      <div className="mx-auto mt-5 max-w-lg space-y-2">
        <h3 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Fonctionnalité disponible avec {requiredPlan.name}
        </h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {requiredPlan.description || "Débloquez la puissance analytique complète de GESCOP pour piloter votre entreprise en toute sérénité."}
        </p>
      </div>

      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <Button asChild size="lg" className="gap-2 shadow-md">
          <Link to="/tarifs">
            Découvrir {requiredPlan.name}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <Button asChild variant="ghost" size="lg">
          <Link to="/parametres/facturation">
            Gérer mon forfait
          </Link>
        </Button>
      </div>
    </div>
  );
}

export default FeatureGate;

