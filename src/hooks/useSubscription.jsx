import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { PLANS, PLAN_LIMITS, canAccess as checkAccess, hasFullAccess as checkFullAccess, getFeaturePermission } from "@/lib/entitlements";

export function useSubscription() {
  const { data: subscription, isLoading, refetch } = useQuery({
    queryKey: ["subscription"],
    queryFn: async () => {
      try {
        const list = await base44.entities.Subscription.list("-created_date", 1);
        return list && list[0] ? list[0] : null;
      } catch (err) {
        console.warn("Impossible de charger l'abonnement, fallback sur PLAN_FREE:", err);
        return null;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes cache
    staleTime: 1000 * 60 * 2, // 2 minutes cache
  });

  // Détermination du plan effectif
  let planId = "PLAN_FREE";
  let status = "active";

  if (subscription) {
    const isExpired = subscription.current_period_end && new Date(subscription.current_period_end).getTime() < Date.now();
    
    // Si l'abonnement est annulé et que la période est terminée, retour en PLAN_FREE
    if (subscription.status === "canceled" && isExpired) {
      planId = "PLAN_FREE";
      status = "canceled";
    } else if (subscription.status === "active" || subscription.status === "trialing" || (subscription.status === "canceled" && !isExpired)) {
      planId = subscription.plan_id || "PLAN_FREE";
      status = subscription.status;
    } else {
      // past_due, unpaid, incomplete
      planId = "PLAN_FREE";
      status = subscription.status;
    }
  }

  // Trouver l'objet plan correspondant
  const plan = Object.values(PLANS).find((p) => p.id === planId) || PLANS.FREE;
  const limits = PLAN_LIMITS[planId] || PLAN_LIMITS.PLAN_FREE;

  const isPendingCancellation = Boolean(
    subscription?.cancel_at_period_end && 
    planId !== "PLAN_FREE" && 
    subscription?.status !== "canceled"
  );

  const currentPeriodEndFormatted = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString("fr-CA")
    : null;

  // Actions d'abonnement
  const cancelSubscription = async ({ reason = "", immediate = false } = {}) => {
    const res = await base44.functions.invoke("cancelSubscription", {
      action: "cancel",
      reason,
      immediate,
    });
    await refetch();
    return res.data || res;
  };

  const resumeSubscription = async () => {
    const res = await base44.functions.invoke("cancelSubscription", {
      action: "resume",
    });
    await refetch();
    return res.data || res;
  };

  return {
    subscription,
    planId,
    plan,
    status,
    isActive: status === "active" || status === "trialing",
    isPro: planId === "PLAN_PRO",
    isGescop: planId === "PLAN_GESCOP",
    isFree: planId === "PLAN_FREE",
    isPendingCancellation,
    currentPeriodEndFormatted,
    canCancel: planId !== "PLAN_FREE" && !subscription?.cancel_at_period_end,
    canResume: planId !== "PLAN_FREE" && Boolean(subscription?.cancel_at_period_end),
    cancelSubscription,
    resumeSubscription,
    limits,
    canAccess: (feature) => checkAccess(planId, feature),
    hasFullAccess: (feature) => checkFullAccess(planId, feature),
    getPermission: (feature) => getFeaturePermission(planId, feature),
    isLoading,
    refetch,
  };
}

