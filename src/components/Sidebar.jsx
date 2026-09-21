import React, { useState, useEffect } from "react";
import { NavLink, useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard, Brain, Upload, BarChart3, AlertTriangle, ShieldAlert, Lightbulb,
  TrendingUp, Calculator, CheckSquare, Bell, Target, FileText, MessageSquare,
  Radar as RadarIcon, History, Book, Settings, Menu, X, ChevronDown,
  Users, Package, Megaphone, Wallet, PanelLeftClose, PanelLeftOpen, LogOut, ShieldCheck, Banknote, Truck, Building2, Building,
  Star, Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCompany } from "@/hooks/useCompany";
import { useAuth } from "@/lib/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useLanguage } from "@/lib/LanguageContext";
import LiveAlertBadge from "@/components/sidebar/LiveAlertBadge";
import BrandLogo from "@/components/BrandLogo";

const navGroups = [
  {
    id: "group_pilot",
    label: "Pilote",
    icon: LayoutDashboard,
    items: [
      { to: "/", id: "nav_overview", label: "Vue d'ensemble", icon: LayoutDashboard, end: true },
      { to: "/kpis", id: "nav_kpis", label: "KPI", icon: BarChart3 },
      { to: "/tresorerie", id: "nav_cashflow", label: "Trésorerie", icon: Wallet },
      { to: "/finance", id: "nav_finance", label: "Finance", icon: Banknote },
      { to: "/succursales", id: "nav_branches", label: "Succursales", icon: Building },
      { to: "/previsions", id: "nav_forecasts", label: "Prévisions", icon: TrendingUp },
      { to: "/simulateur", id: "nav_simulator", label: "Simulateur", icon: Calculator },
    ],
  },
  {
    id: "group_operations",
    label: "Opérations",
    icon: Users,
    items: [
      { to: "/clients", id: "nav_clients", label: "Clients", icon: Users },
      { to: "/produits", id: "nav_products", label: "Produits", icon: Package },
      { to: "/marketing", id: "nav_marketing", label: "Marketing", icon: Megaphone },
      { to: "/rh", id: "nav_hr", label: "Ressources Humaines", icon: Users },
      { to: "/achats", id: "nav_purchases", label: "Achats & Fournisseurs", icon: Truck },
      { to: "/immobilisations", id: "nav_assets", label: "Immobilisations", icon: Building2 },
    ],
  },
  {
    id: "group_intelligence",
    label: "Intelligence",
    icon: Brain,
    items: [
      { to: "/anomalies", id: "nav_anomalies", label: "Anomalies", icon: AlertTriangle },
      { to: "/risques", id: "nav_risks", label: "Risques & opportunités", icon: ShieldAlert },
      { to: "/insights", id: "nav_insights", label: "Insights IA", icon: Brain },
      { to: "/radar", id: "nav_radar", label: "Radar externe", icon: RadarIcon },
      { to: "/alertes", id: "nav_alerts", label: "Alertes", icon: Bell },
      { to: "/recommandations", id: "nav_recommendations", label: "Recommandations", icon: Lightbulb },
      { to: "/historique", id: "nav_history", label: "Historique", icon: History },
    ],
  },
  {
    id: "group_actions_tools",
    label: "Actions & Outils",
    icon: CheckSquare,
    items: [
      { to: "/importer", id: "nav_import", label: "Importer des données", icon: Upload },
      { to: "/assistant", id: "nav_assistant", label: "Assistant IA", icon: MessageSquare },
      { to: "/taches", id: "nav_tasks", label: "Tâches", icon: CheckSquare },
      { to: "/decisions", id: "nav_decisions", label: "Décisions", icon: Target },
      { to: "/rapports", id: "nav_reports", label: "Rapports", icon: FileText },
      { to: "/audit", id: "nav_audit", label: "Audit des calculs", icon: ShieldCheck },
      { to: "/manuel", id: "nav_manual", label: "Manuel", icon: Book },
    ],
  },
];

const PINNED_STORAGE_KEY = "gescop_pinned_nav";
const MAX_PINNED = 8;

