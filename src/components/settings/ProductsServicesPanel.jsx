import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Package, Sparkles, CheckCircle2 } from "lucide-react";

export default function ProductsServicesPanel({ form, setForm }) {
  const handleChange = (field, val) => {
    setForm((f) => ({ ...f, [field]: val }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          Catalogue Produits & Services
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Déclarez les catégories phares ou laissez GESCOP les extraire automatiquement de vos fichiers de vente et de stock.
        </p>
      </div>

      <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-xs text-emerald-900 flex items-start gap-2.5">
        <Sparkles className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
        <div>
          <strong>Auto-détection activée :</strong> Dès que vous importez un fichier de commandes ou d'inventaire, GESCOP indexe automatiquement vos SKU, catégories et prix sans saisie manuelle requise.
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
        <div>
          <Label htmlFor="prod-categories">Principaux produits ou gammes</Label>
          <Textarea
            id="prod-categories"
            rows={3}
            value={form.products || ""}
            onChange={(e) => handleChange("products", e.target.value)}
            placeholder="Ex: Tentes 4 saisons, Sacs de couchage expédition, Bottes de randonnée imperméables..."
            className="mt-1 text-sm"
          />
        </div>

        <div>
          <Label htmlFor="serv-categories">Services & prestations associées</Label>
          <Textarea
            id="serv-categories"
            rows={2}
            value={form.services || ""}
            onChange={(e) => handleChange("services", e.target.value)}
            placeholder="Ex: Entretien et réparation d'équipement, location saisonnière, guidage..."
            className="mt-1 text-sm"
          />
        </div>

        <div>
          <Label htmlFor="sup-names">Principaux fournisseurs & marques partenaires</Label>
          <Input
            id="sup-names"
            value={form.suppliers || ""}
            onChange={(e) => handleChange("suppliers", e.target.value)}
            placeholder="Ex: Arc'teryx, The North Face, Columbia, MSR..."
            className="mt-1 text-sm"
          />
        </div>
      </div>
    </div>
  );
}

