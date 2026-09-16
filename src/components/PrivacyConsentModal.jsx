import React, { useState } from "react";
import { Shield, FileLock2, Eye, Trash2, Share2, Lock, Globe, Bot, ChevronDown, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import ConsentCheckbox from "@/components/ConsentCheckbox";
import { cn } from "@/lib/utils";

const keyPoints = [
  { icon: FileLock2, title: "Renseignements collectés", text: "Nom, courriel, données d'entreprise et données financières/opérationnelles importées pour l'analyse." },
  { icon: Eye, title: "Finalités", text: "Pilotage, détection d'anomalies, risques, opportunités, recommandations, prévisions et rapports." },
  { icon: Shield, title: "Consentement", text: "Libre et éclairé. Retirable à tout moment sans effet rétroactif." },
  { icon: Share2, title: "Partage", text: "Aucune vente de données. Partage uniquement avec fournisseurs techniques sous entente de confidentialité." },
  { icon: Lock, title: "Sécurité", text: "Chiffrement au repos et en transit, isolation par organisation, contrôle d'accès par rôle." },
  { icon: Globe, title: "Hébergement", text: "Données hébergées au Canada, conformes à la Loi 25 (Québec)." },
  { icon: Trash2, title: "Conservation", text: "Données conservées le temps nécessaire, supprimées 30 jours après suppression du compte." },
  { icon: Eye, title: "Vos droits", text: "Accès, correction, retrait de consentement, portabilité, effacement. Réponse sous 30 jours." },
  { icon: Bot, title: "Intelligence artificielle", text: "L'IA produit des outils d'aide à la décision. La décision finale vous appartient. Droit d'être informé." },
  { icon: Shield, title: "Incidents", text: "Notification à la CAI et aux personnes concernées en cas d'incident de confidentialité." },
];

export default function PrivacyConsentModal() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleAccept = async () => {
    if (!accepted) return;
    setSaving(true);
    try {
      await base44.auth.updateMe({
        public_metadata: {
          ...user.public_metadata,
          privacy_consent_accepted: true,
          privacy_consent_date: new Date().toISOString(),
        }
      });
      toast({ title: "Consentement enregistré. Bienvenue dans GESCOP." });
      // Reload to refresh user state
      window.location.reload();
    } catch (e) {
      toast({ title: "Erreur: " + e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleRefuse = () => {
    logout();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border bg-gradient-to-br from-primary/5 to-transparent px-6 py-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Shield className="h-5.5 w-5.5 text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold tracking-tight">Contrat de confidentialité - Loi 25</h2>
            <p className="text-xs text-muted-foreground">Acceptation requise avant l'utilisation de GESCOP</p>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
            Avant d'utiliser GESCOP, vous devez prendre connaissance et accepter notre politique de confidentialité,
            conforme à la <span className="font-medium text-foreground">Loi 25</span> (protection des renseignements personnels, Québec).
          </p>

          {/* Key points grid */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {keyPoints.map((p) => (
              <div key={p.title} className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-muted/20 p-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <p.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground">{p.title}</p>
                  <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{p.text}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Expandable full summary */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-4 flex w-full items-center justify-between rounded-lg border border-dashed border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent/30"
          >
            <span>Consulter le détail complet de la politique</span>
            <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
          </button>

          {expanded && (
            <div className="mt-3 max-h-48 overflow-y-auto rounded-lg border border-border bg-muted/20 p-4 text-xs leading-relaxed text-muted-foreground">
              <p className="mb-2"><span className="font-semibold text-foreground">Responsable :</span> GESCOP désigne un responsable de la protection des renseignements personnels, joignable à privacy@gescop.app. Réponse sous 30 jours.</p>
              <p className="mb-2"><span className="font-semibold text-foreground">Collecte :</span> Identification (nom, courriel, mot de passe chiffré), entreprise (secteur, CA, site web), données opérationnelles importées (transactions, commandes, clients, produits, stocks, campagnes, trésorerie, employés), données d'analyse générées, journaux techniques.</p>
              <p className="mb-2"><span className="font-semibold text-foreground">Partage :</span> Aucune vente. Fournisseurs techniques sous entente de confidentialité, obligations légales, fusion/acquisition avec notification.</p>
              <p className="mb-2"><span className="font-semibold text-foreground">Sécurité :</span> Chiffrement TLS/SSL, isolation par organisation, authentification sécurisée, journal d'audit, contrôle par rôles.</p>
              <p className="mb-2"><span className="font-semibold text-foreground">Conservation :</span> Compte actif → 30 jours post-suppression. Journaux d'audit → 12 mois. Puis destruction/anonymisation sécurisée.</p>
              <p className="mb-2"><span className="font-semibold text-foreground">Droits :</span> Accès, correction, retrait de consentement, portabilité, effacement, notification d'incident. Réponse sous 30 jours.</p>
              <p className="mb-2"><span className="font-semibold text-foreground">IA :</span> Outils d'aide à la décision. Droit d'être informé du traitement automatisé. Droit de contester. Explications disponibles sur demande.</p>
              <p className="mb-2"><span className="font-semibold text-foreground">Incidents :</span> Notification à la CAI et aux personnes concernées en cas de préjudice sérieux.</p>
              <p><span className="font-semibold text-foreground">Plaintes :</span> Responsable de GESCOP ou Commission d'accès à l'information du Québec (access.gouv.qc.ca, 1 877 353-0434).</p>
            </div>
          )}

          <Link
            to="/politique-confidentialite"
            target="_blank"
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            Ouvrir la politique complète <ExternalLink className="h-3 w-3" />
          </Link>
        </div>

        {/* Footer */}
        <div className="border-t border-border bg-muted/20 px-6 py-4">
          <div className="mb-3">
            <ConsentCheckbox id="consent-modal" checked={accepted} onChange={setAccepted}>
              J'ai lu et j'accepte la <Link to="/politique-confidentialite" target="_blank" className="font-medium text-primary hover:underline">politique de confidentialité</Link> de GESCOP.
              Je consens à la collecte, l'utilisation et la communication de mes renseignements personnels aux finalités décrites, conformément à la Loi 25.
            </ConsentCheckbox>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={handleRefuse} disabled={saving}>
              Refuser et se déconnecter
            </Button>
            <Button onClick={handleAccept} disabled={!accepted || saving}>
              {saving ? "Enregistrement…" : "Accepter et continuer"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}