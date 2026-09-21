import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import StatCard from "@/components/StatCard";
import EmptyState from "@/components/EmptyState";
import DataTable from "@/components/ui/DataTable";
import BadgeStatus from "@/components/ui/BadgeStatus";
import { formatCAD, formatPct } from "@/lib/utils";
import { fetchAll } from "@/lib/fetchAll";
import { Building, MapPin, DollarSign, TrendingUp } from "lucide-react";

export default function Succursales() {
  const { data: orders, isLoading: lo } = useQuery({ queryKey: ["orders"], queryFn: () => fetchAll(base44.entities.Order) });
  const { data: employees, isLoading: le } = useQuery({ queryKey: ["employees"], queryFn: () => fetchAll(base44.entities.Employee) });
  const { data: assets, isLoading: la } = useQuery({ queryKey: ["assets"], queryFn: () => fetchAll(base44.entities.Asset) });
  const { data: summaryRows } = useQuery({ queryKey: ["executive-summary"], queryFn: () => fetchAll(base44.entities.ExecutiveSummary) });

  if (lo || le || la) return <p className="text-sm text-muted-foreground">Chargement…</p>;

  const hasOrders = orders && orders.length > 0;
  const hasEmployees = employees && employees.length > 0;
  const hasAssets = assets && assets.length > 0;
  const hasSummary = summaryRows && summaryRows.length > 0;

  if (!hasOrders && !hasEmployees && !hasAssets && !hasSummary) {
    return (
      <EmptyState
        icon={Building}
        title="Aucune donnée de succursale"
        description="Importez vos ventes, employés et immobilisations pour suivre le P&L par succursale."
      />
    );
  }

  // Grouper par succursale (location / location_id)
  const locationsMap = {};

  const getLoc = (loc) => {
    if (!loc) return "Non assigné";
    const s = String(loc).trim();
    // Le fichier RH nomme parfois une succursale "Ville (Succursale)" (ex.
    // "Québec (Sainte-Foy)") alors que les ventes utilisent seulement
    // "Sainte-Foy" : on garde la partie entre parenthèses pour que les deux
    // rejoignent la même clé, sinon le coût employeur de cette succursale
    // atterrit dans un groupe que les revenus ne touchent jamais.
    // S'applique à toute source (Order/Employee/Asset) qui passe par ici : si
    // une vraie succursale contient un jour des parenthèses pour une autre
    // raison, elle sera tronquée de la même façon — accepté pour l'instant,
    // aucune donnée observée ne fait ça hors du cas RH ci-dessus.
    const m = s.match(/\(([^)]+)\)\s*$/);
    return (m ? m[1].trim() : s) || "Non assigné";
  };

  const ensureLoc = (loc) => {
    const key = getLoc(loc);
    if (!locationsMap[key]) {
      locationsMap[key] = {
        name: key,
        revenue: 0,
        cogs: 0,
        grossProfit: 0,
        employerCost: 0,
        depreciation: 0,
      };
    }
    return locationsMap[key];
  };

  (orders || []).forEach(o => {
    const loc = ensureLoc(o.location_id || o.succursale || o.store || o.location);
    const rev = Number(o.total_revenue) || Number(o.total) || 0;
    const cogs = Number(o.total_cost) || Number(o.cost) || 0;
    loc.revenue += rev;
    loc.cogs += cogs;
    loc.grossProfit += Number(o.gross_profit) || (rev - cogs);
  });

  if ((orders || []).length === 0 && (summaryRows || []).length > 0) {
    summaryRows.forEach(s => {
      const loc = ensureLoc(s.location_id || s.succursale || s.store);
      const rev = Number(s.total_revenue) || Number(s.total) || 0;
      const cogs = Number(s.total_cost) || Number(s.cost) || 0;
      loc.revenue += rev;
      loc.cogs += cogs;
      loc.grossProfit += Number(s.gross_profit) || (rev - cogs);
    });
  }

  (employees || []).forEach(e => {
    // `branch` porte le vrai nom de succursale (celui que suivent les
    // ventes) ; `location` n'est souvent qu'une catégorie générique
    // ("Magasin", "Siège social") qui ne correspond à aucune succursale
    // précise — la préférer en premier regroupait tout le coût employeur
    // sous des clés que les revenus ne touchaient jamais, gonflant chaque
    // EBIT en négatif.
    const loc = ensureLoc(e.branch || e.location || e.succursale || e.department);
    loc.employerCost += Number(e.total_employer_cost) || 0;
  });

  (assets || []).forEach(a => {
    const loc = ensureLoc(a.location_id || a.succursale || a.location);
    loc.depreciation += (Number(a.net_book_value || 0) * (Number(a.dpa_rate || 0)));
  });

  const locations = Object.values(locationsMap).map(loc => {
    // EBITDA = Gross Profit - Employer Cost (simplification P&L Succursale)
    loc.ebitda = loc.grossProfit - loc.employerCost;
    // EBIT = EBITDA - Depreciation
    loc.ebit = loc.ebitda - loc.depreciation;
    loc.marginPct = loc.revenue > 0 ? (loc.ebit / loc.revenue) * 100 : 0;
    return loc;
  }).sort((a, b) => b.ebit - a.ebit);

  const totalEbitda = locations.reduce((sum, l) => sum + l.ebitda, 0);
  const totalEbit = locations.reduce((sum, l) => sum + l.ebit, 0);
  const totalRev = locations.reduce((sum, l) => sum + l.revenue, 0);
  const totalGrossProfit = locations.reduce((sum, l) => sum + l.grossProfit, 0);
  const totalEmployerCost = locations.reduce((sum, l) => sum + l.employerCost, 0);
  const totalDepreciation = locations.reduce((sum, l) => sum + l.depreciation, 0);
  // Marge nette consolidée pondérée par le CA de chaque succursale, pas une
  // simple moyenne des pourcentages (qui surpondérerait les petites
  // succursales).
  const weightedMarginPct = totalRev > 0 ? (totalEbit / totalRev) * 100 : 0;

  const locationColumns = [
    { key: "name", header: "Succursale", render: (l) => l.name },
    { key: "revenue", header: "Revenus", align: "right", sortValue: (l) => l.revenue, render: (l) => formatCAD(l.revenue), footer: () => formatCAD(totalRev) },
    { key: "grossProfit", header: "Marge Brute (Ventes)", align: "right", sortValue: (l) => l.grossProfit, render: (l) => formatCAD(l.grossProfit), footer: () => formatCAD(totalGrossProfit) },
    { key: "employerCost", header: "Coût Employeur (RH)", align: "right", sortValue: (l) => l.employerCost, render: (l) => <span className="text-red-600/80">{formatCAD(l.employerCost)}</span>, footer: () => <span className="text-red-600/80">{formatCAD(totalEmployerCost)}</span> },
    { key: "ebitda", header: "EBITDA", align: "right", sortValue: (l) => l.ebitda, render: (l) => <span className="font-semibold">{formatCAD(l.ebitda)}</span>, footer: () => formatCAD(totalEbitda) },
    { key: "depreciation", header: "Amortissement (Actifs)", align: "right", sortValue: (l) => l.depreciation, render: (l) => <span className="text-red-600/80">{formatCAD(l.depreciation)}</span>, footer: () => <span className="text-red-600/80">{formatCAD(totalDepreciation)}</span> },
    {
      key: "ebit",
      header: "EBIT (Résultat)",
      align: "right",
      sortValue: (l) => l.ebit,
      render: (l) => <span className={`font-bold ${l.ebit >= 0 ? "text-emerald-600" : "text-red-600"}`}>{formatCAD(l.ebit)}</span>,
      footer: () => <span className={`font-bold ${totalEbit >= 0 ? "text-emerald-600" : "text-red-600"}`}>{formatCAD(totalEbit)}</span>,
    },
    {
      key: "marginPct",
      header: "Marge Nette %",
      align: "right",
      sortValue: (l) => l.marginPct,
      render: (l) => <BadgeStatus status={l.marginPct >= 10 ? "good" : l.marginPct >= 0 ? "warning" : "critical"}>{formatPct(l.marginPct, 1)}</BadgeStatus>,
      footer: () => <BadgeStatus status={weightedMarginPct >= 10 ? "good" : weightedMarginPct >= 0 ? "warning" : "critical"}>{formatPct(weightedMarginPct, 1)}</BadgeStatus>,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Performance par Succursale</h1>
        <p className="mt-1 text-muted-foreground">P&L détaillé croisant Ventes, RH et Immobilisations.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Succursales" value={locations.length.toLocaleString()} icon={MapPin} />
        <StatCard label="Chiffre d'affaires global" value={`${Math.round(totalRev).toLocaleString("fr-CA")} $`} icon={DollarSign} />
        <StatCard label="EBITDA total" value={`${Math.round(totalEbitda).toLocaleString("fr-CA")} $`} icon={TrendingUp} />
        <StatCard label="EBIT total (après amort.)" value={`${Math.round(totalEbit).toLocaleString("fr-CA")} $`} icon={TrendingUp} accent={totalEbit > 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"} />
      </div>

      <DataTable
        columns={locationColumns}
        data={locations}
        rowKey={(l) => l.name}
        searchPlaceholder="Rechercher une succursale…"
        footer
        emptyIcon={Building}
        emptyTitle="Aucune succursale"
      />
    </div>
  );
}

