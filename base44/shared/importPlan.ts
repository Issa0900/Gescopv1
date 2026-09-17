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
import { parseDate, stripAccents, FIELD_ALIASES, cleCanonique, ALIAS_CANONIQUES, type ConventionDate } from "./importUtils.ts";
import { trouverLigneEntetes, detectEntityByHeaders, detectEntityByFieldOverlap } from "./sheetDetect.ts";
import { recognizeAllColumns } from "./core/contextualRecognition.ts";

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
    if (champ && champsConnus.length > 0 && !champsConnus.includes(champ)) {
      // L'IA a invente un champ : on garde la colonne, mais on va tenter le rattrapage.
      refus.push(`champ inconnu ignore : ${c.colonne} -> ${champ}`);
      champ = null;
    }
    
    // Rattrapage : si l'IA n'a pas su rattacher (ou s'est trompee), on cherche 
    // une correspondance exacte ou via dictionnaire.
    if (!champ && champsConnus.length > 0) {
      const cleanC = c.colonne.toLowerCase().trim();
      const noAccentC = cleanC.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_");
      
      if (champsConnus.includes(c.colonne)) champ = c.colonne;
      else if (champsConnus.includes(cleanC)) champ = cleanC;
      else if (champsConnus.includes(noAccentC)) champ = noAccentC;
      else {
          const canon = cleCanonique(c.colonne);
          const alias = FIELD_ALIASES[cleanC] || FIELD_ALIASES[cleanC.replace(/[\s-]/g, "_")] || FIELD_ALIASES[noAccentC] || ALIAS_CANONIQUES[canon];
          if (alias && champsConnus.includes(alias)) champ = alias;
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

export function construirePrompt(echantillon: string, nomFichier: string, entites: string[]): string {
  return [
    "Tu analyses un fichier exporte par une PME (comptabilite, caisse, tableur maison).",
    "Ta tache est de DECRIRE comment lire ce fichier. Tu ne recopies aucune valeur.",
    "",
    `Nom du fichier : ${nomFichier}`,
    `Types de donnees possibles : ${entites.join(", ")}`,
    "",
    "Voici les premieres lignes, telles quelles, numerotees a partir de 0 :",
    "```",
    echantillon,
    "```",
    "",
    "Reponds en indiquant :",
    "- entite : le type de donnees, parmi la liste ci-dessus (null si aucun ne convient).",
    "- ligne_entetes : le numero de la ligne qui contient les intitules de colonnes.",
    "  Attention, un export commence souvent par un titre de rapport sur plusieurs lignes.",
    "- lignes_ignorees : les numeros des lignes qui ne sont pas des donnees (totaux, sous-totaux, commentaires).",
    "- colonnes : pour chaque intitule, le champ vise (ou null si la colonne ne correspond a rien).",
    "  * convention_date : si la colonne contient des dates ecrites en chiffres, precise JJ/MM ou MM/JJ.",
    "  * valeurs : si la colonne utilise des codes, donne leur traduction, ex. {\"D\": \"expense\", \"C\": \"income\"}.",
    "- confiance : haute, moyenne ou faible.",
    "- explication : une phrase en francais, adressee au proprietaire de l'entreprise,",
    "  decrivant ce que tu as compris du fichier. Pas de jargon technique.",
    "",
    "N'invente jamais un nom de champ : utilise uniquement ceux du type de donnees choisi.",
    "Si une colonne ne correspond a rien, mets champ: null plutot que de forcer un rapprochement.",
  ].join("\n");
}

export const SCHEMA_REPONSE = {
  type: "object",
  properties: {
    entite: { type: ["string", "null"] },
    ligne_entetes: { type: "integer" },
    lignes_ignorees: { type: "array", items: { type: "integer" } },
    colonnes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          colonne: { type: "string" },
          champ: { type: ["string", "null"] },
          convention_date: { type: ["string", "null"], enum: ["JJ/MM", "MM/JJ", null] },
          valeurs: { type: ["object", "null"], additionalProperties: { type: "string" } },
        },
        required: ["colonne"],
      },
    },
    confiance: { type: "string", enum: ["haute", "moyenne", "faible"] },
    explication: { type: "string" },
  },
  required: ["entite", "ligne_entetes", "colonnes"],
};

