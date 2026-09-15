import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Trash2, ExternalLink, Loader2, Crosshair, RotateCcw } from "lucide-react";

const marketPositions = [
  { value: "leader", label: "Leader" },
  { value: "challenger", label: "Challenger" },
  { value: "suiveur", label: "Suiveur" },
  { value: "niche", label: "Niche" },
];

const pricePositions = [
  { value: "inferieur", label: "Inférieur" },
  { value: "egal", label: "Égal" },
  { value: "superieur", label: "Supérieur" },
];

export default function CompetitorsManager() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    website: "",
    sector: "",
    market_position: "suiveur",
    price_position: "egal",
  });

  const { data: competitors, isLoading } = useQuery({
    queryKey: ["competitors"],
    queryFn: async () => {
      const list = await base44.entities.Competitor.list();
      return list || [];
    },
  });

  const resetForm = () => {
    setForm({ name: "", website: "", sector: "", market_position: "suiveur", price_position: "egal" });
    setAdding(false);
  };

  const handleAdd = async () => {
    if (!form.name.trim()) {
      toast({ title: "Le nom du concurrent est requis", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const id = `comp-${Date.now()}`;
      let website = form.website.trim();
      if (website && !website.startsWith("http")) website = `https://${website}`;
      await base44.entities.Competitor.create({
        competitor_id: id,
        name: form.name.trim(),
        website,
        sector: form.sector.trim(),
        market_position: form.market_position,
        price_position: form.price_position,
      });
      qc.invalidateQueries(["competitors"]);
      toast({ title: "Concurrent ajouté", description: "GESCOP surveillera ce concurrent." });
      resetForm();
    } catch (e) {
      toast({ title: "Erreur: " + e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer ce concurrent ?")) return;
    try {
      await base44.entities.Competitor.delete(id);
      qc.invalidateQueries(["competitors"]);
      toast({ title: "Concurrent supprimé" });
    } catch (e) {
      toast({ title: "Erreur: " + e.message, variant: "destructive" });
    }
  };

  const handleClear = async () => {
    if (!competitors?.length || !window.confirm("Supprimer tous les concurrents enregistrés ?")) return;
    setSaving(true);
    try {
      await Promise.all(competitors.map((competitor) => base44.entities.Competitor.delete(competitor.id)));
      await qc.invalidateQueries({ queryKey: ["competitors"] });
      toast({ title: "Suivi des concurrents réinitialisé" });
    } catch (e) {
      toast({ title: "Erreur: " + e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crosshair className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-semibold">Concurrents surveillés</h2>
        </div>
        {!adding && <div className="flex gap-2">
          {competitors?.length > 0 && (
            <Button size="sm" variant="ghost" onClick={handleClear} disabled={saving}>
              <RotateCcw className="mr-1 h-4 w-4" /> Réinitialiser
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
            <Plus className="mr-1 h-4 w-4" /> Ajouter
          </Button>
        </div>}
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Ajoutez uniquement les concurrents que vous souhaitez suivre. Aucun concurrent ni signal n'est généré automatiquement.
      </p>

      {adding && (
        <div className="mb-4 space-y-3 rounded-xl border border-border bg-muted/30 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label>Nom *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Compagnie XYZ" />
            </div>
            <div>
              <Label>Site web</Label>
              <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="exemple.com" />
            </div>
            <div>
              <Label>Secteur</Label>
              <Input value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })} placeholder="Ex: Commerce de détail" />
            </div>
            <div>
              <Label>Position sur le marché</Label>
              <select
                value={form.market_position}
                onChange={(e) => setForm({ ...form, market_position: e.target.value })}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              >
                {marketPositions.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <Label>Position de prix</Label>
              <select
                value={form.price_position}
                onChange={(e) => setForm({ ...form, price_position: e.target.value })}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              >
                {pricePositions.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={resetForm}>Annuler</Button>
            <Button size="sm" onClick={handleAdd} disabled={saving}>
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-4 w-4" />}
              Enregistrer
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : !competitors || competitors.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun concurrent ajouté pour le moment.</p>
      ) : (
        <div className="space-y-2">
          {competitors.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{c.name}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  {c.sector && <span>{c.sector}</span>}
                  {c.market_position && <span className="capitalize">{c.market_position}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {c.website && (
                  <a
                    href={c.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    Voir <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                <button
                  onClick={() => handleDelete(c.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}