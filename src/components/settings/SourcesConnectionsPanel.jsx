import React from "react";
import { Link } from "react-router-dom";
import {
  Database,
  FileSpreadsheet,
  CheckCircle2,
  RefreshCw,
  Layers,
  ArrowRight,
  ShieldCheck,
  Zap
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const SOURCE_CATEGORIES = [
  {
    category: "Fichiers & Tableurs (Moteur Universel)",
    sources: [
      {
        id: "excel_csv",
        name: "Excel & CSV universel",
        desc: "Ingestion automatique avec normalisation sémantique, validation métier et détection d'erreurs.",
        status: "actif",
        badgeText: "Actif & Opérationnel",
        badgeVariant: "default",
        icon: FileSpreadsheet,
        lastSync: "Récent",
        actionText: "Importer un fichier",
        actionLink: "/importer"
      },
      {
        id: "pdf_rapports",
        name: "Rapports PDF & États financiers",
        desc: "Extraction automatique des états financiers, bilans et balances de vérification.",
        status: "actif",
        badgeText: "Actif",
        badgeVariant: "default",
        icon: Database,
        lastSync: "Supporté",
        actionText: "Importer",
        actionLink: "/importer"
      }
    ]
  },
  {
    category: "Comptabilité & ERP",
    sources: [
      {
        id: "acomba",
        name: "Acomba (Québec)",
        desc: "Synchronisation des écritures comptables, facturation, clients et fournisseurs.",
        status: "ready",
        badgeText: "Connecteur disponible",
        badgeVariant: "secondary",
        icon: Layers,
        lastSync: "Export .CSV supporté",
        actionText: "Connecter",
        actionLink: "/importer"
      },
      {
        id: "quickbooks",
        name: "QuickBooks Online",
        desc: "Flux automatique des ventes, dépenses, créances et états financiers.",
        status: "ready",
        badgeText: "API Prête",
        badgeVariant: "secondary",
        icon: Zap,
        lastSync: "Prêt",
        actionText: "Connecter",
        actionLink: "/importer"
      },
      {
        id: "sage",
        name: "Sage 50 / Sage Intacct",
        desc: "Grand livre, balance de vérification et plan comptable standard canadien.",
        status: "ready",
        badgeText: "Connecteur disponible",
        badgeVariant: "secondary",
        icon: Layers,
        lastSync: "Prêt",
        actionText: "Connecter",
        actionLink: "/importer"
      },
      {
        id: "xero",
        name: "Xero",
        desc: "Rapprochement bancaire, flux de trésorerie et factures clients.",
        status: "ready",
        badgeText: "API Prête",
        badgeVariant: "secondary",
        icon: Zap,
        lastSync: "Prêt",
        actionText: "Connecter",
        actionLink: "/importer"
      }
    ]
  },
  {
    category: "Commerce & Points de Vente (POS / E-commerce)",
    sources: [
      {
        id: "shopify",
        name: "Shopify",
        desc: "Commandes, paniers moyens, stocks en temps réel et fiches clients.",
        status: "ready",
        badgeText: "Connecteur e-commerce",
        badgeVariant: "secondary",
        icon: Zap,
        lastSync: "Exports supportés",
        actionText: "Importer les ventes",
        actionLink: "/importer"
      },
      {
        id: "lightspeed",
        name: "Lightspeed Retail",
        desc: "Tickets de caisse en succursales, inventaires multi-magasins et marges.",
        status: "ready",
        badgeText: "Connecteur POS",
        badgeVariant: "secondary",
        icon: Layers,
        lastSync: "Exports supportés",
        actionText: "Importer les ventes",
        actionLink: "/importer"
      },
      {
        id: "square_stripe",
        name: "Square & Stripe",
        desc: "Règlements cartes, remboursements et abonnements récurrents.",
        status: "ready",
        badgeText: "Connecteur Paiement",
        badgeVariant: "secondary",
        icon: Zap,
        lastSync: "Prêt",
        actionText: "Importer",
        actionLink: "/importer"
      }
    ]
  }
];

export default function SourcesConnectionsPanel({ form, setForm }) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-foreground">Sources de Données & Intégrations</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Gérez les flux d'alimentation de GESCOP : fichiers manuels, ERP comptables, plateformes e-commerce et caisses de succursale.
            </p>
          </div>
          <Link to="/importer">
            <Button size="sm" className="gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Accéder au module d'import
            </Button>
          </Link>
        </div>

        {/* Global Pipeline Health Banner */}
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium text-xs">
              <CheckCircle2 className="h-4 w-4" />
              Moteur Universel d'Import
            </div>
            <div className="mt-2 text-lg font-bold text-foreground">Opérationnel</div>
            <p className="text-[11px] text-muted-foreground mt-1">Normalisation et auto-apprentissage actifs</p>
          </div>

          <div className="rounded-xl border border-border bg-card/60 p-4">
            <div className="flex items-center gap-2 text-foreground font-medium text-xs">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Audit de Conformité
            </div>
            <div className="mt-2 text-lg font-bold text-foreground">Loi 25 & Souveraineté</div>
            <p className="text-[11px] text-muted-foreground mt-1">Données isolées et chiffrées au repos</p>
          </div>

          <div className="rounded-xl border border-border bg-card/60 p-4">
            <div className="flex items-center gap-2 text-foreground font-medium text-xs">
              <RefreshCw className="h-4 w-4 text-sky-500" />
              Détection des doublons
            </div>
            <div className="mt-2 text-lg font-bold text-foreground">Active</div>
            <p className="text-[11px] text-muted-foreground mt-1">Quarantaine intelligente des anomalies</p>
          </div>
        </div>

        {/* Source Categories list */}
        <div className="mt-8 space-y-6">
          {SOURCE_CATEGORIES.map((cat, idx) => (
            <div key={idx} className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {cat.category}
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {cat.sources.map((src) => {
                  const Icon = src.icon;
                  return (
                    <div
                      key={src.id}
                      className="flex flex-col justify-between rounded-xl border border-border bg-card p-4 transition-all hover:border-border/80 hover:shadow-xs"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                              <Icon className="h-5 w-5" />
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold text-foreground">{src.name}</h4>
                              <span className="text-[11px] text-muted-foreground">{src.lastSync}</span>
                            </div>
                          </div>
                          <Badge variant={/** @type {'default'|'secondary'} */ (src.badgeVariant)} className="text-[10px]">
                            {src.badgeText}
                          </Badge>
                        </div>
                        <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
                          {src.desc}
                        </p>
                      </div>

                      <div className="mt-4 flex items-center justify-end border-t border-border/50 pt-3">
                        <Link to={src.actionLink}>
                          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5 text-primary hover:text-primary">
                            {src.actionText}
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

