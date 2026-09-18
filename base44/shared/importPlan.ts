// Analyse d'un fichier par l'IA : produire un PLAN DE LECTURE, pas des donnees.
//
// Pourquoi un plan plutot qu'une extraction directe.
// ----------------------------------------------------------------------------
// Les fichiers des PME ne ressemblent jamais a un tableau propre : un en-tete de
// rapport sur quatre lignes, des intitules maison ("Mtt HT reel", "Sens"), une
// ligne de totaux a la fin, des dates 03/04/2026 dont personne ne sait si c'est
// le 3 avril ou le 4 mars. Aucune table de synonymes ne rattrapera cela : c'est
// un probleme de lecture de document, pas de format — donc le terrain d'un LLM.
//
// Mais on ne lui fait PAS retranscrire les valeurs. Recopier 40 000 cellules
// sans jamais en abimer une seule est un travail mecanique, et une ligne fausse
// ACCEPTEE est pire qu'une ligne rejetee : rien ne la signale. L'IA lit donc la
// STRUCTURE du fichier sur un echantillon et rend des consignes ; le code les
// applique ensuite a toutes les lignes, de facon deterministe et reproductible.
//
// Troisieme garde-fou, decisif : ce que le FICHIER prouve l'emporte sur ce que
// l'IA annonce. Si elle dit "dates en MM/JJ" et que la colonne contient 25/03,
// la preuve gagne. Voir verifierAvecPreuves().

import { getSchema } from "./entitySchemas.ts";
import { parseDate, stripAccents, FIELD_ALIASES, cleCanonique, ALIAS_CANONIQUES, variantesCanoniques, isSummaryOrTotalRow, type ConventionDate } from "./importUtils.ts";
import { trouverLigneEntetes, detectEntityByHeaders, detectEntityByFieldOverlap, detectEntityByName } from "./sheetDetect.ts";
import { recognizeAllColumns } from "./core/contextualRecognition.ts";
import { classifyDocumentSheet, type SheetClassificationResult } from "./core/documentClassifier.ts";
import { calculateQualityProfile, type QualityProfile } from "./core/qualityEngine.ts";
import { evaluateDecision, type DecisionVerdict } from "./core/decisionMatrix.ts";
import { DOCUMENT_ARCHETYPES, type DocumentArchetype, type GrainLevel } from "./core/ontology/types.ts";

export type Confiance = "haute" | "moyenne" | "faible";
export type OriginePlan = "ia" | "ia+preuves" | "regles" | "memoire";

export interface PlanColonne {
  /** Intitule tel qu'il apparait dans le fichier. */
  colonne: string;
  /** Champ vise dans l'entite, ou null si la colonne n'est rattachee a rien. */
  champ: string | null;
  /** Convention de date imposee a toute la colonne. */
  convention_date?: ConventionDate | null;
  /** Correspondance de valeurs, ex. { "D": "expense", "C": "income" }. */
  valeurs?: Record<string, string> | null;
}

export interface PlanImport {
  entite: string | null;
  /** Index (base 0) de la ligne d'en-tetes dans la matrice du fichier. */
  ligne_entetes: number;
  /** Index (base 0) des lignes a ignorer : totaux, sous-totaux, commentaires. */
  lignes_ignorees: number[];
  colonnes: PlanColonne[];
  confiance: Confiance;
  /** Phrase en francais montrable a l'utilisateur avant validation. */
  explication: string;
  origine: OriginePlan;
  /** Ce que les preuves du fichier ont corrige dans la proposition de l'IA. */
  corrections: string[];

  /** Nouveaux enrichissements universels V3.0 (Spec Section 9, 14, 22, 26) */
  archetype?: DocumentArchetype;
  grain?: GrainLevel;
  isAggregatedSummary?: boolean;
  qualityProfile?: QualityProfile;
  decision?: DecisionVerdict;
}

/** Nombre de lignes soumises a l'IA. Assez pour voir la structure ET des cas limites. */
export const LIGNES_ECHANTILLON = 30;

// ---------------------------------------------------------------------------
// 1. Echantillon
// ---------------------------------------------------------------------------

/**
 * Rend le debut du fichier sous forme de grille numerotee.
 *
 * On envoie le fichier TEL QUEL, desordre compris : c'est precisement l'en-tete
 * de rapport, la ligne vide et la ligne de totaux que l'IA doit voir pour les
 * signaler. Les nettoyer avant reviendrait a lui cacher le probleme qu'on lui
 * demande de resoudre.
 */
export function construireEchantillon(matrix: any[][], limite = LIGNES_ECHANTILLON): string {
  return matrix
    .slice(0, limite)
    .map((row, i) => `${String(i).padStart(2, " ")} | ${(row || []).map((c) => String(c ?? "").trim()).join(" | ")}`)
    .join("\n");
}

