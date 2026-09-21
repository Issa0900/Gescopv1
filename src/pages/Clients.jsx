import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import StatCard from "@/components/StatCard";
import EmptyState from "@/components/EmptyState";
import DataTable from "@/components/ui/DataTable";
import BadgeStatus from "@/components/ui/BadgeStatus";
import { formatCAD, formatNumber, cn } from "@/lib/utils";
import { Users, UserMinus, Crown, DollarSign } from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { churnStats, customerValue, columnPresent, validSalesOrders } from "@/lib/metrics";
import { fetchAll } from "@/lib/fetchAll";

// Palette catégorielle validée CVD (ordre fixe, ne jamais réassigner par sens) —
// voir la skill dataviz : 8 teintes espacées pour rester distinguables en
// deutéranopie/protanopie, contrairement à des hex choisis à l'oeil.
const segmentColors = {
  nouveau: "#2a78d6",
  regulier: "#eb6834",
  vip: "#1baf7a",
  inactif: "#eda100",
  b2b: "#e87ba4",
  haute_valeur: "#008300",
  a_risque: "#4a3aa7",
};

const segmentLabels = {
  nouveau: "Nouveau",
  regulier: "Régulier",
  vip: "VIP",
  inactif: "Inactif",
  b2b: "B2B",
  haute_valeur: "Haute valeur",
  a_risque: "À risque",
};

