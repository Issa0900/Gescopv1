import { createFixedClientFromRequest as createClientFromRequest } from "../../shared/client.ts";
import { normalizeRow, isSummaryOrTotalRow, deriveFallbackIdentity, buildCompanyDictionaryIndex } from "../../shared/importUtils.ts";
import { detectEntityByName, detectEntityByHeaders, detectEntityByFieldOverlap, entiteCompatible, sheetRows, trouverLigneEntetes } from "../../shared/sheetDetect.ts";
import { fetchDelimitedRows, fetchMatrice } from "../../shared/csvParse.ts";
import { fetchExternalFile } from "../../shared/safeFetch.ts";
import {
  analyserFichier, appliquerPlan, planParRegles, signatureFichier,
  construireEchantillon, type PlanImport,
} from "../../shared/importPlan.ts";
import { insertRows, missingRequired } from "../../shared/bulkInsert.ts";
import { buildBusinessContext } from "../../shared/businessContext.ts";
import { normalizeRow as normalizeRowForCore } from "../../shared/normalizationEngine.ts";
import { profileData } from "../../shared/dataProfiler.ts";
import { matchConcept } from "../../shared/semanticMatcher.ts";
import { detectGrain } from "../../shared/grainEngine.ts";
import { generateObservations } from "../../shared/observationEngine.ts";
import { deduplicateRows } from "../../shared/deduplication.ts";
import { getSchema, ENTITY_SCHEMAS } from "../../shared/entitySchemas.ts";
import * as XLSX from "npm:xlsx@0.18.5";

/**
 * Resolve the target entity for a sheet/file.
 *
 * `manual` is the type the user picked in the UI and it wins outright: guessing
 * from the sheet name used to override that explicit choice, so a file whose
 * name looked like something else landed in the wrong entity — or nowhere.
 * Then: name, exact header signature, and finally a best-fit score over the
 * columns, which rescues sheets that carry no recognizable id column.
 */
export function detect(label: string, headers: string[], fileGuess?: string | null, manual?: string | null, companyDictionary?: Record<string, string>) {
  if (manual) return { entity: manual, via: "manuel" };
  const byName = detectEntityByName(label);
  const byHeaders = detectEntityByHeaders(headers, companyDictionary);
  // Le nom ne l'emporte que si les colonnes peuvent reellement alimenter
  // l'entite qu'il designe. Sinon ce sont les colonnes qui decident : elles
  // decrivent le contenu, le nom ne fait que le suggerer.
  if (byName && (headers.length === 0 || entiteCompatible(byName, headers, companyDictionary))) {
    return { entity: byName, via: "nom" };
  }
  if (byHeaders) return { entity: byHeaders, via: "colonnes" };
  if (byName) return { entity: byName, via: "nom (colonnes non concluantes)" };
  const byOverlap = detectEntityByFieldOverlap(headers, companyDictionary);
  if (byOverlap) return { entity: byOverlap, via: "colonnes (approché)" };
  if (fileGuess) return { entity: fileGuess, via: "nom du fichier" };
  return { entity: null, via: null };
}

