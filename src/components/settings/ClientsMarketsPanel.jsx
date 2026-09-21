import React from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Users } from "lucide-react";

export default function ClientsMarketsPanel({ form, setForm }) {
  const handleChange = (field, val) => {
    setForm((f) => ({ ...f, [field]: val }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Clients & Marchés Cibles
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Précisez le profil de votre clientèle et vos canaux de distribution prioritaires.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
        <div>
          <Label htmlFor="client-desc">Typologie de clientèle & Segments cibles</Label>
          <Textarea
            id="client-desc"
            rows={3}
            value={form.clientele || ""}
            onChange={(e) => handleChange("clientele", e.target.value)}
            placeholder="Ex: Passionnés de randonnée, familles actives, aventuriers hivernaux, clubs de plein air..."
            className="mt-1 text-sm"
          />
        </div>

        <div>
          <Label htmlFor="sales-channels">Canaux de vente actifs</Label>
          <Textarea
            id="sales-channels"
            rows={2}
            value={form.tools || ""}
            onChange={(e) => handleChange("tools", e.target.value)}
            placeholder="Ex: Boutiques physiques, Site Web Shopify, Téléphone / Comptoir, Amazon..."
            className="mt-1 text-sm"
          />
        </div>
      </div>
    </div>
  );
}