// ---------------------------------------------------------------------------
// 2. Preuves tirees du fichier (deterministes, gratuites, decisives)
// ---------------------------------------------------------------------------

const MOTIF_DATE_COURTE = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2}|\d{4})$/;

/**
 * Convention de date reellement prouvee par une colonne.
 *
 * Une seule valeur dont le premier nombre depasse 12 suffit a trancher : aucun
 * mois ne vaut 25, donc 25/03 est le 25 mars et toute la colonne est en JJ/MM.
 * C'est plus fiable que n'importe quelle intuition — IA comprise — parce que
 * c'est une preuve, pas une supposition. Retourne null si le fichier ne prouve
 * rien (toutes les valeurs sont ambigues) ou se contredit.
 */
export function conventionDateProuvee(valeurs: any[]): ConventionDate | null {
  let jourEnTete = 0;
  let moisEnTete = 0;
  for (const v of valeurs) {
    const m = String(v ?? "").trim().match(MOTIF_DATE_COURTE);
    if (!m) continue;
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (a > 12 && b <= 12) jourEnTete++;
    if (b > 12 && a <= 12) moisEnTete++;
  }
  if (jourEnTete > 0 && moisEnTete === 0) return "JJ/MM";
  if (moisEnTete > 0 && jourEnTete === 0) return "MM/JJ";
  return null;
}

/**
 * Une ligne est-elle une ligne de totaux ?
 *
 * Signature courante des exports comptables : une premiere cellule textuelle
 * ("TOTAL", "Sous-total", "Cumul") alors que le reste de la ligne est chiffre.
 * Sert de filet quand l'IA ne l'a pas signalee.
 */
const MOTS_TOTAUX = /^(total|totaux|sous[\s-]?total|cumul|somme|balance|solde\s+final)\b/i;

export function estLigneDeTotaux(row: any[]): boolean {
  const cells = (row || []).map((c) => String(c ?? "").trim());
  const remplies = cells.filter((c) => c !== "");
  if (remplies.length < 2) return false;
  return MOTS_TOTAUX.test(remplies[0]);
}

// ---------------------------------------------------------------------------
// 3. Validation de la reponse de l'IA
// ---------------------------------------------------------------------------

/**
 * Une reponse de LLM est du texte, jamais une garantie. On verifie donc que le
 * plan est structurellement utilisable AVANT de le laisser piloter un import :
 * les champs vises doivent exister dans le schema de l'entite, les index de
 * lignes doivent etre des entiers, l'entite doit etre connue. Tout ce qui ne
 * passe pas est ecarte — et non "corrige au mieux", ce qui masquerait l'erreur.
 */
