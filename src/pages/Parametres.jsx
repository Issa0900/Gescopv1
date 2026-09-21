import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useCompany } from "@/hooks/useCompany";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import {
  Building2,
  Briefcase,
  GitBranch,
  Package,
  Users2,
  Target,
  BarChart3,
  BookOpen,
  BrainCircuit,
  Radar,
  Database,
  Shield,
  Sliders,
  Save,
  CheckCircle2,
  Sparkles,
  CreditCard,
  Trash2,
  Plus,
  AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/LanguageContext";

// Settings Subpanels
import CompanyProfilePanel from "@/components/settings/CompanyProfilePanel";
import BusinessModelPanel from "@/components/settings/BusinessModelPanel";
import OrganizationPanel from "@/components/settings/OrganizationPanel";
import ProductsServicesPanel from "@/components/settings/ProductsServicesPanel";
import ClientsMarketsPanel from "@/components/settings/ClientsMarketsPanel";
import StrategicGoalsPanel from "@/components/settings/StrategicGoalsPanel";
import KpiManagementPanel from "@/components/settings/KpiManagementPanel";
import DictionaryPanel from "@/components/settings/DictionaryPanel";
import UnderstandingPanel from "@/components/settings/UnderstandingPanel";
import RadarSettingsPanel from "@/components/settings/RadarSettingsPanel";
import SourcesConnectionsPanel from "@/components/settings/SourcesConnectionsPanel";
import UsersAccessPanel from "@/components/settings/UsersAccessPanel";
import PreferencesPanel from "@/components/settings/PreferencesPanel";
import Facturation from "@/pages/Facturation";

const SETTINGS_SECTIONS = [
  {
    group: "Contexte Entreprise",
    items: [
      { id: "entreprise", label: "Entreprise", icon: Building2, desc: "Profil de référence & fiche d'identité" },
      { id: "activite", label: "Activité & Modèle", icon: Briefcase, desc: "Modèle d'affaires & flux de revenus" },
      { id: "organisation", label: "Organisation & Succursales", icon: GitBranch, desc: "Régions, succursales et départements" },
      { id: "produits", label: "Produits & Services", icon: Package, desc: "Catalogue, gammes et fournisseurs" },
      { id: "clients", label: "Clients & Marchés", icon: Users2, desc: "Typologie de clientèle et canaux" },
      { id: "objectifs", label: "Objectifs Stratégiques", icon: Target, desc: "Cibles de croissance & priorités" },
    ]
  },
  {
    group: "Intelligence & Sémantique",
    items: [
      { id: "kpis", label: "KPI & Indicateurs", icon: BarChart3, desc: "Indicateurs découverts & éligibles" },
      { id: "dictionnaire", label: "Dictionnaire Entreprise", icon: BookOpen, desc: "Vocabulaire interne & concepts GESCOP" },
      { id: "comprehension", label: "Ce que GESCOP a compris", icon: BrainCircuit, desc: "Niveau de confiance & audit sémantique" },
    ]
  },
  {
    group: "Surveillance",
    items: [
      { id: "radar", label: "Radar & 12 Domaines", icon: Radar, desc: "Veille externe & signaux concurrentiels" },
    ]
  },
  {
    group: "Données & Flux",
    items: [
      { id: "sources", label: "Sources & Connexions", icon: Database, desc: "Fichiers, ERP Acomba, Shopify, API" },
    ]
  },
  {
    group: "Système & Accès",
    items: [
      { id: "facturation", label: "Abonnement & Facturation", icon: CreditCard, desc: "Forfait, factures et moyens de paiement" },
      { id: "utilisateurs", label: "Utilisateurs & Accès", icon: Shield, desc: "Équipe, rôles et matrice de permissions" },
      { id: "preferences", label: "Préférences & Conformité", icon: Sliders, desc: "Devise, date, alertes et Loi 25" },
    ]
  }
];

export default function Parametres() {
  const { company, refetch } = useCompany();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "entreprise");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [hasSavedOnce, setHasSavedOnce] = useState(false);
  const [form, setForm] = useState(null);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (company) {
      setForm({
        name: company.name || "",
        trade_name: company.trade_name || "",
        description: company.description || "",
        website: company.website || "",
        sector: company.sector || "",
        subsector: company.subsector || "",
        location: company.location || "",
        creation_year: company.creation_year || "",
        employee_count: company.employee_count || 1,
        revenue: company.revenue || "",
        currency: company.currency || "CAD",
        language: company.language || "fr",
        business_model: company.business_model || "",
        products: company.products || "",
        services: company.services || "",
        clientele: company.clientele || "",
        suppliers: company.suppliers || "",
        tools: company.tools || "",
        objectives: company.objectives || [],
        strategic_goals: company.strategic_goals || [],
        organization_structure: company.organization_structure || {
          regions: ["Grand Montréal", "Laurentides", "Estrie", "Québec Capitale"],
          branches: [
            { id: "b1", name: "Succursale Montréal - Centre", region: "Grand Montréal", type: "Succursale physique" },
            { id: "b2", name: "Succursale Laval", region: "Grand Montréal", type: "Succursale physique" },
            { id: "b3", name: "Succursale Saint-Jérôme", region: "Laurentides", type: "Succursale physique" },
            { id: "b4", name: "Boutique en ligne (E-commerce)", region: "National", type: "Canal numérique" }
          ],
          departments: [
            { id: "d1", name: "Ventes & Conseil Client", manager: "Direction des Ventes" },
            { id: "d2", name: "Achats & Gestion des stocks", manager: "Approvisionnement" },
            { id: "d3", name: "Comptabilité & Finance", manager: "Contrôleur financier" },
            { id: "d4", name: "Marketing & Acquisition", manager: "Responsable Marketing" }
          ]
        },
        company_dictionary: company.company_dictionary || [
          { term: "Succursale", maps_to: "location_id", description: "Point de vente géographique distinct" },
          { term: "Coût Total ($)", maps_to: "total_cost", description: "Coût d'acquisition des marchandises vendues (COGS)" },
          { term: "Profit Brut ($)", maps_to: "gross_profit", description: "Bénéfice brut avant charges d'exploitation" },
          { term: "% Marge", maps_to: "gross_margin", description: "Taux de marge brute calculé en pourcentage" },
          { term: "Date Transaction", maps_to: "date", description: "Horodatage de la vente au point de caisse" }
        ],
        target_markets: company.target_markets || {},
        monitored_domains: company.monitored_domains || [
          "concurrence", "marche_demande", "clients_comportements", "prix_offres",
          "produits_services", "marketing_communication", "technologie_innovation",
          "economie_finance_externe", "reglementation_juridique", "territoire_environnement",
          "chaine_approvisionnement", "rh_emploi"
        ],
        connected_sources: company.connected_sources || [],
        preferences: company.preferences || {
          alert_frequency: "daily",
          notify_anomalies: true,
          notify_radar_signals: true,
          date_format: "YYYY-MM-DD",
          number_format: "fr-CA"
        }
      });
    } else {
      setForm(null);
    }
  }, [company]);

  const selectTab = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  const handleSave = async () => {
    if (!company?.id) return;
    setSaving(true);
    try {
      await base44.entities.Company.update(company.id, {
        ...form,
        revenue: Number(form.revenue) || 0,
        employee_count: Number(form.employee_count) || 1,
      });
      await refetch();
      setHasSavedOnce(true);
      toast({
        title: "Configuration enregistrée",
        description: "Le profil de contexte d'entreprise et les paramètres GESCOP ont été mis à jour avec succès."
      });
    } catch (e) {
      toast({
        title: "Erreur d'enregistrement",
        description: e.message || "Une erreur est survenue lors de la sauvegarde.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCompany = async () => {
    if (!company?.id) return;
    setDeleting(true);
    try {
      await base44.entities.Company.delete(company.id);
      setForm(null);
      await refetch();
      setShowDeleteModal(false);
      toast({
        title: "Identité de l'entreprise supprimée",
        description: "L'identité et les paramètres de référence de l'entreprise ont été effacés avec succès."
      });
    } catch (e) {
      toast({
        title: "Erreur lors de la suppression",
        description: e.message || "Une erreur est survenue lors de la suppression.",
        variant: "destructive"
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleCreateCompany = async () => {
    setSaving(true);
    try {
      await base44.entities.Company.create({
        name: "Nouvelle Entreprise",
        currency: "CAD",
        sector: "Commerce général"
      });
      await refetch();
      toast({
        title: "Profil d'entreprise initialisé",
        description: "Vous pouvez désormais renseigner l'identité de votre entreprise."
      });
    } catch (e) {
      toast({
        title: "Erreur de création",
        description: e.message || "Impossible de créer le profil.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (!company) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-xs sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  Centre de Configuration & Contexte Entreprise
                </h1>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  Référentiel central alimentant l'intelligence sémantique, les KPI, le Radar et la prise de décision.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4 shadow-xs">
            <Building2 className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Aucune identité d'entreprise configurée</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">
            L'identité de l'entreprise a été supprimée ou n'a pas encore été initialisée. Créez un profil pour guider les analyses et l'IA de GESCOP.
          </p>
          <Button
            onClick={handleCreateCompany}
            disabled={saving}
            className="mt-6 gap-2 shadow-xs"
          >
            <Plus className="h-4 w-4" />
            Créer une nouvelle identité d'entreprise
          </Button>
        </div>
      </div>
    );
  }

  if (!form) return null;

  // Active section metadata
  const allItems = SETTINGS_SECTIONS.flatMap((s) => s.items);
  const currentItem = allItems.find((item) => item.id === activeTab) || allItems[0];

  return (
    <div className="space-y-6">
      {/* Header with quick status and Save Button */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                Centre de Configuration & Contexte Entreprise
                {t("settings_title", "Centre de Configuration & Contexte Entreprise")}
              </h1>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Référentiel central alimentant l'intelligence sémantique, les KPI, le Radar et la prise de décision.
                {t("settings_subtitle", "Référentiel central alimentant l'intelligence sémantique, les KPI, le Radar et la prise de décision.")}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
          {hasSavedOnce && (
            <span className="hidden items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 sm:inline-flex">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Synchronisé
            </span>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowDeleteModal(true)}
            className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/50 shadow-xs text-xs sm:text-sm"
          >
            <Trash2 className="h-4 w-4" />
            {t("settings_delete_identity", "Supprimer l'identité")}
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="shadow-sm transition-all gap-2"
            className="shadow-sm transition-all gap-2 text-xs sm:text-sm"
          >
            {saving ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                Enregistrement…
                {t("settings_saving", "Enregistrement…")}
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Enregistrer les modifications
                {t("settings_save", "Enregistrer les modifications")}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main Layout: Navigation Sidebar + Content Area */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Navigation Sidebar (3 cols on desktop) */}
        <div className="lg:col-span-3">
          <div className="sticky top-4 space-y-5 rounded-2xl border border-border bg-card p-4 shadow-xs">
            {SETTINGS_SECTIONS.map((section, sIdx) => (
              <div key={sIdx} className="space-y-1.5">
                <h3 className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {section.group}
                </h3>
                <nav className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    const tabTitle = t(`tab_${item.id}`, item.label);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => selectTab(item.id)}
                        className={cn(
                          "w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium transition-all",
                          isActive
                            ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        )}
                      >
                        <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
                        <span className="truncate">{item.label}</span>
                        <span className="truncate">{tabTitle}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>
            ))}

            {/* Quick Danger Zone in Sidebar */}
            <div className="border-t border-border pt-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
              >
                <Trash2 className="h-4 w-4 shrink-0 text-red-500" />
                <span>{t("settings_delete_identity_nav", "Supprimer l'identité")}</span>
              </button>
            </div>

            {/* Micro Knowledge Summary */}
            <div className="border-t border-border pt-4">
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-[11px] text-muted-foreground space-y-1">
                <div className="flex items-center gap-1.5 font-medium text-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Mémoire GESCOP
                  {t("settings_memory_title", "Mémoire GESCOP")}
                </div>
                <p className="leading-relaxed">
                  Toute information renseignée ici permet au moteur d'import d'éviter les faux rejets et d'adapter instantanément les formules de calcul.
                  {t("settings_memory_desc", "Toute information renseignée ici permet au moteur d'import d'éviter les faux rejets et d'adapter instantanément les formules de calcul.")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Content Panel (9 cols on desktop) */}
        <div className="space-y-6 lg:col-span-9">
          {activeTab === "entreprise" && (
            <CompanyProfilePanel
              form={form}
              setForm={setForm}
              onDelete={() => setShowDeleteModal(true)}
            />
          )}

          {activeTab === "activite" && (
            <BusinessModelPanel form={form} setForm={setForm} />
          )}

          {activeTab === "organisation" && (
            <OrganizationPanel form={form} setForm={setForm} />
          )}

          {activeTab === "produits" && (
            <ProductsServicesPanel form={form} setForm={setForm} />
          )}

          {activeTab === "clients" && (
            <ClientsMarketsPanel form={form} setForm={setForm} />
          )}

          {activeTab === "objectifs" && (
            <StrategicGoalsPanel />
          )}

          {activeTab === "kpis" && (
            <KpiManagementPanel />
          )}

          {activeTab === "dictionnaire" && (
            <DictionaryPanel form={form} setForm={setForm} />
          )}

          {activeTab === "comprehension" && (
            <UnderstandingPanel />
          )}

          {activeTab === "radar" && (
            <RadarSettingsPanel form={form} setForm={setForm} />
          )}

          {activeTab === "sources" && (
            <SourcesConnectionsPanel form={form} setForm={setForm} />
          )}

          {activeTab === "utilisateurs" && (
            <UsersAccessPanel />
          )}

          {activeTab === "preferences" && (
            <PreferencesPanel form={form} setForm={setForm} />
          )}

          {activeTab === "facturation" && (
            <Facturation />
          )}

          {/* Bottom Save Bar */}
          {activeTab !== "facturation" && (
            <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-xs">
              <div className="text-xs text-muted-foreground">
                Modifications en cours pour <span className="font-semibold text-foreground">{form?.name || "l'entreprise"}</span>
                {t("settings_current_editing", "Modifications en cours pour")} <span className="font-semibold text-foreground">{form?.name || "l'entreprise"}</span>
              </div>
              <Button onClick={handleSave} disabled={saving} size="sm" className="gap-2">
                <Save className="h-4 w-4" />
                {saving ? "Enregistrement…" : "Enregistrer les modifications"}
                {saving ? t("settings_saving", "Enregistrement…") : t("settings_save", "Enregistrer les modifications")}
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteModal(true)}
                  className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/50 shadow-xs text-xs"
                >
                  <Trash2 className="h-4 w-4" />
                  {t("settings_delete_identity", "Supprimer l'identité")}
                </Button>
                <Button onClick={handleSave} disabled={saving} size="sm" className="gap-2">
                  <Save className="h-4 w-4" />
                  {saving ? t("settings_saving", "Enregistrement…") : t("settings_save", "Enregistrer les modifications")}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Confirmation de Suppression d'Identité */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100 dark:bg-red-950/50">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Supprimer l'identité ?</h3>
                <p className="text-xs text-muted-foreground">Action irréversible sur la fiche d'entreprise</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Êtes-vous certain de vouloir supprimer la fiche d'identité de <strong className="text-foreground">{company?.name || "l'entreprise"}</strong> ? Les données transactionnelles et les clients enregistrés restent intacts, mais le modèle d'affaires, le secteur et le contexte stratégique configurés seront réinitialisés.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
              >
                Annuler
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDeleteCompany}
                disabled={deleting}
                className="gap-1.5 shadow-xs"
              >
                <Trash2 className="h-4 w-4" />
                {deleting ? "Suppression…" : "Confirmer la suppression"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}