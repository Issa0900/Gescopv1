import React from "react";
import { Target, Check, HelpCircle } from "lucide-react";

const BUSINESS_MODELS = [
  { id: "B2C", label: "B2C (Vente aux particuliers)", desc: "Commerce grand public, boutiques, e-commerce, clients individuels." },
  { id: "B2B", label: "B2B (Vente aux entreprises)", desc: "Comptes corporatifs, facturation sur devis, cycles de vente longs." },
  { id: "B2B2C", label: "B2B2C", desc: "Vente via des intermédiaires, distributeurs ou plateformes partenaires." },
  { id: "D2C", label: "D2C (Direct to Consumer)", desc: "Marque fabricante vendant directement sans distributeur." },
  { id: "produits", label: "Vente de Produits physiques", desc: "Gestion des stocks, approvisionnement, expéditions et logistique." },
  { id: "services", label: "Vente de Services / Conseil", desc: "Temps passé, forfaits, honoraires, expertise humaine." },
  { id: "abonnement", label: "Abonnement / Récurrent (MRR)", desc: "Adhésions, licences mensuelles, fidélisation et suivi du churn." },
  { id: "location", label: "Location d'équipements / Biens", desc: "Tarification à l'usage, gestion de parc, taux d'occupation." },
  { id: "projet", label: "Sur Projet / Contrat", desc: "Jalons de facturation, budgets fermes, acomptes et livrables." },
  { id: "commission", label: "Commission / Courtage", desc: "Pourcentage perçu sur le volume d'affaires réalisé." },
];

export default function BusinessModelPanel({ form, setForm }) {
  const currentModels = (form.business_model || "")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);

  const toggleModel = (id) => {
    let next;
    if (currentModels.includes(id)) {
      next = currentModels.filter((m) => m !== id);
    } else {
      next = [...currentModels, id];
    }
    setForm((f) => ({ ...f, business_model: next.join(", ") }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Activité & Modèle d'affaires
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Permet à GESCOP de comprendre exactement comment votre entreprise génère ses revenus et calibre automatiquement les KPI, les analyses financières et les signaux du Radar.
        </p>
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs text-blue-900 flex items-start gap-2.5">
        <HelpCircle className="h-4 w-4 shrink-0 mt-0.5 text-blue-600" />
        <p>
          Vous pouvez sélectionner plusieurs modèles si votre activité est hybride (ex: <strong>B2C</strong> + <strong>Vente de produits</strong> + <strong>Location</strong>).
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {BUSINESS_MODELS.map((bm) => {
          const isSelected = currentModels.includes(bm.id);
          return (
            <div
              key={bm.id}
              onClick={() => toggleModel(bm.id)}
              className={`cursor-pointer rounded-xl border p-4 transition-all ${
                isSelected
                  ? "border-primary bg-primary/5 shadow-xs"
                  : "border-border bg-card hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">{bm.label}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{bm.desc}</p>
                </div>
                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                    isSelected ? "border-primary bg-primary text-primary-foreground" : "border-slate-300"
                  }`}
                >
                  {isSelected && <Check className="h-3.5 w-3.5" />}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