export function validerPlan(brut: any, matrix: any[][]): { plan: PlanImport | null; refus: string[] } {
  const refus: string[] = [];
  if (!brut || typeof brut !== "object") return { plan: null, refus: ["reponse vide ou illisible"] };

  const entite = typeof brut.entite === "string" && brut.entite.trim() !== "" ? brut.entite.trim() : null;
  const schema = entite ? getSchema(entite) : null;
  if (entite && !schema) {
    refus.push(`entite inconnue : ${entite}`);
    return { plan: null, refus };
  }
  const champsConnus = schema ? Object.keys(schema.properties) : [];

  const ligneEntetes = Number.isInteger(brut.ligne_entetes) ? brut.ligne_entetes : 0;
  if (ligneEntetes < 0 || ligneEntetes >= matrix.length) {
    refus.push(`ligne d'en-tetes hors du fichier : ${brut.ligne_entetes}`);
    return { plan: null, refus };
  }

  const lignesIgnorees: number[] = Array.isArray(brut.lignes_ignorees)
    ? brut.lignes_ignorees.filter((n: any) => Number.isInteger(n) && n > ligneEntetes && n < matrix.length)
    : [];

  const colonnes: PlanColonne[] = [];
  for (const c of Array.isArray(brut.colonnes) ? brut.colonnes : []) {
    if (!c || typeof c.colonne !== "string") continue;
    let champ = typeof c.champ === "string" && c.champ.trim() !== "" ? c.champ.trim() : null;
    
    // Sauvetage contextuel si l'IA a proposé un synonyme ou nom légèrement différent
    if (champ && champsConnus.length > 0 && !champsConnus.includes(champ)) {
      const rescued = FIELD_ALIASES[champ] || ALIAS_CANONIQUES[champ];
      if (rescued && champsConnus.includes(rescued)) {
        champ = rescued;
      } else if (entite === "Campaign" && (champ === "cout_clic" || champ === "cost_per_click" || champ === "cout_par_clic") && champsConnus.includes("cpc")) {
        champ = "cpc";
      } else if (entite === "Campaign" && (champ === "budget_cad" || champ === "budget_total") && champsConnus.includes("budget")) {
        champ = "budget";
      } else if (entite === "Inventory" && (champ === "qte_en_stock" || champ === "inventory_level" || champ === "stock_quantity") && champsConnus.includes("closing_stock")) {
        champ = "closing_stock";
      } else if (entite === "Inventory" && (champ === "seuil_d_alerte" || champ === "seuil_alerte") && champsConnus.includes("reorder_point")) {
        champ = "reorder_point";
      } else if (entite === "Inventory" && (champ === "fournisseur" || champ === "supplier_name") && champsConnus.includes("supplier_id")) {
        champ = champsConnus.includes("supplier_name") ? "supplier_name" : "supplier_id";
      } else if (entite === "Customer" && (champ === "nom_complet" || champ === "full_name" || champ === "nom_client") && (champsConnus.includes("first_name") || champsConnus.includes("full_name"))) {
        champ = champsConnus.includes("full_name") ? "full_name" : "first_name";
      } else if (entite === "Customer" && champ === "code_postal" && champsConnus.includes("postal_code")) {
        champ = "postal_code";
      } else if (entite === "ExecutiveSummary" && (champ === "total" || champ === "ventes_totales") && champsConnus.includes("total_revenue")) {
        champ = "total_revenue";
      } else if (entite === "ExecutiveSummary" && (champ === "nb_transactions" || champ === "nombre_transactions") && champsConnus.includes("total_orders")) {
        champ = "total_orders";
      } else if (entite === "Supplier" && champ === "contact_principal" && champsConnus.includes("contact_name")) {
        champ = "contact_name";
      } else if (entite === "Supplier" && (champ === "conditions_paiement" || champ === "condition_paiement") && champsConnus.includes("payment_terms")) {
        champ = "payment_terms";
      } else if (entite === "Employee" && (champ === "role_poste" || champ === "poste") && champsConnus.includes("role")) {
        champ = "role";
      } else if (entite === "Employee" && champ === "taux_commission" && champsConnus.includes("commission_rate")) {
        champ = "commission_rate";
      } else {
        refus.push(`champ inconnu ignore : ${c.colonne} -> ${champ}`);
        champ = null;
      }
    }
    
    // Rattrapage multi-variantes si l'IA n'a pas su rattacher
    if (!champ && champsConnus.length > 0) {
      const vars = variantesCanoniques(c.colonne);
      for (const vr of vars) {
        if (champsConnus.includes(vr)) {
          champ = vr;
          break;
        }
        const alias = FIELD_ALIASES[vr] || ALIAS_CANONIQUES[vr];
        if (alias && champsConnus.includes(alias)) {
          champ = alias;
          break;
        }
      }
    }
    
    const convention = c.convention_date === "JJ/MM" || c.convention_date === "MM/JJ" ? c.convention_date : null;
    const valeurs = c.valeurs && typeof c.valeurs === "object" && !Array.isArray(c.valeurs) ? c.valeurs : null;
    colonnes.push({ colonne: c.colonne, champ, convention_date: convention, valeurs });
  }
  if (colonnes.length === 0) {
    refus.push("aucune colonne exploitable");
    return { plan: null, refus };
  }

  const confiance: Confiance = ["haute", "moyenne", "faible"].includes(brut.confiance) ? brut.confiance : "moyenne";

  return {
    plan: {
      entite,
      ligne_entetes: ligneEntetes,
      lignes_ignorees: lignesIgnorees,
      colonnes,
      confiance,
      explication: typeof brut.explication === "string" ? brut.explication : "",
      origine: "ia",
      corrections: [],
    },
    refus,
  };
}

// ---------------------------------------------------------------------------
// 4. Confrontation aux preuves — le fichier a toujours le dernier mot
// ---------------------------------------------------------------------------

export function verifierAvecPreuves(plan: PlanImport, matrix: any[][]): PlanImport {
  const corrections: string[] = [];
  const entetes = (matrix[plan.ligne_entetes] || []).map((h: any) => String(h ?? "").trim());
  const lignesDonnees = matrix.slice(plan.ligne_entetes + 1);

  const colonnes = plan.colonnes.map((col) => {
    const idx = entetes.indexOf(col.colonne);
    if (idx < 0) return col;
    const valeurs = lignesDonnees.map((r) => (r || [])[idx]);

    const prouvee = conventionDateProuvee(valeurs);
    if (prouvee && col.convention_date && col.convention_date !== prouvee) {
      corrections.push(
        `colonne « ${col.colonne} » : l'analyse annoncait des dates ${col.convention_date}, `
        + `le fichier prouve ${prouvee} (une valeur y depasse 12 jours) — le fichier l'emporte.`,
      );
      return { ...col, convention_date: prouvee };
    }
    if (prouvee && !col.convention_date) return { ...col, convention_date: prouvee };
    return col;
  });

  // Lignes de totaux que l'IA n'aurait pas vues.
  const ignorees = new Set(plan.lignes_ignorees);
  lignesDonnees.forEach((row, i) => {
    const absolu = plan.ligne_entetes + 1 + i;
    if (!ignorees.has(absolu) && estLigneDeTotaux(row)) {
      ignorees.add(absolu);
      corrections.push(`ligne ${absolu} ecartee : ligne de totaux non signalee par l'analyse.`);
    }
  });

  return {
    ...plan,
    colonnes,
    lignes_ignorees: Array.from(ignorees).sort((a, b) => a - b),
    origine: corrections.length > 0 ? "ia+preuves" : plan.origine,
    corrections,
  };
}

