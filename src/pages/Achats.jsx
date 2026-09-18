import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import StatCard from "@/components/StatCard";
import EmptyState from "@/components/EmptyState";
import { Truck, AlertTriangle, PackageCheck, Timer } from "lucide-react";
import { fetchAll } from "@/lib/fetchAll";

const statusLabels = { recu: "Reçu", en_cours: "En cours", retard: "En retard", annule: "Annulé" };
const statusColors = {
  recu: "text-emerald-600", en_cours: "text-amber-600",
  retard: "text-red-600", annule: "text-muted-foreground",
};
const supplierStatusLabels = { actif: "Actif", inactif: "Inactif", problematique: "Problématique" };

// Cette page existait comme donnée (Purchase/Supplier n'étaient consommés que
// pour le comptage de cohérence interne de la page Audit) sans jamais être
// montrée à l'utilisateur : les achats et fournisseurs importés
// disparaissaient après l'import. C'est le module métier qui leur manquait.
export default function Achats() {
  const { data: purchases, isLoading: lp } = useQuery({
    queryKey: ["purchases"],
    queryFn: () => fetchAll(base44.entities.Purchase, "-date"),
  });
  const { data: suppliers, isLoading: ls } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => fetchAll(base44.entities.Supplier),
  });

  if (lp || ls) return <p className="text-sm text-muted-foreground">Chargement…</p>;

  const hasPurchases = purchases && purchases.length > 0;
  const hasSuppliers = suppliers && suppliers.length > 0;

  if (!hasPurchases && !hasSuppliers) {
    return (
      <EmptyState
        icon={Truck}
        title="Aucune donnée d'achat"
        description="Importez vos commandes fournisseurs ou votre liste de fournisseurs pour suivre les délais, statuts et fiabilité."
      />
    );
  }

  const supplierName = {};
  (suppliers || []).forEach((s) => { supplierName[s.supplier_id] = s.supplier_name || s.supplier_id; });

  const total = purchases?.length || 0;
  const late = (purchases || []).filter((p) => p.status === "retard").length;
  const received = (purchases || []).filter((p) => p.status === "recu").length;
  const delaySamples = (purchases || []).filter((p) => p.delay_days !== null && p.delay_days !== undefined);
  const avgDelay = delaySamples.length > 0
    ? Math.round(delaySamples.reduce((s, p) => s + Number(p.delay_days || 0), 0) / delaySamples.length)
    : null;
  const activeSuppliers = (suppliers || []).filter((s) => s.status === "actif").length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Achats & Fournisseurs</h1>
        <p className="mt-1 text-muted-foreground">Commandes fournisseurs, délais de livraison et fiabilité des partenaires.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Commandes suivies" value={total.toLocaleString()} icon={PackageCheck} />
        <StatCard
          label="En retard"
          value={late.toLocaleString()}
          sublabel={total > 0 ? `${Math.round((late / total) * 100)}% des commandes` : undefined}
          icon={AlertTriangle}
          accent={late > 0 ? "bg-red-50 text-red-600" : "bg-muted text-muted-foreground"}
        />
        <StatCard label="Délai moyen" value={avgDelay === null ? "-" : `${avgDelay} j`} sublabel={avgDelay === null ? "aucune donnée de délai" : "vs date prévue"} icon={Timer} />
        <StatCard label="Fournisseurs actifs" value={`${activeSuppliers} / ${suppliers?.length || 0}`} icon={Truck} />
      </div>

      {hasSuppliers && (
        <div className="overflow-x-auto rounded-xl border border-border">
          <h2 className="px-4 pt-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Fournisseurs</h2>
          <table className="w-full min-w-[700px] text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Fournisseur</th>
                <th className="px-4 py-3 font-medium">Pays</th>
                <th className="px-4 py-3 font-medium">Délai moyen</th>
                <th className="px-4 py-3 font-medium">Score qualité</th>
                <th className="px-4 py-3 font-medium">Fiabilité</th>
                <th className="px-4 py-3 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {suppliers.slice(0, 30).map((s) => (
                <tr key={s.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{s.supplier_name || s.supplier_id}</td>
                  <td className="px-4 py-3">{s.country || "-"}</td>
                  <td className="px-4 py-3">{s.average_delivery_days != null ? `${s.average_delivery_days} j` : "-"}</td>
                  <td className="px-4 py-3">{s.quality_score != null ? s.quality_score : "-"}</td>
                  <td className="px-4 py-3">{s.reliability_score != null ? s.reliability_score : "-"}</td>
                  <td className="px-4 py-3">
                    <span className={s.status === "actif" ? "text-emerald-600" : s.status === "problematique" ? "text-red-600" : "text-muted-foreground"}>
                      {supplierStatusLabels[s.status] || s.status || "-"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hasPurchases && (
        <div className="overflow-x-auto rounded-xl border border-border">
          <h2 className="px-4 pt-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Commandes</h2>
          <table className="w-full min-w-[700px] text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Fournisseur</th>
                <th className="px-4 py-3 font-medium">Produit</th>
                <th className="px-4 py-3 font-medium">Quantité</th>
                <th className="px-4 py-3 font-medium">Coût total</th>
                <th className="px-4 py-3 font-medium">Délai</th>
                <th className="px-4 py-3 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {purchases.slice(0, 30).map((p) => (
                <tr key={p.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">{p.date || "-"}</td>
                  <td className="px-4 py-3 font-medium">{supplierName[p.supplier_id] || p.supplier_id || "-"}</td>
                  <td className="px-4 py-3">{p.product_id || "-"}</td>
                  <td className="px-4 py-3">{p.quantity != null ? p.quantity : "-"}</td>
                  <td className="px-4 py-3">{p.total_cost != null ? `${Math.round(p.total_cost).toLocaleString()} $` : "-"}</td>
                  <td className="px-4 py-3">{p.delay_days != null ? `${p.delay_days} j` : "-"}</td>
                  <td className="px-4 py-3">
                    <span className={statusColors[p.status] || "text-muted-foreground"}>{statusLabels[p.status] || p.status || "-"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