/** Signature minimale attendue : permet de tester sans reseau. */
export type InvocateurLLM = (args: { prompt: string; response_json_schema: any }) => Promise<any>;

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
  },
): Promise<{ plan: PlanImport; refus: string[]; erreur?: string }> {
  const { matrix, nomFichier, entitesPossibles, planDeSecours } = options;
  if (matrix.length === 0) return { plan: planDeSecours, refus: ["fichier vide"] };

  let brut: any;
  try {
    brut = await invoquer({
      prompt: construirePrompt(construireEchantillon(matrix), nomFichier, entitesPossibles),
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
  const entite = entiteConnue || detectEntityByHeaders(entetes) || detectEntityByFieldOverlap(entetes) || null;
  
  // Use Contextual Recognition (Sprint 2)
  
  // Create sample rows for recognition
  const sampleRows: Record<string, any>[] = [];
  for(let i = ligne + 1; i < Math.min(matrix.length, ligne + 20); i++) {
    const rowObj: Record<string, any> = {};
    const row = matrix[i] || [];
    entetes.forEach((h: string, idx: number) => {
      rowObj[h] = row[idx];
    });
    sampleRows.push(rowObj);
  }

  // Assuming recognizeAllColumns is imported at the top
  let recognizedCols = new Map();
  try {
    // Only attempt if we can import it
    recognizedCols = recognizeAllColumns({
      sheetName: nomFichier,
      headers: entetes,
      sampleRows,
      entityHint: entite,
      mappingMemory
    });
  } catch (e) {
    console.warn("Contextual recognition failed, falling back to basic mapping", e);
  }

  return {
    entite,
    ligne_entetes: ligne,
    lignes_ignorees: [],
    colonnes: entetes.map((c: string) => {
      const rec = recognizedCols.get(c);
      let champ = null;

      // Exact schema fields always win over semantic guesses. This prevents
      // ambiguous headers such as category, revenue, status, or type from
      // being redirected to another valid field by the recognizer.
      if (entite) {
        const schema = getSchema(entite);
        if (schema) {
          const cleanC = c.toLowerCase().trim();
          const noAccentC = cleanC.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_");
          const fields = Object.keys(schema.properties);
          if (fields.includes(c)) champ = c;
          else if (fields.includes(cleanC)) champ = cleanC;
          else if (fields.includes(noAccentC)) champ = noAccentC;
        }
      }
      
      // 1. Semantic contextual recognition
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
      }
      
      // 2. Fallback to schema fields so the UI doesn't show 'Ignorer' for valid columns
      if (!champ && entite) {
          const schema = getSchema(entite);
          if (schema) {
              const cleanC = c.toLowerCase().trim();
              const noAccentC = cleanC.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_");
              const fields = Object.keys(schema.properties);
              
              if (fields.includes(c)) champ = c;
              else if (fields.includes(cleanC)) champ = cleanC;
              else if (fields.includes(noAccentC)) champ = noAccentC;
              else {
                  const canon = cleCanonique(c);
                  const alias = FIELD_ALIASES[cleanC] || FIELD_ALIASES[cleanC.replace(/[\s-]/g, "_")] || FIELD_ALIASES[noAccentC] || ALIAS_CANONIQUES[canon];
                  if (alias && fields.includes(alias)) champ = alias;
              }
          }
      }
      return { colonne: c, champ };
    }),
    confiance: "moyenne",
    explication: entite
      ? `Lecture sémantique de ${nomFichier} : reconnaissance de ${entetes.length} colonnes pour l'entité ${entite}.`
      : `Lecture automatique de ${nomFichier} : le type de données n'a pas pu être déterminé.`,
    origine: "regles",
    corrections: [],
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
      } else {
        // Toujours conserver l'entête d'origine : permet au dictionnaire d'alias
        // et à la normalisation de rattraper les colonnes financières et métier
        obj[entete] = valeur;
      }
    });
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