function forceTransactionColumns(plan: PlanImport): PlanImport {
  if (plan.entite !== "Transaction") return plan;
  return {
    ...plan,
    colonnes: plan.colonnes.map((col: any) => {
      const key = String(col.colonne || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_");
      if (key === "type") return { ...col, champ: "type" };
      if (key === "category" || key === "categorie") return { ...col, champ: "category" };
      return col;
    }),
  };
}

/**
 * Plan de lecture d'une feuille : memoire, puis IA, puis regles.
 *
 * L'ordre n'est pas negociable. Un plan qu'un humain a deja valide l'emporte sur
 * une nouvelle analyse : rappeler l'IA sur un fichier dont l'utilisateur a
 * corrige le rattachement risquerait de lui reproposer l'erreur qu'il vient de
 * corriger. Ailleurs l'IA est appelee a chaque fois, et les regles ne servent
 * que de filet si elle est indisponible.
 */
async function planPourFeuille(
  base44: any,
  options: { matrix: any[][]; label: string; nomFichier: string; manual?: string | null; companyDictionary?: Record<string, string> },
) {
  const { matrix, label, nomFichier, manual, companyDictionary } = options;
  const entetes = (matrix[trouverLigneEntetes(matrix)] || []).map((h: any) => String(h ?? "").trim());
  const signature = signatureFichier(entetes);

  // 1. Deja vu et valide par un humain.
  // 1. Deja vu et valide par un humain (match exact de la signature).
  try {
    const memo = await base44.entities.Import.filter(
      { plan_signature: signature, plan_confirmed: true }, "-created_date", 1,
    );
    if (memo && memo.length > 0 && memo[0].read_plan && memo[0].read_plan.colonnes) {
      const plan: PlanImport = forceTransactionColumns({ ...memo[0].read_plan, origine: "memoire", corrections: [] });
      if (manual) plan.entite = manual;
      return { plan, signature, refus: [] as string[], erreur: undefined as string | undefined };
    }
  } catch { /* la memoire est un confort, jamais un prerequis */ }

  // 1.5. Apprentissage croisé (mémoire globale pour rattraper les colonnes uniques)
  let mappingMemory: any[] = [];
  try {
    const allMemo = await base44.entities.Import.filter(
      { plan_confirmed: true }, "-created_date", 50,
    );
    mappingMemory = allMemo.map((m: any) => m.read_plan).filter(Boolean);
  } catch {}

  // 2. Analyse par l'IA, filet deterministe derriere.
  // `label` (nom de la feuille, ex. "Sommaire Exécutif") et non `nomFichier`
  // (nom du classeur entier, ex. "Entreprise_Simulation_50Ans_Canada_QC.xlsx") :
  // la classification par nom ("sommaire", "executif"...) dans planParRegles
  // ne matchait jamais rien tant qu'elle recevait le nom du fichier, faisant
  // manquer la detection de type meme quand la feuille s'appelait explicitement
  // "Sommaire Exécutif".
  const secours = planParRegles(matrix, label, manual || null, mappingMemory);
  const res = await analyserFichier(
    (args) => base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: args.prompt,
      response_json_schema: args.response_json_schema,
      model: "gemini_3_8_flash",
    }),
    { matrix, nomFichier: label, entitesPossibles: Object.keys(ENTITY_SCHEMAS), planDeSecours: secours, companyDictionary },
  );
  const entiteParNom = detectEntityByName(label);
  const entetesNormalisees = entetes.map((h) => String(h).trim());
  if (entiteParNom && entiteCompatible(entiteParNom, entetesNormalisees)) {
    res.plan.entite = entiteParNom;
    if (entiteParNom === "Transaction") {
      // The semantic recognizer can confuse Transaction.category with type.
      // For this entity the two headers are unambiguous: preserve them before
      // the plan reaches the write phase.
      res.plan = forceTransactionColumns(res.plan);
    }
  }
  // Le type choisi explicitement par l'utilisateur n'est jamais discute.
  if (manual) res.plan.entite = manual;
  return { ...res, signature };
}

/**
 * Les lignes du fichier selon le plan — avec un filet.
 *
 * Un plan dont la ligne d'en-tetes est decalee d'un cran ne rend aucune ligne :
 * les intitules ne correspondent a rien, et l'import se solderait par « 0 ligne
 * importee » sans que personne ne sache pourquoi. Quand cela arrive alors que le
 * fichier contient manifestement des donnees, on rejoue avec les regles
 * deterministes et on le DIT dans le resultat, plutot que de rendre un echec
 * muet.
 */
function lignesSelonPlan(plan: PlanImport, matrix: any[][], nomFichier: string, entite?: string | null) {
  let rows: Record<string, any>[] = [];
  try { rows = appliquerPlan(plan, matrix); } catch { rows = []; }
  const disponibles = Math.max(matrix.length - plan.ligne_entetes - 1 - plan.lignes_ignorees.length, 0);
  // Une ligne d'en-tetes decalee d'un cran ne rend pas toujours 0 ligne : les
  // intitules pointent alors sur de vraies donnees, qui deviennent des colonnes
  // au nom absurde produisant 1 ou 2 lignes bien formees mais illisibles. Le
  // signal fiable n'est donc pas "0 ligne" mais "aucune des colonnes decrites
  // par le plan n'a ete retrouvee dans la ligne d'en-tetes reelle".
  const entetesReelles = new Set((matrix[plan.ligne_entetes] || []).map((h: any) => String(h ?? "").trim()));
  const aucuneColonneRattachee = plan.colonnes.length > 0 && plan.colonnes.every((c) => !entetesReelles.has(c.colonne));
  if ((rows.length > 0 && !aucuneColonneRattachee) || disponibles === 0) return { rows, plan, note: "" };

  const secours = planParRegles(matrix, nomFichier, entite || plan.entite);
  let rowsSecours: Record<string, any>[] = [];
  try { rowsSecours = appliquerPlan(secours, matrix); } catch { rowsSecours = []; }
  if (rowsSecours.length === 0) return { rows, plan, note: "" };
  return {
    rows: rowsSecours,
    plan: secours,
    note: "Le plan de lecture ne rattachait aucune ligne du fichier ; lecture automatique utilisee a la place.",
  };
}

