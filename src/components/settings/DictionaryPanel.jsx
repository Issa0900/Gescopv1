import React, { useState } from "react";
import { BookOpen, Plus, Trash2, CheckCircle2, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function DictionaryPanel({ form, setForm }) {
  const dictionary = form.company_dictionary || {
    "CA": "revenue",
    "Chiffre affaires": "revenue",
    "Ventes": "revenue",
    "Coût achat": "cogs",
    "Coût d'achat": "cogs",
    "Coût Total ($)": "cogs",
    "Profit Brut ($)": "gross_profit",
    "% Marge": "gross_margin_pct",
    "Succursale": "branch",
    "Magasin": "branch",
    "Courriel": "customer_email",
    "Facebook Ads": "meta_ads",
    "ID Transaction": "order_id",
    "Employés": "headcount",
  };

  const [newTerm, setNewTerm] = useState("");
  const [newConcept, setNewConcept] = useState("");

  const addTerm = () => {
    if (!newTerm.trim() || !newConcept.trim()) return;
    const nextDict = {
      ...dictionary,
      [newTerm.trim()]: newConcept.trim(),
    };
    setForm((f) => ({ ...f, company_dictionary: nextDict }));
    setNewTerm("");
    setNewConcept("");
  };

  const removeTerm = (key) => {
    const nextDict = { ...dictionary };
    delete nextDict[key];
    setForm((f) => ({ ...f, company_dictionary: nextDict }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          Dictionnaire Métier & Mémoire Sémantique
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Apprend et mémorise le vocabulaire spécifique de vos fichiers pour garantir une reconnaissance sans erreur à chaque import.
        </p>
      </div>

      <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 text-xs text-indigo-950 flex items-start gap-2.5">
        <Sparkles className="h-4 w-4 shrink-0 mt-0.5 text-indigo-600" />
        <div>
          <strong>Apprentissage adaptatif :</strong> Chaque correction que vous appliquez lors d'un import est automatiquement enregistrée ici et réutilisée pour tous les futurs fichiers de votre entreprise.
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-600 border-b border-border">
            <tr>
              <th className="text-left py-3 px-4 font-semibold">Terme utilisé dans vos fichiers</th>
              <th className="text-left py-3 px-4 font-semibold">Concept GESCOP normalisé</th>
              <th className="text-right py-3 px-4">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {Object.entries(dictionary).map(([term, concept]) => (
              <tr key={term} className="hover:bg-slate-50/70">
                <td className="py-2.5 px-4 font-medium text-slate-900">{term}</td>
                <td className="py-2.5 px-4">
                  <span className="font-mono text-primary font-bold bg-primary/10 px-2 py-0.5 rounded">
                    {concept}
                  </span>
                </td>
                <td className="py-2.5 px-4 text-right">
                  <button
                    type="button"
                    onClick={() => removeTerm(term)}
                    className="text-slate-400 hover:text-red-600 p-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
        <h3 className="text-xs font-semibold text-slate-900">Ajouter une correspondance manuelle</h3>
        <div className="flex gap-2 max-w-lg">
          <Input
            value={newTerm}
            onChange={(e) => setNewTerm(e.target.value)}
            placeholder="Terme dans vos fichiers (ex: POS Site)"
            className="text-xs bg-white"
          />
          <Input
            value={newConcept}
            onChange={(e) => setNewConcept(e.target.value)}
            placeholder="Concept canonique (ex: branch)"
            className="text-xs bg-white"
          />
          <Button type="button" size="sm" onClick={addTerm}>
            <Plus className="h-4 w-4 mr-1" /> Associer
          </Button>
        </div>
      </div>
    </div>
  );
}

