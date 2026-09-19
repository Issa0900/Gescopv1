import { formatPct } from "@/lib/utils";
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import StatCard from "@/components/StatCard";
import EmptyState from "@/components/EmptyState";
import ProductSalesTrend from "@/components/produits/ProductSalesTrend";
import ProductFilters from "@/components/produits/ProductFilters";
import StockThresholdSettings from "@/components/produits/StockThresholdSettings";
import { useCompany } from "@/hooks/useCompany";
import { getStockAlertSettings, isStockAlert, computeStockAlerts } from "@/lib/stockAlerts";
import { latestByKey, currentMonthKey } from "@/lib/periods";
import { fetchAll } from "@/lib/fetchAll";
import { validSalesOrders, columnPresent } from "@/lib/metrics";
import DataErrorState from "@/components/DataErrorState";
import { Package, AlertTriangle, Boxes, DollarSign } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

const stockColors = {
  optimal: "#10b981",
  rupture: "#ef4444",
  surstock: "#f59e0b",
  dormant: "#94a3b8",
  faible: "#f97316",
  proche_rupture: "#dc2626",
};

const stockLabels = {
  optimal: "Optimal",
  rupture: "Rupture",
  surstock: "Surstock",
  dormant: "Dormant",
  faible: "Faible",
  proche_rupture: "Proche rupture",
};

const monthLabels = {
  "01": "jan", "02": "fév", "03": "mar", "04": "avr",
  "05": "mai", "06": "jun", "07": "jul", "08": "aoû",
  "09": "sep", "10": "oct", "11": "nov", "12": "déc",
};

function formatMonthLabel(m) {
  const [, mm] = (m || "").split("-");
  return monthLabels[mm] || m;
}

// Product and Inventory are imported as two separate entities, and a stock
// export that never had a distinct "catalogue" sheet (SKU + description +
// price only, no dedicated Product rows) lands entirely in Inventory. Without
// this fallback the page showed "Aucun produit" for such a company even
// though its stock — and every field this page needs (cost, price, margin,
// reorder point) — was sitting right there in Inventory, one row per product
// per date.
function deriveProductsFromInventory(inventory) {
  const latest = latestByKey(inventory || [], "product_id", "date");
  return latest
    .filter((i) => i.product_id)
    .map((i) => {
      const cost = Number(i.unit_cost) || 0;
      const price = Number(i.selling_price) || 0;
      return {
        id: i.id,
        product_id: i.product_id,
        product_name: i.product_name || i.product_id,
        category: i.category || null,
        supplier_id: i.supplier_id || null,
        purchase_cost: cost,
        selling_price: price,
        gross_margin: price > 0 ? ((price - cost) / price) * 100 : 0,
        inventory_level: i.closing_stock != null ? Number(i.closing_stock) : (i.qte_en_stock != null ? Number(i.qte_en_stock) : (i.inventory_level != null ? Number(i.inventory_level) : null)),
        reorder_point: i.reorder_point != null ? Number(i.reorder_point) : null,
        status: i.stock_status || null,
      };
    });
}

