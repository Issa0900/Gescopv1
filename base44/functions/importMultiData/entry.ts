import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { normalizeRow } from "../../shared/importUtils.ts";
import { detectEntityByName, detectEntityByHeaders, detectEntityByFieldOverlap, entiteCompatible, sheetRows, trouverLigneEntetes } from "../../shared/sheetDetect.ts";
import { fetchDelimitedRows, fetchMatrice } from "../../shared/csvParse.ts";
import {
  analyserFichier, appliquerPlan, planParRegles, signatureFichier,
  construireEchantillon, type PlanImport,
} from "../../shared/importPlan.ts";
import { insertRows, missingRequired } from "../../shared/bulkInsert.ts";
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
export function detect(label: string, headers: string[], fileGuess?: string | null, manual?: string | null) {
  if (manual) return { entity: manual, via: "manuel" };
  const byName = detectEntityByName(label);
  const byHeaders = detectEntityByHeaders(headers);
  // Le nom ne l'emporte que si les colonnes peuvent reellement alimenter
  // l'entite qu'il designe. Sinon ce sont les colonnes qui decident : elles
  // decrivent le contenu, le nom ne fait que le suggerer.
  if (byName && (headers.length === 0 || entiteCompatible(byName, headers))) {
    return { entity: byName, via: "nom" };
  }
  if (byHeaders) return { entity: byHeaders, via: "colonnes" };
  if (byName) return { entity: byName, via: "nom (colonnes non concluantes)" };
  const byOverlap = detectEntityByFieldOverlap(headers);
  if (byOverlap) return { entity: byOverlap, via: "colonnes (approché)" };
  if (fileGuess) return { entity: fileGuess, via: "nom du fichier" };
  return { entity: null, via: null };
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
  options: { matrix: any[][]; label: string; nomFichier: string; manual?: string | null },
) {
  const { matrix, label, nomFichier, manual } = options;
  const entetes = (matrix[trouverLigneEntetes(matrix)] || []).map((h: any) => String(h ?? "").trim());
  const signature = signatureFichier(entetes);

  // 1. Deja vu et valide par un humain.
  try {
    const memo = await base44.entities.Import.filter(
      { plan_signature: signature, plan_confirmed: true }, "-created_date", 1,
    );
    if (memo && memo.length > 0 && memo[0].read_plan && memo[0].read_plan.colonnes) {
      const plan: PlanImport = { ...memo[0].read_plan, origine: "memoire", corrections: [] };
      if (manual) plan.entite = manual;
      return { plan, signature, refus: [] as string[], erreur: undefined as string | undefined };
    }
  } catch { /* la memoire est un confort, jamais un prerequis */ }

  // 2. Analyse par l'IA, filet deterministe derriere.
  const secours = planParRegles(matrix, nomFichier, manual || null);
  const res = await analyserFichier(
    (args) => base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: args.prompt,
      response_json_schema: args.response_json_schema,
      model: "gemini_3_8_flash",
    }),
    { matrix, nomFichier: label, entitesPossibles: Object.keys(ENTITY_SCHEMAS), planDeSecours: secours },
  );
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
  if (rows.length > 0 || disponibles === 0) return { rows, plan, note: "" };

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
) {
  // Ré-importer le même fichier/feuille dupliquait chaque ligne : un fichier
  // importé 6 fois donnait 6 copies et des chiffres contradictoires partout.
  const already = await base44.entities.Import.filter({ file_name: fileLabel, entity_type: entityName }, null, 1);
  if (already && already.length > 0) {
    return {
      entity: entityName,
      status: "ignore",
      rows_read: rows.length,
      rows: 0,
      quarantined: 0,
      message: "Déjà importé — supprimez d'abord l'import existant pour le remplacer (évite les doublons).",
      rateLimited: false,
    };
  }

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
  let quarantined = 0;
  const missingFields = new Set<string>();
  const samples: string[] = [];
  // Values present in the file but refused by the schema, counted per field and
  // per value so the report can name them instead of claiming the field is absent.
  const refusedValues: Record<string, Record<string, number>> = {};
  const allowedByField: Record<string, string[]> = {};
  rows.forEach((row) => {
    if (!row || typeof row !== "object") { quarantined++; return; }
    const enumIssues: { field: string; value: string; allowed: string[] }[] = [];
    const normalized = normalizeRow(entityName, row, importRec.id, properties, sourceType, enumIssues);
    if (Object.keys(normalized).filter((k) => k !== "import_id").length === 0) { quarantined++; return; }
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
  });

  const { created, quarantined: rejected, errors } = await insertRows(base44, entityName, toCreate);
  quarantined += rejected;

  const messages: string[] = [];
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
            const ab = await (await fetch(file_url)).arrayBuffer();
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
              : await planPourFeuille(base44, { matrix, label, nomFichier: file_name, manual: entity_override });
            const plan = analyse.plan;

            if (analyseSeule) {
              results.push({
                file_name: label, sheet: nomFeuille, entity: plan.entite,
                plan, signature: analyse.signature, refus: analyse.refus, analyse_erreur: analyse.erreur,
                apercu: lignesSelonPlan(plan, matrix, file_name).rows.slice(0, 5),
                echantillon: construireEchantillon(matrix, 8),
                rows_read: Math.max(matrix.length - plan.ligne_entetes - 1, 0),
                status: "analyse",
              });
              continue;
            }

            // Une feuille generique ("Feuil1") ne dit rien : ses colonnes decident.
            const generic = /^(feuil|sheet|tab|page)\s*\d*$/i.test(nomFeuille.trim());
            const entetesLues = (matrix[plan.ligne_entetes] || []).map((h: any) => String(h ?? "").trim());
            let entity = plan.entite;
            let via = plan.origine;
            if (!entity) {
              const parRegles = detect(generic ? "" : (nomFeuille || file_name), entetesLues, detectEntityByName(file_name), entity_override);
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
            });
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

        const res = await importRows(base44, entityName, rows, sourceType, file_name, file_url);
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