// ---------------------------------------------------------------------------
// 5. L'appel a l'IA
// ---------------------------------------------------------------------------

// construirePrompt/SCHEMA_REPONSE deplaces vers importUtils.ts (18 sept
// 2026) : fonctions pures, aucune dependance a XLSX — les y laisser via
// l'import de sheetDetect.ts (qui, lui, importe npm:xlsx@0.18.5) empechait
// de les tester sous le test runner Node du repo, meme probleme deja
// rencontre avec deriveFallbackIdentity et les fonctions de detection.
export { construirePrompt, SCHEMA_REPONSE, type InvocateurLLM } from "./importUtils.ts";
import { construirePrompt, SCHEMA_REPONSE } from "./importUtils.ts";

/**
 * Produit le plan de lecture d'un fichier.
 *
 * `planDeSecours` est le plan deterministe deja calcule par les regles
 * existantes (detection d'entite + ligne d'en-tetes). Il sert des que l'IA est
 * indisponible, lente, ou rend une reponse inutilisable : un import ne doit
 * jamais echouer parce qu'un service tiers est en panne.
 */
export async function analyserFichier(
  invoquer: InvocateurLLM,
  options: {
    matrix: any[][];
    nomFichier: string;
    entitesPossibles: string[];
    planDeSecours: PlanImport;
    companyDictionary?: Record<string, string>;
  },
): Promise<{ plan: PlanImport; refus: string[]; erreur?: string }> {
  const { matrix, nomFichier, entitesPossibles, planDeSecours, companyDictionary } = options;
  if (matrix.length === 0) return { plan: planDeSecours, refus: ["fichier vide"] };

  let brut: any;
  try {
    brut = await invoquer({
      prompt: construirePrompt(construireEchantillon(matrix), nomFichier, entitesPossibles, companyDictionary),
      response_json_schema: SCHEMA_REPONSE,
    });
  } catch (e: any) {
    return { plan: planDeSecours, refus: [], erreur: `analyse indisponible : ${e?.message || e}` };
  }

  const { plan, refus } = validerPlan(brut, matrix);
  if (!plan) return { plan: planDeSecours, refus, erreur: "plan refuse" };
  const verifie = verifierAvecPreuves(plan, matrix);

  // Fallback: override missing mappings from LLM with our deterministic rules & memory
  for (const col of verifie.colonnes) {
      if (!col.champ) {
          const secCol = planDeSecours.colonnes.find(c => c.colonne === col.colonne);
          if (secCol && secCol.champ) {
              col.champ = secCol.champ;
              verifie.corrections.push(`colonne « ${col.colonne} » : rattrapage via memoire/reconnaissance -> ${col.champ}.`);
              verifie.origine = "ia+preuves";
          }
      }
  }

  return { plan: verifie, refus };
}

// ---------------------------------------------------------------------------
// 6. Plan de secours : les regles deterministes, quand l'IA n'a pas repondu
// ---------------------------------------------------------------------------

/**
 * Un import ne doit jamais echouer parce qu'un service d'IA est en panne, lent
 * ou saturé. Ce plan reproduit le comportement historique : ligne d'en-tetes
 * trouvee par heuristique, entite deduite des colonnes, rattachement des
 * colonnes laisse a la table de synonymes de normalizeKeys (champ: null ici
 * signifie « le pipeline decidera », pas « colonne ignoree »).
 */
