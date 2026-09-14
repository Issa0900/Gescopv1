import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import StatCard from "@/components/StatCard";
import EmptyState from "@/components/EmptyState";
import { Users, UserMinus, Crown, DollarSign } from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { churnStats, customerValue, columnPresent } from "@/lib/metrics";
import { fetchAll } from "@/lib/fetchAll";

const segmentColors = {
  nouveau: "#3b82f6",
  regulier: "#10b981",
  vip: "#f59e0b",
  inactif: "#ef4444",
  b2b: "#8b5cf6",
  haute_valeur: "#06b6d4",
  a_risque: "#f97316",
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

  // Compute real revenue and order counts from orders
  const revByCustomer = {};
  const ordersByCustomer = {};
  (orders || []).forEach((o) => {
    const cid = o.customer_id;
    if (!cid) return;
    revByCustomer[cid] = (revByCustomer[cid] || 0) + (Number(o.total) || 0);
    ordersByCustomer[cid] = (ordersByCustomer[cid] || 0) + 1;
  });
  const enriched = customers.map((c) => ({
    ...c,
    _total_revenue: revByCustomer[c.customer_id] || 0,
    _total_orders: ordersByCustomer[c.customer_id] || 0,
    _aov: (ordersByCustomer[c.customer_id] || 0) > 0
      ? (revByCustomer[c.customer_id] || 0) / ordersByCustomer[c.customer_id]
      : 0,
    // churn_risk is imported as a 0–1 ratio; displaying it raw showed "1%" for
    // a client with a 70% departure risk.
    // null when the column is absent — rendered as « — ». Showing 0 % on every
    // client would read as "nobody is at risk", which is not what an empty
    // column says.
    _churnPct: c.churn_risk === null || c.churn_risk === undefined || c.churn_risk === ""
      ? null
      : Math.round(Number(c.churn_risk) <= 1 ? Number(c.churn_risk) * 100 : Number(c.churn_risk)),
  }));

  const total = enriched.length;
  // Same churn definition as the KPI page, the scores and the audit page.
  // This page used to also count "segment a_risque" as churned, so it showed a
  // higher rate than every other screen from the exact same rows.
  const churn = churnStats(customers, orders);
  const churnRate = churn.rate === null ? 0 : Math.round(churn.rate);
  // "0 client à risque" is only meaningful if the risk column was imported.
  const hasChurnRisk = columnPresent(customers, "churn_risk");
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
          value={`${churnRate}%`}
          sublabel={`${churn.churned} sur ${churn.total} depuis le début${hasChurnRisk ? ` · ${churn.atRisk} à risque` : ""}`}
          icon={UserMinus}
          accent={churnRate > 20 ? "bg-red-50 text-red-600" : "bg-muted text-muted-foreground"}
        />
        <StatCard
          label={`Inactifs depuis ${churn.inactiveMonths} mois`}
          value={churn.behaviourRate !== null ? `${Math.round(churn.behaviourRate)}%` : "—"}
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

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[700px] text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="px-4 py-3 font-medium">Segment</th>
              <th className="px-4 py-3 font-medium">Commandes</th>
              <th className="px-4 py-3 font-medium">CA total</th>
              <th className="px-4 py-3 font-medium">Panier moyen</th>
              <th className="px-4 py-3 font-medium">Risque de départ</th>
              <th className="px-4 py-3 font-medium">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sorted.slice(0, 30).map((c) => (
              <tr key={c.id} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">{`${c.first_name || ""} ${c.last_name || ""}`.trim() || c.customer_id}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 text-xs">
                    <span className="h-2 w-2 rounded-full" style={{ background: segmentColors[c.segment] || "#94a3b8" }} />
                    {segmentLabels[c.segment] || c.segment || "—"}
                  </span>
                </td>
                <td className="px-4 py-3">{c._total_orders}</td>
                <td className="px-4 py-3 font-medium">{Math.round(c._total_revenue || 0).toLocaleString()} $</td>
                <td className="px-4 py-3">{Math.round(c._aov || 0).toLocaleString()} $</td>
                <td className="px-4 py-3">
                  {c._churnPct === null ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <span className={c._churnPct > 60 ? "text-red-600 font-medium" : c._churnPct > 30 ? "text-amber-600" : "text-muted-foreground"}>
                      {c._churnPct}%
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={c.status === "actif" ? "text-emerald-600" : c.status === "inactif" ? "text-red-600" : "text-amber-600"}>
                    {c.status || "—"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}