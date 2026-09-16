import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import InsightCard from "@/components/insights/InsightCard";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Brain, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useCompany } from "@/hooks/useCompany";
import { fetchAll } from "@/lib/fetchAll";
import { computeLiveAlerts } from "@/lib/liveAlerts";
import { useObservations } from "@/hooks/useObservations";

const formatImpact = (amount) => {
  if (!amount || amount === 0) return null;
  const v = Math.round(Math.abs(amount)).toLocaleString("fr-CA");
  return amount > 0 ? `+${v} $` : `-${v} $`;
};

const filters = [
  { key: "tous", label: "Tous" },
  { key: "anomalie", label: "Anomalies" },
  { key: "risque", label: "Risques" },
  { key: "opportunite", label: "Opportunités" },
  { key: "recommandation", label: "Recommandations" },
];

const priorityMap = { critique: "urgente", important: "elevee", actif: "elevee", urgente: "urgente", elevee: "elevee" };
const categoryMap = { anomalie: "urgent", risque: "strategique", opportunite: "commercial", recommandation: "strategique" };

export default function Insights() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [filter, setFilter] = useState("tous");

  const { data: anomalies, isLoading: la } = useQuery({
    queryKey: ["anomalies"],
    queryFn: async () => { const l = await base44.entities.Anomaly.list("-created_date", 30); return l || []; },
  });
  const { data: risks, isLoading: lr } = useQuery({
    queryKey: ["risks-active"],
    queryFn: async () => { const l = await base44.entities.Risk.filter({ status: "actif" }); return l || []; },
  });
  const { data: opportunities, isLoading: lo } = useQuery({
    queryKey: ["opportunities-new"],
    queryFn: async () => { const l = await base44.entities.Opportunity.filter({ status: "nouvelle" }); return l || []; },
  });
  const { data: recommendations, isLoading: lrec } = useQuery({
    queryKey: ["recommendations"],
    queryFn: async () => { const l = await base44.entities.Recommendation.list("-created_date", 20); return l || []; },
  });
  const { data: observations, isLoading: lobs } = useObservations({ limit: 50 });

  // Fetch full data for live interconnected alerts
  const { company } = useCompany();
  const { data: liveData, isLoading: llive } = useQuery({
    queryKey: ["insights-live-alerts", company?.stock_alert_threshold],
    queryFn: async () => {
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

  const insights = useMemo(() => {
    const items = [];
    
    const getPreuves = (id) => {
      if (!observations) return [];
      return observations.filter(o => o.entity_id === id || o.source_id === id);
    };

    (liveData || []).forEach((a) => {
      // Les alertes croisées contiennent "&" dans la catégorie
      const isCrossDomain = a.category.includes("&");
      items.push({
        id: a.id, 
        type: "anomalie", 
        typeLabel: isCrossDomain ? "Alerte Inter-Domaine (Live)" : "Alerte Live",
        fait: `${a.category} : ${a.title}`, 
        analyse: a.message,
        impactLabel: null,
        confiance: 100, 
        recommandation: isCrossDomain ? "Vérifiez immédiatement les impacts en chaîne." : null, 
        preuves: getPreuves(a.id),
        source: { severity: a.level, priority: a.level },
      });
    });
    (anomalies || []).forEach((a) => items.push({
      id: `a-${a.id}`, type: "anomalie", typeLabel: "Anomalie",
      fait: a.title, analyse: a.explanation || a.description,
      impactLabel: a.financial_impact ? `${formatImpact(a.financial_impact)}/mois` : (a.deviation_pct ? `${a.deviation_pct > 0 ? "+" : ""}${Math.round(a.deviation_pct)}%` : null),
      confiance: a.confidence_pct || 0, recommandation: null, 
      preuves: getPreuves(a.id),
      source: a,
    }));
    (risks || []).forEach((r) => items.push({
      id: `r-${r.id}`, type: "risque", typeLabel: "Risque",
      fait: r.title, analyse: r.description,
      impactLabel: formatImpact(r.financial_impact),
      confiance: r.confidence_pct || 0, recommandation: null, 
      preuves: getPreuves(r.id),
      source: r,
    }));
    (opportunities || []).forEach((o) => items.push({
      id: `o-${o.id}`, type: "opportunite", typeLabel: "Opportunité",
      fait: o.title, analyse: o.description,
      impactLabel: formatImpact(o.financial_impact),
      confiance: o.confidence_pct || 0, recommandation: null, 
      preuves: getPreuves(o.id),
      source: o,
    }));
    (recommendations || []).forEach((r) => items.push({
      id: `rec-${r.id}`, type: "recommandation", typeLabel: "Recommandation",
      fait: r.situation || r.title, analyse: r.analysis,
      impactLabel: formatImpact(r.financial_impact) || r.impact,
      confiance: r.confidence_pct || 0, recommandation: r.action, 
      preuves: getPreuves(r.id),
      source: r,
    }));
    return items.sort((a, b) => (Math.abs(b.source.financial_impact || 0) + b.confiance / 2) - (Math.abs(a.source.financial_impact || 0) + a.confiance / 2));
  }, [anomalies, risks, opportunities, recommendations, liveData, observations]);

  const filtered = filter === "tous" ? insights : insights.filter((i) => i.type === filter);
  const isLoading = la || lr || lo || lrec || lobs || llive;

  const handleCreateAction = async (insight) => {
    try {
      await base44.entities.Task.create({
        title: insight.fait,
        description: insight.analyse || "",
        category: categoryMap[insight.type] || "strategique",
        priority: priorityMap[insight.source.severity || insight.source.priority] || "moyenne",
        status: "a_faire",
      });
      toast({ title: "Action créée", description: "La tâche a été ajoutée à votre liste." });
      qc.invalidateQueries({ queryKey: ["tasks"] });
    } catch (e) {
      toast({ title: "Erreur: " + (e.message || ""), variant: "destructive" });
    }
  };

  if (isLoading) {
    return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" /></div>;
  }

  if (insights.length === 0) {
    return (
      <EmptyState
        icon={Brain}
        title="Aucun insight pour le moment"
        description="Lancez une analyse pour que GESCOP détecte les anomalies, évalue les risques et génère des recommandations structurées."
        action={<Button asChild><Link to="/"><Sparkles className="mr-2 h-4 w-4" /> Aller au tableau de bord</Link></Button>}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Insights</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Chaque insight suit la chaîne : fait observé → analyse → impact financier → niveau de confiance → action recommandée.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              filter === f.key ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:bg-muted/50"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {filtered.map((insight) => (
          <InsightCard key={insight.id} {...insight} onCreateAction={() => handleCreateAction(insight)} />
        ))}
      </div>
    </div>
  );
}