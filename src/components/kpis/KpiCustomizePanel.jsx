import React from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { GripVertical, RotateCcw, Plus, Minus } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { kpiId, orderKpisByPreference } from "@/lib/kpiPreferences";

/**
 * Edit-mode panel for /kpis: lets the user show/hide each indicator and
 * drag-reorder the cards within its domain section, and opt into additional
 * indicators (`addableCatalog`) that aren't shown by default. Changes call
 * onChange with the full updated preference object - the caller is
 * responsible for persisting it (see Kpis.jsx).
 */
export default function KpiCustomizePanel({ byDomain, domainLabels, prefs, onChange, addableCatalog = [] }) {
  const orderedByDomain = orderKpisByPreference(byDomain, prefs);
  const hiddenSet = new Set(prefs.hidden || []);
  const addedSet = new Set(prefs.added || []);

  const toggleHidden = (id) => {
    const hidden = hiddenSet.has(id)
      ? (prefs.hidden || []).filter((h) => h !== id)
      : [...(prefs.hidden || []), id];
    onChange({ ...prefs, hidden });
  };

  const toggleAdded = (id) => {
    const added = addedSet.has(id)
      ? (prefs.added || []).filter((a) => a !== id)
      : [...(prefs.added || []), id];
    onChange({ ...prefs, added });
  };

  const handleDragEnd = (domain) => (result) => {
    if (!result.destination) return;
    const ids = orderedByDomain[domain].map((k) => kpiId(k));
    const [moved] = ids.splice(result.source.index, 1);
    ids.splice(result.destination.index, 0, moved);
    onChange({ ...prefs, order: { ...prefs.order, [domain]: ids } });
  };

  const resetDomain = (domain) => {
    const idsInDomain = new Set((byDomain[domain] || []).map((k) => kpiId(k)));
    onChange({
      ...prefs,
      hidden: (prefs.hidden || []).filter((h) => !idsInDomain.has(h)),
      order: { ...prefs.order, [domain]: [] },
    });
  };

  return (
    <div className="space-y-6 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4">
      <p className="text-sm text-muted-foreground">
        Active ou masque chaque indicateur, et glisse-le pour changer son ordre dans sa section. Tes choix sont propres à ton compte.
      </p>
      {Object.entries(domainLabels).map(([domain, label]) => {
        const items = orderedByDomain[domain];
        if (!items || items.length === 0) return null;
        return (
          <div key={domain}>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">{label}</h3>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => resetDomain(domain)}>
                <RotateCcw className="mr-1 h-3 w-3" /> Réinitialiser
              </Button>
            </div>
            <DragDropContext onDragEnd={handleDragEnd(domain)}>
              <Droppable droppableId={domain}>
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-1.5">
                    {items.map((k, idx) => {
                      const id = kpiId(k);
                      const hidden = hiddenSet.has(id);
                      return (
                        <Draggable key={id} draggableId={id} index={idx}>
                          {(dragProvided, dragSnapshot) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              className={`flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 ${dragSnapshot.isDragging ? "shadow-md" : ""} ${hidden ? "opacity-50" : ""}`}
                            >
                              <span {...dragProvided.dragHandleProps} className="cursor-grab text-muted-foreground">
                                <GripVertical className="h-4 w-4" />
                              </span>
                              <span className="flex-1 text-sm">{k.name}</span>
                              <Switch checked={!hidden} onCheckedChange={() => toggleHidden(id)} />
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>
        );
      })}

      {addableCatalog.length > 0 && (
        <div>
          <h3 className="mb-1 text-sm font-semibold">+ Ajouter un indicateur</h3>
          <p className="mb-2 text-xs text-muted-foreground">
            Ces indicateurs ne sont pas affichés par défaut. Ils n'apparaissent sur la page que tant que tes données permettent de les calculer.
          </p>
          <div className="space-y-1.5">
            {addableCatalog.map((k) => {
              const added = addedSet.has(k.id);
              return (
                <div
                  key={k.id}
                  className={`flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 ${!k.available ? "opacity-50" : ""}`}
                >
                  <span className="w-20 shrink-0 text-xs uppercase tracking-wide text-muted-foreground">
                    {domainLabels[k.domain] || k.domain}
                  </span>
                  <span className="flex-1 text-sm">{k.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {k.available ? `${k.value.toLocaleString("fr-CA")}${k.unit}` : "données insuffisantes"}
                  </span>
                  <Button
                    variant={added ? "secondary" : "outline"}
                    size="sm"
                    className="h-7 px-2"
                    disabled={!k.available && !added}
                    onClick={() => toggleAdded(k.id)}
                  >
                    {added ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
