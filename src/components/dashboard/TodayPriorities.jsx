import React from "react";
import { AlertTriangle, ShieldAlert, Zap, CalendarClock, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const formatImpact = (amount) => {
  if (!amount || amount === 0) return null;
  const v = Math.round(Math.abs(amount)).toLocaleString("fr-CA");
  return amount > 0 ? `+${v} $` : `-${v} $`;
};

const itemTypes = {
  recommendation: {
    icon: Zap,
    iconBg: "bg-orange-50 text-orange-600",
    border: "border-l-orange-500",
    label: "Recommandation urgente",
    link: "/recommandations",
  },
  anomaly: {
    icon: AlertTriangle,
    iconBg: "bg-red-50 text-red-600",
    border: "border-l-red-500",
    label: "Anomalie critique",
    link: "/anomalies",
  },
  risk: {
    icon: ShieldAlert,
    iconBg: "bg-rose-50 text-rose-600",
    border: "border-l-rose-500",
    label: "Risque élevé",
    link: "/risques",
  },
  task: {
    icon: CalendarClock,
    iconBg: "bg-amber-50 text-amber-600",
    border: "border-l-amber-500",
    label: "Échéance aujourd'hui",
    link: "/taches",
  },
};

function PriorityItem({ type, title, subtitle, impact, link }) {
  const cfg = itemTypes[type] || itemTypes.recommendation;
  const Icon = cfg.icon;
  return (
    <Link
      to={link || cfg.link}
      className={cn(
        "flex items-center gap-3 rounded-xl border border-l-4 border-border bg-card p-4 transition-shadow hover:shadow-md",
        cfg.border
      )}
    >
      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", cfg.iconBg)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{cfg.label}</p>
        <p className="mt-0.5 truncate font-semibold">{title}</p>
        {subtitle && <p className="truncate text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {impact && <p className="shrink-0 text-sm font-bold text-red-600">{impact}</p>}
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

export default function TodayPriorities({ recommendations, anomalies, risks, tasks }) {
  const todayStr = new Date().toLocaleDateString("en-CA");

  const urgentRecs = (recommendations || [])
    .filter((r) => r.status === "nouvelle" && r.priority === "urgente")
    .slice(0, 2)
    .map((r) => ({
      type: "recommendation",
      title: r.title,
      subtitle: r.action,
      impact: r.financial_impact ? formatImpact(r.financial_impact) : null,
      link: "/recommandations",
    }));

  const critAnoms = (anomalies || [])
    .filter((a) => a.severity === "critique" && a.status === "nouveau")
    .slice(0, 2)
    .map((a) => ({
      type: "anomaly",
      title: a.title,
      subtitle: a.explanation || a.description,
      impact: a.financial_impact ? formatImpact(a.financial_impact) : null,
      link: "/anomalies",
    }));

  const highRisks = (risks || [])
    .filter((r) => r.urgency === "elevee")
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 2)
    .map((r) => ({
      type: "risk",
      title: r.title,
      subtitle: r.description,
      impact: r.financial_impact ? formatImpact(r.financial_impact) : null,
      link: "/risques",
    }));

  const dueTasks = (tasks || [])
    .filter((t) => t.status !== "terminee" && t.status !== "annulee" && t.due_date && t.due_date <= todayStr)
    .sort((a, b) => (a.due_date < b.due_date ? -1 : 1))
    .slice(0, 2)
    .map((t) => ({
      type: "task",
      title: t.title,
      subtitle: t.due_date < todayStr ? `En retard — échéance ${t.due_date}` : `Échéance: aujourd'hui`,
      link: "/taches",
    }));

  const priorities = [...urgentRecs, ...critAnoms, ...highRisks, ...dueTasks];

  if (priorities.length === 0) return null;

  return (
    <div className="animate-fade-in">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
        </div>
        <h2 className="text-base font-bold">Priorités critiques du jour</h2>
        <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">{priorities.length}</span>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {priorities.map((p, i) => (
          <PriorityItem key={i} {...p} />
        ))}
      </div>
    </div>
  );
}