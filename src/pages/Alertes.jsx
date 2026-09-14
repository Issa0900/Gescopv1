import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import EmptyState from "@/components/EmptyState";
import PriorityBadge from "@/components/PriorityBadge";
import { computeLiveAlerts } from "@/lib/liveAlerts";
import { fetchAll } from "@/lib/fetchAll";
import { useCompany } from "@/hooks/useCompany";
import { Bell, Check, Activity } from "lucide-react";

const levelOrder = { critique: 0, important: 1, modere: 2, info: 3, faible: 4 };

export default function Alertes() {
  const qc = useQueryClient();
  // Stock alerts honour the company threshold, like the Produits page and the KPIs.
  const { company } = useCompany();

  const { data: stored, isLoading } = useQuery({
    queryKey: ["alerts-all"],
    queryFn: () => base44.entities.Alert.list("-created_date", 50),
  });

  const { data: live } = useQuery({
    queryKey: ["alerts-live", company?.stock_alert_threshold, company?.stock_alert_use_reorder_point],
    queryFn: async () => {
      // Read in full: alerts are thresholds on aggregates, so a truncated
      // source moves the threshold. Cashflow in particular was capped at 100
      // rows here, which is barely three months of daily balances to judge a
      // runway on. Destructured by name to keep the order unambiguous.
      const [transactions, customers, orders, campaignDaily, inventory, cashflow, products] = await Promise.all([
        fetchAll(base44.entities.Transaction, "-date"),
        fetchAll(base44.entities.Customer, "-created_date"),
        fetchAll(base44.entities.Order, "-date"),
        fetchAll(base44.entities.CampaignDaily, "-date"),
        fetchAll(base44.entities.Inventory, "-date"),
        fetchAll(base44.entities.Cashflow, "-date"),
        fetchAll(base44.entities.Product),
      ]);
      return computeLiveAlerts({ transactions, orders, customers, campaignDaily, products, inventory, cashflow, company });
    },
  });

  const markRead = async (id) => {
    await base44.entities.Alert.update(id, { status: "lue" });
    qc.invalidateQueries(["alerts-all"]);
    qc.invalidateQueries(["alerts-unread"]);
  };

  const alerts = React.useMemo(
    () =>
      [...(live || []), ...(stored || [])].sort(
        (a, b) => (levelOrder[a.level] ?? 5) - (levelOrder[b.level] ?? 5)
      ),
    [live, stored]
  );

  if (isLoading) return <p className="text-sm text-muted-foreground">Chargement…</p>;

  if (alerts.length === 0) {
    return (
      <EmptyState
        icon={Bell}
        title="Aucune alerte"
        description="Aucun seuil critique n'est franchi dans vos données actuelles."
      />
    );
  }

  const criticalCount = alerts.filter((a) => a.level === "critique").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Centre d'alertes</h1>
        <p className="mt-1 text-muted-foreground">
          {criticalCount > 0
            ? `${criticalCount} alerte${criticalCount > 1 ? "s" : ""} critique${criticalCount > 1 ? "s" : ""} sur ${alerts.length} au total.`
            : `${alerts.length} alerte${alerts.length > 1 ? "s" : ""}, aucune critique.`}
        </p>
      </div>

      <div className="space-y-2">
        {alerts.map((a) => (
          <div
            key={a.id}
            className={`flex items-start gap-3 rounded-xl border p-4 ${
              a.status === "non_lue" ? "border-border bg-card" : "border-border bg-muted/20"
            }`}
          >
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <PriorityBadge level={a.level} />
                {a.category && <span className="text-xs text-muted-foreground">{a.category}</span>}
                {a.live && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    <Activity className="h-3 w-3" />
                    Temps réel
                  </span>
                )}
                {!a.live && a.status === "non_lue" && <span className="h-2 w-2 rounded-full bg-primary" />}
              </div>
              <p className="mt-2 font-medium">{a.title}</p>
              {a.message && <p className="text-sm text-muted-foreground">{a.message}</p>}
              {a.live ? (
                <p className="mt-1 text-xs text-muted-foreground">Calculée à l'instant depuis vos données</p>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(a.created_date).toLocaleString("fr-CA")}
                </p>
              )}
            </div>
            {!a.live && a.status === "non_lue" && (
              <button
                onClick={() => markRead(a.id)}
                className="shrink-0 rounded-lg border border-border p-2 text-muted-foreground hover:bg-muted"
                aria-label="Marquer comme lue"
              >
                <Check className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}