import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { computeLiveAlerts } from "@/lib/liveAlerts";
import { fetchAll } from "@/lib/fetchAll";
import { useCompany } from "@/hooks/useCompany";

// Counts only what needs attention now: unread stored alerts plus live
// critical/important ones computed from current data.
export default function LiveAlertBadge({ compact }) {
  // Stock alerts follow the company threshold, like every other screen.
  const { company } = useCompany();
  const { data: stored } = useQuery({
    queryKey: ["alerts-badge"],
    queryFn: async () => (await base44.entities.Alert.list("-created_date", 100)) || [],
  });
  // These query keys are SHARED with the Dashboard and the Trésorerie page, so
  // they must fetch exactly the same rows. This component used to read cashflow
  // with a limit of 100 under the same "cashflow-summary" key: whichever query
  // mounted first won the cache, and the runway alert could end up computed on
  // 100 days of cash while the dashboard showed the full history.
  const { data: transactions } = useQuery({
    queryKey: ["transactions-summary"],
    queryFn: () => fetchAll(base44.entities.Transaction, "-date"),
  });
  const { data: orders } = useQuery({
    queryKey: ["orders-summary"],
    queryFn: () => fetchAll(base44.entities.Order, "-date"),
  });
  const { data: customers } = useQuery({
    queryKey: ["customers-summary"],
    queryFn: () => fetchAll(base44.entities.Customer),
  });
  const { data: inventory } = useQuery({
    queryKey: ["inventory-dashboard"],
    queryFn: () => fetchAll(base44.entities.Inventory, "-date"),
  });
  const { data: cashflow } = useQuery({
    queryKey: ["cashflow-summary"],
    queryFn: () => fetchAll(base44.entities.Cashflow, "-date"),
  });
  const { data: campaignDaily } = useQuery({
    queryKey: ["campaign-daily-dashboard"],
    queryFn: () => fetchAll(base44.entities.CampaignDaily, "-date"),
  });
  const { data: products } = useQuery({
    queryKey: ["products-dashboard"],
    queryFn: () => fetchAll(base44.entities.Product),
  });

  const live = computeLiveAlerts({ transactions, orders, customers, campaignDaily, products, inventory, cashflow, company });
  const liveCount = live.filter((a) => a.level === "critique" || a.level === "important").length;
  const unreadStored = (stored || []).filter((a) => a.status !== "lue").length;
  const count = liveCount + unreadStored;

  if (!count) return null;

  if (compact) {
    return <span className="absolute right-2 top-1.5 h-2 w-2 rounded-full bg-red-500" />;
  }
  return (
    <span className="ml-auto rounded-full bg-red-500/90 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
      {count}
    </span>
  );
}