import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useCompany } from "@/hooks/useCompany";
import { base44 } from "@/api/base44Client";

const LANGUAGE_STORAGE_KEY = "gescop_language";

export const translations = {
  fr: {
    // Navigation Groups
    group_pilot: "Pilote",
    group_operations: "Opérations",
    group_intelligence: "Intelligence",
    group_actions_tools: "Actions & Outils",
    nav_favorites: "Favoris",

    // Navigation Items
    nav_overview: "Vue d'ensemble",
    nav_kpis: "KPI",
    nav_cashflow: "Trésorerie",
    nav_finance: "Finance",
    nav_branches: "Succursales",
    nav_forecasts: "Prévisions",
    nav_simulator: "Simulateur",
    nav_clients: "Clients",
    nav_products: "Produits",
    nav_marketing: "Marketing",
    nav_hr: "Ressources Humaines",
    nav_purchases: "Achats & Fournisseurs",
    nav_assets: "Immobilisations",
    nav_anomalies: "Anomalies",
    nav_risks: "Risques & opportunités",
    nav_insights: "Insights IA",
    nav_radar: "Radar externe",
    nav_alerts: "Alertes",
    nav_recommendations: "Recommandations",
    nav_history: "Historique",
    nav_import: "Importer des données",
    nav_assistant: "Assistant IA",
    nav_tasks: "Tâches",
    nav_decisions: "Décisions",
    nav_reports: "Rapports",
    nav_audit: "Audit des calculs",
    nav_manual: "Manuel",
    nav_settings: "Paramètres",
    nav_logout: "Se déconnecter",
    nav_collapse: "Réduire la sidebar",
    nav_expand: "Développer la barre latérale",
    nav_compliance: "Données hébergées au Canada · Loi 25",
    nav_plan_free: "Diagnostic (Gratuit)",
    nav_plan_standard: "GESCOP",
    nav_plan_pro: "GESCOP Pro",
    nav_status_active: "Actif",
    nav_status_upgrade: "Mettre à niveau",

    // Settings General
    settings_title: "Centre de Configuration & Contexte Entreprise",
    settings_subtitle: "Référentiel central alimentant l'intelligence sémantique, les KPI, le Radar et la prise de décision.",
    settings_memory_title: "Mémoire GESCOP",
    settings_memory_desc: "Toute information renseignée ici permet au moteur d'import d'éviter les faux rejets et d'adapter instantanément les formules de calcul.",
    settings_saving: "Enregistrement…",
    settings_save: "Enregistrer les modifications",
    settings_saved_title: "Configuration enregistrée",
    settings_saved_desc: "Le profil de contexte d'entreprise et les paramètres GESCOP ont été mis à jour avec succès.",
    settings_current_editing: "Modifications en cours pour",

    // Settings Tabs
    tab_entreprise: "Entreprise",
    tab_entreprise_desc: "Fiche d'identité, nom, secteur et devise",
    tab_activite: "Modèle & Activité",
    tab_activite_desc: "Modèle économique, revenus et propositions de valeur",
    tab_organisation: "Structure & Organisation",
    tab_organisation_desc: "Succursales, régions et départements",
    tab_produits: "Catalogue & Produits",
    tab_produits_desc: "Gammes de produits, catégories et offres",
    tab_clients: "Clients & Segments",
    tab_clients_desc: "Typologies, marchés cibles et géographies",
    tab_objectifs: "Objectifs Stratégiques",
    tab_objectifs_desc: "Caps à 1, 3 et 5 ans",
    tab_kpis: "Indicateurs KPI",
    tab_kpis_desc: "Gestion et personnalisation des indicateurs suivis",
    tab_dictionnaire: "Dictionnaire Métier",
    tab_dictionnaire_desc: "Correspondances sémantiques et termes personnalisés",
    tab_comprehension: "Compréhension & Sémantique",
    tab_comprehension_desc: "Perception par l'IA et analyse contextuelle",
    tab_radar: "Radar Externe",
    tab_radar_desc: "12 axes de veille externe et mots-clés de veille",
    tab_sources: "Sources & Données",
    tab_sources_desc: "Intégrations, connecteurs et historique d'import",
    tab_utilisateurs: "Utilisateurs & Droits",
    tab_utilisateurs_desc: "Membres d'équipe, rôles et permissions",
    tab_preferences: "Préférences & Conformité",
    tab_preferences_desc: "Langue, devise, format de date et Loi 25",
    tab_facturation: "Abonnement & Facturation",
    tab_facturation_desc: "Forfait, factures et moyens de paiement",

    // Common Actions
    action_cancel: "Annuler",
    action_delete: "Supprimer",
    action_add: "Ajouter",
    action_save: "Enregistrer",
    action_close: "Fermer",
  },
  en: {
    // Navigation Groups
    group_pilot: "Pilot",
    group_operations: "Operations",
    group_intelligence: "Intelligence",
    group_actions_tools: "Actions & Tools",
    nav_favorites: "Favorites",

    // Navigation Items
    nav_overview: "Overview",
    nav_kpis: "KPIs",
    nav_cashflow: "Cash Flow",
    nav_finance: "Finance",
    nav_branches: "Branches",
    nav_forecasts: "Forecasts",
    nav_simulator: "Simulator",
    nav_clients: "Customers",
    nav_products: "Products",
    nav_marketing: "Marketing",
    nav_hr: "Human Resources",
    nav_purchases: "Procurement & Suppliers",
    nav_assets: "Fixed Assets",
    nav_anomalies: "Anomalies",
    nav_risks: "Risks & Opportunities",
    nav_insights: "AI Insights",
    nav_radar: "External Radar",
    nav_alerts: "Alerts",
    nav_recommendations: "Recommendations",
    nav_history: "History",
    nav_import: "Import Data",
    nav_assistant: "AI Assistant",
    nav_tasks: "Tasks",
    nav_decisions: "Decisions",
    nav_reports: "Reports",
    nav_audit: "Calculation Audit",
    nav_manual: "User Manual",
    nav_settings: "Settings",
    nav_logout: "Log Out",
    nav_collapse: "Collapse Sidebar",
    nav_expand: "Expand Sidebar",
    nav_compliance: "Hosted in Canada · Law 25 compliant",
    nav_plan_free: "Diagnostic (Free)",
    nav_plan_standard: "GESCOP",
    nav_plan_pro: "GESCOP Pro",
    nav_status_active: "Active",
    nav_status_upgrade: "Upgrade",

    // Settings General
    settings_title: "Configuration Center & Company Context",
    settings_subtitle: "Central repository powering semantic intelligence, KPIs, Radar, and executive decision-making.",
    settings_memory_title: "GESCOP Knowledge",
    settings_memory_desc: "Any details entered here enable the import engine to prevent column mapping errors and adapt formulas automatically.",
    settings_saving: "Saving…",
    settings_save: "Save changes",
    settings_saved_title: "Configuration saved",
    settings_saved_desc: "Company profile context and GESCOP preferences have been updated successfully.",
    settings_current_editing: "Editing preferences for",

    // Settings Tabs
    tab_entreprise: "Company Profile",
    tab_entreprise_desc: "Identity, legal name, industry sector, and currency",
    tab_activite: "Business Model",
    tab_activite_desc: "Revenue streams, operating models, and value propositions",
    tab_organisation: "Organization & Branches",
    tab_organisation_desc: "Branches, sales territories, and corporate departments",
    tab_produits: "Products & Services",
    tab_produits_desc: "Product lines, categories, and offering structures",
    tab_clients: "Customers & Segments",
    tab_clients_desc: "Client archetypes, target demographics, and territories",
    tab_objectifs: "Strategic Goals",
    tab_objectifs_desc: "1, 3, and 5-year business milestones",
    tab_kpis: "KPI Management",
    tab_kpis_desc: "Manage and configure monitored performance indicators",
    tab_dictionnaire: "Business Dictionary",
    tab_dictionnaire_desc: "Custom terminology and semantic column mappings",
    tab_comprehension: "Semantics & Context",
    tab_comprehension_desc: "AI understanding model and business reasoning",
    tab_radar: "External Radar",
    tab_radar_desc: "12 market intelligence axes and tracking keywords",
    tab_sources: "Data Sources",
    tab_sources_desc: "File uploads, integrations, and historical imports",
    tab_utilisateurs: "Users & Permissions",
    tab_utilisateurs_desc: "Team accounts, roles, and access matrices",
    tab_preferences: "Preferences & Compliance",
    tab_preferences_desc: "Language, currency, date formatting, and Law 25",
    tab_facturation: "Billing & Subscription",
    tab_facturation_desc: "Subscription plan, invoices, and payment methods",

    // Common Actions
    action_cancel: "Cancel",
    action_delete: "Delete",
    action_add: "Add",
    action_save: "Save",
    action_close: "Close",
  }
};

