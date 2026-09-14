import React from "react";
import { Upload, Link2, ShoppingBag, Database, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const sources = [
  { icon: Upload, label: "Importer Excel / CSV", desc: "Téléversez un fichier", available: true, link: "/importer" },
  { icon: Database, label: "Connecter QuickBooks", desc: "Synchronisation comptable", available: false },
  { icon: ShoppingBag, label: "Connecter Shopify", desc: "Synchronisation e-commerce", available: false },
  { icon: Link2, label: "Connecter une autre source", desc: "API ou intégration", available: false },
];

const steps = ["Connecter", "Normaliser", "Analyser", "Comprendre", "Agir"];

export default function OnboardingHero() {
  return (
    <div className="animate-fade-in space-y-6">
      <div className="rounded-2xl border border-border bg-card p-8 text-center md:p-12">
        <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Commençons à piloter votre entreprise.</h2>
        <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground md:text-base">
          Connectez vos données et GESCOP construira automatiquement votre tableau de pilotage intelligent.
        </p>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {sources.map((s, i) => {
            const content = (
              <div className={`flex h-full flex-col items-center rounded-xl border p-5 text-center transition-all ${s.available ? "border-border hover:border-primary/30 hover:shadow-md cursor-pointer" : "border-dashed border-border opacity-60"}`}>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                  <s.icon className="h-6 w-6 text-foreground" />
                </div>
                <p className="mt-3 text-sm font-semibold">{s.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{s.desc}</p>
                {!s.available && <span className="mt-2 rounded bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">Bientôt</span>}
              </div>
            );
            return s.available ? <Link key={i} to={s.link}>{content}</Link> : <div key={i}>{content}</div>;
          })}
        </div>
        <p className="mt-6 text-sm text-muted-foreground">Vous pouvez commencer avec un simple fichier Excel.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Comment ça marche</p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{i + 1}</div>
              <span className="text-sm font-medium">{step}</span>
              {i < steps.length - 1 && <ArrowRight className="ml-1 h-4 w-4 text-muted-foreground/40" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}