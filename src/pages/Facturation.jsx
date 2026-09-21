import React, { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useSubscription } from "@/hooks/useSubscription";
import { useLanguage } from "@/lib/LanguageContext";
import { base44 } from "@/api/base44Client";
import { PLANS } from "@/lib/entitlements";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CreditCard,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  Loader2,
  Shield,
  FileText,
  Download,
  AlertTriangle,
  RotateCcw,
  Trash2,
  Check,
  Calendar,
  Lock
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function Facturation() {
  const {
    subscription,
    planId,
    plan,
    status,
    isFree,
    isPendingCancellation,
    currentPeriodEndFormatted,
    canCancel,
    canResume,
    cancelSubscription,
    resumeSubscription,
    refetch
  } = useSubscription();

  const { t } = useLanguage();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [loadingPortal, setLoadingPortal] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("budget");
  const [cancelImmediate, setCancelImmediate] = useState(false);

  // Charger l'historique des factures
  const { data: invoices, refetch: refetchInvoices } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      try {
        const list = await base44.entities.Invoice.list("-paid_at", 20);
        return Array.isArray(list) ? list : [];
      } catch {
        return [];
      }
    },
    staleTime: 1000 * 60 * 2,
  });

  // Détection du retour Checkout Stripe (?success=true)
  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast({
        title: "Abonnement activé avec succès !",
        description: `Félicitations, vous bénéficiez désormais de l'ensemble des fonctionnalités de votre forfait ${plan.name}.`,
      });
      refetch();
      refetchInvoices();
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, plan.name, refetch, refetchInvoices, setSearchParams, toast]);

  // Ouverture du portail client Stripe (Factures & Carte)
  const handleOpenCustomerPortal = async () => {
    setLoadingPortal(true);
    try {
      const res = await base44.functions.invoke("createCustomerPortal", {
        return_url: window.location.href,
      });
      const data = res.data || res;
      if (data.portal_url) {
        window.location.href = data.portal_url;
      } else if (data.mock) {
        toast({
          title: "Portail Stripe (Mode Simulation)",
          description: "Stripe n'est pas encore branché avec vos clés de production réelles. Vos paiements sont simulés avec succès.",
        });
      } else {
        toast({
          title: "Portail client",
          description: data.error || "Impossible d'accéder au portail client pour le moment.",
        });
      }
    } catch (err) {
      toast({
        title: "Erreur portail",
        description: err.message || "Erreur lors de l'accès au portail de facturation.",
        variant: "destructive",
      });
    } finally {
      setLoadingPortal(false);
    }
  };

  // Traitement de la résiliation (Désabonnement)
  const handleConfirmCancel = async () => {
    setCanceling(true);
    try {
      const res = await cancelSubscription({
        reason: cancelReason,
        immediate: cancelImmediate,
      });
      setShowCancelModal(false);
      await refetch();
      toast({
        title: "Résiliation enregistrée",
        description: res.message || "Votre demande de résiliation a été prise en compte avec succès.",
      });
    } catch (err) {
      toast({
        title: "Erreur lors de la résiliation",
        description: err.message || "Une erreur est survenue.",
        variant: "destructive",
      });
    } finally {
      setCanceling(false);
    }
  };

  // Traitement de la réactivation de l'abonnement
  const handleResumeSubscription = async () => {
    setResuming(true);
    try {
      const res = await resumeSubscription();
      await refetch();
      toast({
        title: "Abonnement réactivé !",
        description: res.message || "Votre abonnement continue sans interruption.",
      });
    } catch (err) {
      toast({
        title: "Erreur de réactivation",
        description: err.message || "Impossible de réactiver l'abonnement.",
        variant: "destructive",
      });
    } finally {
      setResuming(false);
    }
  };

  const statusColors = {
    active: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    trialing: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
    past_due: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
    canceled: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
  };

  const statusLabels = {
    active: isPendingCancellation ? "Résiliation programmée" : "Actif",
    trialing: "Période d'essai",
    past_due: "Paiement en attente",
    canceled: "Résilié",
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Facturation & Abonnement
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gérez votre offre GESCOP, vos moyens de paiement et vos factures en toute simplicité.
        </p>
      </div>

      {/* Alerte de résiliation programmée */}
      {isPendingCancellation && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-amber-900 dark:text-amber-300 shadow-sm animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-sm">
                  Résiliation programmée au {currentPeriodEndFormatted || "terme de la période"}
                </p>
                <p className="text-xs text-amber-800/90 dark:text-amber-300/90 max-w-xl">
                  Votre abonnement {plan.name} reste pleinement actif jusqu'à cette date. Vos données d'entreprise et calculs resteront sauvegardés. À l'échéance, vous passerez automatiquement au forfait Diagnostic gratuit.
                </p>
              </div>
            </div>
            {canResume && (
              <Button
                type="button"
                onClick={handleResumeSubscription}
                disabled={resuming}
                size="sm"
                className="shrink-0 gap-1.5 bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
              >
                {resuming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                Conserver mon abonnement
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Carte du Forfait Actuel */}
      <Card className="rounded-2xl border-border bg-card shadow-xs overflow-hidden">
        <div className="bg-muted/30 p-6 sm:p-8 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {plan.name}
              </h2>
              <Badge
                variant="outline"
                className={
                  isPendingCancellation
                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 font-medium"
                    : (statusColors[status] || "bg-muted text-muted-foreground font-medium")
                }
              >
                {statusLabels[status] || status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-md">
              {plan.description}
            </p>
          </div>

          <div className="text-left sm:text-right">
            <div className="text-3xl font-extrabold tracking-tight text-foreground">
              {plan.price} $ <span className="text-sm font-normal text-muted-foreground">CAD / mois</span>
            </div>
            {subscription?.current_period_end && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center sm:justify-end gap-1">
                <Calendar className="h-3 w-3" />
                {subscription.cancel_at_period_end ? "Prend fin le " : "Renouvellement le "}
                {currentPeriodEndFormatted}
              </p>
            )}
          </div>
        </div>

        <CardContent className="p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border p-4 bg-muted/20">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                Référence d'offre
              </span>
              <span className="text-sm font-mono font-medium text-foreground">
                {planId}
              </span>
            </div>

            <div className="rounded-xl border border-border p-4 bg-muted/20">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                Paiements & Facturation
              </span>
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Shield className="h-4 w-4 text-emerald-500" />
                <span>Stripe Payments · Sécurité bancaire SSL 256 bits</span>
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="p-6 sm:p-8 pt-0 flex flex-wrap items-center justify-between gap-3 border-t border-border/50">
          <div className="flex items-center gap-3">
            <Button asChild className="gap-2 shadow-xs">
              <Link to="/tarifs">
                Changer de forfait
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>

            {!isFree && (
              <Button
                variant="outline"
                className="gap-2"
                onClick={handleOpenCustomerPortal}
                disabled={loadingPortal}
              >
                {loadingPortal ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="h-4 w-4" />
                )}
                Gérer ma carte & Reçus
                <ExternalLink className="h-3.5 w-3.5 opacity-60" />
              </Button>
            )}
          </div>

          {/* Bouton de désabonnement direct */}
          {canCancel && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowCancelModal(true)}
              className="text-xs text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Se désabonner
            </Button>
          )}
        </CardFooter>
      </Card>

      {/* Moyens de paiement enregistrés */}
      <Card className="rounded-2xl border-border bg-card shadow-xs">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            Moyens de paiement
          </CardTitle>
          <CardDescription>
            Votre carte bancaire enregistrée pour le renouvellement mensuel de votre abonnement GESCOP.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border bg-muted/20">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-12 items-center justify-center rounded-lg bg-card border border-border text-foreground font-mono text-xs font-bold shadow-2xs">
                CARD
              </div>
              <div>
                <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  Carte bancaire enregistrée
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-emerald-600 border-emerald-500/30">
                    Sécurisée
                  </Badge>
                </p>
                <p className="text-xs text-muted-foreground">
                  Gérée et chiffrée par Stripe Payments (PCI-DSS niveau 1).
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenCustomerPortal}
              disabled={loadingPortal}
              className="gap-1.5 shrink-0"
            >
              <CreditCard className="h-3.5 w-3.5" />
              Mettre à jour la carte
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Historique des factures et reçus */}
      <Card className="rounded-2xl border-border bg-card shadow-xs">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Historique des factures & Reçus
          </CardTitle>
          <CardDescription>
            Consultez et téléchargez vos justificatifs comptables officiels ($ CAD).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invoices && invoices.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 text-muted-foreground border-b border-border">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold">Date</th>
                    <th className="text-left py-3 px-4 font-semibold">Numéro / Réf</th>
                    <th className="text-left py-3 px-4 font-semibold">Forfait</th>
                    <th className="text-left py-3 px-4 font-semibold">Montant</th>
                    <th className="text-left py-3 px-4 font-semibold">Statut</th>
                    <th className="text-right py-3 px-4 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {invoices.map((inv, idx) => (
                    <tr key={inv.id || idx} className="hover:bg-muted/20">
                      <td className="py-3 px-4 text-foreground font-medium">
                        {inv.paid_at ? new Date(inv.paid_at).toLocaleDateString("fr-CA") : "-"}
                      </td>
                      <td className="py-3 px-4 font-mono text-muted-foreground">
                        {inv.invoice_number || inv.stripe_invoice_id || `FACT-${idx + 1}`}
                      </td>
                      <td className="py-3 px-4 text-foreground">
                        {inv.plan_id === "PLAN_PRO" ? "GESCOP Pro" : "GESCOP"}
                      </td>
                      <td className="py-3 px-4 font-bold text-foreground">
                        {inv.amount ? `${inv.amount.toFixed(2)} $ CAD` : `${plan.price}.00 $ CAD`}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">
                          Payée
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {inv.invoice_pdf || inv.hosted_invoice_url ? (
                          <a
                            href={inv.invoice_pdf || inv.hosted_invoice_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                          >
                            <Download className="h-3.5 w-3.5" /> Reçu PDF
                          </a>
                        ) : (
                          <span className="text-muted-foreground">Reçu disponible</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-border bg-muted/10">
              <FileText className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm font-semibold text-foreground">
                {!isFree ? "Première facture en cours de génération" : "Aucune facture émise"}
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                {!isFree
                  ? "Votre reçu sera automatiquement disponible ici dès la validation du cycle de facturation par Stripe."
                  : "Vous êtes actuellement sur le forfait Diagnostic gratuit. Les factures apparaîtront dès votre passage à un forfait payant."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Capacités du forfait actuel */}
      <Card className="rounded-2xl border-border bg-card shadow-xs">
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Capacités incluses dans votre forfait {plan.name}
          </CardTitle>
          <CardDescription>
            Fonctionnalités actuellement déverrouillées pour votre entreprise.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {plan.featuresList.map((item, i) => (
              <div key={i} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span className="text-foreground/90">{item}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* MODALE DE CONFIRMATION DE DÉSABONNEMENT */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground">
                  Résilier votre abonnement {plan.name} ?
                </h3>
                <p className="text-xs text-muted-foreground">
                  Nous sommes désolés de vous voir partir. Voici comment se déroule la résiliation :
                </p>
              </div>
            </div>

            {/* Garanties clés */}
            <div className="space-y-2 rounded-xl border border-border bg-muted/20 p-4 text-xs">
              <div className="flex items-start gap-2 text-foreground">
                <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Zéro perte de données :</strong> Toutes vos ventes, dépenses, clients et analyses historiques restent intactes et sécurisées.
                </span>
              </div>
              <div className="flex items-start gap-2 text-foreground">
                <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Accès garanti jusqu'au terme :</strong> Vos fonctionnalités {plan.name} restent actives jusqu'au <strong>{currentPeriodEndFormatted || "terme de votre mois payé"}</strong>.
                </span>
              </div>
              <div className="flex items-start gap-2 text-foreground">
                <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Aucun frais caché :</strong> Vous basculerez automatiquement sur le forfait <em>Diagnostic gratuit (0 $ CAD)</em> à l'échéance.
                </span>
              </div>
            </div>

            {/* Motif de résiliation facultatif */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">
                Motif principal de votre résiliation (facultatif) :
              </label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="budget">Contraintes budgétaires / Trop cher</option>
                <option value="temporary">Objectif ponctuel atteint (diagnostic terminé)</option>
                <option value="missing_features">Fonctionnalités manquantes</option>
                <option value="other">Autre raison</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowCancelModal(false)}
                disabled={canceling}
              >
                Conserver mon abonnement
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleConfirmCancel}
                disabled={canceling}
                className="gap-1.5 shadow-xs"
              >
                {canceling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Confirmer la résiliation
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
