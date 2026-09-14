import React from "react";
import { Button } from "@/components/ui/button";
import { Download, X, FileText, Calendar, Clock, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import ReportComparison from "@/components/reports/ReportComparison";

const typeConfig = {
  quotidien: { label: "Quotidien", color: "text-blue-600", bg: "bg-blue-50", ring: "ring-blue-100" },
  hebdomadaire: { label: "Hebdomadaire", color: "text-violet-600", bg: "bg-violet-50", ring: "ring-violet-100" },
  mensuel: { label: "Mensuel", color: "text-emerald-600", bg: "bg-emerald-50", ring: "ring-emerald-100" },
};

export default function ReportViewer({ report, onClose, onExport }) {
  if (!report) return null;
  const cfg = typeConfig[report.type] || typeConfig.quotidien;

  return (
    <div className="animate-scale-in overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${cfg.bg} ${cfg.ring} ring-1`}>
            <FileText className={`h-5 w-5 ${cfg.color}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold tracking-tight">{report.period}</h2>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                {cfg.label}
              </span>
            </div>
            <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {report.created_date ? new Date(report.created_date).toLocaleDateString("fr-CA") : "—"}
              </span>
              {report.created_date && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(report.created_date).toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={onExport}>
            <Download className="mr-1.5 h-3.5 w-3.5" /> Exporter
          </Button>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="px-6 py-5 sm:px-8 sm:py-6">
        {/* Executive summary callout */}
        {report.summary && (
          <div className="mb-6 flex gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary/80">Résumé exécutif</p>
              <p className="mt-1 text-sm leading-relaxed text-foreground">{report.summary}</p>
            </div>
          </div>
        )}

        {/* Period comparison */}
        {report.comparison && <ReportComparison comparison={report.comparison} />}

        {/* Content */}
        <div className="report-content">
          <ReactMarkdown
            components={{
              h1: ({ node, ...props }) => <h1 className="mb-3 mt-5 text-lg font-bold tracking-tight text-foreground first:mt-0" {...props} />,
              h2: ({ node, ...props }) => <h2 className="mb-2.5 mt-5 text-base font-semibold tracking-tight text-foreground first:mt-0" {...props} />,
              h3: ({ node, ...props }) => <h3 className="mb-2 mt-4 text-sm font-semibold text-foreground" {...props} />,
              p: ({ node, ...props }) => <p className="mb-3 text-sm leading-relaxed text-muted-foreground" {...props} />,
              ul: ({ node, ...props }) => <ul className="mb-3 ml-4 list-disc space-y-1.5 text-sm leading-relaxed text-muted-foreground marker:text-muted-foreground/50" {...props} />,
              ol: ({ node, ...props }) => <ol className="mb-3 ml-4 list-decimal space-y-1.5 text-sm leading-relaxed text-muted-foreground marker:text-muted-foreground/50" {...props} />,
              li: ({ node, ...props }) => <li className="pl-1" {...props} />,
              strong: ({ node, ...props }) => <strong className="font-semibold text-foreground" {...props} />,
              blockquote: ({ node, ...props }) => <blockquote className="my-3 border-l-2 border-primary/30 pl-4 text-sm italic text-muted-foreground" {...props} />,
              table: ({ node, ...props }) => <div className="my-4 overflow-x-auto"><table className="w-full text-left text-sm border-collapse" {...props} /></div>,
              th: ({ node, ...props }) => <th className="border-b border-border bg-muted/50 px-3 py-2 font-semibold text-foreground" {...props} />,
              td: ({ node, ...props }) => <td className="border-b border-border px-3 py-2 text-muted-foreground" {...props} />,
              hr: ({ node, ...props }) => <hr className="my-5 border-border" {...props} />,
            }}
          >
            {report.content || ""}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}