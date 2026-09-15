import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, AlertTriangle, Info, ScanLine, Table2, Brain } from "lucide-react";
import { motion } from "framer-motion";

/**
 * « Voici ce que j'ai compris de votre fichier. »
 *
 * Cet ecran est le contrat de confiance de l'import : rien n'est enregistre
 * tant que l'utilisateur n'a pas vu, et au besoin corrige, la lecture proposee.
 * Il montre donc aussi ce que le FICHIER a corrige dans l'analyse — la preuve
 * visible que l'application ne croit pas son IA sur parole.
 */

const TON_CONFIANCE = {
  haute: { libelle: "Lecture sûre", classe: "bg-emerald-50 text-emerald-700 border-emerald-200", Icone: CheckCircle2 },
  moyenne: { libelle: "À vérifier", classe: "bg-amber-50 text-amber-700 border-amber-200", Icone: Info },
  faible: { libelle: "Peu sûre — vérifiez", classe: "bg-rose-50 text-rose-700 border-rose-200", Icone: AlertTriangle },
};

const ORIGINE = {
  ia: "Lu par l'analyse automatique",
  "ia+preuves": "Lu par l'analyse, corrigé d'après le contenu du fichier",
  regles: "Lu sans analyse (service indisponible)",
  memoire: "Lecture déjà validée par vous pour ce type de fichier",
};

const IGNOREE = "__ignoree__";