export default function Clients() {
  // Clic sur une tuile RFM (Champions, Fidèles à réactiver, À risque) : filtre
  // le tableau ci-dessous sur ce segment. Recliquer sur la même tuile efface
  // le filtre.
  const [rfmFilter, setRfmFilter] = useState(null);
  const { data: customers, isLoading } = useQuery({
    queryKey: ["customers"],
    // Paginated: a single list() call caps at 500 rows, so reading customers and
    // orders with one call each truncated the base and made the top-5
    // concentration and the revenue per client depend on how much history
    // happened to fit.
    queryFn: () => fetchAll(base44.entities.Customer),
  });
  const { data: orders, isLoading: lo } = useQuery({
    queryKey: ["orders-clients"],
    queryFn: () => fetchAll(base44.entities.Order, "-date"),
  });
  // Interaction (contacts client : canal, sentiment, résolution) n'avait
  // aucune page — importée, jamais montrée. Elle vit ici, à côté du client
  // qu'elle concerne.
  const { data: interactions } = useQuery({
    queryKey: ["interactions"],
    queryFn: () => fetchAll(base44.entities.Interaction, "-date"),
  });

  if (isLoading || lo) return <p className="text-sm text-muted-foreground">Chargement…</p>;
  if (!customers || customers.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="Aucun client"
        description="Importez vos données clients pour voir leur segmentation, churn et concentration."
      />
    );
  }

  // Compute real revenue and order counts from orders. Refunded orders are
  // excluded - their money went back to the customer, so counting them here
  // overstated concentration, top-client ranking and every client's own CA.
  const revByCustomer = {};
  const ordersByCustomer = {};
  const lastOrderByCustomer = {};
  validSalesOrders(orders).forEach((o) => {
    const cid = o.customer_id;
    if (!cid) return;
    // total_revenue is the field the import pipeline actually populates.
    revByCustomer[cid] = (revByCustomer[cid] || 0) + (Number(o.total_revenue) || Number(o.total) || 0);
    ordersByCustomer[cid] = (ordersByCustomer[cid] || 0) + 1;
    if (o.date && (!lastOrderByCustomer[cid] || o.date > lastOrderByCustomer[cid])) {
      lastOrderByCustomer[cid] = o.date;
    }
  });
  const todayKey = new Date().toISOString().slice(0, 10);
  const enriched = customers.map((c) => {
    const custRev = revByCustomer[c.customer_id] || Number(c.total_revenue) || Number(c.lifetime_value) || 0;
    const custOrders = ordersByCustomer[c.customer_id] || Number(c.total_orders) || 0;
    const custAov = custOrders > 0 ? (custRev / custOrders) : (Number(c.average_order_value) || 0);
    const lastDate = lastOrderByCustomer[c.customer_id] || c.last_purchase_date || null;
    return {
      ...c,
      _total_revenue: custRev,
      _total_orders: custOrders,
      _aov: custAov,
      _last_order_date: lastDate,
      _recency_days: lastDate
        ? Math.round((new Date(todayKey).getTime() - new Date(lastDate).getTime()) / 86400000)
        : null,
      _churnPct: c.churn_risk === null || c.churn_risk === undefined || c.churn_risk === ""
        ? null
        : Math.round(Number(c.churn_risk) <= 1 ? Number(c.churn_risk) * 100 : Number(c.churn_risk)),
    };
  });

  const total = enriched.length;
  // Same churn definition as the KPI page, the scores and the audit page.
  // This page used to also count "segment a_risque" as churned, so it showed a
  // higher rate than every other screen from the exact same rows.
  const churn = churnStats(customers, orders);
  // null when no customer row has ever carried a status ("actif"/"inactif"/
  // "perdu") - that means the field was never filled in, not a 0 % churn.
  const churnRate = churn.rate === null ? null : Math.round(churn.rate);
  // "0 client à risque" is only meaningful if the risk column was imported.
  const hasChurnRisk = columnPresent(customers, "churn_risk");
  // Optional columns: shown only when at least one customer actually
  // carries them, so an import without postal codes/loyalty points doesn't
  // get a table full of empty dashes.
  const hasPostalCode = columnPresent(customers, "postal_code");
  const hasLoyaltyPoints = columnPresent(customers, "loyalty_points");
  const totalRevenue = enriched.reduce((s, c) => s + (c._total_revenue || 0), 0);
  const sorted = [...enriched].sort((a, b) => (b._total_revenue || 0) - (a._total_revenue || 0));
  const top5Revenue = sorted.slice(0, 5).reduce((s, c) => s + (c._total_revenue || 0), 0);
  const concentration = totalRevenue > 0 ? Math.round((top5Revenue / totalRevenue) * 100) : 0;
  // Divided by the customers who actually ordered, not by the whole base.
  const value = customerValue(orders, customers);
  const avgRevenue = value.avgRevenue === null ? 0 : Math.round(value.avgRevenue);

  const bySegment = {};
  enriched.forEach((c) => {
    const s = c.segment || "non_precise";
    bySegment[s] = (bySegment[s] || 0) + 1;
  });
  const pieData = Object.entries(bySegment).map(([seg, count]) => ({
    name: segmentLabels[seg] || seg,
    value: count,
    key: seg,
  }));

  const topBarData = sorted.slice(0, 10).map((c) => ({
    name: `${c.first_name || ""} ${c.last_name || ""}`.trim() || c.customer_id,
    revenue: Math.round(c._total_revenue || 0),
  }));

  // === Scoring RFM (Récence, Fréquence, Montant) ===
  // Calculable dès qu'il y a des commandes datées - aucune nouvelle colonne
  // requise. Segments définis selon le guide fourni : Champions (achète
  // souvent, récemment, gros montant), Fidèles à réactiver (achetait
  // souvent mais plus depuis 180j+), Comptes à risque financier (gros
  // montant mais statut compromis ou crédit saturé).
  const buyers = enriched.filter((c) => c._total_orders > 0);
  const hasRfm = buyers.length > 0;
  let rfm = null;
  if (hasRfm) {
    const revenues = buyers.map((c) => c._total_revenue).sort((a, b) => a - b);
    const p75Revenue = revenues[Math.floor(revenues.length * 0.75)] ?? 0;
    const medianFrequency = (() => {
      const freqs = buyers.map((c) => c._total_orders).sort((a, b) => a - b);
      return freqs[Math.floor(freqs.length / 2)] ?? 1;
    })();
    const champions = buyers.filter((c) =>
      c._recency_days !== null && c._recency_days <= 60
      && c._total_orders >= Math.max(2, medianFrequency)
      && c._total_revenue >= p75Revenue
    );
    const toReactivate = buyers.filter((c) =>
      c._total_orders >= Math.max(2, medianFrequency)
      && c._recency_days !== null && c._recency_days > 180
    );
    const atRisk = buyers.filter((c) =>
      c._total_revenue >= (revenues[Math.floor(revenues.length * 0.5)] ?? 0)
      && (c.status === "inactif" || c.status === "perdu"
        || (c.credit_limit > 0 && c._total_revenue >= c.credit_limit * 0.8))
    );
    rfm = { champions, toReactivate, atRisk };
  }

  const clientColumns = [
    {
      key: "name",
      header: "Client",
      searchValue: (c) => `${c.first_name || ""} ${c.last_name || ""} ${c.customer_id || ""}`,
      sortValue: (c) => `${c.first_name || ""} ${c.last_name || ""}`.trim() || c.customer_id || "",
      render: (c) => `${c.first_name || ""} ${c.last_name || ""}`.trim() || c.customer_id,
    },
    {
      key: "segment",
      header: "Segment",
      sortValue: (c) => segmentLabels[c.segment] || c.segment || "",
      render: (c) => (
        <span className="inline-flex items-center gap-1.5 text-xs">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: segmentColors[c.segment] || "#94a3b8" }} aria-hidden="true" />
          {segmentLabels[c.segment] || c.segment || "-"}
        </span>
      ),
    },
    ...(hasPostalCode ? [{ key: "postal_code", header: "Code postal", render: (c) => c.postal_code || "-" }] : []),
    ...(hasLoyaltyPoints ? [{ key: "loyalty_points", header: "Points fidélité", align: "right", sortValue: (c) => Number(c.loyalty_points) || 0, render: (c) => c.loyalty_points != null ? formatNumber(c.loyalty_points) : "-" }] : []),
    { key: "_total_orders", header: "Commandes", align: "right", sortValue: (c) => c._total_orders || 0, render: (c) => formatNumber(c._total_orders || 0) },
    { key: "_total_revenue", header: "CA total", align: "right", sortValue: (c) => c._total_revenue || 0, render: (c) => <span className="font-medium">{formatCAD(c._total_revenue || 0)}</span> },
    { key: "_aov", header: "Panier moyen", align: "right", sortValue: (c) => c._aov || 0, render: (c) => formatCAD(c._aov || 0) },
    {
      key: "_churnPct",
      header: "Risque de départ",
      align: "right",
      sortValue: (c) => c._churnPct ?? -1,
      render: (c) => c._churnPct === null ? (
        <span className="text-muted-foreground">-</span>
      ) : (
        <BadgeStatus status={c._churnPct > 60 ? "critical" : c._churnPct > 30 ? "warning" : "neutral"}>{c._churnPct}%</BadgeStatus>
      ),
    },
    {
      key: "status",
      header: "Statut",
      sortValue: (c) => c.status || "",
      render: (c) => (
        <BadgeStatus status={c.status === "actif" ? "good" : c.status === "inactif" ? "critical" : "warning"}>{c.status || "-"}</BadgeStatus>
      ),
    },
  ];

  // Une seule map construite ici plutôt qu'un `customers.find()` relancé par
  // ligne × par accesseur (sort/search/render) : sur une longue liste
  // d'interactions, ça remplace un balayage linéaire répété par un lookup O(1).
  const customerLabelById = {};
  customers.forEach((c) => {
    customerLabelById[c.customer_id] = `${c.first_name || ""} ${c.last_name || ""}`.trim() || c.customer_id;
  });
  const clientLabelFor = (it) => customerLabelById[it.customer_id] || it.customer_id || "";

  const interactionColumns = [
    { key: "date", header: "Date", render: (it) => it.date || "-" },
    {
      key: "client",
      header: "Client",
      sortValue: clientLabelFor,
      searchValue: clientLabelFor,
      render: (it) => clientLabelFor(it) || "-",
    },
    { key: "channel", header: "Canal", render: (it) => it.channel || "-" },
    { key: "subject", header: "Sujet", sortValue: (it) => it.subject || it.type || "", render: (it) => it.subject || it.type || "-" },
    {
      key: "sentiment",
      header: "Sentiment",
      sortValue: (it) => it.sentiment || "",
      render: (it) => {
        const neg = it.sentiment === "negatif" || it.sentiment === "tres_negatif";
        const pos = it.sentiment === "positif";
        return <BadgeStatus status={neg ? "critical" : pos ? "good" : "neutral"}>{it.sentiment || "-"}</BadgeStatus>;
      },
    },
    { key: "resolved", header: "Résolu", sortValue: (it) => (it.resolved === true ? 1 : it.resolved === false ? 0 : -1), render: (it) => it.resolved === true ? "Oui" : it.resolved === false ? "Non" : "-" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
        <p className="mt-1 text-muted-foreground">Segmentation, concentration, churn et valeur vie client.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total clients" value={total.toLocaleString()} icon={Users} />
        {/* Two different questions, so two cards. The cumulative share answers
            "how much of the base have we ever lost"; the period rate answers
            "who has stopped buying lately". Only the second one can improve. */}
        <StatCard
          label="Clients perdus (cumul)"
          value={churnRate === null ? "-" : `${churnRate}%`}
          sublabel={churn.statusMeasured
            ? `${churn.churned} sur ${churn.total} depuis le début${hasChurnRisk ? ` · ${churn.atRisk} à risque` : ""}`
            : "statut client jamais renseigné"}
          icon={UserMinus}
          accent={churnRate > 20 ? "bg-red-50 text-red-600" : "bg-muted text-muted-foreground"}
        />
        <StatCard
          label={`Inactifs depuis ${churn.inactiveMonths} mois`}
          value={churn.behaviourRate !== null ? `${Math.round(churn.behaviourRate)}%` : "-"}
          sublabel={churn.measurable
            ? `${churn.lapsed} sur ${churn.buyers} clients ayant déjà commandé`
            : "historique de commandes absent"}
          icon={UserMinus}
          accent={churn.behaviourRate > 30 ? "bg-red-50 text-red-600" : "bg-muted text-muted-foreground"}
        />
        <StatCard label="Concentration top 5" value={`${concentration}%`} sublabel="du CA total" icon={Crown} accent={concentration > 40 ? "bg-amber-50 text-amber-600" : "bg-muted text-muted-foreground"} />
        <StatCard label="Revenu moyen par client" value={`${avgRevenue.toLocaleString("fr-CA")} $`} sublabel={`${value.buyers} clients ayant commandé`} icon={DollarSign} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Répartition par segment</h2>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={(e) => `${e.name}: ${e.value}`}>
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={segmentColors[entry.key] || "#94a3b8"} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Top 10 clients (CA total)</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={topBarData} layout="vertical" margin={{ left: 20, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v) => `${v.toLocaleString()} $`} />
              <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {hasRfm && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Scoring RFM (Récence, Fréquence, Montant)</h2>
          <p className="mb-4 text-xs text-muted-foreground">Segmentation calculée sur l'historique de commandes.</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { key: "champions", label: "Champions", list: rfm.champions, ring: "border-emerald-200 bg-emerald-50", text: "text-emerald-700", desc: "Achats récents (≤60j), fréquents, panier élevé — priorité B2B/revendeurs" },
              { key: "toReactivate", label: "Fidèles à réactiver", list: rfm.toReactivate, ring: "border-amber-200 bg-amber-50", text: "text-amber-700", desc: "Achetaient souvent, aucune commande depuis plus de 180 jours" },
              { key: "atRisk", label: "Comptes à risque financier", list: rfm.atRisk, ring: "border-red-200 bg-red-50", text: "text-red-700", desc: "CA élevé mais statut compromis ou crédit saturé (>80%)" },
            ].map((seg) => (
              <button
                key={seg.key}
                type="button"
                onClick={() => setRfmFilter((cur) => (cur === seg.key ? null : seg.key))}
                aria-pressed={rfmFilter === seg.key}
                className={cn(
                  "rounded-lg border p-4 text-left transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                  seg.ring,
                  rfmFilter === seg.key ? "ring-2 ring-offset-2" : "hover:shadow-sm"
                )}
              >
                <p className={cn("text-xs font-medium uppercase", seg.text)}>{seg.label}</p>
                <p className={cn("mt-1 text-2xl font-bold", seg.text)}>{seg.list.length}</p>
                <p className={cn("mt-1 text-xs", seg.text, "opacity-80")}>{seg.desc}</p>
              </button>
            ))}
          </div>
          {rfmFilter && (
            <p className="mt-3 text-xs text-muted-foreground">
              Tableau filtré sur « {rfmFilter === "champions" ? "Champions" : rfmFilter === "toReactivate" ? "Fidèles à réactiver" : "Comptes à risque financier"} » —{" "}
              <button type="button" className="underline underline-offset-2 hover:text-foreground" onClick={() => setRfmFilter(null)}>
                effacer le filtre
              </button>
            </p>
          )}
        </div>
      )}

      <DataTable
        columns={clientColumns}
        data={rfmFilter ? rfm[rfmFilter] : sorted}
        rowKey={(c) => c.id}
        searchPlaceholder="Rechercher un client…"
        emptyIcon={Users}
        emptyTitle="Aucun client ne correspond"
        emptyDescription={rfmFilter ? "Ce segment RFM ne contient aucun client pour le moment." : "Essayez d'élargir la recherche."}
      />

      {interactions && interactions.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Interactions récentes</h2>
          <DataTable
            columns={interactionColumns}
            data={interactions}
            rowKey={(it) => it.id}
            searchPlaceholder="Rechercher une interaction…"
            emptyTitle="Aucune interaction"
          />
        </div>
      )}
    </div>
  );
}