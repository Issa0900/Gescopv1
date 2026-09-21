import React from "react";
import { ShieldCheck, TrendingUp, Brain, Activity, Target, Zap } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";

/**
 * @param {Object} props
 * @param {React.ElementType} props.icon
 * @param {string} props.title
 * @param {string} [props.subtitle]
 * @param {React.ReactNode} [props.footer]
 * @param {React.ReactNode} [props.children]
 */
export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <div className="min-h-screen flex bg-background">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-sidebar flex-col justify-between p-12">
        {/* Decorative gradient orbs */}
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-sidebar-primary/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute top-1/3 left-1/2 h-64 w-64 rounded-full bg-chart-4/10 blur-3xl" />
        {/* Grille de fond discrète : rappelle le tableau de bord sans distraire. */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "40px 40px" }}
          aria-hidden="true"
        />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <BrandLogo className="h-11 w-11 shrink-0 shadow-lg shadow-black/20" />
          <div>
            <p className="text-xl font-bold tracking-tight text-sidebar-accent-foreground">GESCOP</p>
            <p className="text-[11px] uppercase tracking-wider text-sidebar-foreground/50">Pilotage intelligent</p>
          </div>
        </div>

        {/* Hero content */}
        <div className="relative z-10 space-y-8 pb-10">
          <div>
            <h2 className="text-3xl font-bold leading-tight text-sidebar-accent-foreground">
              Ne subissez plus vos données.<br />Prenez les devants.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-sidebar-foreground/70 max-w-md">
              GESCOP analyse l'information pour vous : comprenez vos performances, détectez les failles et prenez les bonnes décisions.
              <br /><br />
              <strong className="text-sidebar-foreground/90">Aucune expertise technique requise.</strong> Importez vos fichiers, l'IA s'occupe du reste.
            </p>
          </div>

          <div className="space-y-3 max-w-md">
            <p className="text-sm font-medium text-sidebar-accent-foreground mb-4 uppercase tracking-wider">
              En quelques minutes, GESCOP vous permet de :
            </p>
            {[
              { icon: Activity, label: "Surveiller vos performances et KPI stratégiques" },
              { icon: Target, label: "Détecter les anomalies et identifier les risques" },
              { icon: TrendingUp, label: "Maximiser votre rentabilité et anticiper la trésorerie" },
              { icon: Zap, label: "Transformer la donnée brute en actions concrètes" },
              { icon: ShieldCheck, label: "Vos données. Votre entreprise. Vos décisions." },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 animate-fade-in" style={{ animationDelay: `${0.1 + i * 0.1}s` }}>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary/15">
                  <item.icon className="h-4 w-4 text-sidebar-primary" />
                </div>
                <p className="pt-1.5 text-sm leading-snug text-sidebar-foreground/80">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-xs text-sidebar-foreground/40">
          © 2026 GESCOP · Tous droits réservés
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-20">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center justify-center gap-2.5 mb-8">
            <BrandLogo className="h-10 w-10 shrink-0 shadow-lg shadow-primary/20" />
            <div>
              <p className="text-lg font-bold tracking-tight">GESCOP</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Pilotage intelligent</p>
            </div>
          </div>

          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
              <Icon className="w-7 h-7 text-primary" aria-hidden="true" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h1>
            {subtitle && <p className="text-muted-foreground mt-2 text-sm sm:text-base">{subtitle}</p>}
          </div>

          <div className="bg-card rounded-2xl shadow-sm border border-border p-6 sm:p-8 animate-scale-in">
            {children}
          </div>

          {footer && (
            <p className="text-center text-sm text-muted-foreground mt-6">{footer}</p>
          )}
        </div>
      </div>
    </div>
  );
}