// Shared import normalization utilities — used by importData and importMultiData

// Strip accents/diacritics for comparison (é→e, à→a, etc.)
export function stripAccents(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Map common French column names to schema field names
export const FIELD_ALIASES: Record<string, string> = {
  // --- Identifiants et colonnes cles ---
  // Ces alias ne vivaient que dans sheetDetect.ts (detection du type de feuille).
  // L'import, lui, consultait cette table-ci, qui ne les avait pas : un fichier
  // "Commandes" etait donc correctement RECONNU puis integralement mis en
  // quarantaine, faute de trouver order_id. Les deux couches partagent
  // desormais la meme table.
  "id_commande": "order_id", "commande_id": "order_id", "no_commande": "order_id",
  "n_commande": "order_id", "numero_commande": "order_id", "num_commande": "order_id",
  "id_produit": "product_id", "id_client": "customer_id",
  "id_fournisseur": "supplier_id", "id_employe": "employee_id",
  "id_campagne": "campaign_id", "id_depense": "expense_id", "depense_id": "expense_id",
  "date_operation": "date", "periode": "period",
  "solde_cloture": "closing_cash", "solde_final": "closing_cash",
  "encaissements": "cash_in", "decaissements": "cash_out",
  "entrees": "cash_in", "sorties": "cash_out",
  "categorie": "category", "catégorie": "category",
  "nom": "name", "nom du produit": "product_name", "nom_produit": "product_name",
  "prix": "price", "prix_vente": "selling_price", "prix de vente": "selling_price",
  "cout": "cost", "cout_achat": "purchase_cost", "coût": "cost", "coût_achat": "purchase_cost",
  "marge": "gross_margin",
  "quantite": "quantity", "quantité": "quantity",
  "date_achat": "date", "date_vente": "date", "date_commande": "date",
  "client_id": "customer_id", "produit_id": "product_id",
  "fournisseur_id": "supplier_id", "fournisseur_nom": "supplier_name",
  "employe_id": "employee_id", "employé_id": "employee_id",
  "montant": "amount", "sous_total": "subtotal",
  "statut": "status", "canal": "channel", "segment": "segment",
  "ventes_mensuelles": "monthly_sales", "ventes mensuelles": "monthly_sales",
  "niveau_stock": "inventory_level", "seuil_reappro": "reorder_point",
  "date_lancement": "launch_date", "date_embauche": "hire_date",
  "type_emploi": "employment_type", "taux_horaire": "hourly_rate",
  "heures_semaine": "weekly_hours", "departement": "department",
  "nom_famille": "last_name", "prenom": "first_name",
  "first name": "first_name", "last name": "last_name",
  "courriel": "email", "ville": "city", "region": "region",
  "pays": "country", "telephone": "phone",
  "total_commandes": "total_orders", "nombre_commandes": "total_orders",
  "ca_total": "total_revenue", "chiffre_affaires": "total_revenue", "ca total": "total_revenue",
  "total_spent": "total_revenue", "total spent": "total_revenue", "montant_total": "total_revenue",
  "depense_totale": "total_revenue", "revenu_total": "total_revenue",
  "panier_moyen": "average_order_value", "valeur_panier": "average_order_value",
  "valeur_vie": "lifetime_value", "ltv": "lifetime_value", "valeur vie client": "lifetime_value",
  "risque_churn": "churn_risk", "risque de churn": "churn_risk",
  "type_client": "customer_type", "type de client": "customer_type",
  "premiere_commande": "first_purchase_date", "premiere achat": "first_purchase_date",
  "derniere_commande": "last_purchase_date", "dernier achat": "last_purchase_date",
  "date_acquisition": "acquisition_date", "date d acquisition": "acquisition_date",
  "id produit": "product_id", "nom_campagne": "campaign_name",
  "id_concurrent": "competitor_id",
  "cout_unitaire": "unit_cost", "cout_total": "total_cost",
  "prix_unitaire": "unit_price", "quantite_vendue": "quantity",
  "marge_brute": "gross_margin", "taux_clic": "ctr",
  "taux_conversion": "conversion_rate", "cout_par_clic": "cpc",
  "nombre_impressions": "impressions", "nombre_clics": "clicks",
  "nombre_conversions": "conversions", "portee": "reach",
  "stock_ouverture": "opening_stock", "stock_cloture": "closing_stock",
  "stock_final": "closing_stock", "stock_initial": "opening_stock",
  "valeur_stock": "inventory_value", "jours_inventaire": "days_in_inventory",
  "etat_stock": "stock_status", "statut_stock": "stock_status",
  "delai_livraison": "average_delivery_days", "delai_moyen": "average_delivery_days",
  "qualite_score": "quality_score", "fiabilite_score": "reliability_score",
  "variation_prix": "price_change_last_12_months",
  "volume_achat": "purchase_volume", "volume_ventes": "monthly_sales",
  "position_prix": "price_position", "position_marche": "market_position",
  "chiffre_affaire_estime": "estimated_revenue", "nombre_employes": "employee_count",
  "note_moyenne": "average_rating",
};

/**
 * Cle reduite : sans accent, sans ponctuation, separateurs unifies.
 * "Date d'acquisition" et "date-d-acquisition" donnent la meme cle, sans quoi
 * une apostrophe suffisait a faire perdre une colonne parfaitement lisible.
 */
export function cleCanonique(k: string): string {
  return stripAccents(String(k).toLowerCase().trim())
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

// La table d'alias est elle-meme indexee sous forme canonique : ses cles sont
// ecrites avec des espaces ("date d acquisition") et ne matchaient donc jamais
// une colonne ponctuee ("Date d'acquisition").
export const ALIAS_CANONIQUES: Record<string, string> = Object.fromEntries(
  Object.entries(FIELD_ALIASES).map(([k, v]) => [cleCanonique(k), v]),
);

export function normalizeKeys(row: Record<string, any>, properties?: Record<string, any> | null): Record<string, any> {
  const out: Record<string, any> = {};
  const schemaFields = properties ? Object.keys(properties) : [];
  for (const [k, v] of Object.entries(row || {})) {
    const lower = k.toLowerCase().trim();
    const canon = cleCanonique(k);
    const alias = FIELD_ALIASES[lower]
      || FIELD_ALIASES[lower.replace(/[\s-]/g, "_")]
      || FIELD_ALIASES[canon]
      || ALIAS_CANONIQUES[canon]
      || (schemaFields.includes(canon) ? canon : lower);
    // If alias is not a schema field, try fuzzy match against schema field names
    if (schemaFields.length > 0 && !schemaFields.includes(alias)) {
      const fuzzyMatch = schemaFields.find((f) => cleCanonique(f) === canon);
      if (fuzzyMatch) {
        out[fuzzyMatch] = v;
        continue;
      }
    }
    out[alias] = v;
  }
  return out;
}

// English → French enum translations (context-aware: checked against target enum)
const ENUM_TRANSLATIONS: Record<string, string[]> = {
  "paid": ["paye"], "pending": ["en_attente", "en_cours"], "failed": ["echoue"], "refunded": ["rembourse"],
  "shipped": ["expedie"], "processing": ["en_preparation"], "completed": ["livre", "terminee"], "cancelled": ["annule"], "returned": ["retourne"],
  "none": ["aucun"], "requested": ["demande"], "approved": ["approuve"], "rejected": ["refuse"],
  "web": ["shopify"],
  "google ads": ["google_ads"], "meta ads": ["meta_ads"],
  "paused": ["pause"], "planned": ["planifiee"], "active": ["active"],
  "dormant": ["dormant"],
  // French capitalized/common variants → canonical enum values
  "alerte": ["proche_rupture", "faible"], "normal": ["optimal"],
  "bas": ["inferieur"], "moyen": ["egal"], "eleve": ["superieur"],
  "haute": ["elevee", "urgente"], "critique": ["urgente"], "basse": ["faible"],
  "en retard": ["non_atteint"], "en attente": ["en_attente", "en_cours"],
  "avis": ["avis", "question"], "reclamation": ["reclamation", "plainte"], "rh": ["administration", "service_client"],
  "recu": ["recu"], "en cours": ["en_cours"],
  "income": ["revenu", "revenue", "credit", "entree", "encaissement"],
  "expense": ["depense", "debit", "sortie", "decaissement", "remboursement", "achat", "charge"],

  // --- Familles de veille (ExternalSignal.family) ---
  // Les fichiers de veille décrivent la famille en langage courant (« Engouement
  // Moto », « Réglementaire », « Local ») plutôt qu'avec les 7 identifiants du
  // schéma. coerceEnum teste aussi mot à mot, donc un seul mot reconnu dans le
  // libellé suffit à rattacher la ligne à la bonne famille au lieu de la rejeter.
  "engouement": ["marche"], "tendance": ["marche"], "tendances": ["marche"],
  "demande": ["marche"], "local": ["marche"], "sectoriel": ["marche"],
  "secteur": ["marche"], "marché": ["marche"], "opportunite": ["marche"],
  "reglementaire": ["gouvernement"], "reglementation": ["gouvernement"],
  "legal": ["gouvernement"], "juridique": ["gouvernement"], "loi": ["gouvernement"],
  "fiscal": ["gouvernement"], "fiscalite": ["gouvernement"], "politique": ["gouvernement"],
  "subvention": ["gouvernement"], "norme": ["gouvernement"], "douane": ["gouvernement"],
  "economique": ["economie"], "macroeconomie": ["economie"], "inflation": ["economie"],
  "taux": ["economie"], "devise": ["economie"], "conjoncture": ["economie"],
  "concurrent": ["concurrence"], "concurrents": ["concurrence"],
  "competiteur": ["concurrence"], "competition": ["concurrence"],
  "fournisseur": ["fournisseurs"], "approvisionnement": ["fournisseurs"],
  "chaine": ["fournisseurs"], "logistique": ["fournisseurs"], "import": ["fournisseurs"],
  "consommateur": ["consommateurs"], "client": ["consommateurs"],
  "clientele": ["consommateurs"], "comportement": ["consommateurs"],
  // "nouvelle" / "nouveau" sont volontairement absents : ce sont des adjectifs
  // courants (« Nouvelle loi », « Nouveau concurrent ») et le rapprochement se
  // fait sur le PREMIER mot reconnu, donc ils captureraient des libellés qui
  // appartiennent à une autre famille.
  "actualite": ["actualites"], "actualites": ["actualites"],
  "presse": ["actualites"], "media": ["actualites"], "medias": ["actualites"],
  "technologique": ["actualites"], "technologie": ["actualites"], "innovation": ["actualites"],
};

// Coerce a value to match an enum (case-insensitive, accents, spaces/hyphens, English→French)
export function coerceEnum(value: any, enumOptions: string[]): any {
  if (!value || !enumOptions) return value;
  const raw = String(value).toLowerCase().trim();
  const normalized = raw.replace(/[\s-]/g, "_");
  const rawNoAccents = stripAccents(raw);
  const normNoAccents = stripAccents(normalized);
  if (enumOptions.includes(raw)) return raw;
  if (enumOptions.includes(normalized)) return normalized;
  // Try English→French translation (also check accent-stripped keys)
  const translations = ENUM_TRANSLATIONS[raw] || ENUM_TRANSLATIONS[normalized] || ENUM_TRANSLATIONS[rawNoAccents] || ENUM_TRANSLATIONS[normNoAccents];
  if (translations) {
    const match = translations.find((t) => enumOptions.includes(t));
    if (match) return match;
  }
  const match = enumOptions.find((e) => {
    const eLow = e.toLowerCase();
    const eNoAcc = stripAccents(eLow);
    return eLow === raw || eLow === normalized || eNoAcc === rawNoAccents || eNoAcc === normNoAccents;
  });
  if (match) return match;
  // Labels carry qualifiers the enum doesn't have ("Boutique VIP", "Web Premium",
  // "Google Ads - Retargeting"). Match on the words instead of losing the field.
  const words = rawNoAccents.split(/[^a-z0-9]+/).filter(Boolean);
  for (const w of words) {
    const direct = enumOptions.find((e) => stripAccents(e.toLowerCase()) === w);
    if (direct) return direct;
    const viaTranslation = (ENUM_TRANSLATIONS[w] || []).find((t) => enumOptions.includes(t));
    if (viaTranslation) return viaTranslation;
  }
  return value;
}

// Normalize enum fields based on the entity schema properties
export function normalizeEnums(row: Record<string, any>, properties: Record<string, any>): Record<string, any> {
  if (!properties) return row;
  const out = { ...row };
  for (const [field, prop] of Object.entries(properties)) {
    if (prop && prop.enum && out[field] != null) {
      out[field] = coerceEnum(out[field], prop.enum);
    }
  }
  return out;
}

const BUILTIN_FIELDS = ["id", "created_date", "updated_date", "created_by_id"];

const MONTHS_FR: Record<string, string> = {
  janv: "01", jan: "01", fevr: "02", fev: "02", feb: "02", mars: "03", mar: "03",
  avr: "04", apr: "04", mai: "05", may: "05", juin: "06", jun: "06",
  juil: "07", jul: "07", aout: "08", aug: "08", sept: "09", sep: "09",
  oct: "10", nov: "11", dec: "12",
};

/**
 * A single separator followed by exactly three digits is a thousands group
 * ("1.234" = 1234, "45,000" = 45000) — UNLESS the integer part is "0" or is
 * longer than three digits, in which case it is a genuine decimal ("0.125" is a
 * rate, and "1234.567" would have been written "1.234,567" if dotted).
 *
 * The dot branch used to skip this test entirely (its guard was dead code:
 * `!single || (... && !single)`), so a European-formatted export turned
 * "1.234" into 1.234 and "45.000" into 45 — every amount silently divided by
 * 1000. The comma branch had the mirror problem on "0,125", which came out as
 * 125 and displayed a 12 500 % churn risk.
 */
function isThousandsGroup(s: string, sepIdx: number): boolean {
  const decimals = s.length - sepIdx - 1;
  if (decimals !== 3) return false;
  const intPart = s.slice(0, sepIdx);
  return /^[1-9]\d{0,2}$/.test(intPart);
}

/**
 * Parse a number written in any of the formats spreadsheets produce:
 * "1 234,56" (FR), "1,234.56" (EN), "1.234,56", "12 %", "1 500,00 $", "(500)".
 * A wrong separator guess silently divides or multiplies a metric by 1000,
 * so the decimal separator is decided by the LAST separator present.
 */
export function parseNumber(value: any): number | null {
  if (typeof value === "number") return isNaN(value) ? null : value;
  if (value === null || value === undefined) return null;
  let s = String(value).trim();
  if (s === "" || s === "-" || /^(n\/?a|nd|null)$/i.test(s)) return null;
  // Excel prefixe d'une apostrophe les nombres "stockes comme texte" ('1000), et
  // le format suisse s'en sert comme separateur de milliers (1'000). Dans les
  // deux cas ce n'est jamais un separateur decimal : on l'enleve avant tout le
  // reste, sinon la valeur est illisible et la ligne part en quarantaine.
  s = s.replace(/['\u2019\u02BC]/g, "").replace(/^"+|"+$/g, "").trim();
  if (s === "") return null;
  const negative = /^\(.*\)$/.test(s) || s.startsWith("-");
  s = s.replace(/[()\-+]/g, "");
  // Abréviations d'échelle ("1.5M", "2,5 k", "3 Md"). Elles doivent être lues
  // AVANT le retrait des lettres : sinon "1.5M" devient 1.5, soit un montant
  // divisé par un million. Seul un suffixe collé à un nombre est reconnu, pour
  // qu'un code devise ("1 500 CAD") reste traité comme avant.
  let multiplicateur = 1;
  const mult = s.match(/^([\d\s.,\u00A0\u202F]+)(md|mrd|k|m|g|b)\s*[$€£]?$/i);
  if (mult) {
    const suffixe = mult[2].toLowerCase();
    multiplicateur = suffixe === "k" ? 1e3 : (suffixe === "md" || suffixe === "mrd" || suffixe === "g" || suffixe === "b") ? 1e9 : 1e6;
    s = mult[1];
  }
  // Strip currency, percent signs and every kind of space (incl. non-breaking).
  s = s.replace(/[$€£%]|[a-zA-Z]|\s|\u00A0|\u202F/g, "");
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma >= 0 && lastDot >= 0) {
    // Both present: the rightmost one is the decimal separator.
    s = lastComma > lastDot ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (lastComma >= 0) {
    const single = s.indexOf(",") === lastComma;
    s = single && isThousandsGroup(s, lastComma) ? s.replace(",", "") : s.replace(/,/g, ".");
  } else if (lastDot >= 0) {
    const single = s.indexOf(".") === lastDot;
    // Several dots can only be thousands groups ("1.234.567").
    if (!single) s = s.replace(/\./g, "");
    else if (isThousandsGroup(s, lastDot)) s = s.replace(".", "");
  }
  const n = Number(s) * multiplicateur;
  if (isNaN(n)) return null;
  return negative ? -n : n;
}

/**
 * Une date doit exister au calendrier : "31/02/2025" se composait jusqu'ici en
 * "2025-02-31", stocké tel quel puis comparé et trié comme une vraie date.
 */
function dateReelle(annee: string, mois: string, jour: string): boolean {
  const a = Number(annee), m = Number(mois), j = Number(jour);
  if (!a || m < 1 || m > 12 || j < 1) return false;
  const dansLeMois = new Date(Date.UTC(a, m, 0)).getUTCDate();
  return j <= dansLeMois;
}

/**
 * Parse a date to YYYY-MM-DD from ISO, DD/MM/YYYY, DD-MM-YY, "15 janv. 2025",
 * or an Excel serial number (days since 1899-12-30) — serials arrive as plain
 * numbers and would otherwise be stored as unusable text.
 */
export type ConventionDate = "JJ/MM" | "MM/JJ";

export function parseDate(value: any, convention?: ConventionDate | null): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date && !isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === "number" || /^\d{5}(\.\d+)?$/.test(String(value).trim())) {
    const serial = Number(value);
    if (serial > 20000 && serial < 60000) {
      const ms = Math.round((serial - 25569) * 86400 * 1000);
      return new Date(ms).toISOString().slice(0, 10);
    }
  }
  let s = String(value).trim();
  if (s.includes("T")) s = s.slice(0, 10);
  // YYYY-MM-DD / YYYY/MM/DD
  let m = s.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
  if (m) return dateReelle(m[1], m[2], m[3]) ? `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}` : null;
  // DD/MM/YYYY, DD-MM-YY
  m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2}|\d{4})$/);
  if (m) {
    let year = m[3].length === 2 ? `20${m[3]}` : m[3];
    let day = m[1];
    let month = m[2];
    // 03/04/2026 est indechiffrable cellule par cellule : c'est le 3 avril ou
    // le 4 mars selon la convention du fichier. Le plan de lecture tranche pour
    // TOUTE la colonne (voir importPlan.ts) ; sans plan on garde l'ordre
    // europeen, qui est celui des fichiers de nos utilisateurs.
    if (convention === "MM/JJ") [day, month] = [month, day];
    // Ordre non ambigu : 13 ne peut pas etre un mois. La preuve presente dans
    // la cellule l'emporte sur toute convention annoncee.
    if (Number(month) > 12 && Number(day) <= 12) [day, month] = [month, day];
    if (!dateReelle(year, month, day)) return null;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  // "15 janv. 2025" / "15 janvier 2025"
  m = stripAccents(s.toLowerCase()).match(/^(\d{1,2})\s+([a-z]+)\.?\s+(\d{4})$/);
  if (m) {
    const mm = MONTHS_FR[m[2].slice(0, 4)] || MONTHS_FR[m[2].slice(0, 3)];
    if (mm) return dateReelle(m[3], mm, m[1]) ? `${m[3]}-${mm}-${m[1].padStart(2, "0")}` : null;
  }
  // YYYY-MM (period) → first day of month
  m = s.match(/^(\d{4})[\/\-](\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-01`;
  return null;
}

// Coerce a value to the schema property type (date, number, boolean)
export function coerceType(value: any, prop: any): any {
  if (value === null || value === undefined || value === "") return value;
  if (!prop || !prop.type) return value;
  switch (prop.type) {
    case "string":
      if (prop.format === "date" || prop.format === "date-time") {
        // Une valeur illisible renvoyait ses 10 premiers caracteres ("Lundi 3 ma"),
        // stockes tels quels dans un champ date : la ligne passait la validation,
        // entrait en base, puis faussait tout filtre ou tri par periode. Renvoyer
        // null la fait mettre en quarantaine, ce qui est le role de ce moteur.
        return parseDate(value);
      }
      return String(value);
    case "number": {
      const n = parseNumber(value);
      return n === null ? value : n;
    }
    case "boolean": {
      if (typeof value === "boolean") return value;
      const s = String(value).toLowerCase().trim();
      if (["true", "oui", "1", "yes", "vrai", "y"].includes(s)) return true;
      if (["false", "non", "0", "no", "faux", "n"].includes(s)) return false;
      return value;
    }
    default:
      return value;
  }
}

// Normalize a single row for a given entity
/** A value that was present in the file but refused by the schema. */
export type EnumIssue = { field: string; value: string; allowed: string[] };

export function normalizeRow(
  entityName: string,
  row: Record<string, any>,
  importId: string,
  properties: Record<string, any> | null,
  sourceType?: string,
  // Optional sink for diagnostics. A rejected enum value used to be dropped in
  // silence, and the row was then reported as "champ obligatoire manquant" —
  // pointing at a field the user could plainly see in their file. Collecting
  // the refused values lets the import tell the truth: the field is there, its
  // value is not one of the accepted ones.
  enumIssues?: EnumIssue[],
): Record<string, any> {
  const r = normalizeKeys(row, properties);

  // A single "name"/"nom" column on an entity that stores first + last name would
  // otherwise be dropped entirely, leaving nameless records.
  if (properties?.first_name && r.name && !r.first_name) {
    const parts = String(r.name).trim().split(/\s+/);
    r.first_name = parts[0];
    if (parts.length > 1) r.last_name = parts.slice(1).join(" ");
    delete r.name;
  }

  if (entityName === "Transaction") {
    // Meme principe que la date ci-dessous : un montant absent ou illisible ne
    // doit pas devenir 0 en silence. Le `|| 0` faisait passer la validation a
    // une ligne sans montant, et un fichier dont la colonne montant est mal
    // nommee s'importait "avec succes" avec toutes ses transactions a 0 $ —
    // comptees dans les volumes, invisibles dans les sommes.
    const amount = parseNumber(r.amount);
    let type = (r.type || "").toLowerCase().trim();
    if (!type) type = (amount ?? 0) >= 0 ? "income" : "expense";
    const typeNorm = stripAccents(type);
    if (["revenu", "revenue", "credit", "entree", "income"].includes(typeNorm)) type = "income";
    if (["depense", "expense", "debit", "sortie"].includes(typeNorm)) type = "expense";
    if (["remboursement", "refund", "transfer", "transfert"].includes(typeNorm)) type = "expense";
    // An unparseable date must NOT silently become today. Those rows used to
    // land in the in-progress month, which every calculation excludes — so they
    // vanished from all analyses while still inflating the all-time totals, and
    // the "lignes sans date" quality check could not see them because they had
    // a date. Leaving the field empty sends the row to quarantine, where it is
    // counted and reported to the user.
    const parsedDate = parseDate(r.date);
    return {
      date: parsedDate,
      description: r.description || "",
      // undefined (et non 0) : missingRequired met alors la ligne en quarantaine.
      amount: amount === null ? undefined : Math.abs(amount),
      type,
      category: r.category || "",
      source: sourceType || "csv",
      currency: "CAD",
      client: r.client || r.customer_id || "",
      product: r.product || r.product_id || "",
      import_id: importId,
    };
  }

  // Cashflow files rarely carry the net flow column: derive it, otherwise every
  // treasury check compares real balances against a column full of zeros.
  if (entityName === "Cashflow" && r.net_cash_flow == null) {
    const cin = parseNumber(r.cash_in);
    const cout = parseNumber(r.cash_out);
    if (cin !== null || cout !== null) r.net_cash_flow = (cin || 0) - (cout || 0);
  }

  // Les exports de campagnes contiennent la dépense, le revenu et les
  // conversions, mais presque jamais le ROAS ni le CAC : sans dérivation, la
  // page Marketing affichait des colonnes vides alors que tout est calculable.
  if (entityName === "Campaign") {
    const spend = parseNumber(r.spend);
    const revenue = parseNumber(r.revenue);
    const conversions = parseNumber(r.conversions);
    if (r.roas == null && spend && revenue != null) r.roas = Math.round((revenue / spend) * 100) / 100;
    if (r.cac == null && spend && conversions) r.cac = Math.round((spend / conversions) * 100) / 100;
  }

  // For other entities: normalize enums, coerce types, keep only schema fields, strip empty values
  const withEnums = normalizeEnums(r, properties || {});
  const cleaned: Record<string, any> = {};
  for (const [k, v] of Object.entries(withEnums)) {
    if (BUILTIN_FIELDS.includes(k)) continue;
    if (v === null || v === undefined || v === "") continue;
    const prop = properties?.[k];
    if (prop) {
      // Field is in schema: validate enum, coerce type
      if (prop.enum) {
        const coerced = coerceEnum(v, prop.enum);
        if (!prop.enum.includes(coerced)) {
          // Skip the invalid value rather than failing the whole row, but record
          // it so the import can explain what was refused and why.
          if (enumIssues) enumIssues.push({ field: k, value: String(v), allowed: prop.enum });
          continue;
        }
        cleaned[k] = coerceType(coerced, prop);
      } else {
        cleaned[k] = coerceType(v, prop);
      }
    } else if (!properties) {
      // No schema available: keep value as-is
      cleaned[k] = v;
    }
    // else: field not in schema, skip
  }
  if (importId) cleaned["import_id"] = importId;
  return cleaned;
}