function loadPinned() {
  try {
    const raw = localStorage.getItem(PINNED_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function Sidebar({ compact, onToggleCompact }) {
  const [open, setOpen] = useState(false);
  const { company } = useCompany();
  const { user, logout } = useAuth();
  const { planId, isPro } = useSubscription();
  const { t } = useLanguage();
  const location = useLocation();

  const activeGroupObj = navGroups.find((g) => g.items.some((i) => i.to === location.pathname)) || navGroups[0];
  const activeGroupId = activeGroupObj.id;

  // Mode accordéon : ouvre le groupe actif par défaut
  const [expanded, setExpanded] = useState(() => ({ [activeGroupId]: true }));

  useEffect(() => {
    if (activeGroupId) {
      setExpanded({ [activeGroupId]: true });
    }
  }, [activeGroupId]);

  const toggle = (groupId) => {
    setExpanded((prev) => {
      const willOpen = !prev[groupId];
      return willOpen ? { [groupId]: true } : {};
    });
  };

  const initials = (user?.full_name || user?.email || "?").trim().slice(0, 2).toUpperCase();

  // Favoris personnalisables
  const [pinned, setPinned] = useState(loadPinned);
  const allItemsByPath = Object.fromEntries(navGroups.flatMap((g) => g.items).map((i) => [i.to, i]));

  const togglePin = (path) => {
    setPinned((prev) => {
      const next = prev.includes(path)
        ? prev.filter((p) => p !== path)
        : prev.length >= MAX_PINNED ? prev : [...prev, path];
      try { localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const renderNavItem = (item, { pinnable = true } = {}) => {
    const isPinned = pinned.includes(item.to);
    const label = t(item.id, item.label);

    return (
      <div key={item.to} className="group/item relative flex items-center">
        <NavLink
          to={item.to}
          end={item.end}
          onClick={() => setOpen(false)}
          title={compact ? label : undefined}
          className={({ isActive }) =>
            cn(
              "group relative flex flex-1 items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors duration-150 ease-in-out",
              compact && "justify-center px-0",
              isActive
                ? "bg-emerald-500/15 text-white font-semibold"
                : "text-sidebar-foreground/80 hover:bg-white/5 hover:text-white"
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive && <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[#10B981]" />}
              <item.icon
                className={cn("shrink-0 transition-colors duration-150", isActive ? "text-[#10B981]" : "text-sidebar-foreground/70 group-hover:text-white")}
                style={{ width: 15, height: 15 }}
              />
              {!compact && <span className="truncate">{label}</span>}
              {item.to === "/alertes" && <LiveAlertBadge compact={compact} />}
            </>
          )}
        </NavLink>
        {pinnable && !compact && (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); togglePin(item.to); }}
            title={isPinned ? (t("action_delete", "Retirer") + " des favoris") : (t("action_add", "Ajouter") + " aux favoris")}
            aria-pressed={isPinned}
            className={cn(
              "absolute right-1.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/40 transition-all duration-150 hover:bg-white/10 hover:text-[#10B981]",
              isPinned ? "opacity-100 text-[#10B981]" : "opacity-0 group-hover/item:opacity-100"
            )}
          >
            <Star className="h-3 w-3" fill={isPinned ? "currentColor" : "none"} />
          </button>
        )}
      </div>
    );
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Ouvrir le menu de navigation"
        className="fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card/70 shadow-md backdrop-blur transition-transform hover:scale-105 md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>
      {open && <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden" onClick={() => setOpen(false)} />}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-sidebar transition-all duration-300 ease-out md:translate-x-0",
          compact ? "w-16" : "w-64",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className={cn("flex items-center py-5", compact ? "justify-center px-2" : "justify-between px-5")}>
          <div className="flex items-center gap-2.5">
            <BrandLogo className="h-9 w-9 shrink-0 p-0.5 shadow-lg shadow-black/20" />
            {!compact && (
              <div>
                <p className="text-base font-bold tracking-tight text-white">GESCOP</p>
                <p className="text-[10px] uppercase tracking-wider text-sidebar-foreground/60">Pilotage intelligent</p>
              </div>
            )}
          </div>
          {!compact && (
            <button aria-label="Fermer le menu de navigation" onClick={() => setOpen(false)} className="rounded-lg p-1 text-sidebar-foreground/80 hover:bg-white/10 hover:text-white md:hidden">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Filet décoratif */}
        <div className="mx-5 mb-4 h-px bg-gradient-to-r from-[#10B981]/50 via-white/10 to-transparent" />

        {/* Company selector */}
        {!compact && company && (
          <div className="mx-3 mb-3 rounded-xl bg-white/[0.04] px-3 py-2 backdrop-blur transition-colors duration-150 hover:bg-white/[0.07]">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">{company.name}</p>
                <p className="truncate text-xs text-sidebar-foreground/70">{company.sector || "-"}</p>
              </div>
              <ChevronDown className="h-4 w-4 shrink-0 text-sidebar-foreground/60" />
            </div>
          </div>
        )}

        {/* Navigation principale */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-1">
          {/* Favoris */}
          {pinned.length > 0 && (
            <div className="mb-2">
              {!compact ? (
                <div className="flex items-center gap-2 px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#10B981]">
                  <Star className="h-3 w-3 shrink-0" fill="currentColor" />
                  <span>{t("nav_favorites", "Favoris")}</span>
                </div>
              ) : (
                <div className="flex justify-center py-1">
                  <Star className="h-4 w-4 text-[#10B981]" fill="currentColor" />
                </div>
              )}
              <div className="space-y-0.5">
                {pinned.map((path) => allItemsByPath[path]).filter(Boolean).map((item) => renderNavItem(item))}
              </div>
              <div className="mx-3 my-2 border-t border-white/5" />
            </div>
          )}

          {/* Groupes accordéon */}
          {navGroups.map((group) => {
            const isExpanded = !!expanded[group.id] || compact;
            const isActiveGroup = activeGroupId === group.id;
            const Icon = group.icon;
            const groupTitle = t(group.id, group.label);

            return (
              <div key={group.id} className="my-0.5">
                {!compact ? (
                  <button
                    onClick={() => toggle(group.id)}
                    aria-expanded={isExpanded}
                    aria-label={`${isExpanded ? "Réduire" : "Développer"} ${groupTitle}`}
                    className={cn(
                      "group/btn flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] transition-colors duration-150",
                      isActiveGroup
                        ? "text-[#10B981] bg-white/[0.04]"
                        : "text-[#9CA3AF] hover:text-white hover:bg-white/[0.02]"
                    )}
                  >
                    <Icon className={cn("h-3.5 w-3.5 shrink-0 transition-colors", isActiveGroup ? "text-[#10B981]" : "text-[#9CA3AF] group-hover/btn:text-white")} />
                    <span className="flex-1 text-left truncate">{groupTitle}</span>
                    <span className={cn(
                      "rounded-full px-1.5 py-0.2 text-[9px] font-normal transition-colors",
                      isActiveGroup ? "bg-[#10B981]/20 text-[#10B981]" : "bg-white/[0.06] text-sidebar-foreground/50 group-hover/btn:text-sidebar-foreground/80"
                    )}>
                      {group.items.length}
                    </span>
                    <ChevronDown className={cn("h-3 w-3 shrink-0 transition-transform duration-200 text-sidebar-foreground/50", !isExpanded && "-rotate-90")} />
                  </button>
                ) : (
                  <div className="flex justify-center py-1">
                    <group.icon
                      className={cn("transition-colors", isActiveGroup ? "text-[#10B981]" : "text-[#9CA3AF]")}
                      style={{ width: 16, height: 16 }}
                    />
                  </div>
                )}
                {compact && <div className="mx-3 my-1 border-t border-white/5" />}
                <div className={cn("overflow-hidden transition-all duration-300 ease-out", isExpanded ? "max-h-[30rem] opacity-100 mt-0.5" : "max-h-0 opacity-0")}>
                  <div className="space-y-0.5 pl-1">{group.items.map((item) => renderNavItem(item))}</div>
                </div>
              </div>
            );
          })}
        </nav>

        {/* Forfait actuel */}
        {!compact && (
          <div className="px-3 pt-2">
            <Link
              to="/tarifs"
              className="flex items-center justify-between rounded-xl bg-white/[0.04] p-2.5 border border-white/5 hover:bg-white/[0.08] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-xs font-semibold text-white">
                  {planId === "PLAN_PRO" ? t("nav_plan_pro", "GESCOP Pro") : planId === "PLAN_GESCOP" ? t("nav_plan_standard", "GESCOP") : t("nav_plan_free", "Diagnostic (Gratuit)")}
                </span>
              </div>
              <span className={`text-[10px] uppercase font-bold tracking-wider ${isPro ? "text-emerald-400" : "text-amber-400"}`}>
                {isPro ? t("nav_status_active", "Actif") : t("nav_status_upgrade", "Mettre à niveau")}
              </span>
            </Link>
          </div>
        )}

        {/* Profil utilisateur */}
        <div className="px-3 py-3">
          {!compact && user ? (
            <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.04] px-3 py-2.5 transition-colors duration-150 hover:bg-white/[0.07]">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#10B981]/20 text-[11px] font-bold text-[#10B981]">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-white">{user.full_name || user.email?.split("@")[0]}</p>
                <p className="truncate text-[10px] text-sidebar-foreground/60">{user.email}</p>
              </div>
              <Link
                to="/parametres"
                title={t("nav_settings", "Paramètres")}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sidebar-foreground/70 transition-colors duration-150 hover:bg-white/10 hover:text-white"
              >
                <Settings className="h-4 w-4" />
              </Link>
              <button
                onClick={() => logout()}
                title={t("nav_logout", "Se déconnecter")}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sidebar-foreground/70 transition-colors duration-150 hover:bg-red-500/20 hover:text-red-400"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : compact && user ? (
            <div className="flex flex-col items-center gap-2">
              <Link to="/parametres" title={t("nav_settings", "Paramètres")} className="rounded-lg p-1.5 text-sidebar-foreground/70 transition-colors duration-150 hover:bg-white/10 hover:text-white">
                <Settings className="h-4 w-4" />
              </Link>
              <button onClick={() => logout()} title={t("nav_logout", "Se déconnecter")} className="rounded-lg p-1.5 text-sidebar-foreground/70 transition-colors duration-150 hover:bg-red-500/20 hover:text-red-400">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : null}
        </div>

        {/* Bouton Réduire & Mention légale */}
        <div className="px-3 pb-3">
          <button
            onClick={onToggleCompact}
            aria-label={compact ? t("nav_expand", "Développer la barre latérale") : t("nav_collapse", "Réduire la barre latérale")}
            aria-pressed={compact}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium text-sidebar-foreground/70 transition-colors duration-150 hover:bg-white/5 hover:text-white",
              compact && "justify-center px-0"
            )}
          >
            {compact ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            {!compact && t("nav_collapse", "Réduire la sidebar")}
          </button>
          {!compact && <p className="mt-2 px-3 text-[10px] text-sidebar-foreground/50">{t("nav_compliance", "Données hébergées au Canada · Loi 25")}</p>}
        </div>
      </aside>
    </>
  );
}
