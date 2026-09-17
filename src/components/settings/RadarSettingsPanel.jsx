import React from "react";
import { Radar, Compass, CheckCircle2, AlertTriangle, ShieldCheck, Sparkles } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import CompetitorsManager from "@/components/settings/CompetitorsManager";

const ALL_RADAR_DOMAINS = [
  {
    id: "concurrence",
    name: "Concurrence",
    icon: "⚔️",
    desc: "Nouveaux entrants, actions tarifaires, expansions de rivaux directs et indirects.",
    family: "Marché & Concurrence",
    autoRecommendedFor: ["Commerce de détail", "Services", "E-commerce", "Fabrication"]
  },
  {
    id: "marche_demande",
    name: "Marché & Demande",
    icon: "📈",
    desc: "Tendances de consommation, saisons, variations de volumes sectoriels.",
    family: "Marché & Concurrence",
    autoRecommendedFor: ["Commerce de détail", "E-commerce", "Tourisme", "Plein air"]
  },
  {
    id: "clients_comportements",
    name: "Clients & Comportements",
    icon: "👥",
    desc: "Pouvoir d'achat, exigences écologiques, habitudes d'achat en ligne vs physique.",
    family: "Consommation & Habitudes",
    autoRecommendedFor: ["Commerce de détail", "Services", "B2C"]
  },
  {
    id: "prix_offres",
    name: "Prix & Offres",
    icon: "🏷️",
    desc: "Guerres de prix, promotions agressives, répercussion de l'inflation.",
    family: "Marché & Concurrence",
    autoRecommendedFor: ["Commerce de détail", "E-commerce", "Distribution"]
  },
  {
    id: "produits_services",
    name: "Produits & Services",
    icon: "📦",
    desc: "Innovations produits, fins de vie, cycles de renouvellement de gammes.",
    family: "Offre & Produits",
    autoRecommendedFor: ["Fabrication", "Commerce de détail", "Technologie"]
  },
  {
    id: "marketing_communication",
    name: "Marketing & Communication",
    icon: "📣",
    desc: "Campagnes marquantes, canaux d'acquisition émergents, part de voix.",
    family: "Visibilité & Marque",
    autoRecommendedFor: ["E-commerce", "B2C", "Services"]
  },
  {
    id: "technologie_innovation",
    name: "Technologie & Innovation",
    icon: "⚡",
    desc: "Outils IA, digitalisation des points de vente, automatisation d'entrepôt.",
    family: "Technologie & Digital",
    autoRecommendedFor: ["Technologie", "Services", "Commerce de détail"]
  },
  {
    id: "economie_finance_externe",
    name: "Économie & Finance externe",
    icon: "🏦",
    desc: "Taux directeurs, inflation, fluctuations du dollar CAD/USD, pouvoir d'achat.",
    family: "Macroéconomie",
    autoRecommendedFor: ["Tous secteurs", "Import-Export", "Distribution"]
  },
  {
    id: "reglementation_juridique",
    name: "Réglementation & Juridique",
    icon: "⚖️",
    desc: "Loi 25, normes environnementales, conformité travail et étiquetage.",
    family: "Conformité & Normes",
    autoRecommendedFor: ["Tous secteurs", "Santé", "Finance", "Alimentation"]
  },
  {
    id: "territoire_environnement",
    name: "Territoire & Économie locale",
    icon: "📍",
    desc: "Chantiers routiers, dynamisme commercial des régions (Laurentides, Estrie, etc.).",
    family: "Géographie & Local",
    autoRecommendedFor: ["Magasins physiques", "Commerce de détail", "Tourisme"]
  },
  {
    id: "chaine_approvisionnement",
    name: "Chaîne d'approvisionnement",
    icon: "🚢",
    desc: "Délais maritimes, ruptures de stocks amont, hausses des frais de transport.",
    family: "Logistique & Opérations",
    autoRecommendedFor: ["Fabrication", "Commerce de détail", "Import"]
  },
  {
    id: "rh_emploi",
    name: "RH & Marché de l'emploi",
    icon: "🤝",
    desc: "Pénurie de main-d'œuvre, salaires horaires médians, disponibilité saisonnière.",
    family: "Ressources Humaines",
    autoRecommendedFor: ["Commerce de détail", "Restauration", "Services", "Industrie"]
  }
];

export default function RadarSettingsPanel({ form, setForm }) {
  const monitored = form.monitored_domains || ALL_RADAR_DOMAINS.map((d) => d.id);

  const toggleDomain = (domainId) => {
    const next = monitored.includes(domainId)
      ? monitored.filter((d) => d !== domainId)
      : [...monitored, domainId];
    setForm({ ...form, monitored_domains: next });
  };

  const selectAll = () => {
    setForm({ ...form, monitored_domains: ALL_RADAR_DOMAINS.map((d) => d.id) });
  };

  const selectRecommended = () => {
    const recommendedIds = ALL_RADAR_DOMAINS.map((d) => d.id);
    setForm({ ...form, monitored_domains: recommendedIds });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <Radar className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-foreground">Surveillance & Veille Stratégique (12 Domaines)</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Configurez les domaines externes et périphériques que le Radar GESCOP analyse en continu pour détecter menaces et opportunités.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={selectAll}
              className="rounded-lg border border-border bg-secondary/50 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"
            >
              Tous activer ({ALL_RADAR_DOMAINS.length})
            </button>
            <button
              type="button"
              onClick={selectRecommended}
              className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20"
            >
              Recommandés secteur
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs text-muted-foreground flex items-start gap-3">
          <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div>
            <span className="font-medium text-foreground">Détection contextualisée : </span>
            Selon votre profil d'activité ({form.sector || "Commerce de détail"}), GESCOP croise automatiquement vos indicateurs de vente et de stock avec les alertes des domaines cochés.
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {ALL_RADAR_DOMAINS.map((domain) => {
            const isActive = monitored.includes(domain.id);
            return (
              <div
                key={domain.id}
                onClick={() => toggleDomain(domain.id)}
                className={`cursor-pointer rounded-xl border p-4 transition-all ${
                  isActive
                    ? "border-primary/50 bg-primary/5 shadow-xs"
                    : "border-border bg-card/40 opacity-70 hover:opacity-100 hover:border-border"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{domain.icon}</span>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{domain.name}</h3>
                      <span className="text-[11px] text-muted-foreground font-medium">{domain.family}</span>
                    </div>
                  </div>
                  <Switch
                    checked={isActive}
                    onCheckedChange={() => toggleDomain(domain.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <p className="mt-2.5 text-xs text-muted-foreground leading-relaxed">
                  {domain.desc}
                </p>
                <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2 text-[11px]">
                  <span className="text-muted-foreground">Statut:</span>
                  <Badge variant={isActive ? "default" : "outline"} className="text-[10px] h-5">
                    {isActive ? "Actif & Surveillé" : "En pause"}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Concurrents directs & surveillance ciblée */}
      <CompetitorsManager />
    </div>
  );
}

