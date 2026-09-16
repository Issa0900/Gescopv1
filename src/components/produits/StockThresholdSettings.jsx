import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { SlidersHorizontal, Check, RotateCcw } from "lucide-react";

const SLIDER_MAX = 100;
const DORMANT_MAX = 24;

/**
 * Stock alert threshold - applied live.
 *
 * The control is fully driven by the parent: every move calls onChange, the page
 * recomputes immediately, and the alert count below updates as you drag. Saving
 * is a separate, explicit step, so a value can be tried before it is committed.
 *
 * Previously the component kept its own copy of the threshold and the page only
 * saw it after "Appliquer" persisted it to the company record and that query
 * refetched - you had to commit a value in order to find out what it did.
 */
export default function StockThresholdSettings({
  company,
  settings,
  isDraft,
  alertCount,
  dormantCount,
  dormancyMeasurable,
  trackedCount,
  onChange,
  onSaved,
}) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = (patch) => onChange({ ...settings, ...patch });

  const onThresholdInput = (raw) => {
    // An empty field would coerce to 0 and silently empty the alert list, so it
    // is held at 0 explicitly and the user sees the effect right away.
    const n = raw === "" ? 0 : Math.max(0, Math.floor(Number(raw)) || 0);
    set({ threshold: n });
  };

  const save = async () => {
    if (!company) return;
    setSaving(true);
    try {
      await base44.entities.Company.update(company.id, {
        stock_alert_threshold: Math.max(0, Number(settings.threshold) || 0),
        stock_alert_use_reorder_point: settings.useReorderPoint,
        stock_dormant_months: Math.max(1, Number(settings.dormantMonths) || 3),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onSaved?.();
    } finally {
      setSaving(false);
    }
  };

  const share = trackedCount > 0 ? Math.round((alertCount / trackedCount) * 100) : 0;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Seuil d'alerte stock
          </h2>
        </div>
        {/* Live counts: the whole point of the controls is watching these move. */}
        <p className="text-sm text-muted-foreground">
          <span className="text-base font-semibold text-foreground">{alertCount}</span>
          {" "}en alerte
          {trackedCount > 0 && <span className="ml-1 text-xs">({share} %)</span>}
          {dormancyMeasurable && (
            <>
              <span className="mx-2 text-border">·</span>
              <span className="text-base font-semibold text-foreground">{dormantCount}</span>
              {" "}dormant{dormantCount === 1 ? "" : "s"}
            </>
          )}
        </p>
      </div>

      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:gap-8">
        <div className="min-w-0 flex-1">
          <Label htmlFor="stock-threshold-range" className="text-xs text-muted-foreground">
            Alerter à partir de {settings.threshold} unité{settings.threshold === 1 ? "" : "s"} en stock
          </Label>
          <div className="mt-2 flex items-center gap-3">
            <input
              id="stock-threshold-range"
              type="range"
              min="0"
              max={SLIDER_MAX}
              step="1"
              value={Math.min(SLIDER_MAX, Number(settings.threshold) || 0)}
              onChange={(e) => set({ threshold: Number(e.target.value) })}
              className="h-1.5 min-w-0 flex-1 cursor-pointer accent-primary"
            />
            <Input
              type="number"
              min="0"
              aria-label="Seuil d'alerte en unités"
              value={String(settings.threshold)}
              onChange={(e) => onThresholdInput(e.target.value)}
              className="w-20 shrink-0"
            />
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
            <span>0</span><span>{SLIDER_MAX}+</span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <Label htmlFor="dormant-range" className="text-xs text-muted-foreground">
            Dormant après {settings.dormantMonths} mois sans vente
          </Label>
          <div className="mt-2 flex items-center gap-3">
            <input
              id="dormant-range"
              type="range"
              min="1"
              max={DORMANT_MAX}
              step="1"
              value={Math.min(DORMANT_MAX, Number(settings.dormantMonths) || 3)}
              onChange={(e) => set({ dormantMonths: Number(e.target.value) })}
              className="h-1.5 min-w-0 flex-1 cursor-pointer accent-primary"
              disabled={!dormancyMeasurable}
            />
            <Input
              type="number"
              min="1"
              aria-label="Dormance en mois sans vente"
              value={String(settings.dormantMonths)}
              onChange={(e) => set({ dormantMonths: Math.max(1, Math.floor(Number(e.target.value) || 1)) })}
              className="w-20 shrink-0"
              disabled={!dormancyMeasurable}
            />
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
            <span>1 mois</span><span>{DORMANT_MAX} mois</span>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <Switch
            id="use-reorder"
            checked={settings.useReorderPoint}
            onCheckedChange={(v) => set({ useReorderPoint: v })}
          />
          <Label htmlFor="use-reorder" className="text-sm font-normal">
            Utiliser aussi le seuil de réappro. de chaque produit
          </Label>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {isDraft && (
            <Button variant="ghost" size="sm" onClick={() => onChange(null)} disabled={saving}>
              <RotateCcw className="mr-1.5 h-4 w-4" /> Rétablir
            </Button>
          )}
          <Button size="sm" onClick={save} disabled={!isDraft || saving || !company}>
            {saved ? <><Check className="mr-1.5 h-4 w-4" /> Enregistré</> : saving ? "…" : "Enregistrer"}
          </Button>
        </div>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        {isDraft
          ? "Réglage en cours d'essai - la liste et les alertes ci-dessous sont déjà recalculées. Enregistrez pour le conserver."
          : "Réglage enregistré. Déplacez le curseur pour tester un autre seuil : tout se recalcule immédiatement."}
      </p>
    </div>
  );
}