export default function PlanConfirmation({ analyses, champsParEntite, entityOptions, onConfirmer, onAnnuler, enCours }) {
  // Les plans sont modifiables : c'est l'utilisateur qui a le dernier mot.
  const [plans, setPlans] = useState(() =>
    Object.fromEntries(analyses.map((a) => [a.file_name, a.plan])),
  );

  const [manuallyChanged, setManuallyChanged] = useState({});

  const majPlan = (fichier, maj) =>
    setPlans((p) => ({ ...p, [fichier]: { ...p[fichier], ...maj } }));

  const majColonne = (fichier, nomColonne, champ) => {
    setPlans((p) => ({
      ...p,
      [fichier]: {
        ...p[fichier],
        colonnes: p[fichier].colonnes.map((c) =>
          c.colonne === nomColonne ? { ...c, champ: champ === IGNOREE ? null : champ } : c,
        ),
      },
    }));
    
    setManuallyChanged((prev) => ({
      ...prev,
      [`${fichier}-${nomColonne}`]: true
    }));
  };

  const rattaches = (plan) => plan.colonnes.filter((c) => c.champ).length;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Voici ce que j'ai compris</h2>
          <p className="text-sm text-slate-600 mt-1">
            Rien n'est encore enregistré. Vérifiez la lecture, corrigez si besoin, puis lancez l'import.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onAnnuler} disabled={enCours} className="border-slate-200">Annuler</Button>
          <Button onClick={() => onConfirmer(plans)} disabled={enCours} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
            {enCours ? "Import en cours…" : "Importer ces données"}
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {analyses.map((a, idx) => {
          const plan = plans[a.file_name];
          if (!plan) return null;
          const champs = champsParEntite?.[plan.entite] || [];
          const confiance = TON_CONFIANCE[plan.confiance] || TON_CONFIANCE.moyenne;
          const { Icone } = confiance;

          return (
            <motion.section 
              key={a.file_name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 space-y-6"
            >
              <header className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-slate-900 break-words">{a.file_name}</h3>
                  {plan.explication && <p className="mt-1 text-sm text-slate-600 leading-relaxed">{plan.explication}</p>}
                  <p className="mt-1.5 text-xs font-medium text-slate-500">{ORIGINE[plan.origine] || plan.origine}</p>
                </div>
                <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm ${confiance.classe}`}>
                  <Icone className="h-4 w-4" aria-hidden="true" />
                  {confiance.libelle}
                </span>
              </header>

              {/* Ce que le fichier a corrige dans l'analyse. */}
              {plan.corrections?.length > 0 && (
                <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold text-sky-900">
                    <ScanLine className="h-4 w-4" aria-hidden="true" />
                    Corrigé d'après le contenu réel du fichier
                  </p>
                  <ul className="mt-2 space-y-1.5 text-sm text-sky-800">
                    {plan.corrections.map((c, i) => <li key={i} className="flex items-start gap-2"><span className="text-sky-400">•</span> {c}</li>)}
                  </ul>
                </div>
              )}

              {a.analyse_erreur && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <p>{a.analyse_erreur}</p>
                </div>
              )}

              <div className="grid gap-6 sm:grid-cols-2 rounded-xl bg-slate-50/50 p-5 border border-slate-100">
                <div>
                  <label className="text-sm font-semibold text-slate-900 mb-1.5 block" htmlFor={`type-${a.file_name}`}>
                    Type de données
                  </label>
                  <Select value={plan.entite || ""} onValueChange={(val) => majPlan(a.file_name, { entite: val })}>
                    <SelectTrigger id={`type-${a.file_name}`} className="bg-white">
                      <SelectValue placeholder="Choisir un type" />
                    </SelectTrigger>
                    <SelectContent>
                      {entityOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm self-end">
                  <dt className="text-slate-500 font-medium">Lignes à importer</dt>
                  <dd className="text-slate-900 font-semibold">{a.rows_read ?? "—"}</dd>
                  <dt className="text-slate-500 font-medium">Colonnes rattachées</dt>
                  <dd className="text-slate-900 font-semibold">{rattaches(plan)} <span className="text-slate-400 font-normal">/ {plan.colonnes.length}</span></dd>
                  {plan.lignes_ignorees?.length > 0 && (
                    <>
                      <dt className="text-slate-500 font-medium">Lignes écartées</dt>
                      <dd className="text-slate-900 font-semibold">{plan.lignes_ignorees.length} <span className="text-slate-400 font-normal">(totaux, commentaires)</span></dd>
                    </>
                  )}
                </dl>
              </div>

              {a.quality && (
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-slate-900">Score de Qualité</h4>
                      <p className="text-sm text-slate-500">Analyse de la complétude et de la validité métier.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-2xl font-bold ${a.quality.score >= 90 ? 'text-emerald-600' : a.quality.score >= 70 ? 'text-amber-500' : 'text-red-600'}`}>
                        {a.quality.score} / 100
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                    <div className="flex flex-col gap-1 rounded-lg bg-emerald-50 p-3 border border-emerald-100">
                      <span className="text-emerald-700 font-medium flex items-center gap-2"><CheckCircle2 className="h-4 w-4"/> Lignes valides</span>
                      <span className="text-2xl font-bold text-emerald-900">{a.quality.valid_rows}</span>
                    </div>
                    <div className="flex flex-col gap-1 rounded-lg bg-rose-50 p-3 border border-rose-100">
                      <span className="text-rose-700 font-medium flex items-center gap-2"><AlertTriangle className="h-4 w-4"/> Quarantaine (Rejetées)</span>
                      <span className="text-2xl font-bold text-rose-900">{a.quality.quarantined_rows}</span>
                    </div>
                  </div>

                  {a.quality.quarantine_samples && a.quality.quarantine_samples.length > 0 && (
                    <div className="mt-4 border-t pt-4">
                      <p className="text-sm font-semibold text-rose-800 mb-2">Exemples de lignes en erreur (ignorer ou corriger le mapping)</p>
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                        {a.quality.quarantine_samples.slice(0, 3).map((err, i) => (
                          <div key={i} className="text-xs bg-rose-50/50 p-2 rounded border border-rose-100">
                            <span className="font-semibold text-rose-700 block mb-1">Ligne {err.rowIndex}:</span>
                            <ul className="list-disc list-inside text-rose-600 mb-2">
                              {err.errors.map((e, j) => <li key={j}>{e}</li>)}
                            </ul>
                            <div className="text-slate-600 bg-white p-1 rounded overflow-hidden text-ellipsis whitespace-nowrap">
                              {JSON.stringify(err.original)}
                            </div>
                          </div>
                        ))}
                        {a.quality.quarantine_samples.length > 3 && (
                          <p className="text-xs text-center text-slate-500 italic mt-2">Et {a.quality.quarantine_samples.length - 3} autres...</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <p className="mb-3 text-sm font-semibold text-slate-900">Correspondance des colonnes</p>
                <div className="space-y-2.5">
                  {plan.colonnes.map((c) => {
                    const isMapped = !!c.champ;
                    const isManual = manuallyChanged[`${a.file_name}-${c.colonne}`];
                    
                    return (
                      <div key={c.colonne} className={`flex flex-wrap items-center gap-3 p-2 rounded-lg border transition-colors ${
                        isMapped ? "bg-emerald-50/30 border-emerald-100" : "bg-slate-50 border-slate-200"
                      }`}>
                        <span className="min-w-0 flex-1 truncate font-medium text-sm text-slate-700 px-1" title={c.colonne}>
                          {c.colonne}
                        </span>
                        <span className="text-slate-400" aria-hidden="true">→</span>
                        <Select
                          value={c.champ || IGNOREE}
                          onValueChange={(val) => majColonne(a.file_name, c.colonne, val)}
                        >
                          <SelectTrigger className={`w-full sm:w-64 bg-white ${isMapped ? "border-emerald-200" : "border-slate-300"}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={IGNOREE}>Ignorer cette colonne</SelectItem>
                            {champs.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        
                        <div className="flex items-center gap-2 shrink-0 min-w-[120px]">
                          {isManual && (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-1 rounded-md"
                              title="Ce choix sera mémorisé pour les prochains imports"
                            >
                              <Brain className="h-3.5 w-3.5" />
                              Appris par l'IA
                            </motion.div>
                          )}
                          
                          {c.convention_date && (
                            <Badge variant="outline" className="text-[10px] uppercase tracking-wider bg-white">
                              {c.convention_date === "JJ/MM" ? "jour/mois" : "mois/jour"}
                            </Badge>
                          )}
                          {c.valeurs && (
                            <Badge variant="outline" className="text-[10px] bg-white max-w-[150px] truncate" title={Object.entries(c.valeurs).map(([k, val]) => `${k}=${val}`).join(", ")}>
                              {Object.entries(c.valeurs).slice(0, 2).map(([k, val]) => `${k}:${val}`).join(", ")}
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {a.apercu?.length > 0 && (
                <div>
                  <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Table2 className="h-4 w-4 text-slate-500" aria-hidden="true" />
                    Aperçu de ce qui sera enregistré
                  </p>
                  <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          {Object.keys(a.apercu[0]).map((k) => {
                            // Find if this target key is mapped in the current plan
                            const isColumnMapped = plan.colonnes.some(c => c.champ === k);
                            
                            return (
                              <th key={k} className={`whitespace-nowrap px-4 py-3 text-left font-semibold ${
                                isColumnMapped ? "text-emerald-700 bg-emerald-50/50" : "text-amber-700 bg-amber-50/50"
                              }`}>
                                <div className="flex items-center gap-1.5">
                                  {isColumnMapped ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                                  {k}
                                </div>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {a.apercu.map((ligne, i) => (
                          <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                            {Object.keys(a.apercu[0]).map((k) => {
                              const val = ligne[k];
                              const isMissing = val === null || val === undefined || val === "";
                              return (
                                <td key={k} className={`whitespace-nowrap px-4 py-2.5 ${isMissing ? 'bg-rose-50/30' : ''}`}>
                                  {isMissing ? (
                                    <span className="text-slate-300 italic text-xs">vide</span>
                                  ) : (
                                    <span className="text-slate-700">{String(val)}</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {a.apercu?.length === 0 && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                  <p>Aucune ligne n'a pu être lue avec cette correspondance. Vérifiez le type de données et les colonnes ci-dessus avant d'importer.</p>
                </div>
              )}
            </motion.section>
          );
        })}
      </div>
    </motion.div>
  );
}
