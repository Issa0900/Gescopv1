import React, { useState, useEffect } from "react";
import { NavLink, useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard, Brain, Upload, BarChart3, AlertTriangle, ShieldAlert, Lightbulb,
  TrendingUp, Calculator, CheckSquare, Bell, Target, FileText, MessageSquare,
  Radar as RadarIcon, History, Book, Settings, Menu, X, ChevronDown, Database,
  Users, Package, Megaphone, Wallet, PanelLeftClose, PanelLeftOpen, LogOut, ShieldCheck, Banknote
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCompany } from "@/hooks/useCompany";
import { useAuth } from "@/lib/AuthContext";
import LiveAlertBadge from "@/components/sidebar/LiveAlertBadge";
import BrandLogo from "@/components/BrandLogo";

const navGroups = [
  {
    label: "Pilote",
    icon: LayoutDashboard,
    items: [
      { to: "/", label: "Vue d'ensemble", icon: LayoutDashboard, end: true },
      { to: "/kpis", label: "KPI", icon: BarChart3 },
      { to: "/tresorerie", label: "Trésorerie", icon: Wallet },
      { to: "/finance", label: "Finance", icon: Banknote },
      { to: "/previsions", label: "Prévisions", icon: TrendingUp },
      { to: "/simulateur", label: "Simulateur", icon: Calculator },
    ],
  },
  {
    label: "Opérations",
    icon: Users,
    items: [
      { to: "/clients", label: "Clients", icon: Users },
      { to: "/produits", label: "Produits", icon: Package },
      { to: "/marketing", label: "Marketing", icon: Megaphone },
      { to: "/rh", label: "Ressources Humaines", icon: Users },
    ],
  },
  {
    label: "Intelligence",
    icon: Brain,
    items: [
      { to: "/anomalies", label: "Anomalies", icon: AlertTriangle },
      { to: "/risques", label: "Risques & opportunités", icon: ShieldAlert },
      { to: "/insights", label: "Insights IA", icon: Brain },
      { to: "/radar", label: "Radar externe", icon: RadarIcon },
      { to: "/alertes", label: "Alertes", icon: Bell },
      { to: "/recommandations", label: "Recommandations", icon: Lightbulb },
      { to: "/historique", label: "Historique", icon: History },
    ],
  },
  {
    label: "Actions",
    icon: CheckSquare,
    items: [
      { to: "/taches", label: "Tâches", icon: CheckSquare },
      { to: "/decisions", label: "Décisions", icon: Target },
      { to: "/rapports", label: "Rapports", icon: FileText },
      { to: "/assistant", label: "Assistant", icon: MessageSquare },
    ],
  },
  {
    label: "Outils",
    icon: Upload,
    items: [
      { to: "/importer", label: "Sources", icon: Upload },
      { to: "/audit", label: "Audit des calculs", icon: ShieldCheck },
      { to: "/manuel", label: "Manuel", icon: Book },
    ],
  },
];

export default function Sidebar({ compact, onToggleCompact }) {
  const [open, setOpen] = useState(false);
  const { company } = useCompany();
  const { user, logout } = useAuth();
  const location = useLocation();

  const activeGroup = navGroups.find((g) => g.items.some((i) => i.to === location.pathname))?.label || "Accueil";
  const [expanded, setExpanded] = useState(
    Object.fromEntries(navGroups.map((g) => [g.label, true]))
  );

  useEffect(() => {
    setExpanded((e) => ({ ...e, [activeGroup]: true }));
  }, [activeGroup]);

  const toggle = (label) => setExpanded((e) => ({ ...e, [label]: !e[label] }));

  const initials = (user?.full_name || user?.email || "?").trim().slice(0, 2).toUpperCase();

  const renderNavItem = (item) => (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.end}
      onClick={() => setOpen(false)}
      title={compact ? item.label : undefined}
      className={({ isActive }) =>
        cn(
          "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 ease-in-out",
          compact && "justify-center px-0",
          isActive
            ? "bg-emerald-500/15 text-white"
            : "text-sidebar-foreground hover:bg-white/5 hover:text-white"
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-[#10B981]" />}
          <item.icon
            className={cn("shrink-0 transition-colors duration-150", isActive ? "text-[#10B981]" : "text-sidebar-foreground/80 group-hover:text-white")}
            style={{ width: 17, height: 17 }}
          />
          {!compact && <span className="truncate">{item.label}</span>}
          {item.to === "/alertes" && <LiveAlertBadge compact={compact} />}
        </>
      )}
    </NavLink>
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
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
            <button onClick={() => setOpen(false)} className="rounded-lg p-1 text-sidebar-foreground/80 hover:bg-white/10 hover:text-white md:hidden">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Company selector */}
        {!compact && company && (
          <div className="mx-3 mb-3 rounded-xl bg-white/[0.04] px-3 py-2 backdrop-blur transition-colors duration-150 hover:bg-white/[0.07]">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">{company.name}</p>
                <p className="truncate text-xs text-sidebar-foreground/70">{company.sector || "—"}</p>
              </div>
              <ChevronDown className="h-4 w-4 shrink-0 text-sidebar-foreground/60" />
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-1">
          {navGroups.map((group) => {
            const isExpanded = expanded[group.label] || compact;
            const isActiveGroup = activeGroup === group.label;
            return (
              <div key={group.label}>
                {!compact ? (
                  <button
                    onClick={() => toggle(group.label)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors duration-150",
                      isActiveGroup ? "text-[#10B981]" : "text-[#9CA3AF] hover:text-white"
                    )}
                  >
                    <span className="flex-1 text-left">{group.label}</span>
                    <ChevronDown className={cn("h-3 w-3 shrink-0 transition-transform duration-200", !isExpanded && "-rotate-90")} />
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
                <div className={cn("overflow-hidden transition-all duration-300 ease-out", isExpanded ? "max-h-[28rem] opacity-100 mt-0.5" : "max-h-0 opacity-0")}>
                  <div className="space-y-0.5">{group.items.map(renderNavItem)}</div>
                </div>
              </div>
            );
          })}
        </nav>

        {/* User profile — no harsh borders */}
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
                title="Paramètres"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sidebar-foreground/70 transition-colors duration-150 hover:bg-white/10 hover:text-white"
              >
                <Settings className="h-4 w-4" />
              </Link>
              <button
                onClick={() => logout()}
                title="Se déconnecter"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sidebar-foreground/70 transition-colors duration-150 hover:bg-red-500/20 hover:text-red-400"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : compact && user ? (
            <div className="flex flex-col items-center gap-2">
              <Link to="/parametres" title="Paramètres" className="rounded-lg p-1.5 text-sidebar-foreground/70 transition-colors duration-150 hover:bg-white/10 hover:text-white">
                <Settings className="h-4 w-4" />
              </Link>
              <button onClick={() => logout()} title="Se déconnecter" className="rounded-lg p-1.5 text-sidebar-foreground/70 transition-colors duration-150 hover:bg-red-500/20 hover:text-red-400">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : null}
        </div>

        {/* Compact toggle + footer */}
        <div className="px-3 pb-3">
          <button
            onClick={onToggleCompact}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium text-sidebar-foreground/70 transition-colors duration-150 hover:bg-white/5 hover:text-white",
              compact && "justify-center px-0"
            )}
          >
            {compact ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            {!compact && "Réduire la sidebar"}
          </button>
          {!compact && <p className="mt-2 px-3 text-[10px] text-sidebar-foreground/50">Données hébergées au Canada · Loi 25</p>}
        </div>
      </aside>
    </>
  );
}