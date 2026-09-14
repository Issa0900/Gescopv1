import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, AlertTriangle, Info, ScanLine, Table2 } from "lucide-react";

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

  const majPlan = (fichier, maj) =>
    setPlans((p) => ({ ...p, [fichier]: { ...p[fichier], ...maj } }));

  const majColonne = (fichier, nomColonne, champ) =>
    setPlans((p) => ({
      ...p,
      [fichier]: {
        ...p[fichier],
        colonnes: p[fichier].colonnes.map((c) =>
          c.colonne === nomColonne ? { ...c, champ: champ === IGNOREE ? null : champ } : c,
        ),
      },
    }));

  const rattaches = (plan) => plan.colonnes.filter((c) => c.champ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Voici ce que j'ai compris</h2>
          <p className="text-sm text-slate-600">
            Rien n'est encore enregistré. Vérifiez la lecture, corrigez si besoin, puis lancez l'import.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onAnnuler} disabled={enCours}>Annuler</Button>
          <Button onClick={() => onConfirmer(plans)} disabled={enCours}>
            {enCours ? "Import en cours…" : "Importer ces données"}
          </Button>
        </div>
      </div>

      {analyses.map((a) => {
        const plan = plans[a.file_name];
        if (!plan) return null;
        const champs = champsParEntite?.[plan.entite] || [];
        const confiance = TON_CONFIANCE[plan.confiance] || TON_CONFIANCE.moyenne;
        const { Icone } = confiance;

        return (
          <section key={a.file_name} className="rounded-xl border border-slate-200 bg-white p-5 space-y-5">
            <header className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-slate-900 break-words">{a.file_name}</p>
                {plan.explication && <p className="mt-1 text-sm text-slate-600">{plan.explication}</p>}
                <p className="mt-1 text-xs text-slate-500">{ORIGINE[plan.origine] || plan.origine}</p>
              </div>
              <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${confiance.classe}`}>
                <Icone className="h-3.5 w-3.5" aria-hidden="true" />
                {confiance.libelle}
              </span>
            </header>

            {/* Ce que le fichier a corrige dans l'analyse. */}
            {plan.corrections?.length > 0 && (
              <div className="rounded-lg border border-sky-200 bg-sky-50 p-3">
                <p className="flex items-center gap-1.5 text-sm font-medium text-sky-900">
                  <ScanLine className="h-4 w-4" aria-hidden="true" />
                  Corrigé d'après le contenu réel du fichier
                </p>
                <ul className="mt-1.5 space-y-1 text-sm text-sky-800">
                  {plan.corrections.map((c, i) => <li key={i}>• {c}</li>)}
                </ul>
              </div>
            )}

            {a.analyse_erreur && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                {a.analyse_erreur}
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-slate-600" htmlFor={`type-${a.file_name}`}>
                  Type de données
                </label>
                <Select value={plan.entite || ""} onValueChange={(val) => majPlan(a.file_name, { entite: val })}>
                  <SelectTrigger id={`type-${a.file_name}`} className="mt-1">
                    <SelectValue placeholder="Choisir un type" />
                  </SelectTrigger>
                  <SelectContent>
                    {entityOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm self-end">
                <dt className="text-slate-500">Lignes à importer</dt>
                <dd className="text-slate-900">{a.rows_read ?? "—"}</dd>
                <dt className="text-slate-500">Colonnes rattachées</dt>
                <dd className="text-slate-900">{rattaches(plan)} / {plan.colonnes.length}</dd>
                {plan.lignes_ignorees?.length > 0 && (
                  <>
                    <dt className="text-slate-500">Lignes écartées</dt>
                    <dd className="text-slate-900">{plan.lignes_ignorees.length} (totaux, commentaires)</dd>
                  </>
                )}
              </dl>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium text-slate-600">Correspondance des colonnes</p>
              <div className="space-y-2">
                {plan.colonnes.map((c) => (
                  <div key={c.colonne} className="flex flex-wrap items-center gap-2">
                    <span className="min-w-0 flex-1 truncate rounded-md bg-slate-50 px-2.5 py-1.5 text-sm text-slate-700" title={c.colonne}>
                      {c.colonne}
                    </span>
                    <span className="text-slate-400" aria-hidden="true">→</span>
                    <Select
                      value={c.champ || IGNOREE}
                      onValueChange={(val) => majColonne(a.file_name, c.colonne, val)}
                    >
                      <SelectTrigger className="w-full sm:w-56">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={IGNOREE}>Ignorer cette colonne</SelectItem>
                        {champs.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {c.convention_date && (
                      <Badge variant="outline" className="shrink-0 text-xs">
                        dates {c.convention_date === "JJ/MM" ? "jour/mois" : "mois/jour"}
                      </Badge>
                    )}
                    {c.valeurs && (
                      <Badge variant="outline" className="shrink-0 text-xs">
                        {Object.entries(c.valeurs).slice(0, 3).map(([k, val]) => `${k} = ${val}`).join(", ")}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {a.apercu?.length > 0 && (
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-600">
                  <Table2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Aperçu de ce qui sera enregistré
                </p>
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        {Object.keys(a.apercu[0]).map((k) => (
                          <th key={k} className="whitespace-nowrap px-3 py-2 text-left font-medium text-slate-600">{k}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {a.apercu.map((ligne, i) => (
                        <tr key={i} className="border-t border-slate-100">
                          {Object.keys(a.apercu[0]).map((k) => (
                            <td key={k} className="whitespace-nowrap px-3 py-2 text-slate-700">{String(ligne[k] ?? "")}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {a.apercu?.length === 0 && (
              <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                Aucune ligne n'a pu être lue avec cette correspondance. Vérifiez le type de données et les colonnes ci-dessus avant d'importer.
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}