const LanguageContext = createContext({
  language: "fr",
  setLanguage: () => {},
  t: (key, fallback) => fallback || key,
  locale: "fr-CA",
});

export function LanguageProvider({ children }) {
  const { company, refetch } = useCompany();

  // Initialize from localStorage or company or default to "fr"
  const [language, setLanguageState] = useState(() => {
    try {
      const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (stored === "en" || stored === "fr") return stored;
    } catch {
      // Local storage unavailable
    }
    return company?.language === "en" ? "en" : "fr";
  });

  // Sync if company has explicit language
  useEffect(() => {
    if (company?.language && (company.language === "en" || company.language === "fr")) {
      const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (!stored) {
        setLanguageState(company.language);
      }
    }
  }, [company?.language]);

  const setLanguage = useCallback((newLang) => {
    const valid = newLang === "en" ? "en" : "fr";
    setLanguageState(valid);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, valid);
    } catch {
      // ignore
    }

    // Also persist to company entity in background if available
    if (company?.id && company.language !== valid) {
      base44.entities.Company.update(company.id, { language: valid })
        .then(() => refetch?.())
        .catch(() => {});
    }
  }, [company?.id, company?.language, refetch]);

  const t = useCallback((key, fallback) => {
    const langDict = translations[language] || translations.fr;
    if (langDict && langDict[key] != null) {
      return langDict[key];
    }
    return fallback != null ? fallback : key;
  }, [language]);

  const locale = language === "en" ? "en-CA" : "fr-CA";

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, locale }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

