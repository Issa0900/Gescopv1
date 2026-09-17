import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Building2, Sparkles, MapPin, Globe, Calendar, DollarSign, Languages } from "lucide-react";

export default function CompanyProfilePanel({ form, setForm }) {
  const handleChange = (field, val) => {
    setForm((f) => ({ ...f, [field]: val }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          Profil de référence de l'entreprise
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Les informations fondamentales qui définissent votre entreprise et guident l'intelligence de GESCOP.
        </p>
      </div>

      {/* Carte synthétique : Ce que GESCOP connaît de votre entreprise */}
      <div className="rounded-2xl border border-indigo-150 bg-gradient-to-br from-indigo-50/70 to-slate-50 p-5 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
            <Sparkles className="h-4 w-4" />
          </span>
          <h3 className="text-sm font-bold text-indigo-950">Ce que GESCOP connaît de votre entreprise</h3>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
          <div className="bg-white/80 p-3 rounded-xl border border-indigo-100">
            <span className="text-slate-500 block">Secteur</span>
            <strong className="text-slate-900 font-semibold">{form.sector || "Non spécifié"}</strong>
          </div>
          <div className="bg-white/80 p-3 rounded-xl border border-indigo-100">
            <span className="text-slate-500 block">Modèle d'affaires</span>
            <strong className="text-slate-900 font-semibold">{form.business_model || "Commerce mixte"}</strong>
          </div>
          <div className="bg-white/80 p-3 rounded-xl border border-indigo-100">
            <span className="text-slate-500 block">Territoire</span>
            <strong className="text-slate-900 font-semibold">{form.location || "Québec"}</strong>
          </div>
          <div className="bg-white/80 p-3 rounded-xl border border-indigo-100">
            <span className="text-slate-500 block">Devise de référence</span>
            <strong className="text-slate-900 font-semibold">{form.currency || "CAD ($)"}</strong>
          </div>
        </div>
      </div>

      {/* Formulaire complet */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="comp-name">Nom officiel de l'entreprise *</Label>
            <Input
              id="comp-name"
              value={form.name || ""}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="Ex: Nordik Plein Air Inc."
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="trade-name">Nom commercial / Marque</Label>
            <Input
              id="trade-name"
              value={form.trade_name || ""}
              onChange={(e) => handleChange("trade_name", e.target.value)}
              placeholder="Ex: Nordik Plein Air"
              className="mt-1"
            />
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="comp-desc">Description de l'activité</Label>
            <Textarea
              id="comp-desc"
              rows={3}
              value={form.description || ""}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Décrivez en quelques phrases votre offre principale, votre positionnement et votre mission."
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="comp-sector">Secteur d'activité *</Label>
            <Input
              id="comp-sector"
              value={form.sector || ""}
              onChange={(e) => handleChange("sector", e.target.value)}
              placeholder="Ex: Commerce de détail, Restauration, E-commerce, B2B..."
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="comp-subsector">Sous-secteur spécialisé</Label>
            <Input
              id="comp-subsector"
              value={form.subsector || ""}
              onChange={(e) => handleChange("subsector", e.target.value)}
              placeholder="Ex: Équipements de camping & plein air"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="comp-location">Territoire d'implantation (Pays / Province / Ville)</Label>
            <Input
              id="comp-location"
              value={form.location || ""}
              onChange={(e) => handleChange("location", e.target.value)}
              placeholder="Ex: Québec, Canada"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="comp-website">Site web officiel</Label>
            <Input
              id="comp-website"
              value={form.website || ""}
              onChange={(e) => handleChange("website", e.target.value)}
              placeholder="https://nordikpleinair.ca"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="comp-currency">Devise comptable</Label>
            <Input
              id="comp-currency"
              value={form.currency || "CAD"}
              onChange={(e) => handleChange("currency", e.target.value)}
              placeholder="CAD ($), USD ($), EUR (€)..."
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="comp-year">Année de création</Label>
            <Input
              id="comp-year"
              type="number"
              value={form.creation_year || ""}
              onChange={(e) => handleChange("creation_year", Number(e.target.value))}
              placeholder="Ex: 2018"
              className="mt-1"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