/** Matrice d'une feuille de classeur, meme forme que celle d'un fichier texte. */
function matriceDeFeuille(sheet: any): any[][] {
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", blankrows: false }) as any[][];
}

async function importRows(
  base44: any,
  entityName: string,
  rows: Record<string, any>[],
  sourceType: string,
  fileLabel: string,
  fileUrl = "",
  memoire?: { plan: PlanImport | null; signature: string; confirme: boolean },
  companyDictionary?: Record<string, string>,
) {
  const schema = getSchema(entityName);
  const properties = schema ? schema.properties : null;
  const required = schema ? schema.required : [];

  const importRec = await base44.entities.Import.create({
    source_type: sourceType,
    file_name: fileLabel,
    file_url: fileUrl,
    entity_type: entityName,
    status: "en_cours",
    rows_processed: 0,
    rows_quarantined: 0,
    // Le plan est enregistre avec l'import : c'est lui qui rendra le prochain
    // export du meme logiciel lisible sans rien redemander.
    read_plan: memoire?.plan || undefined,
    plan_signature: memoire?.signature || undefined,
    plan_confirmed: memoire?.confirme || false,
  });

  const toCreate: Record<string, any>[] = [];
  const rawObservations = [];
  let quarantined = 0;
  const missingFields = new Set<string>();
  const samples: string[] = [];
  // Values present in the file but refused by the schema, counted per field and
  // per value so the report can name them instead of claiming the field is absent.
  const refusedValues: Record<string, Record<string, number>> = {};
  const allowedByField: Record<string, string[]> = {};
  // Colonnes du fichier qui n'ont pu être associées à aucun champ de
  // l'entité cible — un fichier peut "réussir" son import tout en ayant
  // silencieusement ignoré une colonne financière que personne n'a vue.
  const unmappedColumns = new Set<string>();

  // ── NOUVEAU PIPELINE SÉMANTIQUE (Phase 1) ──
  let profile, matchedConcepts, grain;
  try {
    profile = profileData(rows.slice(0, 50));
    matchedConcepts = {};
    for (const [col, p] of Object.entries(profile.columns)) {
      const match = matchConcept(p);
      if (match) matchedConcepts[col] = match;
    }
    grain = detectGrain(profile, matchedConcepts);
  } catch(e) { console.error("Semantic engine failed", e); }

  rows.forEach((row, index) => {
    if (!row || typeof row !== "object" || isSummaryOrTotalRow(row)) return;
    const enumIssues: { field: string; value: string; allowed: string[] }[] = [];
    const normalized = normalizeRow(entityName, row, importRec.id, properties, sourceType, enumIssues, unmappedColumns, companyDictionary);
    if (Object.keys(normalized).filter((k) => k !== "import_id").length === 0) return;
    deriveFallbackIdentity(entityName, normalized, index);
    // Reject up front rather than letting one row fail its whole batch.
    const missing = missingRequired(normalized, required);
    if (missing.length > 0) {
      missing.forEach((m) => {
        // Was the field actually absent, or present with a refused value?
        const refused = enumIssues.find((e) => e.field === m);
        if (refused) {
          if (!refusedValues[m]) refusedValues[m] = {};
          refusedValues[m][refused.value] = (refusedValues[m][refused.value] || 0) + 1;
          allowedByField[m] = refused.allowed;
        } else {
          missingFields.add(m);
        }
      });
      if (samples.length < 2) samples.push(JSON.stringify(row).slice(0, 220));
      quarantined++;
      return;
    }
    toCreate.push(normalized);

    // Génération de l'Observation
    if (profile && matchedConcepts && grain) {
      const normalizedObs = normalizeRowForCore(row, profile.columns);
      const obsList = generateObservations(normalizedObs, matchedConcepts, fileLabel, grain);
      rawObservations.push(...obsList);
    }
  });

  const messages: string[] = [];
  if (unmappedColumns.size > 0) {
    messages.push(
      `${unmappedColumns.size} colonne(s) non reconnue(s) et ignorée(s) pour ${entityName} : ${Array.from(unmappedColumns).slice(0, 10).join(", ")}` +
      (unmappedColumns.size > 10 ? "…" : "") +
      ". Leur contenu brut reste conservé dans original_data si besoin de le récupérer.",
    );
  }

  // GESCOP Phase 5 SSOT: Deduplication
  const { newRows, duplicateCount } = await deduplicateRows(base44, entityName, toCreate);
  if (duplicateCount > 0) {
    messages.push(`${duplicateCount} doublon(s) détecté(s) et ignoré(s).`);
  }

  const { created, quarantined: rejected, errors } = await insertRows(base44, entityName, newRows);
  quarantined += rejected + duplicateCount;

  // Sauvegarde des Observations (Silencieuse pour ne pas bloquer l'import)
  if (rawObservations.length > 0) {
    try {
      // On sauvegarde par lots de 100
      for (let i = 0; i < rawObservations.length; i += 100) {
        await base44.entities.Observation.bulkCreate(rawObservations.slice(i, i + 100));
      }
    } catch(e) { console.warn("Failed to save observations", e); }
  }

  // Refused values first: this is the actionable one, and it used to be
  // reported as a missing field, which sent users looking for a column that
  // was right there in their file.
  for (const [field, counts] of Object.entries(refusedValues)) {
    const listed = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([val, n]) => `« ${val} » (${n})`)
      .join(", ");
    const total = Object.values(counts).reduce((s, n) => s + n, 0);
    messages.push(
      `${field} : ${total} ligne(s) rejetée(s) pour cause de valeur non reconnue — ${listed}. `
      + `Valeurs acceptées : ${(allowedByField[field] || []).join(", ")}. `
      + `Corrigez cette colonne dans votre fichier, puis réimportez.`,
    );
  }
  if (missingFields.size > 0) {
    messages.push(`champs obligatoires absents du fichier : ${Array.from(missingFields).join(", ")}`);
    if (samples.length > 0) messages.push(`exemple de ligne rejetée : ${samples[0]}`);
  }
  if (errors.length > 0) messages.push(errors[0]);

  const quality = rows.length > 0 ? Math.round((created / rows.length) * 100) : 0;
  await base44.entities.Import.update(importRec.id, {
    status: created > 0 ? "complete" : "echoue",
    quality_score: quality,
    rows_processed: created,
    rows_quarantined: quarantined,
  });

  return {
    entity: entityName,
    status: created > 0 ? "complete" : "echoue",
    rows_read: rows.length,
    rows: created,
    quarantined,
    message: messages.join(" · ") || undefined,
    // Signals to the caller that the quota is exhausted, so the next sheet
    // should not be fired straight into the same wall.
    rateLimited: errors.some((e) => e.includes("limite de débit")),
  };
}

