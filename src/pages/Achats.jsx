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
  const { data: inventory, isLoading: li } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => fetchAll(base44.entities.Inventory),
  });
  const { data: products, isLoading: lpr } = useQuery({
    queryKey: ["products"],
    queryFn: () => fetchAll(base44.entities.Product),
  });

  if (lp || ls) return <p className="text-sm text-muted-foreground">Chargement…</p>;
  if (lp || ls || li || lpr) return <p className="text-sm text-muted-foreground">Chargement…</p>;

  const hasPurchases = purchases && purchases.length > 0;
  const hasSuppliers = suppliers && suppliers.length > 0;
  const hasInventory = inventory && inventory.length > 0;

  if (!hasPurchases && !hasSuppliers && !hasInventory) {
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

  // Optional columns: shown only when at least one supplier actually carries
  // that field, so a company whose import never had it doesn't get a table
  // full of empty dashes.
  const hasCity = (suppliers || []).some((s) => s.city);
  const hasContact = (suppliers || []).some((s) => s.contact_name);
  const hasEmail = (suppliers || []).some((s) => s.email);
  const hasPaymentTerms = (suppliers || []).some((s) => s.payment_terms);

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
                {hasCity && <th className="px-4 py-3 font-medium">Ville</th>}
                <th className="px-4 py-3 font-medium">Pays</th>
                {hasContact && <th className="px-4 py-3 font-medium">Contact</th>}
                {hasEmail && <th className="px-4 py-3 font-medium">Courriel</th>}
                {hasPaymentTerms && <th className="px-4 py-3 font-medium">Conditions paiement</th>}
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
                  {hasCity && <td className="px-4 py-3">{s.city || "-"}</td>}
                  <td className="px-4 py-3">{s.country || "-"}</td>
                  {hasContact && <td className="px-4 py-3">{s.contact_name || "-"}</td>}
                  {hasEmail && <td className="px-4 py-3">{s.email || "-"}</td>}
                  {hasPaymentTerms && <td className="px-4 py-3">{s.payment_terms || "-"}</td>}
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
      {hasInventory && (
        <div className="overflow-x-auto rounded-xl border border-border mt-8">
          <h2 className="px-4 pt-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Matrice de Risque Douanier
          </h2>
          <table className="w-full min-w-[800px] text-sm mt-2">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">SKU / Produit</th>
                <th className="px-4 py-3 font-medium">Code Douanier</th>
                <th className="px-4 py-3 font-medium">Origine</th>
                <th className="px-4 py-3 font-medium">Fournisseur (Pays)</th>
                <th className="px-4 py-3 font-medium">Marge brute</th>
                <th className="px-4 py-3 font-medium">Niveau de Risque</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {inventory
                .filter(i => i.origin_country || i.customs_code)
                .slice(0, 30)
                .map((inv) => {
                  const sup = (suppliers || []).find(s => s.supplier_id === inv.supplier_id);
                  const prod = (products || []).find(p => p.product_id === inv.product_id);
                  
                  // Calcul de risque simpliste
                  let riskScore = 0;
                  if (inv.origin_country && String(inv.origin_country).toLowerCase() !== "ca" && String(inv.origin_country).toLowerCase() !== "canada") riskScore += 1;
                  if (sup && sup.country && String(sup.country).toLowerCase() !== "ca" && String(sup.country).toLowerCase() !== "canada") riskScore += 1;
                  if (prod && prod.gross_margin < 20) riskScore += 1; // Faible marge = plus sensible aux tarifs douaniers
                  
                  let riskLabel = "Faible";
                  let riskColor = "text-emerald-600 bg-emerald-50";
                  if (riskScore === 1) {
                    riskLabel = "Moyen";
                    riskColor = "text-amber-600 bg-amber-50";
                  } else if (riskScore >= 2) {
                    riskLabel = "Élevé";
                    riskColor = "text-red-600 bg-red-50";
                  }

                  return (
                    <tr key={inv.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{inv.product_id}</td>
                      <td className="px-4 py-3">{inv.customs_code || "-"}</td>
                      <td className="px-4 py-3">{inv.origin_country || "-"}</td>
                      <td className="px-4 py-3">
                        {sup ? `${sup.supplier_name || sup.supplier_id} (${sup.country || "-"})` : "-"}
                      </td>
                      <td className="px-4 py-3">{prod && prod.gross_margin != null ? `${prod.gross_margin} %` : "-"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${riskColor}`}>
                          {riskLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
          {inventory.filter(i => i.origin_country || i.customs_code).length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Aucune donnée d'origine ou de code douanier disponible pour l'analyse de risque.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