export function planParRegles(
  matrix: any[][], 
  nomFichier: string, 
  entiteConnue?: string | null,
  mappingMemory: any[] = []
): PlanImport {
  const ligne = matrix.length > 0 ? trouverLigneEntetes(matrix) : 0;
  const entetes = (matrix[ligne] || []).map((h: any) => String(h ?? "").trim()).filter((h: string) => h !== "");
  
  // Create sample rows for recognition and profiling
  const sampleRows: Record<string, any>[] = [];
  const lignes_ignorees: number[] = [];
  for(let i = ligne + 1; i < matrix.length; i++) {
    const rowObj: Record<string, any> = {};
    const row = matrix[i] || [];
    entetes.forEach((h: string, idx: number) => {
      rowObj[h] = row[idx];
    });
    // Detection automatique des lignes de total/synthese a ecarter
    if (isSummaryOrTotalRow(rowObj)) {
      lignes_ignorees.push(i);
    } else {
      if (sampleRows.length < 50) {
        sampleRows.push(rowObj);
      }
    }
  }

  // 1. Classification universelle de la feuille (Spec Section 9 & 14)
  const classification = classifyDocumentSheet({
    sheetName: nomFichier,
    headers: entetes,
    rows: sampleRows,
    matrix,
  });

  // 2. Détection de l'entité
  let entite = entiteConnue || detectEntityByName(nomFichier) || detectEntityByHeaders(entetes) || detectEntityByFieldOverlap(entetes) || null;
  if (!entite && classification.isAggregatedSummary) {
    entite = "ExecutiveSummary";
  }
  
  // Use Contextual Recognition (Sprint 2)
  let recognizedCols = new Map();
  try {
    recognizedCols = recognizeAllColumns({
      sheetName: nomFichier,
      headers: entetes,
      sampleRows,
      entityHint: entite || undefined,
      mappingMemory
    });
  } catch (e) {
    console.warn("Contextual recognition failed, falling back to basic mapping", e);
  }

  const colonnes = entetes.map((c: string) => {
    const rec = recognizedCols.get(c);
    let champ = null;
    const cleanC = c.toLowerCase().trim();
    const noAccentC = cleanC.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_");

    // Exact schema fields always win over semantic guesses
    if (entite) {
      const schema = getSchema(entite);
      if (schema) {
        const fields = Object.keys(schema.properties);
        if (fields.includes(c)) champ = c;
        else if (fields.includes(cleanC)) champ = cleanC;
        else if (fields.includes(noAccentC)) champ = noAccentC;
      }
    }
    
    // 1. Semantic contextual recognition (Ontologie Commerciale Universelle)
    if (!champ && rec && rec.confidence >= 0.5 && rec.canonicalKey !== 'unknown') {
       const k = rec.canonicalKey;
       if (k === 'revenue_amount' && entite === 'Order') champ = 'total';
       else if (k === 'revenue_amount' && entite === 'Campaign') champ = 'revenue';
       else if (k === 'expense_amount' && entite === 'Expense') champ = 'amount';
       else if (k === 'cash_balance' && entite === 'Cashflow') champ = 'closing_cash';
       else if (k === 'employee_identifier' && entite === 'Employee') champ = 'employee_id';
       else if (k === 'product_identifier' && entite === 'Product') champ = 'product_id';
       else if (k === 'identifier' && entite === 'Product') champ = 'product_id';
       else if (k === 'identifier' && entite === 'Employee') champ = 'employee_id';
       else champ = k;
       if (rec.targetField) {
          champ = rec.targetField;
       }
    }
    
    // 2. Fallback to schema fields so the UI doesn't show 'Ignorer' for valid columns
    if (!champ && entite) {
        const schema = getSchema(entite);
        if (schema) {
            const vars = variantesCanoniques(c);
            for (const vr of vars) {
              if (Object.keys(schema.properties).includes(vr)) {
                champ = vr;
                break;
              }
              const alias = FIELD_ALIASES[vr] || ALIAS_CANONIQUES[vr];
              if (alias && Object.keys(schema.properties).includes(alias)) {
                champ = alias;
                break;
              }
            }
        }
    }

    // 3. Adaptations ciblées par entité (Order, Product, Inventory, Customer, Campaign, Supplier, Employee, ExecutiveSummary)
    if (entite === 'Order') {
      if (champ === 'transaction_id') champ = 'order_id';
      if (champ === 'succursale' || champ === 'store') champ = 'location_id';
      if (champ === 'taxe_federale_tps') champ = 'tax_federal';
      if (champ === 'taxe_provinciale_tvq_tvh') champ = 'tax_provincial';
      {
        const normC = stripAccents(c.toLowerCase()).replace(/[^a-z0-9]+/g, "_");
        const mot = (s: string) => new RegExp(`(^|_)${s}(_|$)`).test(normC);
        if (mot("profit") && !mot("marge") && !mot("margin") && !mot("pct")) champ = 'gross_profit';
        else if ((mot("marge") || mot("margin")) && champ !== 'gross_profit') champ = 'gross_margin';
      }
    }
    if (entite === 'Product') {
      if (champ === 'closing_stock' || champ === 'stock_quantity') champ = 'inventory_level';
      if (champ === 'unit_cost') champ = 'purchase_cost';
      if (champ === 'qte_en_stock' || champ === 'quantity_on_hand') champ = 'inventory_level';
      if (champ === 'description') champ = 'product_name';
    }
    if (entite === 'Inventory') {
      if (champ === 'inventory_level' || champ === 'stock_quantity' || champ === 'qte_en_stock') champ = 'closing_stock';
      if (champ === 'valeur_stock_cout_cad' || champ === 'valeur_stock_cout' || champ === 'valeur_stock') champ = 'inventory_value';
      if (champ === 'seuil_d_alerte' || champ === 'seuil_alerte') champ = 'reorder_point';
      if (champ === 'fournisseur' || champ === 'supplier_name') champ = 'supplier_id';
      if (champ === 'description') champ = 'product_name';
    }
    if (entite === 'Customer') {
      if (champ === 'nom_complet' || champ === 'nom_client' || champ === 'client') champ = 'full_name';
      if (champ === 'code_postal') champ = 'postal_code';
      if (champ === 'points_fidelite') champ = 'loyalty_points';
    }
    if (entite === 'Supplier') {
      if (champ === 'contact_principal' || champ === 'contact') champ = 'contact_name';
      if (champ === 'conditions_paiement' || champ === 'condition_paiement' || champ === 'termes_paiement') champ = 'payment_terms';
      if (champ === 'ville') champ = 'city';
      if (champ === 'courriel') champ = 'email';
    }
    if (entite === 'Campaign') {
      if (champ === 'cout_clic' || champ === 'cout_par_clic' || champ === 'cost_per_click') champ = 'cpc';
      if (champ === 'budget_cad' || champ === 'budget_total') champ = 'budget';
    }
    if (entite === 'Employee') {
      if (champ === 'store' || champ === 'location_id' || champ === 'succursale') champ = 'location';
      if (champ === 'category') champ = 'department';
      if (champ === 'role_poste' || champ === 'poste' || champ === 'titre_poste') champ = 'role';
      if (champ === 'taux_commission') champ = 'commission_rate';
    }
    if (entite === 'ExecutiveSummary') {
      const normC = stripAccents(c.toLowerCase()).replace(/[^a-z0-9]+/g, "_");
      const mot = (s: string) => new RegExp(`(^|_)${s}(_|$)`).test(normC);
      if (mot("indicateur") || mot("kpi") || mot("performance") || mot("label")) champ = 'indicator_name';
      else if (mot("valeur") || mot("metrique")) champ = 'metric_value';
      else if (mot("unite") || mot("formule")) champ = 'unit_formula';
      else if (mot("commentaire") || mot("strategique") || mot("note") || mot("notes")) champ = 'notes';
      else if (mot("succursale") || mot("store") || mot("location") || mot("ville")) champ = 'location_id';
      else if (mot("transaction") || mot("transactions") || mot("commande") || mot("commandes") || mot("nb_transactions")) champ = 'total_orders';
      else if (mot("cout") || mot("cost") || mot("charge")) champ = 'total_cost';
      else if (mot("profit") || mot("benefice")) champ = 'gross_profit';
      else if (mot("marge") || mot("margin") || mot("pct")) champ = 'gross_margin';
      else if (mot("vente") || mot("ventes") || mot("revenue") || mot("ca")) champ = 'total_revenue';
    }
    if (entite === 'Asset') {
      const normC = stripAccents(c.toLowerCase()).replace(/[^a-z0-9]+/g, "_");
      const mot = (s: string) => new RegExp(`(^|_)${s}(_|$)`).test(normC);
      if (mot("immobilisation") || mot("actif_id") || (mot("id") && mot("actif"))) champ = 'asset_id';
      else if (mot("description") || mot("actif")) champ = 'description';
      else if (mot("classe") || (mot("dpa") && mot("classe"))) champ = 'dpa_class';
      else if (mot("taux") || mot("amortissement") || (mot("dpa") && mot("taux"))) champ = 'dpa_rate';
      else if (mot("commentaire") || mot("historique")) champ = 'historical_comment';
    }

    // Filet de sécurité général : la reconnaissance sémantique (étape 1,
    // ci-dessus) gagne souvent la course avant que FIELD_ALIASES/
    // ALIAS_CANONIQUES (étape 2) ne soit consultée, laissant `champ` sur le
    // nom d'en-tête canonicalisé brut ("cout_clic", "qte_en_stock"...) au
    // lieu du vrai champ du schéma ("cpc", "inventory_level"...) — c'est la
    // cause commune à la plupart des bugs de colonnes ignorées identifiés
    // (voir dictionnaire technique, section « Diagnostic des Rejets
    // d'Ingestion »). Les correctifs ciblés par entité ci-dessus couvrent
    // les cas déjà repérés ; ce filet rattrape génériquement tout champ final
    // qui n'existe pas dans le schéma cible mais que ces mêmes tables savent
    // pourtant traduire. Ne s'active que sur un champ déjà invalide : ne peut
    // pas dégrader un champ qui résolvait correctement.
    if (entite && champ) {
      const schema = getSchema(entite);
      if (schema && !Object.keys(schema.properties).includes(champ)) {
        const rescued = FIELD_ALIASES[champ] || ALIAS_CANONIQUES[champ];
        if (rescued && Object.keys(schema.properties).includes(rescued)) {
          champ = rescued;
        }
      }
    }

    return { colonne: c, champ };
  });

  // 3bis. Dédoublonnage des champs cibles : deux colonnes sources ne doivent
  // jamais écrire sur le même champ. appliquerPlan construit l'objet ligne en
  // affectant `obj[champ] = valeur` colonne par colonne — un deuxième
  // affectation au même champ écrase silencieusement la première, sans erreur
  // ni ligne de quarantaine, et l'utilisateur ne voit jamais qu'une colonne a
  // disparu. Repéré en testant Clients_CRM (ID_Client ET Nom_Client mappés
  // tous deux vers customer_id : l'identifiant réel se faisait remplacer par
  // le nom) et Stocks_MultiEntrepots (Quantite_En_Stock ET Quantite_Disponible
  // vers inventory_level). La colonne dont l'en-tête ressemble à un
  // identifiant (contient "id") gagne le champ. Le repli vers un champ "nom"
  // libre ne s'applique qu'au conflit sur un champ "_id" (le cas customer_id
  // / customer_name) : pour tout autre champ (une quantité, un montant...),
  // rediriger vers un champ "nom" du schéma choisi au hasard écrirait une
  // valeur numérique dans un champ texte sans rapport — la colonne perdante
  // est alors simplement ignorée plutôt que mal réaffectée.
  if (entite) {
    const schemaFields = Object.keys(getSchema(entite)?.properties || {});
    const claimedBy = new Map<string, { idx: number; looksLikeId: boolean }>();
    colonnes.forEach((c, idx) => {
      if (!c.champ) return;
      const looksLikeId = /\bid\b/i.test(c.colonne);
      const existing = claimedBy.get(c.champ);
      if (!existing) {
        claimedBy.set(c.champ, { idx, looksLikeId });
        return;
      }
      const loserIdx = (looksLikeId && !existing.looksLikeId) ? existing.idx : idx;
      if (loserIdx === existing.idx) claimedBy.set(c.champ, { idx, looksLikeId });
      const targetIsIdField = /_id$/.test(c.champ);
      const nameFieldPrefix = c.champ.replace(/_id$/, "_name");
      const freeNameField = targetIsIdField && schemaFields.includes(nameFieldPrefix) && !claimedBy.has(nameFieldPrefix)
        ? nameFieldPrefix
        : null;
      if (freeNameField) {
        colonnes[loserIdx].champ = freeNameField;
        claimedBy.set(freeNameField, { idx: loserIdx, looksLikeId: false });
      } else {
        colonnes[loserIdx].champ = null;
      }
    });
  }

  // 4. Calcul du profil de qualité et décision
  const avgConfidence = recognizedCols.size > 0
    ? Array.from(recognizedCols.values()).reduce((s: number, r: any) => s + (r.confidence || 0.8), 0) / recognizedCols.size
    : 0.85;

  const qualityProfile = calculateQualityProfile({
    headers: entetes,
    rows: sampleRows,
    mappedColumnsCount: colonnes.filter((c) => c.champ).length,
    totalColumnsCount: entetes.length,
    averageSemanticConfidence: avgConfidence,
    isAggregatedSummary: classification.isAggregatedSummary,
  });

  const decision = evaluateDecision(qualityProfile, avgConfidence);

  const explication = classification.isAggregatedSummary
    ? classification.explanation
    : (entite
        ? `Lecture sémantique de ${nomFichier} : reconnaissance de ${colonnes.filter((c) => c.champ).length}/${entetes.length} colonnes pour l'entité ${entite}.`
        : `Lecture automatique de ${nomFichier} : ${classification.explanation}`);

  return {
    entite,
    ligne_entetes: ligne,
    lignes_ignorees,
    colonnes,
    confiance: decision.confidenceScore >= 90 ? "haute" : decision.confidenceScore >= 70 ? "moyenne" : "faible",
    explication,
    origine: "regles",
    corrections: [],
    archetype: classification.archetype,
    grain: classification.grain.primaryGrain,
    isAggregatedSummary: classification.isAggregatedSummary,
    qualityProfile,
    decision,
  };
}