/**
 * Cooldown between sheets once the quota has been hit.
 *
 * Sheets are imported one after another, so a large multi-sheet workbook
 * exhausts a per-minute quota partway through and every remaining sheet then
 * fails instantly with 0 rows imported. Pausing once the limit is reached lets
 * the window refill instead of burning the rest of the workbook.
 */
const RATE_LIMIT_COOLDOWN_MS = 20000;
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Non autorisé" }, { status: 401 });

    // Vocabulaire propre a cette entreprise (Company.company_dictionary) :
    // consulte en priorite, avant les tables generiques de normalizeKeys, pour
    // qu'une correction deja faite une fois ne soit plus jamais redemandee.
    // Aujourd'hui alimente uniquement par ce que l'utilisateur tape dans
    // Parametres > Dictionnaire — l'apprentissage automatique depuis une
    // correction manuelle sur l'ecran d'import reste a cabler separement.
    let companyDictionary: Record<string, string> = {};
    try {
      const companies = await base44.entities.Company.list();
      companyDictionary = buildCompanyDictionaryIndex(companies?.[0]?.company_dictionary);
    } catch (e) {
      console.error("Lecture du dictionnaire d'entreprise impossible, poursuite sans", e);
    }

    const body = await req.json();
    const { files, entity_override, mode, plans } = body;
    // Deux temps : "analyser" lit le fichier et rend un plan sans rien ecrire ;
    // l'import n'a lieu qu'ensuite, avec le plan que l'utilisateur a valide ou
    // corrige. Un appel sans `mode` garde le comportement historique.
    const analyseSeule = mode === "analyser";
    // Les plans confirmes par l'utilisateur, indexes par libelle de feuille.
    const plansFournis: Record<string, PlanImport> = {};
    if (plans && typeof plans === "object") Object.assign(plansFournis, plans);
    if (!files || !Array.isArray(files) || files.length === 0) {
      return Response.json({ error: "files requis (tableau de {file_url, file_name})" }, { status: 400 });
    }

    const results: any[] = [];

    for (const file of files) {
      const { file_url, file_name } = file;
      const ext = (file_name || "").split(".").pop().toLowerCase();
      const sourceType = ["csv", "xlsx", "xls", "tsv", "pdf"].includes(ext) ? ext : "csv";

      // === Classeurs et fichiers texte : meme traitement, a la lecture pres ===
      if (["xlsx", "xls", "csv", "tsv"].includes(ext)) {
        try {
          const feuilles: { label: string; nomFeuille: string; matrix: any[][] }[] = [];
          if (["xlsx", "xls"].includes(ext)) {
            const ab = await (await fetchExternalFile(file_url)).arrayBuffer();
            const wb = XLSX.read(new Uint8Array(ab), { type: "array" });
            for (const sheetName of wb.SheetNames) {
              feuilles.push({ label: `${file_name} [${sheetName}]`, nomFeuille: sheetName, matrix: matriceDeFeuille(wb.Sheets[sheetName]) });
            }
          } else {
            feuilles.push({ label: file_name, nomFeuille: "", matrix: await fetchMatrice(file_url) });
          }

          for (const feuille of feuilles) {
            const { label, nomFeuille, matrix } = feuille;
            if (matrix.length === 0) {
              results.push({ file_name: label, entity: null, status: "ignore", rows_read: 0, rows: 0, message: "Feuille vide" });
              continue;
            }

            // Le plan valide par l'utilisateur, s'il nous l'a renvoye.
            const planValide = plansFournis[label];
            const analyse = planValide
              ? { plan: planValide, signature: signatureFichier(matrix[planValide.ligne_entetes] || []), refus: [], erreur: undefined }
              : await planPourFeuille(base44, { matrix, label, nomFichier: file_name, manual: entity_override, companyDictionary });
            const plan = analyse.plan;

            if (analyseSeule) {
              const lecture = lignesSelonPlan(plan, matrix, file_name);
              const totalRows = Math.max(matrix.length - plan.ligne_entetes - 1 - (plan.lignes_ignorees?.length || 0), 0);
              
              let validCount = 0;
              let mappedCount = 0;
              let quarantinedCount = 0;
              const quarantine: any[] = [];
              const properties = getSchema(plan.entite)?.properties || null;
              const required = getSchema(plan.entite)?.required || [];

              if (plan.entite && properties) {
                for (let i = 0; i < lecture.rows.length; i++) {
                  const row = lecture.rows[i];
                  if (!row || typeof row !== "object" || isSummaryOrTotalRow(row)) continue;
                  
                  const enumIssues: { field: string; value: string; allowed: string[] }[] = [];
                  const normalized = normalizeRow(plan.entite, row, "tmp", properties, sourceType, enumIssues, undefined, companyDictionary);

                  if (Object.keys(normalized).filter(k => k !== "import_id").length === 0) {
                    continue; // Ligne vide ou total filtré : ne pas générer de faux positif en quarantaine
                  }
                  deriveFallbackIdentity(plan.entite, normalized, i);
                  mappedCount++;

                  const errors: string[] = [];
                  const missing = missingRequired(normalized, required);
                  if (missing.length > 0) errors.push(`Champs obligatoires manquants: ${missing.join(", ")}`);
                  if (enumIssues.length > 0) {
                    enumIssues.forEach(e => errors.push(`Valeur refusée pour ${e.field}: "${e.value}" (acceptées: ${e.allowed.join(", ")})`));
                  }

                  if (errors.length > 0) {
                    quarantinedCount++;
                    if (quarantine.length < 50) {
                      quarantine.push({ rowIndex: i + plan.ligne_entetes + 1, original: row, mapped: normalized, errors });
                    }
                  } else {
                    validCount++;
                  }
                }
              }

              const completeness = lecture.rows.length > 0 ? (mappedCount / lecture.rows.length) * 100 : 0;
              const validity = lecture.rows.length > 0 ? (validCount / lecture.rows.length) * 100 : 0;
              const quality_score = Math.round((completeness + validity) / 2);

              results.push({
                file_name: label, sheet: nomFeuille, entity: plan.entite,
                plan, signature: analyse.signature, refus: analyse.refus, analyse_erreur: analyse.erreur,
                apercu: lecture.rows.slice(0, 5),
                echantillon: construireEchantillon(matrix, 8),
                rows_read: totalRows,
                status: "analyse",
                quality: {
                  score: quality_score || 0,
                  valid_rows: validCount,
                  total_rows: totalRows,
                  quarantined_rows: quarantinedCount,
                  quarantine_samples: quarantine
                }
              });
              continue;
            }

            // Une feuille generique ("Feuil1") ne dit rien : ses colonnes decident.
            const generic = /^(feuil|sheet|tab|page)\s*\d*$/i.test(nomFeuille.trim());
            const entetesLues = (matrix[plan.ligne_entetes] || []).map((h: any) => String(h ?? "").trim());
            let entity = plan.entite;
            let via = plan.origine;
            if (!entity) {
              const parRegles = detect(generic ? "" : (nomFeuille || file_name), entetesLues, detectEntityByName(file_name), entity_override, companyDictionary);
              entity = parRegles.entity;
              via = parRegles.via as any;
            }
            if (!entity) {
              results.push({
                file_name: label, entity: null, status: "ignore",
                rows_read: Math.max(matrix.length - plan.ligne_entetes - 1, 0), rows: 0,
                message: `Type non reconnu — colonnes lues : ${entetesLues.slice(0, 6).join(", ")}`,
              });
              continue;
            }

            const lecture = lignesSelonPlan(plan, matrix, file_name, entity);
            const res = await importRows(base44, entity, lecture.rows, sourceType, label, file_url, {
              plan: lecture.plan, signature: analyse.signature, confirme: Boolean(planValide) && !lecture.note,
            }, companyDictionary);
            if (res.rateLimited) await pause(RATE_LIMIT_COOLDOWN_MS);
            results.push({
              file_name: label, detected_via: via,
              plan_origine: lecture.plan.origine, corrections: lecture.plan.corrections,
              ...res,
              message: [lecture.note, res.message].filter(Boolean).join(" · ") || undefined,
            });
          }
        } catch (e: any) {
          results.push({ file_name, entity: null, status: "echoue", rows_read: 0, rows: 0, error: e.message });
        }
        continue;
      }

      // === PDF: AI extraction (no deterministic structure available) ===
      const entityName = entity_override || detectEntityByName(file_name);
      if (!entityName) {
        results.push({ file_name, entity: null, status: "ignore", rows_read: 0, rows: 0, message: "Type non reconnu — choisissez le type manuellement" });
        continue;
      }

      try {
        let extractionSchema: any;
        const entitySchema = getSchema(entityName);
        if (entitySchema) {
          extractionSchema = {
            type: "array",
            items: { type: "object", properties: entitySchema.properties, additionalProperties: true },
          };
        } else {
          extractionSchema = {
            type: "array",
            items: {
              type: "object",
              properties: {
                date: { type: "string" },
                description: { type: "string" },
                amount: { type: "number" },
                type: { type: "string" },
                category: { type: "string" },
              },
              additionalProperties: true,
            },
          };
        }

        const extraction = await base44.asServiceRole.integrations.Core.ExtractDataFromUploadedFile({
          file_url,
          json_schema: extractionSchema,
        });

        let rows: any[] = [];
        if (extraction && extraction.status === "success" && extraction.output) {
          const out = extraction.output;
          if (Array.isArray(out)) rows = out;
          else if (out && Array.isArray(Object.values(out)[0])) rows = Object.values(out)[0] as any[];
        }

        const res = await importRows(base44, entityName, rows, sourceType, file_name, file_url, undefined, companyDictionary);
        if (res.rateLimited) await pause(RATE_LIMIT_COOLDOWN_MS);
        results.push({ file_name, detected_via: entity_override ? "manuel" : "nom", ...res });
      } catch (e: any) {
        results.push({ file_name, entity: entityName, status: "echoue", rows_read: 0, rows: 0, error: e.message });
      }
    }

    // En mode analyse, l'ecran de confirmation doit pouvoir proposer les champs
    // de n'importe quel type : l'utilisateur peut corriger le type detecte, et
    // la liste des champs doit suivre. On l'envoie une fois, pas par feuille.
    if (analyseSeule) {
      const champsParEntite: Record<string, string[]> = {};
      for (const [nom, schema] of Object.entries(ENTITY_SCHEMAS)) {
        champsParEntite[nom] = Object.keys(schema.properties).filter((c) => c !== "import_id");
      }
      return Response.json({ results, champs_par_entite: champsParEntite });
    }
    return Response.json({ results });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
