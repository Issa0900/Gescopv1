// Deterministic CSV/TSV parsing.
// AI extraction truncates large files (it caps around a few hundred rows), which
// silently produced partial datasets and incoherent metrics. Delimited text is
// fully structured, so it must be parsed literally — never through the LLM.

import * as XLSX from "npm:xlsx@0.18.5";
import { sheetRows } from "./sheetDetect.ts";
import { fetchExternalFile } from "./safeFetch.ts";

const SEPARATEURS = [",", ";", "\t", "|"];

/**
 * Compte un separateur en ignorant ceux places entre guillemets.
 *
 * Sans cela, "Vente, comptoir" fait croire a une colonne de plus sur cette
 * ligne-la et brouille la comparaison entre separateurs candidats.
 */
function compterHorsGuillemets(ligne: string, separateur: string): number {
  let total = 0;
  let entreGuillemets = false;
  for (let i = 0; i < ligne.length; i++) {
    const c = ligne[i];
    if (c === '"') {
      if (entreGuillemets && ligne[i + 1] === '"') { i++; continue; } // guillemet echappe
      entreGuillemets = !entreGuillemets;
    } else if (c === separateur && !entreGuillemets) {
      total++;
    }
  }
  return total;
}

/**
 * Choisit le separateur sur l'ENSEMBLE du fichier, pas sur sa premiere ligne.
 *
 * La premiere ligne seule est un mauvais juge : un export comptable commence
 * souvent par un titre ("Rapport de ventes - mars 2026") qui ne contient aucun
 * separateur. On retombait alors sur la virgule par defaut, et un fichier Excel
 * francais a point-virgule etait decoupe n'importe comment — chaque ligne
 * finissait en quarantaine alors que le fichier etait parfaitement lisible.
 *
 * On retient donc le separateur qui decoupe le plus de lignes en un MEME nombre
 * de colonnes : un vrai separateur est regulier d'une ligne a l'autre, un
 * caractere qui apparait par hasard (la virgule decimale de "1 500,00") ne
 * l'est pas.
 */
function detecterSeparateur(texte: string): string {
  const lignes = texte.split(/\r?\n/).filter((l) => l.trim() !== "").slice(0, 20);
  let retenu = ",";
  let meilleurScore = 0;
  for (const separateur of SEPARATEURS) {
    const occurrences: Record<number, number> = {};
    for (const ligne of lignes) {
      const n = compterHorsGuillemets(ligne, separateur);
      if (n >= 1) occurrences[n] = (occurrences[n] || 0) + 1;
    }
    // Le nombre de colonnes le plus frequent, et sur combien de lignes il tient.
    let colonnes = 0;
    let lignesConcordantes = 0;
    for (const [n, compte] of Object.entries(occurrences)) {
      if (compte > lignesConcordantes || (compte === lignesConcordantes && Number(n) > colonnes)) {
        lignesConcordantes = compte;
        colonnes = Number(n);
      }
    }
    const score = lignesConcordantes * colonnes;
    if (score > meilleurScore) {
      meilleurScore = score;
      retenu = separateur;
    }
  }
  return retenu;
}

/**
 * Le fichier texte sous forme de MATRICE, sans mise en forme.
 *
 * Le plan de lecture (importPlan.ts) raisonne en numeros de ligne — « les
 * en-tetes sont a la ligne 4, la ligne 8 est un total » — donc il lui faut le
 * fichier tel quel, avant tout choix de ligne d'en-tetes. Meme detection de
 * separateur et meme refus de conversion que parseDelimitedText : c'est la meme
 * lecture, arretee une etape plus tot.
 */
export function matriceDepuisTexte(text: string): any[][] {
  const clean = text.replace(/^\uFEFF/, "");
  if (clean.trim() === "") return [];
  const wb = XLSX.read(clean, { type: "string", raw: true, FS: detecterSeparateur(clean) });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", blankrows: false }) as any[][];
}

export async function fetchMatrice(fileUrl: string): Promise<any[][]> {
  const resp = await fetchExternalFile(fileUrl);
  return matriceDepuisTexte(await resp.text());
}

export function parseDelimitedText(text: string): Record<string, any>[] {
  const clean = text.replace(/^\uFEFF/, "");
  const delimiter = detecterSeparateur(clean);
  // raw: true — xlsx ne doit RIEN convertir de lui-meme sur un fichier texte.
  // Avec raw: false il interpretait les cellules a l'americaine avant que nos
  // analyseurs francais ne les voient : « 01/03/2026 » devenait le 3 janvier
  // (MM/DD) et « 800,00 $ » devenait 80 000 (virgule lue comme separateur de
  // milliers). Les lignes etaient donc ACCEPTEES avec des valeurs fausses —
  // pire qu'un rejet, puisque rien ne le signalait. On garde le texte d'origine
  // et parseDate / parseNumber, qui connaissent les conventions FR, tranchent.
  const wb = XLSX.read(clean, { type: "string", raw: true, FS: delimiter });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  // Meme recuperation de la ligne d'en-tetes que pour un classeur Excel : un
  // export comptable commence souvent par un titre ("Rapport de ventes - mars"),
  // qui donnait des colonnes __EMPTY et mettait tout le fichier en quarantaine.
  // Le meme fichier passait en .xlsx et echouait en .csv.
  return sheetRows(sheet).rows;
}

export async function fetchDelimitedRows(fileUrl: string): Promise<Record<string, any>[]> {
  const resp = await fetchExternalFile(fileUrl);
  const text = await resp.text();
  return parseDelimitedText(text);
}
