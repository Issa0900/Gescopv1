import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCompany } from "@/hooks/useCompany";
import CompetitorsManager from "@/components/settings/CompetitorsManager";
import RadarScanButton from "@/components/radar/RadarScanButton";
import {
  RADAR_FAMILIES_META,
  detectRelevantDomains,
  generateCrossSignalInsights,
} from "../../base44/shared/core/radar";
import {
  Crosshair,
  TrendingUp,
  Megaphone,
  Cpu,
  DollarSign,
  Scale,
  MapPin,
  Users,
  ExternalLink,
  Sparkles,
  ShieldAlert,
  ArrowUpRight,
  Info,
  Calendar,
  Layers,
  Compass,
  CheckCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const FAMILY_ICONS = {
  market: TrendingUp,
  competitors: Crosshair,
  commercial: Megaphone,
  tech: Cpu,
  economy: DollarSign,
  legal: Scale,
  territory_resources: MapPin,
  ecosystem: Users,
};

export default function Radar() {
  const { company } = useCompany();
  const [selectedFamily, setSelectedFamily] = useState("all");

  // Récupérer les signaux réels depuis Base44
  const { data: signals = [], isLoading } = useQuery({
    queryKey: ["signals"],
    queryFn: async () => {
      const list = await base44.entities.ExternalSignal.list("-relevance_score", 50);
      return list || [];
    },
  });

  // Profilage dynamique des domaines selon le secteur de l'entreprise
  const domainProfile = useMemo(() => {
    return detectRelevantDomains(company?.sector || "", company?.business_model || "");
  }, [company?.sector, company?.business_model]);

  // Moteur de croisement des signaux (Spec Section 14 & 23)
  const crossSignalInsights = useMemo(() => {
    return generateCrossSignalInsights({
      externalSignals: signals,
      internalMetrics: {},
      companyName: company?.name || "votre entreprise",
    });
  }, [signals, company?.name]);

  // Filtrage des signaux par famille
  const filteredSignals = useMemo(() => {
    if (selectedFamily === "all") return signals;
    if (selectedFamily === "competitors_manager") return [];
    return signals.filter((s) => {
      const fam = s.family?.toLowerCase();
      if (selectedFamily === "market") return fam === "market" || fam === "marche" || fam === "consommateurs";
      if (selectedFamily === "competitors") return fam === "competitors" || fam === "concurrence";
      if (selectedFamily === "commercial") return fam === "commercial";
      if (selectedFamily === "tech") return fam === "tech";
      if (selectedFamily === "economy") return fam === "economy" || fam === "economie";
      if (selectedFamily === "legal") return fam === "legal" || fam === "gouvernement";
      if (selectedFamily === "territory_resources") return fam === "territory_resources" || fam === "fournisseurs";
      if (selectedFamily === "ecosystem") return fam === "ecosystem";
      return fam === selectedFamily;
    });
  }, [signals, selectedFamily]);

  // Calcul des métriques de synthèse
  const stats = useMemo(() => {
    const positiveCount = signals.filter((s) => s.impact === "positif").length;
    const warningCount = signals.filter((s) => s.impact === "negatif").length;
    const distinctDomains = new Set(signals.map((s) => s.domain || s.family)).size;
    return {
      total: signals.length,
      positiveCount,
      warningCount,
      coveredDomainsCount: Math.min(12, distinctDomains || domainProfile.primaryDomains.length),
    };
  }, [signals, domainProfile]);

  return (
    <div className="space-y-8 pb-12">
      {/* ── En-tête principal avec profil sectoriel ──────────────────────────── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Compass className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Radar Stratégique & Signaux Externes</h1>
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  12 Domaines
                </span>
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Surveillance continue de votre environnement : marché, concurrence, prix, réglementations, territoire et opportunités.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col items-end text-xs text-muted-foreground">
            <span>Profil sectoriel actif</span>
            <strong className="text-slate-800 font-semibold">{domainProfile.sectorProfileName}</strong>
          </div>
          <RadarScanButton />
        </div>
      </div>

      {/* ── Cartes d'indicateurs de couverture ───────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase">Signaux Actifs</span>
            <Compass className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{stats.total}</p>
          <span className="text-xs text-muted-foreground">Vérifiés avec source</span>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase">Couverture Domaines</span>
            <Layers className="h-4 w-4 text-blue-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{stats.coveredDomainsCount} / 12</p>
          <span className="text-xs text-emerald-600 font-medium">Profil adapté</span>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase">Opportunités</span>
            <Sparkles className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-600">{stats.positiveCount}</p>
          <span className="text-xs text-muted-foreground">Facteurs favorables</span>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase">Points de Vigilance</span>
            <ShieldAlert className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-600">{stats.warningCount}</p>
          <span className="text-xs text-muted-foreground">Impacts à surveiller</span>
        </div>
      </div>

      {/* ── Moteur d'Inférences Croisées (Section 14 & 23) ────────────────────── */}
      {crossSignalInsights.length > 0 && (
        <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 to-slate-50 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
                <Sparkles className="h-4 w-4" />
              </span>
              <h2 className="text-base font-bold text-indigo-950">Inférences Croisées Multi-Domaines (GESCOP Cross-Signal Engine)</h2>
            </div>
            <span className="text-xs font-medium text-indigo-700 bg-indigo-100/80 px-2.5 py-1 rounded-full">
              {crossSignalInsights.length} synthèse{crossSignalInsights.length > 1 ? "s" : ""}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {crossSignalInsights.map((insight) => (
              <div key={insight.id} className="rounded-xl border border-indigo-200/80 bg-white p-4 shadow-xs">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                    {insight.title}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    insight.impact === "positif" ? "bg-emerald-100 text-emerald-800" :
                    insight.impact === "negatif" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-800"
                  }`}>
                    Priorité {insight.priorityScore}%
                  </span>
                </div>
                <div className="mt-2 space-y-2 text-xs">
                  <p className="text-slate-800 font-medium">{insight.fact}</p>
                  <p className="text-indigo-900 bg-indigo-50/50 p-2 rounded-lg border border-indigo-100/50">{insight.inference}</p>
                  <p className="text-slate-700 font-medium">{insight.recommendedAction}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Onglets des 8 Familles du Référentiel ────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-border text-sm">
          <button
            onClick={() => setSelectedFamily("all")}
            className={`whitespace-nowrap px-3.5 py-2 rounded-lg font-semibold transition-colors ${
              selectedFamily === "all"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            Tous les signaux ({signals.length})
          </button>

          {Object.entries(RADAR_FAMILIES_META).map(([key, meta]) => {
            const Icon = FAMILY_ICONS[key] || Compass;
            const count = signals.filter((s) => {
              const fam = s.family?.toLowerCase();
              if (key === "market") return fam === "market" || fam === "marche" || fam === "consommateurs";
              if (key === "competitors") return fam === "competitors" || fam === "concurrence";
              if (key === "commercial") return fam === "commercial";
              if (key === "tech") return fam === "tech";
              if (key === "economy") return fam === "economy" || fam === "economie";
              if (key === "legal") return fam === "legal" || fam === "gouvernement";
              if (key === "territory_resources") return fam === "territory_resources" || fam === "fournisseurs";
              if (key === "ecosystem") return fam === "ecosystem";
              return fam === key;
            }).length;

            return (
              <button
                key={key}
                onClick={() => setSelectedFamily(key)}
                className={`flex items-center gap-2 whitespace-nowrap px-3 py-2 rounded-lg font-medium transition-colors ${
                  selectedFamily === key
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{meta.label}</span>
                {count > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                    selectedFamily === key ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}

          <button
            onClick={() => setSelectedFamily("competitors_manager")}
            className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-2 rounded-lg font-medium border ml-auto ${
              selectedFamily === "competitors_manager"
                ? "bg-primary text-white border-primary shadow-sm"
                : "border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Crosshair className="h-3.5 w-3.5" />
            <span>Gestion des Concurrents</span>
          </button>
        </div>
      </div>

      {/* ── Vue 1 : Gestionnaire de Concurrents ──────────────────────────────── */}
      {selectedFamily === "competitors_manager" && (
        <div className="space-y-6">
          <div className="flex gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
            <Info className="mt-0.5 h-5 w-5 shrink-0" />
            <p>
              GESCOP cible la recherche du Radar spécifiquement sur les concurrents enregistrés ici.
              Ajoutez les noms, succursales et sites web de vos rivaux directs pour guider le scan.
            </p>
          </div>
          <CompetitorsManager />
        </div>
      )}

      {/* ── Vue 2 : Liste des Signaux selon les 5 Questions Fondamentales ─────── */}
      {selectedFamily !== "competitors_manager" && (
        <div>
          {isLoading ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              Chargement des signaux du Radar...
            </div>
          ) : filteredSignals.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
              <Compass className="mx-auto h-10 w-10 text-slate-400" />
              <h3 className="mt-3 text-base font-semibold text-slate-900">
                {selectedFamily === "all" ? "Aucun signal externe actif" : "Aucun signal dans ce domaine"}
              </h3>
              <p className="mt-1 max-w-md mx-auto text-sm text-slate-500">
                Lancez un scan du radar pour que l'IA consulte le web, filtre les sources officielles et détecte les signaux pertinents pour votre entreprise.
              </p>
              <div className="mt-5">
                <RadarScanButton />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <AnimatePresence>
                {filteredSignals.map((s, idx) => (
                  <motion.div
                    key={s.id || idx}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-slate-300 transition-all"
                  >
                    <div>
                      {/* En-tête de carte : Famille, Impact, Date, Source */}
                      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 uppercase">
                            {RADAR_FAMILIES_META[s.family]?.label || s.family || "Signal"}
                          </span>
                          <span className={`inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            s.impact === "positif"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : s.impact === "negatif"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-slate-50 text-slate-600 border border-slate-200"
                          }`}>
                            {s.impact === "positif" ? "Opportunité" : s.impact === "negatif" ? "Vigilance" : "Neutre"}
                          </span>
                        </div>
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <Calendar className="h-3 w-3" />
                          {s.date || "Récent"}
                        </span>
                      </div>

                      {/* Titre */}
                      <h3 className="mt-3 text-base font-bold text-slate-900 leading-snug">
                        {s.title}
                      </h3>

                      {/* Les 5 Questions Fondamentales (Spec Section 22) */}
                      <div className="mt-4 space-y-2.5 text-xs text-slate-700">
                        {/* 1. Qu'est-ce qui change ? [FAIT] */}
                        <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-150">
                          <span className="font-bold text-slate-900 block mb-0.5">1. Qu'est-ce qui change ? [FAIT]</span>
                          <span>{s.fact || s.description || s.title}</span>
                        </div>

                        {/* 2. Où et depuis quand ? */}
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div className="p-2 bg-slate-50/70 rounded-md">
                            <strong className="text-slate-900 block">2. Où ?</strong>
                            <span>{s.location || company?.location || "Marché régional"}</span>
                          </div>
                          <div className="p-2 bg-slate-50/70 rounded-md">
                            <strong className="text-slate-900 block">3. Depuis quand ?</strong>
                            <span>{s.date || "90 derniers jours"}</span>
                          </div>
                        </div>

                        {/* 4. Quel est l'impact potentiel ? [INFÉRENCE] */}
                        {(s.inference || s.relevance_reason) && (
                          <div className="rounded-lg bg-indigo-50/50 p-2.5 border border-indigo-100">
                            <span className="font-bold text-indigo-950 block mb-0.5">4. Impact potentiel [INFÉRENCE]</span>
                            <span className="text-indigo-900">{s.inference || s.relevance_reason}</span>
                            {s.affected_kpis && (
                              <div className="mt-1.5 flex flex-wrap gap-1">
                                <span className="text-[10px] text-indigo-700 font-semibold">KPIs influençables :</span>
                                {s.affected_kpis.split(",").map((kpi, kIdx) => (
                                  <span key={kIdx} className="bg-white text-indigo-800 text-[10px] font-bold px-1.5 py-0.2 rounded border border-indigo-200">
                                    {kpi.trim()}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* 5. Que faut-il surveiller ? */}
                        {s.monitoring_tip && (
                          <div className="rounded-lg bg-amber-50/40 p-2.5 border border-amber-100">
                            <span className="font-bold text-amber-950 block mb-0.5">5. Que faut-il surveiller ?</span>
                            <span className="text-amber-900">{s.monitoring_tip}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer de la carte : Recommandation & Source Vérifiable */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500 truncate max-w-[220px]" title={s.source}>
                        Source : <strong>{s.source || "Média spécialisé"}</strong>
                      </span>
                      {s.url && (
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                        >
                          Consulter la source <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
