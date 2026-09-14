import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/EmptyState";
import { useToast } from "@/components/ui/use-toast";
import {
  Upload,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Download,
  ArrowRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useCompany } from "@/hooks/useCompany";
import { AlertTriangle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import ImportProgress from "@/components/import/ImportProgress";
import PlanConfirmation from "@/components/import/PlanConfirmation";

const acceptedTypes = ".csv,.xlsx,.xls,.tsv,.pdf";

const ENTITY_OPTIONS = [
  { value: "Transaction", label: "Transactions (revenus/dépenses)" },
  { value: "Order", label: "Commandes (orders)" },
  { value: "Customer", label: "Clients (customers)" },
  { value: "Product", label: "Produits (products)" },
  { value: "Inventory", label: "Stocks (inventory)" },
  { value: "Campaign", label: "Campagnes (campaigns)" },
  { value: "CampaignDaily", label: "Campagnes journalières" },
  { value: "Cashflow", label: "Flux de trésorerie" },
  { value: "Expense", label: "Dépenses (expenses)" },
  { value: "Employee", label: "Employés" },
  { value: "Payroll", label: "Paie (payroll)" },
  { value: "Supplier", label: "Fournisseurs" },
  { value: "Purchase", label: "Achats (purchases)" },
  { value: "Interaction", label: "Interactions client" },
  { value: "Competitor", label: "Concurrents" },
  { value: "Goal", label: "Objectifs (goals)" },
  { value: "Event", label: "Événements" },
  { value: "ExternalSignal", label: "Signaux externes (radar)" },
];

export default function ImportPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [importResult, setImportResult] = useState(null);
  // L'import se fait en deux temps : on analyse d'abord, l'utilisateur valide
  // la lecture, et seulement ensuite on ecrit. Tant que `analyses` est rempli,
  // rien n'a ete enregistre.
  const [analyses, setAnalyses] = useState(null);
  const [champsParEntite, setChampsParEntite] = useState(null);
  const [fichiersEnvoyes, setFichiersEnvoyes] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [purging, setPurging] = useState(false);
  const [manualEntity, setManualEntity] = useState("");
  const { company } = useCompany();

  const { data: imports, isLoading } = useQuery({
    queryKey: ["imports"],
    queryFn: async () => {
      const list = await base44.entities.Import.list("-created_date", 20);
      return list || [];
    },
  });

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploadedFiles = [];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
        uploadedFiles.push({ file_url, file_name: file.name });
      }
      setUploading(false);
      setAnalyzing(true);
      setImportResult(null);
      const res = await base44.functions.invoke("importMultiData", {
        files: uploadedFiles,
        entity_override: manualEntity || null,
        mode: "analyser",
      });
      const data = res.data || res;
      if (data.error) {
        toast({ title: data.error, variant: "destructive" });
        return;
      }
      const lisibles = (data.results || []).filter((r) => r.plan);
      // Les feuilles vides ou illisibles n'ont pas de plan : elles vont
      // directement au recapitulatif, il n'y a rien a confirmer dessus.
      const nonLisibles = (data.results || []).filter((r) => !r.plan);
      if (lisibles.length === 0) {
        setImportResult({ results: nonLisibles });
        toast({ title: "Aucun fichier lisible", variant: "destructive" });
        return;
      }
      setFichiersEnvoyes(uploadedFiles);
      setChampsParEntite(data.champs_par_entite || {});
      setAnalyses(lisibles);
    } catch (e) {
      toast({ title: "Erreur: " + (e.response?.data?.error || e.message), variant: "destructive" });
    } finally {
      setUploading(false);
      setAnalyzing(false);
    }
  };

  /** Deuxieme temps : l'utilisateur a valide la lecture, on ecrit. */
  const lancerImport = async (plans) => {
    setProcessing(true);
    try {
      const res = await base44.functions.invoke("importMultiData", {
        files: fichiersEnvoyes,
        entity_override: manualEntity || null,
        plans,
      });
      const data = res.data || res;
      if (data.error) {
        toast({ title: data.error, variant: "destructive" });
        return;
      }
      setAnalyses(null);
      setImportResult(data);
      const totalRows = (data.results || []).reduce((s, r) => s + (r.rows || 0), 0);
      const okCount = (data.results || []).filter((r) => r.status === "complete").length;
      toast({
        title: "Import terminé",
        description: `${okCount}/${data.results.length} fichiers traités, ${totalRows} lignes importées`,
      });
      qc.invalidateQueries();
    } catch (e) {
      toast({ title: "Erreur: " + (e.response?.data?.error || e.message), variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const annulerAnalyse = () => {
    setAnalyses(null);
    setFichiersEnvoyes([]);
  };

  /**
   * Delete an import AND the records it created.
   *
   * The journal entry is the ONLY link between a row and the file it came from,
   * so it must never be removed while rows still point at it. The previous
   * version deleted it unconditionally: if the cascade matched nothing — an
   * import whose entity_type was empty (it silently fell back to "Transaction"),
   * an entity the client does not expose, or a partial server-side delete — the
   * import vanished from the list, the rows stayed, and the toast still said
   * "supprimés". Those rows then became unreachable: nothing pointed to them
   * any more, and only the global purge could clear them.
   *
   * Now: delete, verify, and keep the journal entry if anything survives.
   */
  const handleDelete = async (imp) => {
    const entityName = imp.entity_type;
    if (!entityName || !base44.entities[entityName]) {
      toast({
        title: "Suppression impossible",
        description: `Cet import ne précise pas de type d'entité valide (${entityName || "vide"}). `
          + "Le supprimer laisserait ses données sans rattachement. Utilisez « Tout supprimer » si vous voulez repartir de zéro.",
        variant: "destructive",
      });
      return;
    }
    if (!window.confirm(`Supprimer cet import effacera aussi tous les enregistrements ${entityName} associés. Continuer ?`)) return;

    const entity = base44.entities[entityName];
    try {
      let deleted = 0;
      let remaining = 0;
      // Loop in case the server caps how many rows one call removes.
      for (let pass = 0; pass < 10; pass += 1) {
        const res = await entity.deleteMany({ import_id: imp.id });
        deleted += Number(res?.deleted) || 0;
        const left = await entity.filter({ import_id: imp.id }, null, 1);
        remaining = (left || []).length;
        if (remaining === 0) break;
        // No progress on this pass: retrying will not help.
        if (!res?.deleted) break;
      }

      if (remaining > 0) {
        // Keep the import record so the rows stay reachable and deletable.
        toast({
          title: "Suppression incomplète",
          description: `${deleted} enregistrement(s) ${entityName} supprimé(s), mais il en reste. `
            + "L'import a été conservé pour que vous puissiez relancer la suppression — sinon ces lignes deviendraient introuvables.",
          variant: "destructive",
        });
        qc.invalidateQueries();
        return;
      }

      await base44.entities.Import.delete(imp.id);
      // Les alertes/notifications produites par l'analyse pointaient sur ces
      // lignes : sans ce nettoyage, la cloche continuait d'afficher des alertes
      // pour des données qui n'existent plus.
      await base44.entities.Alert.deleteMany({ category: { $in: ["anomalie", "risque", "opportunite"] } });
      qc.invalidateQueries();
      toast({ title: `Import supprimé · ${deleted} enregistrement(s) ${entityName} effacé(s) · alertes obsolètes effacées` });
    } catch (e) {
      toast({ title: "Erreur: " + e.message, variant: "destructive" });
    }
  };

  const handlePurgeAll = async () => {
    if (!window.confirm("Cela supprimera DÉFINITIVEMENT toutes vos transactions, KPI, anomalies, risques, opportunités et recommandations. Continuer ?")) return;
    try {
      setPurging(true);
      await base44.entities.Transaction.deleteMany({});
      await base44.entities.Order.deleteMany({});
      await base44.entities.Customer.deleteMany({});
      await base44.entities.Product.deleteMany({});
      await base44.entities.Inventory.deleteMany({});
      await base44.entities.Supplier.deleteMany({});
      await base44.entities.Purchase.deleteMany({});
      await base44.entities.Campaign.deleteMany({});
      await base44.entities.CampaignDaily.deleteMany({});
      await base44.entities.Employee.deleteMany({});
      await base44.entities.Payroll.deleteMany({});
      await base44.entities.Expense.deleteMany({});
      await base44.entities.Cashflow.deleteMany({});
      await base44.entities.Interaction.deleteMany({});
      await base44.entities.Competitor.deleteMany({});
      await base44.entities.Goal.deleteMany({});
      await base44.entities.Event.deleteMany({});
      await base44.entities.Kpi.deleteMany({});
      await base44.entities.Anomaly.deleteMany({});
      await base44.entities.Risk.deleteMany({});
      await base44.entities.Opportunity.deleteMany({});
      await base44.entities.Recommendation.deleteMany({});
      await base44.entities.Alert.deleteMany({});
      await base44.entities.Task.deleteMany({});
      await base44.entities.Decision.deleteMany({});
      await base44.entities.ExternalSignal.deleteMany({});
      await base44.entities.Report.deleteMany({});
      await base44.entities.AnalysisRun.deleteMany({});
      await base44.entities.Import.deleteMany({});
      if (company) {
        await base44.entities.Company.update(company.id, { health_score: 0, dimension_scores: {}, last_analysis_date: null });
      }
      qc.invalidateQueries();
      toast({ title: "Toutes les données ont été purgées" });
    } catch (e) {
      toast({ title: "Erreur: " + e.message, variant: "destructive" });
    } finally {
      setPurging(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Importer des données</h1>
        <p className="mt-1 text-muted-foreground">
          Téléversez vos fichiers (CSV, Excel, PDF). GESCOP extrait et normalise automatiquement vos transactions.
        </p>
      </div>

      {/* Manual entity type selector */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="shrink-0">
            <Label htmlFor="entity-select" className="text-sm font-semibold">Type de données</Label>
            <p className="mt-0.5 text-xs text-muted-foreground">Choisissez le type pour une détection fiable</p>
          </div>
          <Select value={manualEntity} onValueChange={setManualEntity}>
            <SelectTrigger id="entity-select" className="sm:w-80">
              <SelectValue placeholder="Détection automatique (nom du fichier)" />
            </SelectTrigger>
            <SelectContent>
              {ENTITY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${
          dragOver ? "border-primary bg-primary/5" : "border-border bg-card"
        }`}
      >
        {uploading || analyzing || processing ? (
          <ImportProgress phase={uploading ? "uploading" : analyzing ? "analyzing" : "processing"} />
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Upload className="h-7 w-7 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">Glissez vos fichiers ici ou cliquez pour parcourir</p>
              <p className="mt-1 text-sm text-muted-foreground">Multi-fichiers supporté: CSV, XLSX, XLS, TSV, PDF texte</p>
            </div>
            <label>
              <input
                type="file"
                accept={acceptedTypes}
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
              <span className="inline-flex cursor-pointer items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                Choisir un fichier
              </span>
            </label>
          </div>
        )}
      </div>

      {/* Entre la lecture et l'ecriture : l'utilisateur valide ce qui a ete compris. */}
      {analyses && !processing && (
        <PlanConfirmation
          analyses={analyses}
          champsParEntite={champsParEntite}
          entityOptions={ENTITY_OPTIONS}
          onConfirmer={lancerImport}
          onAnnuler={annulerAnalyse}
          enCours={processing}
        />
      )}

      {importResult && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/30 p-6">
          <div className="mb-4 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <h2 className="font-semibold text-emerald-900">Import multi-fichiers terminé</h2>
          </div>
          <div className="overflow-x-auto rounded-lg border border-emerald-200">
            <table className="w-full min-w-[500px] text-sm">
              <thead className="bg-emerald-100/50 text-left text-xs uppercase text-emerald-900">
                <tr>
                  <th className="px-4 py-2 font-medium">Fichier / feuille</th>
                  <th className="px-4 py-2 font-medium">Entité</th>
                  <th className="px-4 py-2 font-medium">Lues</th>
                  <th className="px-4 py-2 font-medium">Importées</th>
                  <th className="px-4 py-2 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-100">
                {(importResult.results || []).map((r, i) => (
                  <tr key={i}>
                    <td className="max-w-[200px] px-4 py-2 font-medium">
                      <span className="block truncate" title={r.file_name}>{r.file_name}</span>
                      {(r.message || r.error) && (
                        <span className="mt-0.5 block text-xs font-normal text-amber-700">{r.message || r.error}</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {r.entity || "—"}
                      {r.detected_via && <span className="ml-1 text-xs">({r.detected_via})</span>}
                    </td>
                    <td className="px-4 py-2">{r.rows_read ?? "—"}</td>
                    <td className="px-4 py-2">
                      {r.rows || 0}
                      {r.quarantined > 0 && <span className="ml-1 text-xs text-amber-700">+{r.quarantined} rejetées</span>}
                    </td>
                    <td className="px-4 py-2">
                      <span className={r.status === "complete" ? "text-emerald-600" : r.status === "ignore" ? "text-muted-foreground" : "text-red-600"}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button asChild><Link to="/">Commencer l'analyse IA <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
            <Button variant="outline" onClick={() => setImportResult(null)}>Fermer</Button>
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <FileSpreadsheet className="mb-2 h-5 w-5 text-emerald-600" />
          <p className="text-sm font-medium">Tableurs</p>
          <p className="text-xs text-muted-foreground">Colonnes: date, description, montant, type, catégorie</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <FileText className="mb-2 h-5 w-5 text-red-600" />
          <p className="text-sm font-medium">PDF texte</p>
          <p className="text-xs text-muted-foreground">Relevés bancaires, factures en PDF natif</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <CheckCircle2 className="mb-2 h-5 w-5 text-blue-600" />
          <p className="text-sm font-medium">Normalisation auto</p>
          <p className="text-xs text-muted-foreground">Détection des types, doublons et devises</p>
        </div>
      </div>

      {/* Import history */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Historique des imports</h2>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : !imports || imports.length === 0 ? (
          <EmptyState icon={Download} title="Aucun import" description="Vos imports apparaîtront ici." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Fichier</th>
                  <th className="px-4 py-3 font-medium">Entité</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Lignes</th>
                  <th className="px-4 py-3 font-medium">Qualité</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {imports.map((imp) => (
                  <tr key={imp.id} className="hover:bg-muted/30">
                    <td className="max-w-[180px] truncate px-4 py-3 font-medium" title={imp.file_name}>{imp.file_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{imp.entity_type || "—"}</td>
                    <td className="px-4 py-3 uppercase text-muted-foreground">{imp.source_type}</td>
                    <td className="px-4 py-3">{imp.rows_processed || 0}</td>
                    <td className="px-4 py-3">
                      {imp.quality_score != null ? `${imp.quality_score}%` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                        imp.status === "complete" ? "text-emerald-600" : imp.status === "echoue" ? "text-red-600" : "text-amber-600"
                      }`}>
                        {imp.status === "complete" && <CheckCircle2 className="h-3.5 w-3.5" />}
                        {imp.status === "echoue" && <AlertCircle className="h-3.5 w-3.5" />}
                        {imp.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(imp.created_date).toLocaleDateString("fr-CA")}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <button onClick={() => handleDelete(imp)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Danger zone */}
      <div className="rounded-xl border border-red-200 bg-red-50/30 p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-900">Purger toutes les données</p>
            <p className="mt-1 text-sm text-red-700">
              Supprime définitivement toutes vos données importées ainsi que les KPI, anomalies, risques,
              opportunités et recommandations produits par l'analyse. Irréversible.
            </p>
          </div>
          <Button variant="destructive" onClick={handlePurgeAll} disabled={purging}>
            {purging ? "Purge en cours…" : "Tout supprimer"}
          </Button>
        </div>
      </div>

      <div className="rounded-xl bg-blue-50 p-4 text-sm text-blue-900">
        <p className="font-medium">Astuce</p>
        <p className="mt-1 text-blue-700">
          Après l'import, allez au tableau de bord et lancez l'analyse IA pour obtenir votre score de santé,
          vos KPI, vos risques et vos recommandations.{" "}
          <Link to="/" className="font-medium underline">Aller au tableau de bord →</Link>
        </p>
      </div>
    </div>
  );
}