/** Le plan de secours laisse le mapping au pipeline historique. */
export function planSansRattachement(plan: PlanImport): boolean {
  // Dans un plan par règles, on autorise toujours le rattrapage par synonymes 
  // pour les colonnes dont le champ est resté à null.
  return plan.origine === "regles";
}

// ---------------------------------------------------------------------------
// 7. Application du plan
// ---------------------------------------------------------------------------

/**
 * Transforme la matrice brute en lignes exploitables, selon le plan.
 *
 * C'est ici que se materialise la separation : l'IA a decrit le fichier, le
 * code l'applique — a chaque ligne, de la meme facon, sans jamais redemander
 * son avis a personne. Deux imports du meme fichier donnent donc exactement le
 * meme resultat, ce qu'un appel par ligne ne pourrait pas garantir.
 *
 * Les valeurs illisibles ne sont PAS corrigees ni supprimees : elles passent
 * telles quelles a la normalisation, qui les mettra en quarantaine avec un
 * motif. Masquer une valeur douteuse serait exactement le defaut qu'on cherche
 * a eviter.
 */
export function appliquerPlan(plan: PlanImport, matrix: any[][]): Record<string, any>[] {
  const entetes = (matrix[plan.ligne_entetes] || []).map((h: any, i: number) => String(h ?? "").trim() || `col_${i + 1}`);
  const ignorees = new Set(plan.lignes_ignorees);
  const rattachement = new Map<number, PlanColonne>();
  plan.colonnes.forEach((col) => {
    const idx = entetes.indexOf(col.colonne);
    if (idx >= 0) rattachement.set(idx, col);
  });

  // Une colonne sans champ ne veut pas dire la meme chose selon l'origine du
  // plan : avec les regles, le rattachement n'a simplement pas ete tente et
  // c'est la table de synonymes qui s'en chargera ; avec l'analyse, cela
  // signifie « cette colonne ne correspond a rien » et la reproposer au
  // pipeline irait contre sa lecture. Le discriminant est donc l'origine du
  // PLAN, pas l'etat de la colonne.
  const rattacherParSynonymes = planSansRattachement(plan);

  const rows: Record<string, any>[] = [];
  for (let i = plan.ligne_entetes + 1; i < matrix.length; i += 1) {
    if (ignorees.has(i)) continue;
    const brute = matrix[i] || [];
    if (brute.every((c: any) => String(c ?? "").trim() === "")) continue;
    if (isSummaryOrTotalRow(brute)) continue;

    const obj: Record<string, any> = {};
    entetes.forEach((entete, idx) => {
      const col = rattachement.get(idx);
      let valeur = brute[idx] ?? "";

      // Traduction des codes maison ("D" -> expense) decidee par l'analyse.
      if (col?.valeurs) {
        const cle = String(valeur ?? "").trim();
        if (Object.prototype.hasOwnProperty.call(col.valeurs, cle)) valeur = col.valeurs[cle];
      }
      // Convention de date imposee a toute la colonne. Si la valeur reste
      // illisible on garde l'originale : la quarantaine dira pourquoi.
      if (col?.convention_date) {
        const d = parseDate(valeur, col.convention_date);
        if (d !== null) valeur = d;
      }

      if (col && col.champ) {
        obj[col.champ] = valeur;
      } else if (!col || rattacherParSynonymes) {
        // Colonne jamais rattachée par le plan (ou plan par règles, qui
        // n'a pas tenté le rattachement) : on conserve l'entête d'origine
        // pour que le dictionnaire d'alias et la normalisation la rattrapent.
        obj[entete] = valeur;
      }
      // Sinon : l'analyse a explicitement jugé cette colonne sans
      // correspondance (col.champ === null) — on ne la réintroduit pas.
    });
    if (isSummaryOrTotalRow(obj)) continue;
    if (Object.keys(obj).length > 0) rows.push(obj);
  }
  return rows;
}


// ---------------------------------------------------------------------------
// 8. Memoire : reconnaitre un fichier deja vu
// ---------------------------------------------------------------------------

/**
 * Empreinte d'un fichier, calculee sur ses seuls intitules de colonnes.
 *
 * Deux exports mensuels du meme logiciel ont les memes colonnes et des donnees
 * differentes : l'empreinte doit donc ignorer le contenu. Elle ignore aussi
 * l'ordre des colonnes, les accents, la casse et les espaces — un export qui
 * deplace une colonne reste le meme export.
 *
 * Sert a retrouver un plan que l'utilisateur a deja valide, pour ne pas lui
 * redemander le mois suivant ce qu'il a corrige une fois.
 */
export function signatureFichier(entetes: any[]): string {
  return entetes
    .map((h) => stripAccents(String(h ?? "").trim().toLowerCase()).replace(/\s+/g, " "))
    .filter((h) => h !== "")
    .sort()
    .join("|");
}
