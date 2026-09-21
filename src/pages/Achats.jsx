import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import StatCard from "@/components/StatCard";
import EmptyState from "@/components/EmptyState";
import DataTable from "@/components/ui/DataTable";
import BadgeStatus from "@/components/ui/BadgeStatus";
import { formatCAD, formatNumber, formatPct } from "@/lib/utils";
import { Truck, AlertTriangle, PackageCheck, Timer } from "lucide-react";
import { fetchAll } from "@/lib/fetchAll";

const statusLabels = { recu: "Reçu", en_cours: "En cours", retard: "En retard", annule: "Annulé" };
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
  const hasPurchaseVolume = (suppliers || []).some((s) => s.purchase_volume != null && Number(s.purchase_volume) > 0);

  const total = purchases?.length || 0;
  const late = (purchases || []).filter((p) => p.status === "retard").length;
  const received = (purchases || []).filter((p) => p.status === "recu").length;
  const delaySamples = (purchases || []).filter((p) => p.delay_days !== null && p.delay_days !== undefined);
  const avgDelay = delaySamples.length > 0
    ? Math.round(delaySamples.reduce((s, p) => s + Number(p.delay_days || 0), 0) / delaySamples.length)
    : null;
  const activeSuppliers = (suppliers || []).filter((s) => s.status === "actif" || !s.status).length;

  const supplierColumns = [
    { key: "name", header: "Fournisseur", searchValue: (s) => s.supplier_name || s.supplier_id || "", sortValue: (s) => s.supplier_name || s.supplier_id || "", render: (s) => s.supplier_name || s.supplier_id },
    ...(hasCity ? [{ key: "city", header: "Ville", render: (s) => s.city || "-" }] : []),
    { key: "country", header: "Pays", render: (s) => s.country || "-" },
    ...(hasContact ? [{ key: "contact_name", header: "Contact", render: (s) => s.contact_name || "-" }] : []),
    ...(hasEmail ? [{ key: "email", header: "Courriel", render: (s) => s.email || "-" }] : []),
    ...(hasPaymentTerms ? [{ key: "payment_terms", header: "Conditions paiement", render: (s) => s.payment_terms || "-" }] : []),
    ...(hasPurchaseVolume ? [{ key: "purchase_volume", header: "Volume d'achats", align: "right", sortValue: (s) => Number(s.purchase_volume) || 0, render: (s) => s.purchase_volume != null ? formatCAD(s.purchase_volume) : "-" }] : []),
    { key: "average_delivery_days", header: "Délai moyen", align: "right", sortValue: (s) => Number(s.average_delivery_days) || 0, render: (s) => s.average_delivery_days != null ? `${s.average_delivery_days} j` : "-" },
    { key: "quality_score", header: "Score qualité", align: "right", sortValue: (s) => Number(s.quality_score) || 0, render: (s) => s.quality_score ?? "-" },
    { key: "reliability_score", header: "Fiabilité", align: "right", sortValue: (s) => Number(s.reliability_score) || 0, render: (s) => s.reliability_score ?? "-" },
    {
      key: "status",
      header: "Statut",
      sortValue: (s) => s.status || "",
      render: (s) => (
        <BadgeStatus status={s.status === "actif" || !s.status ? "good" : s.status === "problematique" ? "critical" : "neutral"}>
          {supplierStatusLabels[s.status] || (s.status ? s.status : "Actif")}
        </BadgeStatus>
      ),
    },
  ];

  const purchaseColumns = [
    { key: "date", header: "Date", render: (p) => p.date || "-" },
    { key: "supplier", header: "Fournisseur", searchValue: (p) => supplierName[p.supplier_id] || p.supplier_id || "", sortValue: (p) => supplierName[p.supplier_id] || p.supplier_id || "", render: (p) => supplierName[p.supplier_id] || p.supplier_id || "-" },
    { key: "product_id", header: "Produit", render: (p) => p.product_id || "-" },
    { key: "quantity", header: "Quantité", align: "right", sortValue: (p) => Number(p.quantity) || 0, render: (p) => p.quantity != null ? formatNumber(p.quantity) : "-" },
    { key: "total_cost", header: "Coût total", align: "right", sortValue: (p) => Number(p.total_cost) || 0, render: (p) => p.total_cost != null ? formatCAD(p.total_cost) : "-" },
    { key: "delay_days", header: "Délai", align: "right", sortValue: (p) => Number(p.delay_days) || 0, render: (p) => p.delay_days != null ? `${p.delay_days} j` : "-" },
    {
      key: "status",
      header: "Statut",
      sortValue: (p) => p.status || "",
      render: (p) => (
        <BadgeStatus status={p.status === "recu" ? "good" : p.status === "en_cours" ? "info" : p.status === "retard" ? "critical" : "neutral"}>
          {statusLabels[p.status] || p.status || "-"}
        </BadgeStatus>
      ),
    },
  ];

  const customsRows = (inventory || []).filter((i) => i.origin_country || i.customs_code).map((inv) => {
    const sup = (suppliers || []).find((s) => s.supplier_id === inv.supplier_id);
    const prod = (products || []).find((p) => p.product_id === inv.product_id);
    let riskScore = 0;
    if (inv.origin_country && String(inv.origin_country).toLowerCase() !== "ca" && String(inv.origin_country).toLowerCase() !== "canada") riskScore += 1;
    if (sup && sup.country && String(sup.country).toLowerCase() !== "ca" && String(sup.country).toLowerCase() !== "canada") riskScore += 1;
    if (prod && prod.gross_margin < 20) riskScore += 1; // Faible marge = plus sensible aux tarifs douaniers
    const riskLabel = riskScore >= 2 ? "Élevé" : riskScore === 1 ? "Moyen" : "Faible";
    const riskStatus = riskScore >= 2 ? "critical" : riskScore === 1 ? "warning" : "good";
    return { ...inv, _sup: sup, _prod: prod, _riskScore: riskScore, _riskLabel: riskLabel, _riskStatus: riskStatus };
  });

  const customsColumns = [
    { key: "product_id", header: "SKU / Produit", render: (inv) => inv.product_id },
    { key: "customs_code", header: "Code Douanier", render: (inv) => inv.customs_code || "-" },
    { key: "origin_country", header: "Origine", render: (inv) => inv.origin_country || "-" },
    { key: "supplier", header: "Fournisseur (Pays)", sortValue: (inv) => inv._sup?.supplier_name || inv._sup?.supplier_id || "", render: (inv) => inv._sup ? `${inv._sup.supplier_name || inv._sup.supplier_id} (${inv._sup.country || "-"})` : "-" },
    { key: "gross_margin", header: "Marge brute", align: "right", sortValue: (inv) => inv._prod?.gross_margin ?? -1, render: (inv) => inv._prod?.gross_margin != null ? formatPct(inv._prod.gross_margin, 0) : "-" },
    {
      key: "risk",
      header: "Niveau de Risque",
      sortValue: (inv) => inv._riskScore,
      render: (inv) => <BadgeStatus status={inv._riskStatus}>{inv._riskLabel}</BadgeStatus>,
    },
  ];

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
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Fournisseurs</h2>
          <DataTable columns={supplierColumns} data={suppliers} rowKey={(s) => s.id} searchPlaceholder="Rechercher un fournisseur…" emptyTitle="Aucun fournisseur" />
        </div>
      )}

      {hasPurchases && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Commandes</h2>
          <DataTable columns={purchaseColumns} data={purchases} rowKey={(p) => p.id} searchPlaceholder="Rechercher une commande…" emptyTitle="Aucune commande" />
        </div>
      )}

      {hasInventory && (
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <AlertTriangle className="h-4 w-4" />
            Matrice de Risque Douanier
          </h2>
          {customsRows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              Aucune donnée d'origine ou de code douanier disponible pour l'analyse de risque.
            </div>
          ) : (
            <DataTable columns={customsColumns} data={customsRows} rowKey={(inv) => inv.id} searchPlaceholder="Rechercher un produit…" emptyTitle="Aucun résultat" />
          )}
        </div>
      )}
    </div>
  );
}