export default function Produits() {
  const [filters, setFilters] = useState({ search: "", category: "all", status: "all" });
  const { company, refetch: refetchCompany } = useCompany();

  // The threshold is applied LIVE. It used to take effect only after "Appliquer"
  // saved it to the company record and that query refetched, so moving the
  // control showed nothing until you committed a value you could not preview.
  //
  // `draft` holds the value being tried out; null means "use what is saved", so
  // no effect is needed to sync when the company record loads or changes.
  const savedSettings = getStockAlertSettings(company);
  const [draft, setDraft] = useState(null);
  const alertSettings = draft || savedSettings;
  const isDraft = draft !== null
    && (draft.threshold !== savedSettings.threshold
      || draft.useReorderPoint !== savedSettings.useReorderPoint
      || draft.dormantMonths !== savedSettings.dormantMonths);
  const { data: productsRaw, isLoading: lp, isError: productsError, refetch: refetchProducts } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const rows = await fetchAll(base44.entities.Product);
      return (Array.isArray(rows) ? rows : []).map((p) => ({
        ...p,
        product_id: p.product_id || p.id || p.sku || p.code,
      }));
    },
  });
  const { data: inventory, isLoading: li, isError: inventoryError, refetch: refetchInventory } = useQuery({
    queryKey: ["inventory-summary"],
    queryFn: async () => {
      const rows = await fetchAll(base44.entities.Inventory, "-date");
      return (Array.isArray(rows) ? rows : []).map((i) => ({
        ...i,
        product_id: i.product_id || i.id_product || i.sku || i.product_code,
      }));
    },
  });
  const { data: orders, isLoading: lo, isError: ordersError, refetch: refetchOrders } = useQuery({
    queryKey: ["orders-produits"],
    queryFn: async () => {
      const rows = await fetchAll(base44.entities.Order, "-date");
      return Array.isArray(rows) ? rows : [];
    },
  });

  if (lp || li || lo) return <p className="text-sm text-muted-foreground">Chargement…</p>;
  if (productsError || inventoryError || ordersError) {
    return (
      <DataErrorState
        onRetry={() => Promise.all([refetchProducts(), refetchInventory(), refetchOrders()])}
      />
    );
  }
  const usingInventoryFallback = !(productsRaw && productsRaw.length > 0);
  const products = usingInventoryFallback ? deriveProductsFromInventory(inventory) : productsRaw;

  if (!products || products.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title="Aucun produit"
        description="Importez vos données produits et inventaire pour voir la performance et le statut des stocks."
      />
    );
  }

  const total = products.length;
  // Shown only when at least one product actually carries a supplier, so an
  // import without one doesn't get a column full of dashes.
  const hasSupplier = columnPresent(products, "supplier_id") || columnPresent(products, "supplier_name");
  const lowMargin = products.filter((p) => (p.gross_margin || 0) < 15);
  const avgMargin = total > 0
    ? products.reduce((s, p) => s + (Number(p.gross_margin) || 0), 0) / total
    : 0;

  // Inventory arrives as one row per product per date. Counting every historical
  // row multiplies each situation by its number of recorded days, so all stock
  // figures use the most recent snapshot per product.
  //
  // One shared computation drives the cards, the alert list and the table, and
  // it follows the threshold. The cards used to count the imported stock_status
  // label instead: on a file where every row says "optimal" they showed 0 en
  // rupture right above a panel reporting 20 produits en alerte, from the same
  // rows. A label from the source system is not a substitute for looking at the
  // stock actually on hand.
  const stock = computeStockAlerts(products, inventory, alertSettings, orders);
  const invByProduct = stock.byProduct;
  const stockOf = (p) => {
    const snap = invByProduct[p.product_id];
    return snap && snap.closing_stock != null ? Number(snap.closing_stock) : Number(p.inventory_level) || 0;
  };
  const dormantCount = stock.dormantCount;
  const nearRupture = stock.alerts.map((r) => r.product);
  const ruptureCount = nearRupture.length;
  // Products the source system itself flagged as out of stock, kept separate so
  // the card can say how many are a hard rupture versus simply low.
  const outOfStockCount = stock.outOfStockCount;

  // Sales per product over the last 3 COMPLETE months.
  //
  // This used to rank products on the single most recent month present in the
  // orders - which is the month in progress. With 11 days of September against
  // 18 months of history, almost every product scored 0 and the "Top 10" chart
  // came up empty. The in-progress month is excluded here like everywhere else,
  // and three months are used so one quiet month cannot empty the ranking.
  const cm = currentMonthKey();
  const completeMonths = Array.from(
    new Set((orders || []).map((o) => (o.date || "").slice(0, 7)).filter(Boolean)),
  ).filter((m) => m !== cm).sort();
  // === Analyse saisonnière ===
  // Regroupe le CA par mois calendaire (jan-déc, cumulé sur toutes les
  // années présentes) pour révéler des cycles récurrents (ex. pic hiver vs
  // été) indépendamment de la catégorie précise du catalogue - fonctionne
  // sur n'importe quel jeu de données, pas seulement plein-air/QC.
  const monthNames = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];
  const revenueByCalendarMonth = Array(12).fill(0);
  validSalesOrders(orders).forEach((o) => {
    if (!o.date) return;
    const monthIdx = Number(o.date.slice(5, 7)) - 1;
    if (monthIdx < 0 || monthIdx > 11) return;
    revenueByCalendarMonth[monthIdx] += Number(o.total_revenue) || Number(o.total) || 0;
  });
  const hasSeasonality = revenueByCalendarMonth.some((v) => v > 0);
  const seasonalityData = monthNames.map((name, i) => ({ mois: name, revenu: Math.round(revenueByCalendarMonth[i]) }));
  const avgMonthlyRevenue = hasSeasonality ? revenueByCalendarMonth.reduce((s, v) => s + v, 0) / 12 : 0;
  const peakMonths = seasonalityData
    .filter((m) => m.revenu > avgMonthlyRevenue * 1.15)
    .sort((a, b) => b.revenu - a.revenu)
    .slice(0, 3)
    .map((m) => m.mois);

  const windowMonths = new Set(completeMonths.slice(-3));
  const windowLabel = windowMonths.size > 0
    ? `${formatMonthLabel(completeMonths.slice(-3)[0])} → ${formatMonthLabel(completeMonths[completeMonths.length - 1])}`
    : null;

  const salesByProduct = {};
  const totalSalesByProduct = {};
  const totalRevByProduct = {};
  // Refunded orders are excluded - their quantity/revenue was reversed and
  // must not count as a sale.
  validSalesOrders(orders).forEach((o) => {
    const m = (o.date || "").slice(0, 7);
    const pid = o.product_id;
    if (!pid) return;
    const qty = Number(o.quantity) || 0;
    // total_revenue is the field the import pipeline actually populates
    // (see domainScores.js) - total alone silently read 0 for every order.
    const rev = Number(o.total_revenue) || Number(o.total) || 0;
    totalSalesByProduct[pid] = (totalSalesByProduct[pid] || 0) + qty;
    totalRevByProduct[pid] = (totalRevByProduct[pid] || 0) + rev;
    if (windowMonths.size > 0 && !windowMonths.has(m)) return;
    salesByProduct[pid] = (salesByProduct[pid] || 0) + qty;
  });

  const topBySales = products
    .map((p) => ({
      ...p,
      _recentSales: salesByProduct[p.product_id] || (windowMonths.size > 0 ? 0 : (p.monthly_sales || 0)),
    }))
    .sort((a, b) => (b._recentSales || 0) - (a._recentSales || 0))
    .slice(0, 10);
  const topBarData = topBySales.map((p) => ({
    name: (p.product_name || p.product_id || "").slice(0, 20),
    ventes: p._recentSales || 0,
    marge: Math.round(p.gross_margin || 0),
  }));

  const stockDist = {};
  const latestInventory = latestByKey(inventory || [], "product_id", "date");
  latestInventory.forEach((i) => {
    const s = i.stock_status || "non_precise";
    stockDist[s] = (stockDist[s] || 0) + 1;
  });
  const pieData = Object.entries(stockDist).map(([s, v]) => ({
    name: stockLabels[s] || s,
    value: v,
    key: s,
  }));
  // Stock value: use the imported inventory_value when present, otherwise
  // derive it from the recorded stock and the product's purchase cost. That
  // column is often empty in exports, and summing it blindly displayed 0 $
  // worth of stock next to hundreds of tracked products.
  const productById = {};
  products.forEach((p) => { productById[p.product_id] = p; });
  let inventoryValueEstimated = false;
  const inventoryValue = products.reduce((s, p) => {
    const stated = Number(latestInventory.find(i => i.product_id === p.product_id)?.inventory_value);
    if (Number.isFinite(stated) && stated > 0) return s + stated;
    const cost = Number(p.purchase_cost) || 0;
    const qty = stockOf(p);
    if (cost > 0 && qty > 0) inventoryValueEstimated = true;
    return s + cost * qty;
  }, 0);

  // Table rows + filtering (search, category, real stock status)
  const statusOf = (p) => invByProduct[p.product_id]?.stock_status || p.status;
  const categories = Array.from(new Set(products.map((p) => p.category).filter(Boolean))).sort();
  const statuses = Array.from(new Set(products.map((p) => statusOf(p)).filter(Boolean))).sort();
  const allRows = products
    .map((p) => ({
      ...p,
      _totalSales: totalSalesByProduct[p.product_id] || 0,
      _totalRev: totalRevByProduct[p.product_id] || 0,
    }))
    .sort((a, b) => (b._totalSales || 0) - (a._totalSales || 0));
  const q = filters.search.trim().toLowerCase();
  const filteredRows = allRows.filter((p) => {
    if (q && !`${p.product_name || ""} ${p.product_id || ""} ${p.sku || ""}`.toLowerCase().includes(q)) return false;
    if (filters.category !== "all" && p.category !== filters.category) return false;
    if (filters.status === "reorder") {
      if (!isStockAlert(stockOf(p), p.reorder_point, alertSettings)) return false;
    } else if (filters.status !== "all" && statusOf(p) !== filters.status) return false;
    return true;
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Produits & Inventaire</h1>
        <p className="mt-1 text-muted-foreground">Performance produits, marges, rotation de stock et alertes d'inventaire.</p>
        {usingInventoryFallback && (
          <p className="mt-1 text-xs text-muted-foreground">
            Aucune donnée de catalogue produit importée : cette liste et les marges sont dérivées de vos données de stock (inventaire).
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total produits" value={total.toLocaleString()} icon={Package} />
        <StatCard label="Faible marge (<15%)" value={lowMargin.length} sublabel={`marge moyenne ${formatPct(avgMargin)}`} icon={DollarSign} accent={lowMargin.length > 0 ? "bg-amber-50 text-amber-600" : "bg-muted text-muted-foreground"} />
        <StatCard
          label="Stock dormant"
          value={dormantCount}
          sublabel={stock.dormancyFromRotation
            ? `aucune vente depuis ${stock.dormantMonths} mois · sur ${stock.tracked} suivis`
            : "historique de commandes absent - rotation non mesurable"}
          icon={Boxes}
          accent={dormantCount > 0 ? "bg-amber-50 text-amber-600" : "bg-muted text-muted-foreground"}
        />
        <StatCard
          label="Sous le seuil d'alerte"
          value={ruptureCount}
          sublabel={outOfStockCount > 0
            ? `dont ${outOfStockCount} en rupture totale · seuil ${alertSettings.threshold} u.`
            : `seuil ${alertSettings.threshold} unité${alertSettings.threshold === 1 ? "" : "s"} · sur ${stock.tracked} suivis`}
          icon={AlertTriangle}
          accent={ruptureCount > 0 ? "bg-red-50 text-red-600" : "bg-muted text-muted-foreground"}
        />
      </div>

      <StockThresholdSettings
        company={company}
        settings={alertSettings}
        isDraft={isDraft}
        alertCount={nearRupture.length}
        dormantCount={dormantCount}
        dormancyMeasurable={stock.dormancyFromRotation}
        trackedCount={products.length}
        onChange={setDraft}
        onSaved={() => { setDraft(null); refetchCompany(); }}
      />

      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Évolution des ventes par mois</h2>
        <p className="mb-4 text-xs text-muted-foreground">Quantité vendue (axe gauche) - revenu $ (axe droit) · 12 derniers mois</p>
        <ProductSalesTrend orders={orders} />
      </div>

      {hasSeasonality && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Analyse saisonnière</h2>
          <p className="mb-4 text-xs text-muted-foreground">
            CA cumulé par mois calendaire (toutes années confondues)
            {peakMonths.length > 0 ? ` · pics : ${peakMonths.join(", ")}` : ""}
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={seasonalityData} margin={{ left: 10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => `${v.toLocaleString()} $`} />
              <Bar dataKey="revenu" radius={[4, 4, 0, 0]}>
                {seasonalityData.map((m, i) => (
                  <Cell key={i} fill={m.revenu > avgMonthlyRevenue * 1.15 ? "#3b82f6" : "#cbd5e1"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Top 10 produits {windowLabel ? `(${windowLabel})` : "(ventes/mois)"}
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topBarData} margin={{ left: 10, right: 10, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="ventes" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Statut des stocks</h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={(e) => `${e.name}: ${e.value}`}>
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={stockColors[entry.key] || "#94a3b8"} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground">Aucune donnée d'inventaire</p>
          )}
          {inventoryValue > 0 && (
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Valeur inventaire total: <span className="font-semibold text-foreground">{Math.round(inventoryValue).toLocaleString("fr-CA")} $</span>
              {inventoryValueEstimated && (
                <span className="block text-xs">Estimée à partir du stock et du coût d'achat : la colonne « valeur de stock » est absente de votre import.</span>
              )}
            </p>
          )}
        </div>
      </div>

      {nearRupture.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50/30 p-5">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <h3 className="text-sm font-semibold text-red-900">Produits proches de la rupture</h3>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {nearRupture.slice(0, 12).map((p) => (
              <div key={p.id} className="rounded-lg bg-white px-3 py-2 text-sm">
                <p className="font-medium truncate">{p.product_name || p.product_id}</p>
                <p className="text-xs text-muted-foreground">
                  Stock: {stockOf(p)} · Seuil: {alertSettings.useReorderPoint && p.reorder_point > 0 ? Math.max(alertSettings.threshold, p.reorder_point) : alertSettings.threshold}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border">
        <ProductFilters
          filters={filters}
          onChange={setFilters}
          categories={categories}
          statuses={statuses}
          statusLabels={stockLabels}
          count={filteredRows.length}
        />
        <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Produit</th>
              <th className="px-4 py-3 font-medium">Catégorie</th>
              {hasSupplier && <th className="px-4 py-3 font-medium">Fournisseur</th>}
              <th className="px-4 py-3 font-medium">Coût</th>
              <th className="px-4 py-3 font-medium">Prix vente</th>
              <th className="px-4 py-3 font-medium">Marge</th>
              <th className="px-4 py-3 font-medium">Unités vendues</th>
              <th className="px-4 py-3 font-medium text-blue-600" title="ESTIMATION : Stock observé - Ventes récentes admissibles">
                Stock analytique estimé *
              </th>
              <th className="px-4 py-3 font-medium">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredRows.slice(0, 50).map((p) => (
              <tr key={p.id} className="hover:bg-muted/30">
                <td className="max-w-[180px] truncate px-4 py-3 font-medium" title={p.product_name}>{p.product_name || p.product_id}</td>
                <td className="px-4 py-3 text-muted-foreground">{p.category || "-"}</td>
                {hasSupplier && <td className="px-4 py-3 text-muted-foreground">{p.supplier_name || p.supplier_id || "-"}</td>}
                <td className="px-4 py-3">{Math.round(p.purchase_cost || 0)} $</td>
                <td className="px-4 py-3">{Math.round(p.selling_price || 0)} $</td>
                <td className="px-4 py-3">
                  <span className={(p.gross_margin || 0) < 15 ? "text-red-600 font-medium" : ""}>{Math.round(p.gross_margin || 0)}%</span>
                </td>
                <td className="px-4 py-3">{p._totalSales}</td>
                <td className="px-4 py-3">{stockOf(p)}</td>
                <td className="px-4 py-3">
                  {/* Real stock state from the latest inventory snapshot, falling
                      back to the imported product status when none exists. */}
                  {(() => {
                    const st = invByProduct[p.product_id]?.stock_status || p.status;
                    const cls = ["rupture", "proche_rupture"].includes(st)
                      ? "text-red-600"
                      : ["faible", "surstock", "dormant"].includes(st)
                        ? "text-amber-600"
                        : st === "optimal" || st === "actif"
                          ? "text-emerald-600"
                          : "text-muted-foreground";
                    return <span className={cls}>{stockLabels[st] || st || "-"}</span>;
                  })()}
                </td>
              </tr>
            ))}
            {filteredRows.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">Aucun produit ne correspond aux filtres</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}