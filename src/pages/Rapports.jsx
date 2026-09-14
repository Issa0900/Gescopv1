import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { FileText, Trash2, Download, Clock, GitCompareArrows } from "lucide-react";
import { downloadCSV } from "@/lib/exportUtils";
import ReportTypeCard from "@/components/reports/ReportTypeCard";
import ReportViewer from "@/components/reports/ReportViewer";
import { cn } from "@/lib/utils";

const reportTypes = ["quotidien", "hebdomadaire", "mensuel"];

const typeBadge = {
  quotidien: "bg-blue-50 text-blue-600",
  hebdomadaire: "bg-violet-50 text-violet-600",
  mensuel: "bg-emerald-50 text-emerald-600",
};
const typeLabel = { quotidien: "Quotidien", hebdomadaire: "Hebdomadaire", mensuel: "Mensuel" };

export default function Rapports() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [generating, setGenerating] = useState(null);
  const [selected, setSelected] = useState(null);
  const [withComparison, setWithComparison] = useState(true);

  const { data: reports, isLoading } = useQuery({
    queryKey: ["reports"],
    queryFn: async () => {
      const list = await base44.entities.Report.list("-created_date", 20);
      return list || [];
    },
  });

  const generate = async (type) => {
    setGenerating(type);
    try {
      const res = await base44.functions.invoke("generateReport", { type, comparison: withComparison });
      const data = res.data || res;
      if (data.error) {
        toast({ title: data.error, variant: "destructive" });
      } else {
        toast({ title: "Rapport généré" });
        qc.invalidateQueries(["reports"]);
        setSelected(data.report);
      }
    } catch (e) {
      toast({ title: "Erreur: " + (e.response?.data?.error || e.message), variant: "destructive" });
    } finally {
      setGenerating(null);
    }
  };

  const exportReport = (report) => {
    const rows = [
      { Champ: "Type", Valeur: report.type || "" },
      { Champ: "Période", Valeur: report.period || "" },
      { Champ: "Date de génération", Valeur: report.created_date ? new Date(report.created_date).toLocaleString("fr-CA") : "" },
      { Champ: "Résumé exécutif", Valeur: report.summary || "" },
      { Champ: "Contenu", Valeur: report.content || "" },
    ];
    const safePeriod = (report.period || "rapport").replace(/[^a-zA-Z0-9]/g, "_");
    downloadCSV(`GESCOP_Rapport_${safePeriod}`, rows, { Champ: "Champ", Valeur: "Valeur" });
  };

  const exportReportsList = () => {
    const rows = (reports || []).map((r) => ({
      Type: r.type || "",
      Période: r.period || "",
      "Date de génération": r.created_date ? new Date(r.created_date).toLocaleString("fr-CA") : "",
      "Résumé exécutif": r.summary || "",
      Contenu: r.content || "",
    }));
    downloadCSV(`GESCOP_Rapports_${new Date().toISOString().slice(0, 10)}`, rows, {
      Type: "Type",
      Période: "Période",
      "Date de génération": "Date de génération",
      "Résumé exécutif": "Résumé exécutif",
      Contenu: "Contenu",
    });
  };

  const remove = async (id) => {
    await base44.entities.Report.delete(id);
    qc.invalidateQueries(["reports"]);
    if (selected?.id === id) setSelected(null);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rapports</h1>
          <p className="mt-1 text-muted-foreground">Rapports générés automatiquement à partir de vos données.</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportReportsList} disabled={!reports || reports.length === 0}>
          <Download className="mr-1.5 h-4 w-4" /> Exporter tout (CSV)
        </Button>
      </div>

      {/* Comparison toggle */}
      <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <GitCompareArrows className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Comparaison période contre période</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Affiche les indicateurs clés de la période actuelle face à la période précédente, avec l'évolution de chaque KPI.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setWithComparison(!withComparison)}
          className={cn(
            "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
            withComparison ? "bg-primary" : "bg-muted-foreground/30"
          )}
        >
          <span
            className={cn(
              "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
              withComparison ? "translate-x-5" : "translate-x-0.5"
            )}
          />
        </button>
      </div>

      {/* Generate buttons */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {reportTypes.map((rt) => (
          <ReportTypeCard key={rt} typeKey={rt} onGenerate={generate} isGenerating={generating === rt} />
        ))}
      </div>

      {/* Selected report */}
      {selected && (
        <ReportViewer report={selected} onClose={() => setSelected(null)} onExport={() => exportReport(selected)} />
      )}

      {/* History */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Rapports récents</h2>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : !reports || reports.length === 0 ? (
          <EmptyState icon={FileText} title="Aucun rapport" description="Générez votre premier rapport ci-dessus." />
        ) : (
          <div className="space-y-2">
            {reports.map((r) => (
              <div key={r.id} className="group flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30 hover:bg-accent/30">
                <button onClick={() => setSelected(r)} className="flex flex-1 items-center gap-3 text-left">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                    <FileText className="h-4.5 w-4.5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${typeBadge[r.type] || typeBadge.quotidien}`}>
                        {typeLabel[r.type] || r.type}
                      </span>
                      <span className="text-sm font-medium">{r.period}</span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {r.created_date ? new Date(r.created_date).toLocaleString("fr-CA", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}
                    </div>
                  </div>
                </button>
                <div className="flex items-center gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                  <Button size="sm" variant="ghost" onClick={() => setSelected(r)}>Consulter</Button>
                  <button onClick={() => exportReport(r)} className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" title="Exporter CSV">
                    <Download className="h-4 w-4" />
                  </button>
                  <button onClick={() => remove(r.id)} className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600" title="Supprimer">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}