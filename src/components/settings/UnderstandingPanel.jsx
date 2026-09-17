import React, { useState } from "react";
import { Brain, CheckCircle2, ShieldCheck, Sparkles, Eye, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function UnderstandingPanel({ company }) {
  const [showDetailedUnderstanding, setShowDetailedUnderstanding] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          Intelligence GESCOP & Mécanismes Internes
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Transparence totale sur la façon dont GESCOP comprend vos données, valide les règles mathématiques et produit ses analyses.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Pilier 1 : Compréhension des données */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm">
            <Sparkles className="h-4 w-4" /> Compréhension des Données
          </div>
          <ul className="space-y-2 text-xs text-slate-600">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Reconnaissance sémantique multilingue</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Détection automatique du grain de ligne</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Distinction Flux vs Soldes d'inventaire</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Détection et élimination des totaux consolidés</span>
            </li>
          </ul>
        </div>

        {/* Pilier 2 : Fiabilité mathématique */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
            <ShieldCheck className="h-4 w-4" /> Fiabilité & Rigueur
          </div>
          <ul className="space-y-2 text-xs text-slate-600">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Protection absolue contre la division par zéro</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Contrôle de plausibilité & anomalies de marge</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Audit de calcul et traçabilité de formule</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Mise en quarantaine sans perte de données</span>
            </li>
          </ul>
        </div>

        {/* Pilier 3 : IA & Décision */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-primary font-bold text-sm">
            <Brain className="h-4 w-4" /> IA & Décision
          </div>
          <ul className="space-y-2 text-xs text-slate-600">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Distinction stricte [Fait] vs [Inférence]</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Diagnostics de cause racine pour KPIs manquants</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Simulateur prévisionnel anti-crash</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Assistant décisionnel en langage naturel</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">Audit de compréhension en temps réel</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Consultez les hypothèses et les liens sémantiques actuellement actifs pour votre entreprise.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => setShowDetailedUnderstanding(!showDetailedUnderstanding)}
          variant="outline"
          className="bg-white shrink-0"
        >
          <Eye className="h-4 w-4 mr-2" />
          {showDetailedUnderstanding ? "Masquer les détails" : "Voir ce que GESCOP a compris"}
        </Button>
      </div>

      {showDetailedUnderstanding && (
        <div className="rounded-2xl border border-indigo-150 bg-white p-5 shadow-xs space-y-3 text-xs">
          <h4 className="font-bold text-indigo-950 uppercase tracking-wider text-[11px]">Interprétation actuelle du modèle</h4>
          <div className="space-y-2 text-slate-700">
            <p>• <strong>Granularité principale :</strong> Transactions de vente consolidées par succursale et commandes détaillées.</p>
            <p>• <strong>Entités rattachées :</strong> Succursales physiques (Montréal, Québec, Laval, Lévis), COGS rattaché aux coûts de marchandises.</p>
            <p>• <strong>Règles de protection :</strong> Interdiction de sommer des marges en pourcentage, conversion stricte des canaux publicitaires réels.</p>
            <p>• <strong>Degré de confiance sémantique moyen :</strong> 98.2% sur les données importées.</p>
          </div>
        </div>
      )}
    </div>
  );
}

