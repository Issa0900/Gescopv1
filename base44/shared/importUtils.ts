// Shared import normalization utilities — used by importData and importMultiData
import { ENTITY_SCHEMAS } from "./entitySchemas.ts";

import { buildFieldAliasesFromRegistry } from "./registry/generateAliases.ts";

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
  "solde_banque": "closing_cash", "solde_bancaire": "closing_cash", "solde": "closing_cash",
  "encaissements": "cash_in", "decaissements": "cash_out",
  "entrees": "cash_in", "sorties": "cash_out",
  "categorie": "category", "catégorie": "category",
  "nom": "name", "nom du produit": "product_name", "nom_produit": "product_name", "nom_complet": "full_name",
  "prix": "price", "prix_vente": "selling_price", "prix de vente": "selling_price",
  "cout": "cost", "cout_achat": "purchase_cost", "coût": "cost", "coût_achat": "purchase_cost",
  "cout_produits": "total_cost", "cout_produit": "unit_cost", "cout_total": "total_cost",
  "profit_brut": "gross_profit",
  "marge": "gross_margin", "marge_pct": "gross_margin", "%_marge": "gross_margin",
  "quantite": "quantity", "quantité": "quantity", "quantite_articles": "quantity", "quantite_commandee": "quantity",
  "date_achat": "date", "date_vente": "date", "date_commande": "date", "date_de_commande": "date", "date de commande": "date",
  "client_id": "customer_id", "produit_id": "product_id",
  "fournisseur_id": "supplier_id", "fournisseur_nom": "supplier_name",
  "employe_id": "employee_id", "employé_id": "employee_id",
  "montant": "amount", "montant_ttc": "total", "montant_ht": "subtotal", "total_ttc": "total", "total_ht": "subtotal",
  "salaire_annuel": "annual_salary", "salaire": "salary",
  "ventes_totales": "total", "ventes_brutes": "gross_revenue",
  "clics_pub": "clicks", "impressions_pub": "impressions", "budget_depense": "spend", "revenu_attribue": "revenue",
  "sous_total": "subtotal",
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
  "premiere_commande": "first_purchase_date", "premiere_achat": "first_purchase_date",
  "derniere_commande": "last_purchase_date", "dernier_achat": "last_purchase_date",
  "date_acquisition": "acquisition_date", "date_d_acquisition": "acquisition_date",
  "nom_campagne": "campaign_name",
  "id_concurrent": "competitor_id",
  "cout_unitaire": "unit_cost",
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
  "cout_clic": "cpc", "cost_per_click": "cpc",
  "seuil_d_alerte": "reorder_point", "seuil_alerte": "reorder_point",
  "contact_principal": "contact_name", "conditions_paiement": "payment_terms", "condition_paiement": "payment_terms",
  "termes_paiement": "payment_terms", "code_postal": "postal_code", "budget_cad": "budget",
  "role_poste": "role", "poste": "role", "titre_poste": "role", "taux_commission": "commission_rate",
  "nb_transactions": "total_orders", "points_fidelite": "loyalty_points", "points_de_fidelite": "loyalty_points",
  "valeur_stock_cout": "inventory_value", "valeur_stock_vente": "selling_inventory_value",
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

/**
 * Calcule la similarité de Levenshtein normalisée (entre 0.0 et 1.0) entre deux chaînes.
 * Utilisé pour rattraper avec prudence les fautes de frappe courantes dans les en-têtes.
 */
export function stringSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;
  const l1 = s1.length;
  const l2 = s2.length;
  const matrix: number[][] = [];
  for (let i = 0; i <= l1; i++) matrix[i] = [i];
  for (let j = 0; j <= l2; j++) matrix[0][j] = j;
  for (let i = 1; i <= l1; i++) {
    for (let j = 1; j <= l2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  const dist = matrix[l1][l2];
  const maxLen = Math.max(l1, l2);
  return (maxLen - dist) / maxLen;
}

const ABBREVIATION_EXPANSIONS: Record<string, string[]> = {
  qte: ["quantite", "quantity"],
  qty: ["quantite", "quantity"],
  quantite: ["qte", "quantity"],
  nb: ["nombre", "number"],
  nbr: ["nombre", "number"],
  nombre: ["nb", "number"],
  num: ["numero", "number", "id"],
  no: ["numero", "number", "id"],
  numero: ["no", "num", "id"],
  mnt: ["montant", "amount"],
  mtt: ["montant", "amount"],
  montant: ["mnt", "mtt", "amount"],
  tx: ["taux", "rate"],
  taux: ["tx", "rate"],
  ca: ["chiffre_affaires", "revenue", "ventes", "total_revenue"],
  desc: ["description"],
  description: ["desc", "product_name"],
  cpc: ["cout_clic", "cost_per_click"],
  cp: ["code_postal", "postal_code"],
  zip: ["code_postal", "postal_code"],
  fourn: ["fournisseur", "supplier"],
  fournisseur: ["supplier", "supplier_name"],
  emp: ["employe", "employee"],
  empl: ["employe", "employee"],
  art: ["article", "produit", "product"],
  prod: ["produit", "product"],
  produit: ["product", "product_name"],
  cmd: ["commande", "order"],
  cmde: ["commande", "order"],
  commande: ["order", "order_id"],
  fact: ["facture", "invoice"],
  facture: ["order_id", "invoice"],
  trans: ["transaction"],
  txn: ["transaction", "order_id"],
  adr: ["adresse", "address"],
  addr: ["adresse", "address"],
  tel: ["telephone", "phone"],
};

/**
 * Génère toutes les variantes canoniques plausibles d'un en-tête de colonne
 * pour résister aux variations d'écriture, abréviations, devises, unités,
 * ponctuations, pluriels/singuliers et mots de liaison.
 */
export function variantesCanoniques(k: string): string[] {
  if (!k) return [];
  const raw = String(k).trim();
  const variants = new Set<string>();

  // 1. Clef canonique standard
  const base = cleCanonique(raw);
  if (base) variants.add(base);

  // 2. Nettoyage des parenthèses/crochets d'unités ou devises
  // ex: "Coût / Clic ($)" -> "cout_clic", "Budget (CAD)" -> "budget", "Ventes Totales ($ CAD)" -> "ventes_totales"
  const sansUnites = raw
    .replace(/\([^)]*\)/g, " ")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/[\$€£%]/g, " ")
    .replace(/\b(cad|usd|eur|dollars?|pct|pourcentage|unites?|ans|heures?|jours?)\b/gi, " ");
  const canonSansUnites = cleCanonique(sansUnites);
  if (canonSansUnites && canonSansUnites !== base) variants.add(canonSansUnites);

  // 3. Sans mots de liaison français/anglais courants (de, du, d, des, le, la, les, en, par, au, aux, of, the, in, per, for)
  for (const v of Array.from(variants)) {
    const sansLiaison = v.replace(/(^|_)(de|du|d|des|le|la|les|en|par|au|aux|of|the|in|per|for)(_|$)/g, "_").replace(/^_+|_+$/g, "").replace(/_+/g, "_");
    if (sansLiaison && sansLiaison !== v) variants.add(sansLiaison);
  }

  // 4. Formes singulières courantes (ventes -> vente, commandes -> commande, clics -> clic, transactions -> transaction)
  for (const v of Array.from(variants)) {
    const tokens = v.split("_");
    let changed = false;
    const singTokens = tokens.map((t) => {
      if (t.endsWith("s") && t.length > 3 && !t.endsWith("ss") && t !== "frais" && t !== "mois" && t !== "prix") {
        changed = true;
        return t.slice(0, -1);
      }
      if (t.endsWith("aux") && t.length > 4) {
        changed = true;
        return t.slice(0, -3) + "al";
      }
      return t;
    });
    if (changed) {
      const sing = singTokens.join("_");
      if (sing) variants.add(sing);
    }
  }

  // 5. Inversion des mots clés (ex: "total_ventes" <-> "ventes_totales", "nb_transactions" <-> "nombre_transactions")
  for (const v of Array.from(variants)) {
    if (v.startsWith("total_")) {
      variants.add(v.replace(/^total_/, "") + "_total");
    } else if (v.endsWith("_total")) {
      variants.add("total_" + v.replace(/_total$/, ""));
    }
    if (v.startsWith("nb_")) {
      variants.add("nombre_" + v.replace(/^nb_/, ""));
    } else if (v.startsWith("nombre_")) {
      variants.add("nb_" + v.replace(/^nombre_/, ""));
    }
  }

  // 6. Substitution et expansion des abréviations
  for (const v of Array.from(variants)) {
    const tokens = v.split("_");
    for (let idx = 0; idx < tokens.length; idx++) {
      const tok = tokens[idx];
      const expansions = ABBREVIATION_EXPANSIONS[tok];
      if (expansions) {
        for (const exp of expansions) {
          const replaced = [...tokens];
          replaced[idx] = exp;
          variants.add(replaced.join("_"));
        }
      }
    }
  }

  return Array.from(variants);
}

// La table d'alias est elle-meme indexee sous forme canonique : ses cles sont
// ecrites avec des espaces ("date d acquisition") et ne matchaient donc jamais
// une colonne ponctuee ("Date d'acquisition").
export const ALIAS_CANONIQUES: Record<string, string> = {

  "chiffre_d_affaires": "revenue",
  "chiffre_affaire": "revenue",
  "chiffre_affaires": "revenue",
  "ca": "revenue",
  "ventes": "revenue",
  "vente": "revenue",
  "revenus": "revenue",
  "revenu": "revenue",
  "recettes_commerciales": "revenue",
  "recettes": "revenue",
  "recettes_de_vente": "revenue",
  "revenu_des_ventes": "revenue",
  "revenus_des_ventes": "revenue",
  "montant_des_ventes": "revenue",
  "valeur_des_ventes": "revenue",
  "ventes_nettes": "net_revenue",
  "client": "customer_name",
  "nom_client": "customer_name",
  "nom_du_client": "customer_name",
  "id_transaction": "order_id",
  "code_produit": "product_id",
  "description_produit": "product_name",
  "sku": "product_id",
  "raison_sociale": "supplier_name",
  "nom_de_la_campagne": "campaign_name",
  "nom_de_campagne": "campaign_name",
  "nom_campagne": "campaign_name",
  "profit_brut": "gross_profit",
  "succursale": "branch",
  "mode_de_paiement": "payment_method",
  "chiffre_d_affaires_net": "net_revenue",
  "ca_net": "net_revenue",
  "revenu_commercial": "revenue",
  "produit_des_ventes": "revenue",
  "produit_de_vente": "revenue",
  "sales": "revenue",
  "sales_revenue": "revenue",
  "total_sales": "revenue",
  "revenue": "revenue",
  "revenues": "revenue",
  "turnover": "revenue",
  "net_sales": "net_revenue",
  "sales_amount": "revenue",
  "sales_value": "revenue",
  "gross_sales": "gross_revenue",
  "commercial_revenue": "revenue",
  "operating_revenue": "revenue",
  "ca_brut": "gross_revenue",
  "chiffre_d_affaires_brut": "gross_revenue",
  "ventes_brutes": "gross_revenue",
  "revenus_bruts": "gross_revenue",
  "recettes_brutes": "gross_revenue",
  "total_brut_des_ventes": "gross_revenue",
  "gross_revenue": "gross_revenue",
  "gross_turnover": "gross_revenue",
  "revenus_nets": "net_revenue",
  "recettes_nettes": "net_revenue",
  "net_revenue": "net_revenue",
  "net_turnover": "net_revenue",
  "sales_after_returns": "net_revenue",
  "quantite_vendue": "sales_quantity",
  "quantites_vendues": "sales_quantity",
  "volume_vendu": "sales_quantity",
  "unites_vendues": "sales_quantity",
  "unites_ecoulees": "sales_quantity",
  "nombre_d_unites_vendues": "sales_quantity",
  "ventes_en_unites": "sales_quantity",
  "quantite_de_vente": "sales_quantity",
  "quantite_ventes": "sales_quantity",
  "volume_des_ventes": "sales_quantity",
  "volume_de_vente": "sales_quantity",
  "quantite_commandee": "sales_quantity",
  "units_sold": "sales_quantity",
  "sold_quantity": "sales_quantity",
  "sales_quantity": "sales_quantity",
  "sales_volume": "sales_quantity",
  "volume_sold": "sales_quantity",
  "nombre_de_ventes": "sales_count",
  "nombre_de_transactions": "sales_count",
  "nombre_de_ventes_realisees": "sales_count",
  "ventes_realisees": "sales_count",
  "transactions_de_vente": "sales_count",
  "operations_de_vente": "sales_count",
  "sales_count": "sales_count",
  "number_of_sales": "sales_count",
  "sales_transactions": "sales_count",
  "transaction_count": "sales_count",
  "nombre_de_commandes": "order_count",
  "commandes": "order_count",
  "total_commandes": "order_count",
  "nombre_commandes": "order_count",
  "volume_de_commandes": "order_count",
  "commandes_recues": "order_count",
  "orders": "order_count",
  "order_count": "order_count",
  "number_of_orders": "order_count",
  "orders_count": "order_count",
  "total_orders": "order_count",
  "valeur_commande": "order_value",
  "valeur_de_commande": "order_value",
  "montant_commande": "order_value",
  "montant_de_commande": "order_value",
  "total_commande": "order_value",
  "total_de_commande": "order_value",
  "montant_total_commande": "order_value",
  "valeur_totale_commande": "order_value",
  "order_value": "order_value",
  "order_amount": "order_value",
  "order_total": "order_value",
  "total_order_value": "order_value",
  "order_revenue": "order_value",
  "panier_moyen": "average_order_value",
  "valeur_moyenne_commande": "average_order_value",
  "valeur_moyenne_des_commandes": "average_order_value",
  "montant_moyen_commande": "average_order_value",
  "montant_moyen_des_commandes": "average_order_value",
  "ticket_moyen": "average_order_value",
  "panier_moyen_client": "average_order_value",
  "aov": "average_order_value",
  "average_order_value": "average_order_value",
  "average_basket": "average_order_value",
  "average_order_amount": "average_order_value",
  "average_ticket": "average_order_value",
  "cout_des_biens_vendus": "cogs",
  "cout_des_marchandises_vendues": "cogs",
  "cout_des_produits_vendus": "cogs",
  "cout_de_revient_des_ventes": "cogs",
  "cout_des_ventes": "cogs",
  "couts_des_ventes": "cogs",
  "cout_marchandises": "cogs",
  "cout_produit_vendu": "cogs",
  "cout_des_articles_vendus": "cogs",
  "cout_d_achat_des_produits_vendus": "cogs",
  "cmv": "cogs",
  "cogs": "cogs",
  "cost_of_goods_sold": "cogs",
  "cost_of_sales": "cogs",
  "cost_of_goods": "cogs",
  "product_cost_sold": "cogs",
  "marge_brute_en_montant": "gross_profit",
  "benefice_brut": "gross_profit",
  "resultat_brut": "gross_profit",
  "gain_brut": "gross_profit",
  "marge_brute": "gross_margin",
  "marge_brute_montant": "gross_profit",
  "gross_profit": "gross_profit",
  "gross_margin_amount": "gross_profit",
  "gross_earnings": "gross_profit",
  "gross_income": "gross_profit",
  "taux_de_marge_brute": "gross_margin",
  "taux_marge_brute": "gross_margin",
  "marge_commerciale": "gross_margin",
  "taux_de_marge_commerciale": "gross_margin",
  "taux_de_profit_brut": "gross_margin",
  "pourcentage_marge_brute": "gross_margin",
  "marge_brute_pourcentage": "gross_margin",
  "gross_margin": "gross_margin",
  "gross_margin_rate": "gross_margin",
  "gross_profit_margin": "gross_margin",
  "gross_margin_percentage": "gross_margin",
  "gm": "gross_margin",
  "gross_profit_rate": "gross_margin",
  "benefice_net": "net_profit",
  "profit_net": "net_margin",
  "resultat_net": "net_margin",
  "revenu_net": "net_profit",
  "gain_net": "net_profit",
  "benefice_final": "net_profit",
  "resultat_final": "net_profit",
  "profit_apres_depenses": "net_profit",
  "net_profit": "net_profit",
  "net_income": "net_profit",
  "net_earnings": "net_profit",
  "bottom_line": "net_profit",
  "net_result": "net_profit",
  "marge_nette": "net_margin",
  "taux_de_marge_nette": "net_margin",
  "taux_marge_nette": "net_margin",
  "rentabilite_nette": "net_margin",
  "marge_beneficiaire_nette": "net_margin",
  "net_margin": "net_margin",
  "net_profit_margin": "net_margin",
  "net_margin_rate": "net_margin",
  "net_profitability": "net_margin",
  "resultat_d_exploitation": "operating_profit",
  "benefice_d_exploitation": "operating_profit",
  "profit_operationnel": "operating_profit",
  "resultat_operationnel": "operating_profit",
  "marge_operationnelle_en_montant": "operating_profit",
  "operating_profit": "operating_profit",
  "operating_income": "operating_profit",
  "ebit": "operating_profit",
  "operating_earnings": "operating_profit",
  "marge_operationnelle": "operating_margin",
  "taux_de_marge_operationnelle": "operating_margin",
  "rentabilite_operationnelle": "operating_margin",
  "marge_d_exploitation": "operating_margin",
  "operating_margin": "operating_margin",
  "operating_profit_margin": "operating_margin",
  "operating_profitability": "operating_margin",
  "depense": "expense",
  "depenses": "expense",
  "depense_totale": "expense",
  "total_depenses": "expense",
  "charge": "expense",
  "charges": "expense",
  "frais": "expense",
  "frais_totaux": "expense",
  "cout_operationnel": "expense",
  "couts_operationnels": "expense",
  "depenses_operationnelles": "expense",
  "charges_operationnelles": "expense",
  "frais_d_exploitation": "expense",
  "operating_expense": "expense",
  "operating_expenses": "expense",
  "opex": "expense",
  "expense": "expense",
  "expenses": "expense",
  "costs": "expense",
  "operating_costs": "expense",
  "couts_fixes": "fixed_cost",
  "cout_fixe": "fixed_cost",
  "charges_fixes": "fixed_cost",
  "frais_fixes": "fixed_cost",
  "depenses_fixes": "fixed_cost",
  "couts_structurels": "fixed_cost",
  "frais_structurels": "fixed_cost",
  "fixed_cost": "fixed_cost",
  "fixed_costs": "fixed_cost",
  "fixed_expenses": "fixed_cost",
  "couts_variables": "variable_cost",
  "cout_variable": "variable_cost",
  "charges_variables": "variable_cost",
  "frais_variables": "variable_cost",
  "depenses_variables": "variable_cost",
  "variable_cost": "variable_cost",
  "variable_costs": "variable_cost",
  "variable_expenses": "variable_cost",
  "seuil_de_rentabilite": "break_even",
  "point_mort": "break_even",
  "seuil_de_rentabilite_financier": "break_even",
  "chiffre_d_affaires_au_seuil": "break_even",
  "ca_au_point_mort": "break_even",
  "break_even": "break_even",
  "break_even_point": "break_even",
  "break_even_sales": "break_even",
  "break_even_revenue": "break_even",
  "marge_sur_couts_variables": "contribution_margin",
  "marge_contributive": "contribution_margin",
  "taux_de_marge_sur_couts_variables": "contribution_margin",
  "marge_de_contribution": "contribution_margin",
  "contribution_margin": "contribution_margin",
  "contribution_margin_ratio": "contribution_margin",
  "cm_ratio": "contribution_margin",
  "tresorerie": "cash_balance",
  "tresorerie_disponible": "cash_balance",
  "solde_de_tresorerie": "cash_balance",
  "solde_bancaire": "cash_balance",
  "encaisse": "cash_balance",
  "encaisse_disponible": "cash_balance",
  "liquidites": "cash_balance",
  "cash": "cash_balance",
  "cash_disponible": "cash_balance",
  "cash_balance": "cash_balance",
  "cash_position": "cash_balance",
  "bank_balance": "cash_balance",
  "available_cash": "cash_balance",
  "cash_on_hand": "cash_balance",
  "tresorerie_initiale": "opening_cash",
  "solde_initial": "opening_cash",
  "encaisse_initiale": "opening_cash",
  "cash_initial": "opening_cash",
  "solde_de_depart": "opening_cash",
  "opening_cash": "opening_cash",
  "opening_cash_balance": "opening_cash",
  "beginning_cash": "opening_cash",
  "starting_cash": "opening_cash",
  "tresorerie_finale": "closing_cash",
  "solde_final": "closing_cash",
  "encaisse_finale": "closing_cash",
  "cash_final": "closing_cash",
  "solde_de_cloture": "closing_cash",
  "closing_cash": "closing_cash",
  "closing_cash_balance": "closing_cash",
  "ending_cash": "closing_cash",
  "ending_cash_balance": "closing_cash",
  "entrees_de_tresorerie": "cash_in",
  "entree_de_cash": "cash_in",
  "encaissements": "cash_in",
  "recettes_encaissees": "cash_in",
  "cash_entrant": "cash_in",
  "flux_entrants": "cash_in",
  "encaissements_clients": "cash_in",
  "cash_inflow": "cash_in",
  "cash_inflows": "cash_in",
  "cash_receipts": "cash_in",
  "cash_received": "cash_in",
  "sorties_de_tresorerie": "cash_out",
  "sortie_de_cash": "cash_out",
  "decaissements": "cash_out",
  "paiements": "cash_out",
  "cash_sortant": "cash_out",
  "flux_sortants": "cash_out",
  "cash_outflow": "cash_out",
  "cash_outflows": "cash_out",
  "cash_payments": "cash_out",
  "cash_paid": "cash_out",
  "comptes_clients": "accounts_receivable",
  "comptes_a_recevoir": "accounts_receivable",
  "creances_clients": "accounts_receivable",
  "creances": "accounts_receivable",
  "clients_a_recevoir": "accounts_receivable",
  "montant_du_par_clients": "accounts_receivable",
  "factures_clients_impayees": "accounts_receivable",
  "ar": "accounts_receivable",
  "a_r": "accounts_receivable",
  "accounts_receivable": "accounts_receivable",
  "receivables": "accounts_receivable",
  "customer_receivables": "accounts_receivable",
  "trade_receivables": "accounts_receivable",
  "comptes_fournisseurs": "accounts_payable",
  "comptes_a_payer": "accounts_payable",
  "dettes_fournisseurs": "accounts_payable",
  "fournisseurs_a_payer": "accounts_payable",
  "factures_fournisseurs_impayees": "accounts_payable",
  "montant_du_aux_fournisseurs": "accounts_payable",
  "ap": "accounts_payable",
  "a_p": "accounts_payable",
  "accounts_payable": "accounts_payable",
  "payables": "accounts_payable",
  "supplier_payables": "accounts_payable",
  "trade_payables": "accounts_payable",
  "besoin_en_fonds_de_roulement": "working_capital",
  "bfr": "working_capital",
  "fonds_de_roulement": "working_capital",
  "besoin_fonds_roulement": "working_capital",
  "working_capital": "working_capital",
  "working_capital_requirement": "working_capital",
  "wcr": "working_capital",
  "nwc": "working_capital",
  "net_working_capital": "working_capital",
  "flux_de_tresorerie": "cash_flow",
  "flux_de_cash": "cash_flow",
  "flux_financier": "cash_flow",
  "mouvement_de_tresorerie": "cash_flow",
  "cash_flow": "cash_flow",
  "cashflow": "cash_flow",
  "net_cash_flow": "cash_flow",
  "cash_movement": "cash_flow",
  "tresorerie_nette_generee": "net_cash_generated",
  "cash_net_genere": "net_cash_generated",
  "flux_net_genere": "net_cash_generated",
  "generation_de_tresorerie": "net_cash_generated",
  "net_cash_generated": "net_cash_generated",
  "net_cash_flow_generated": "net_cash_generated",
  "autonomie_de_tresorerie": "runway",
  "duree_de_tresorerie": "runway",
  "duree_de_vie_du_cash": "runway",
  "runway": "runway",
  "cash_runway": "runway",
  "cash_survival": "runway",
  "months_of_cash": "runway",
  "nombre_de_clients": "customer_count",
  "nombre_clients": "customer_count",
  "clients": "customer_count",
  "total_clients": "customer_count",
  "clientele": "customer_count",
  "base_clients": "customer_count",
  "nombre_de_comptes_clients": "customer_count",
  "customer_count": "customer_count",
  "number_of_customers": "customer_count",
  "customers": "customer_count",
  "client_base": "customer_count",
  "nouveaux_clients": "new_customer_count",
  "nouveaux_clients_acquis": "new_customer_count",
  "nombre_de_nouveaux_clients": "new_customer_count",
  "nouveaux_comptes": "new_customer_count",
  "acquisition_clients": "new_customer_count",
  "new_customers": "new_customer_count",
  "new_customer_count": "new_customer_count",
  "new_clients": "new_customer_count",
  "customer_acquisition": "new_customer_count",
  "clients_recurrents": "returning_customer_count",
  "clients_existants": "returning_customer_count",
  "clients_fideles": "returning_customer_count",
  "clients_de_retour": "returning_customer_count",
  "repeat_customers": "returning_customer_count",
  "returning_customers": "returning_customer_count",
  "returning_clients": "returning_customer_count",
  "repeat_buyers": "returning_customer_count",
  "cout_acquisition_client": "customer_acquisition_cost",
  "cout_d_acquisition_client": "customer_acquisition_cost",
  "cac": "customer_acquisition_cost",
  "cout_acquisition": "cpa",
  "cout_moyen_acquisition": "customer_acquisition_cost",
  "cout_pour_acquerir_un_client": "customer_acquisition_cost",
  "customer_acquisition_cost": "customer_acquisition_cost",
  "customer_acquisition_cost_per_customer": "customer_acquisition_cost",
  "valeur_vie_client": "customer_lifetime_value",
  "valeur_vie_du_client": "customer_lifetime_value",
  "valeur_client_a_vie": "customer_lifetime_value",
  "valeur_vie_clientele": "customer_lifetime_value",
  "ltv": "customer_lifetime_value",
  "clv": "customer_lifetime_value",
  "lifetime_value": "customer_lifetime_value",
  "customer_lifetime_value": "customer_lifetime_value",
  "customer_lifetime_revenue": "customer_lifetime_value",
  "taux_d_attrition": "churn_rate",
  "taux_de_desabonnement": "churn_rate",
  "taux_de_depart_clients": "churn_rate",
  "taux_de_perte_clients": "churn_rate",
  "attrition_client": "churn_rate",
  "churn": "churn_rate",
  "churn_rate": "churn_rate",
  "customer_churn": "churn_rate",
  "customer_attrition_rate": "churn_rate",
  "taux_de_retention": "retention_rate",
  "taux_fidelisation": "retention_rate",
  "taux_de_conservation_clients": "retention_rate",
  "retention_client": "retention_rate",
  "retention_rate": "retention_rate",
  "customer_retention": "retention_rate",
  "retention_percentage": "retention_rate",
  "taux_de_reachat": "repeat_purchase_rate",
  "taux_de_clients_qui_rachetent": "repeat_purchase_rate",
  "frequence_de_reachat": "repeat_purchase_rate",
  "repeat_purchase_rate": "repeat_purchase_rate",
  "repeat_customer_rate": "repeat_purchase_rate",
  "repurchase_rate": "repeat_purchase_rate",
  "satisfaction_client": "customer_satisfaction",
  "satisfaction_clients": "customer_satisfaction",
  "score_satisfaction": "customer_satisfaction",
  "note_satisfaction": "customer_satisfaction",
  "indice_satisfaction": "customer_satisfaction",
  "satisfaction_moyenne": "customer_satisfaction",
  "customer_satisfaction": "customer_satisfaction",
  "csat": "customer_satisfaction",
  "customer_satisfaction_score": "customer_satisfaction",
  "nps": "nps",
  "score_nps": "nps",
  "net_promoter_score": "nps",
  "indice_de_recommandation": "nps",
  "score_de_recommandation": "nps",
  "taux_promoteurs_net": "nps",
  "taux_de_conversion": "conversion_rate",
  "taux_conversion": "conversion_rate",
  "conversion": "conversion_rate",
  "taux_transformation": "conversion_rate",
  "taux_de_transformation": "conversion_rate",
  "conversion_rate": "conversion_rate",
  "conversion_percentage": "conversion_rate",
  "sales_conversion_rate": "conversion_rate",
  "nombre_prospects": "lead_count",
  "prospects": "lead_count",
  "leads": "lead_count",
  "prospects_commerciaux": "lead_count",
  "pistes_commerciales": "lead_count",
  "opportunites_potentielles": "lead_count",
  "lead_count": "lead_count",
  "prospects_count": "lead_count",
  "nombre_opportunites": "opportunity_count",
  "opportunites": "opportunity_count",
  "occasions_de_vente": "opportunity_count",
  "opportunites_commerciales": "opportunity_count",
  "sales_opportunities": "opportunity_count",
  "opportunity_count": "opportunity_count",
  "opportunities": "opportunity_count",
  "taux_de_reussite": "win_rate",
  "taux_de_gain": "win_rate",
  "taux_de_conclusion": "win_rate",
  "taux_de_ventes_gagnees": "win_rate",
  "win_rate": "win_rate",
  "sales_win_rate": "win_rate",
  "opportunity_win_rate": "win_rate",
  "close_rate": "win_rate",
  "cycle_de_vente_moyen": "average_sales_cycle",
  "duree_moyenne_vente": "average_sales_cycle",
  "duree_cycle_commercial": "average_sales_cycle",
  "temps_moyen_de_conversion": "average_sales_cycle",
  "sales_cycle": "average_sales_cycle",
  "average_sales_cycle": "average_sales_cycle",
  "sales_cycle_length": "average_sales_cycle",
  "croissance_des_ventes": "sales_growth",
  "croissance_ca": "sales_growth",
  "croissance_chiffre_affaires": "sales_growth",
  "evolution_ventes": "sales_growth",
  "variation_ventes": "sales_growth",
  "croissance_revenus": "sales_growth",
  "sales_growth": "sales_growth",
  "revenue_growth": "sales_growth",
  "sales_increase": "sales_growth",
  "objectif_ventes": "sales_target",
  "cible_ventes": "sales_target",
  "objectif_ca": "sales_target",
  "cible_ca": "sales_target",
  "quota_ventes": "sales_target",
  "objectif_chiffre_d_affaires": "sales_target",
  "sales_target": "sales_target",
  "sales_goal": "sales_target",
  "revenue_target": "sales_target",
  "sales_quota": "sales_target",
  "depenses_marketing": "marketing_spend",
  "budget_marketing_consomme": "marketing_spend",
  "cout_marketing": "marketing_spend",
  "depenses_de_marketing": "marketing_spend",
  "frais_marketing": "marketing_spend",
  "investissement_marketing": "marketing_spend",
  "marketing_spend": "marketing_spend",
  "marketing_expenses": "marketing_spend",
  "marketing_cost": "marketing_spend",
  "marketing_budget_spent": "marketing_spend",
  "depenses_publicitaires": "advertising_spend",
  "cout_publicite": "advertising_spend",
  "couts_publicitaires": "advertising_spend",
  "budget_publicite_consomme": "advertising_spend",
  "depenses_ads": "advertising_spend",
  "depenses_annonces": "advertising_spend",
  "ad_spend": "advertising_spend",
  "advertising_spend": "advertising_spend",
  "advertising_cost": "advertising_spend",
  "paid_media_spend": "advertising_spend",
  "taux_de_clic": "ctr",
  "taux_clic": "ctr",
  "ctr": "ctr",
  "taux_de_clics": "ctr",
  "click_through_rate": "ctr",
  "click_rate": "ctr",
  "cout_par_clic": "cpc",
  "cout_moyen_par_clic": "cpc",
  "cpc": "cpc",
  "cost_per_click": "cpc",
  "average_cost_per_click": "cpc",
  "cout_par_acquisition": "cpa",
  "cpa": "cpa",
  "cout_par_conversion": "cpa",
  "cost_per_acquisition": "cpa",
  "cost_per_action": "cpa",
  "cost_per_conversion": "cpa",
  "retour_sur_depenses_publicitaires": "roas",
  "retour_publicite": "roas",
  "roas": "roas",
  "rendement_publicitaire": "roas",
  "return_on_ad_spend": "roas",
  "advertising_return": "roas",
  "ad_spend_return": "roas",
  "retour_sur_investissement_marketing": "romi",
  "rendement_marketing": "romi",
  "romi": "romi",
  "retour_marketing": "romi",
  "return_on_marketing_investment": "romi",
  "marketing_roi": "romi",
  "impressions": "impressions",
  "affichages": "impressions",
  "vues_publicitaires": "impressions",
  "nombre_affichages": "impressions",
  "nombre_d_impressions": "impressions",
  "ad_impressions": "impressions",
  "impressions_count": "impressions",
  "clics": "clicks",
  "nombre_de_clics": "clicks",
  "clics_publicitaires": "clicks",
  "clicks": "clicks",
  "click_count": "clicks",
  "ad_clicks": "clicks",
  "portee": "reach",
  "portee_publicitaire": "reach",
  "personnes_atteintes": "reach",
  "audience_atteinte": "reach",
  "reach": "reach",
  "advertising_reach": "reach",
  "audience_reach": "reach",
  "nombre_produits": "product_count",
  "nombre_de_produits": "product_count",
  "produits": "product_count",
  "references": "product_count",
  "nombre_references": "product_count",
  "sku_count": "product_count",
  "product_count": "product_count",
  "number_of_products": "product_count",
  "products": "product_count",
  "id_produit": "product_id",
  "identifiant_produit": "product_id",
  "reference_produit": "product_id",
  "code_sku": "product_id",
  "product_id": "product_id",
  "product_code": "product_id",
  "sku_code": "product_id",
  "item_id": "product_id",
  "nom_produit": "product_name",
  "nom_du_produit": "product_name",
  "produit": "product_name",
  "designation": "product_name",
  "libelle_produit": "product_name",
  "product_name": "product_name",
  "item_name": "product_name",
  "product_description": "product_name",
  "categorie": "category",
  "categorie_produit": "category",
  "famille_produit": "category",
  "groupe_produit": "category",
  "classe_produit": "category",
  "segment_produit": "category",
  "category": "category",
  "product_category": "category",
  "product_family": "category",
  "product_group": "category",
  "prix_unitaire": "unit_price",
  "prix_par_unite": "unit_price",
  "tarif_unitaire": "unit_price",
  "prix_de_vente_unitaire": "unit_price",
  "prix_moyen_unitaire": "unit_price",
  "unit_price": "unit_price",
  "selling_price_per_unit": "unit_price",
  "price_per_unit": "unit_price",
  "cout_unitaire": "unit_cost",
  "cout_par_unite": "unit_cost",
  "cout_produit": "unit_cost",
  "cout_d_achat_unitaire": "unit_cost",
  "prix_coutant": "unit_cost",
  "unit_cost": "unit_cost",
  "cost_per_unit": "unit_cost",
  "product_unit_cost": "unit_cost",
  "quantite_en_stock": "inventory_quantity",
  "quantite_stock": "inventory_quantity",
  "stock_quantite": "inventory_quantity",
  "unites_en_stock": "inventory_quantity",
  "niveau_de_stock": "inventory_quantity",
  "inventaire_quantite": "inventory_quantity",
  "quantite_inventaire": "inventory_quantity",
  "inventory_quantity": "inventory_quantity",
  "stock_quantity": "inventory_quantity",
  "units_in_stock": "inventory_quantity",
  "inventory_units": "inventory_quantity",
  "valeur_stock": "inventory_value",
  "valeur_des_stocks": "inventory_value",
  "valeur_inventaire": "inventory_value",
  "valeur_de_l_inventaire": "inventory_value",
  "stock_en_valeur": "inventory_value",
  "inventory_value": "inventory_value",
  "inventory_valuation": "inventory_value",
  "stock_value": "inventory_value",
  "rotation_des_stocks": "stock_turnover",
  "taux_rotation_stock": "stock_turnover",
  "rotation_stock": "stock_turnover",
  "coefficient_rotation": "stock_turnover",
  "stock_turnover": "stock_turnover",
  "inventory_turnover": "stock_turnover",
  "inventory_turnover_ratio": "stock_turnover",
  "ruptures_de_stock": "stockout_count",
  "nombre_ruptures": "stockout_count",
  "rupture_stock": "stockout_count",
  "nombre_de_ruptures": "stockout_count",
  "stockout_count": "stockout_count",
  "stock_outs": "stockout_count",
  "inventory_stockouts": "stockout_count",
  "taux_rupture": "stockout_rate",
  "taux_de_rupture_stock": "stockout_rate",
  "taux_ruptures": "stockout_rate",
  "stockout_rate": "stockout_rate",
  "stockout_percentage": "stockout_rate",
  "out_of_stock_rate": "stockout_rate",
  "jours_de_stock": "days_inventory",
  "jours_couverture_stock": "days_inventory",
  "couverture_stock_en_jours": "days_inventory",
  "nombre_jours_stock": "days_inventory",
  "inventory_days": "days_inventory",
  "days_inventory": "days_inventory",
  "days_of_stock": "days_inventory",
  "inventory_coverage_days": "days_inventory",
  "point_de_commande": "reorder_point",
  "seuil_commande": "reorder_point",
  "niveau_reapprovisionnement": "reorder_point",
  "seuil_reapprovisionnement": "reorder_point",
  "reorder_point": "reorder_point",
  "reorder_level": "reorder_point",
  "replenishment_point": "reorder_point",
  "demarque": "shrinkage",
  "demarque_inconnue": "shrinkage",
  "pertes_inventaire": "shrinkage",
  "pertes_de_stock": "shrinkage",
  "ecarts_stock": "shrinkage",
  "vol": "shrinkage",
  "casse": "shrinkage",
  "stock_shrinkage": "shrinkage",
  "inventory_shrinkage": "shrinkage",
  "inventory_loss": "shrinkage",
  "taux_de_demarque": "shrinkage_rate",
  "taux_demarque_inconnue": "shrinkage_rate",
  "taux_de_pertes_stock": "shrinkage_rate",
  "taux_pertes_inventaire": "shrinkage_rate",
  "shrinkage_rate": "shrinkage_rate",
  "inventory_shrinkage_rate": "shrinkage_rate",
  "nombre_fournisseurs": "supplier_count",
  "fournisseurs": "supplier_count",
  "nombre_de_fournisseurs": "supplier_count",
  "total_fournisseurs": "supplier_count",
  "supplier_count": "supplier_count",
  "number_of_suppliers": "supplier_count",
  "suppliers": "supplier_count",
  "montant_achats": "purchase_amount",
  "achats": "purchase_amount",
  "total_achats": "purchase_amount",
  "valeur_achats": "purchase_amount",
  "depenses_achats": "purchase_amount",
  "achats_fournisseurs": "purchase_amount",
  "purchase_amount": "purchase_amount",
  "purchases": "purchase_amount",
  "purchase_value": "purchase_amount",
  "procurement_spend": "purchase_amount",
  "quantite_achetee": "purchase_quantity",
  "volume_achats": "purchase_quantity",
  "unites_achetees": "purchase_quantity",
  "quantite_achat": "purchase_quantity",
  "purchase_quantity": "purchase_quantity",
  "purchased_quantity": "purchase_quantity",
  "units_purchased": "purchase_quantity",
  "nombre_commandes_fournisseurs": "purchase_order_count",
  "commandes_achats": "purchase_order_count",
  "bons_de_commande": "purchase_order_count",
  "nombre_bons_commande": "purchase_order_count",
  "purchase_orders": "purchase_order_count",
  "purchase_order_count": "purchase_order_count",
  "po_count": "purchase_order_count",
  "delai_fournisseur": "supplier_lead_time",
  "delai_livraison_fournisseur": "supplier_lead_time",
  "delai_approvisionnement": "supplier_lead_time",
  "temps_approvisionnement": "supplier_lead_time",
  "lead_time_fournisseur": "supplier_lead_time",
  "supplier_lead_time": "supplier_lead_time",
  "supplier_delivery_time": "supplier_lead_time",
  "procurement_lead_time": "supplier_lead_time",
  "cout_fournisseur": "supplier_cost",
  "prix_fournisseur": "supplier_cost",
  "cout_achat_fournisseur": "supplier_cost",
  "supplier_cost": "supplier_cost",
  "supplier_price": "supplier_cost",
  "procurement_cost": "supplier_cost",
  "nombre_employes": "employee_count",
  "nombre_salaries": "employee_count",
  "effectif": "employee_count",
  "effectifs": "employee_count",
  "employes": "employee_count",
  "salaries": "employee_count",
  "personnel": "employee_count",
  "collaborateurs": "employee_count",
  "headcount": "employee_count",
  "employee_count": "employee_count",
  "number_of_employees": "employee_count",
  "staff_count": "employee_count",
  "workforce": "employee_count",
  "masse_salariale": "payroll_cost",
  "cout_salarial": "payroll_cost",
  "couts_salariaux": "payroll_cost",
  "cout_personnel": "labor_cost",
  "cout_de_personnel": "payroll_cost",
  "paie_totale": "payroll_cost",
  "salaires_totaux": "payroll_cost",
  "depenses_paie": "payroll_cost",
  "payroll": "payroll_cost",
  "payroll_cost": "payroll_cost",
  "payroll_expenses": "payroll_cost",
  "labor_cost": "labor_cost",
  "staff_cost": "payroll_cost",
  "salaire_moyen": "average_salary",
  "remuneration_moyenne": "average_salary",
  "salaire_moyen_employe": "average_salary",
  "paie_moyenne": "average_salary",
  "cout_salarial_moyen": "average_salary",
  "average_salary": "average_salary",
  "average_wage": "average_salary",
  "average_compensation": "average_salary",
  "cout_de_main_d_oeuvre": "labor_cost",
  "cout_main_d_oeuvre": "labor_cost",
  "cout_du_travail": "labor_cost",
  "cout_travail": "labor_cost",
  "labour_cost": "labor_cost",
  "workforce_cost": "labor_cost",
  "taux_de_roulement": "employee_turnover",
  "roulement_du_personnel": "employee_turnover",
  "turnover_employes": "employee_turnover",
  "taux_turnover": "employee_turnover",
  "rotation_personnel": "employee_turnover",
  "employee_turnover": "employee_turnover",
  "staff_turnover": "employee_turnover",
  "employee_turnover_rate": "employee_turnover",
  "taux_absenteisme": "absenteeism_rate",
  "absenteisme": "absenteeism_rate",
  "taux_d_absence": "absenteeism_rate",
  "absence_employes": "absenteeism_rate",
  "absenteeism_rate": "absenteeism_rate",
  "absence_rate": "absenteeism_rate",
  "employee_absenteeism": "absenteeism_rate",
  "heures_travaillees": "hours_worked",
  "heures_travail": "hours_worked",
  "nombre_heures": "hours_worked",
  "heures_effectuees": "hours_worked",
  "heures_payees": "hours_worked",
  "temps_travaille": "hours_worked",
  "hours_worked": "hours_worked",
  "worked_hours": "hours_worked",
  "paid_hours": "hours_worked",
  "delai_traitement_commande": "order_fulfillment_time",
  "delai_preparation_commande": "order_fulfillment_time",
  "temps_traitement_commande": "order_fulfillment_time",
  "temps_fulfillment": "order_fulfillment_time",
  "fulfillment_time": "order_fulfillment_time",
  "order_fulfillment_time": "order_fulfillment_time",
  "order_processing_time": "order_fulfillment_time",
  "delai_livraison": "delivery_time",
  "temps_livraison": "delivery_time",
  "duree_livraison": "delivery_time",
  "delai_moyen_livraison": "delivery_time",
  "delivery_time": "delivery_time",
  "delivery_lead_time": "delivery_time",
  "shipping_time": "delivery_time",
  "taux_annulation": "cancellation_rate",
  "taux_d_annulation_commandes": "cancellation_rate",
  "commandes_annulees": "cancellation_rate",
  "cancellation_rate": "cancellation_rate",
  "order_cancellation_rate": "cancellation_rate",
  "taux_retour": "return_rate",
  "taux_de_retours": "return_rate",
  "retours_produits": "return_rate",
  "taux_retours_produits": "return_rate",
  "return_rate": "return_rate",
  "product_return_rate": "return_rate",
  "returns_percentage": "return_rate",
  "montant_remboursements": "refund_amount",
  "remboursements": "refund_amount",
  "valeur_remboursements": "refund_amount",
  "total_remboursements": "refund_amount",
  "refund_amount": "refund_amount",
  "refunds": "refund_amount",
  "refunded_amount": "refund_amount",
  "refund_value": "refund_amount",
  "montant_remise": "discount_amount",
  "montant_rabais": "discount_amount",
  "remises": "discount_amount",
  "rabais": "discount_amount",
  "reduction": "discount_amount",
  "reductions": "discount_amount",
  "valeur_remise": "discount_amount",
  "discount_amount": "discount_amount",
  "discount_value": "discount_amount",
  "discounts": "discount_amount",
  "taux_remise": "discount_rate",
  "taux_rabais": "discount_rate",
  "pourcentage_remise": "discount_rate",
  "remise_moyenne": "discount_rate",
  "discount_rate": "discount_rate",
  "discount_percentage": "discount_rate",
  "average_discount": "discount_rate",
  "ventes_promotionnelles": "promotion_sales",
  "ventes_en_promotion": "promotion_sales",
  "chiffre_affaires_promotion": "promotion_sales",
  "ca_promotion": "promotion_sales",
  "revenus_promotionnels": "promotion_sales",
  "promotional_sales": "promotion_sales",
  "promotion_revenue": "promotion_sales",
  "nombre_promotions": "promotion_count",
  "promotions_actives": "promotion_count",
  "campagnes_promotionnelles": "promotion_count",
  "promotions": "promotion_count",
  "promotion_count": "promotion_count",
  "number_of_promotions": "promotion_count",
  "date": "date",
  "date_transaction": "date",
  "date_operation": "date",
  "date_commande": "date",
  "date_vente": "date",
  "date_evenement": "date",
  "jour": "date",
  "transaction_date": "date",
  "order_date": "date",
  "sales_date": "date",
  "operation_date": "date",
  "annee": "year",
  "an": "year",
  "exercice": "year",
  "annee_fiscale": "year",
  "annee_financiere": "year",
  "year": "year",
  "fiscal_year": "year",
  "financial_year": "year",
  "mois": "month",
  "periode_mensuelle": "month",
  "mois_fiscal": "month",
  "month": "month",
  "monthly_period": "month",
  "fiscal_month": "month",
  "trimestre": "quarter",
  "trimestre_fiscal": "quarter",
  "periode_trimestrielle": "quarter",
  "quarter": "quarter",
  "fiscal_quarter": "quarter",
  "quarterly_period": "quarter",
  "semaine": "week",
  "semaine_fiscale": "week",
  "periode_hebdomadaire": "week",
  "week": "week",
  "fiscal_week": "week",
  "weekly_period": "week",
  "identifiant_transaction": "transaction_id",
  "numero_transaction": "transaction_id",
  "no_transaction": "transaction_id",
  "numero_operation": "transaction_id",
  "transaction_id": "transaction_id",
  "transaction_number": "transaction_id",
  "transaction_reference": "transaction_id",
  "id_commande": "order_id",
  "identifiant_commande": "order_id",
  "numero_commande": "order_id",
  "no_commande": "order_id",
  "num_commande": "order_id",
  "num_cde": "order_id",
  "no_cde": "order_id",
  "cde_no": "order_id",
  "cde_id": "order_id",
  "ref_cde": "order_id",
  "ref_commande": "order_id",
  "bon_commande": "order_id",
  "bc_no": "order_id",
  "order_id": "order_id",
  "order_number": "order_id",
  "order_reference": "order_id",
  "id_client": "customer_id",
  "identifiant_client": "customer_id",
  "numero_client": "customer_id",
  "code_client": "customer_id",
  "customer_id": "customer_id",
  "customer_number": "customer_id",
  "customer_code": "customer_id",
  "id_fournisseur": "supplier_id",
  "identifiant_fournisseur": "supplier_id",
  "numero_fournisseur": "supplier_id",
  "code_fournisseur": "supplier_id",
  "supplier_id": "supplier_id",
  "supplier_number": "supplier_id",
  "supplier_code": "supplier_id",
  "id_employe": "employee_id",
  "identifiant_employe": "employee_id",
  "matricule": "employee_id",
  "numero_employe": "employee_id",
  "code_employe": "employee_id",
  "employee_id": "employee_id",
  "employee_number": "employee_id",
  "employee_code": "employee_id",
  "region": "region",
  "region_administrative": "region",
  "territoire": "region",
  "zone": "region",
  "secteur_geographique": "region",
  "region_commerciale": "region",
  "geographic_region": "region",
  "territory": "region",
  "sales_region": "region",
  "ville": "city",
  "municipalite": "city",
  "commune": "city",
  "city": "city",
  "municipality": "city",
  "town": "city",
  "pays": "country",
  "nation": "country",
  "country": "country",
  "market_country": "country",
  "magasin": "store",
  "boutique": "store",
  "point_de_vente": "store",
  "magasin_physique": "store",
  "store": "store",
  "shop": "store",
  "branch": "store",
  "retail_location": "store",
  "location": "store",
  "canal_de_vente": "channel",
  "canal_commercial": "channel",
  "canal": "channel",
  "canal_publicitaire": "channel",
  "canal_marketing": "channel",
  "canal_de_campagne": "channel",
  "canal_de_communication": "channel",
  "mode_de_vente": "channel",
  "circuit_de_vente": "channel",
  "sales_channel": "channel",
  "sales_source": "channel",
  "distribution_channel": "channel",
  "budget_alloue": "budget",
  "budget_total": "budget",
  "budget_campagne": "budget",
  "depenses_reelles": "spend",
  "depense_reelle": "spend",
  "cout_campagne": "spend",
  "revenu_ventes": "revenue",
  "revenus_ventes": "revenue",
  "chiffre_affaires_campagne": "revenue",
  "ca_genere": "revenue",
  "ventes_generees": "revenue",
  "cout_achat": "unit_cost",
  "prix_achat": "unit_cost",
  "purchase_cost": "unit_cost",
  "statut_paiement": "payment_status",
  "etat_paiement": "payment_status",
  "etat_livraison": "fulfillment_status",
  "statut_livraison": "fulfillment_status",
  "vendeur": "sales_rep",
  "representant_commercial": "sales_rep",
  "conseiller_ventes": "sales_rep",
  "representant": "sales_rep",
  "commercial": "sales_rep",
  "agent_commercial": "sales_rep",
  "sales_representative": "sales_rep",
  "sales_rep": "sales_rep",
  "salesperson": "sales_rep",
  "account_executive": "sales_rep",
  "paniers": "cart_count",
  "paniers_crees": "cart_count",
  "nombre_paniers": "cart_count",
  "shopping_carts": "cart_count",
  "cart_count": "cart_count",
  "carts_created": "cart_count",
  "taux_abandon_panier": "cart_abandonment_rate",
  "taux_d_abandon_panier": "cart_abandonment_rate",
  "paniers_abandonnes": "cart_abandonment_rate",
  "abandon_panier": "cart_abandonment_rate",
  "cart_abandonment": "cart_abandonment_rate",
  "cart_abandonment_rate": "cart_abandonment_rate",
  "abandoned_cart_rate": "cart_abandonment_rate",
  "passages_caisse": "checkout_count",
  "checkouts": "checkout_count",
  "nombre_checkouts": "checkout_count",
  "checkout_count": "checkout_count",
  "completed_checkout_attempts": "checkout_count",
  "sessions_site": "website_sessions",
  "sessions_web": "website_sessions",
  "visites_site": "website_sessions",
  "sessions": "website_sessions",
  "visites": "website_sessions",
  "trafic_site": "website_sessions",
  "website_sessions": "website_sessions",
  "web_sessions": "website_sessions",
  "site_visits": "website_sessions",
  "visits": "website_sessions",
  "taux_rebond": "bounce_rate",
  "taux_de_rebond": "bounce_rate",
  "rebond": "bounce_rate",
  "bounce_rate": "bounce_rate",
  "website_bounce_rate": "bounce_rate",
  "objectif": "target",
  "cible": "target",
  "cible_kpi": "target",
  "valeur_cible": "target",
  "objectif_kpi": "target",
  "target": "target",
  "target_value": "target",
  "goal": "target",
  "goal_value": "target",
  "kpi_target": "target",
  "valeur_actuelle": "actual_value",
  "valeur_reelle": "actual_value",
  "realise": "actual_value",
  "realisation": "actual_value",
  "resultat_actuel": "actual_value",
  "valeur_observee": "actual_value",
  "actual": "actual_value",
  "actual_value": "actual_value",
  "current_value": "actual_value",
  "achieved_value": "actual_value",
  "ecart": "variance",
  "variance": "variance",
  "difference": "variance",
  "ecart_objectif": "variance",
  "ecart_cible": "variance",
  "ecart_realise": "variance",
  "variation_par_rapport_objectif": "variance",
  "target_variance": "variance",
  "actual_vs_target": "variance",
  "taux_atteinte_objectif": "achievement_rate",
  "taux_realisation": "achievement_rate",
  "taux_d_atteinte": "achievement_rate",
  "progression_objectif": "achievement_rate",
  "realisation_objectif": "achievement_rate",
  "target_achievement": "achievement_rate",
  "achievement_rate": "achievement_rate",
  "goal_completion_rate": "achievement_rate",
  "taux_croissance": "growth_rate",
  "taux_de_croissance": "growth_rate",
  "croissance": "growth_rate",
  "evolution": "change_rate",
  "progression": "growth_rate",
  "variation_relative": "growth_rate",
  "growth_rate": "growth_rate",
  "growth_percentage": "growth_rate",
  "growth": "growth_rate",
  "variation_montant": "change_amount",
  "ecart_montant": "change_amount",
  "difference_montant": "change_amount",
  "changement_montant": "change_amount",
  "delta": "change_amount",
  "amount_change": "change_amount",
  "absolute_change": "change_amount",
  "delta_amount": "change_amount",
  "variation": "change_rate",
  "variation_pourcentage": "change_rate",
  "taux_variation": "change_rate",
  "changement": "change_rate",
  "percentage_change": "change_rate",
  "change_rate": "change_rate",
  "relative_change": "change_rate",
  "moyenne": "average",
  "moyenne_generale": "average",
  "moyenne_ponderee": "average",
  "valeur_moyenne": "average",
  "average": "average",
  "mean": "average",
  "weighted_average": "average",
  "minimum": "minimum",
  "valeur_minimale": "minimum",
  "plus_petite_valeur": "minimum",
  "min": "minimum",
  "minimum_value": "minimum",
  "lowest_value": "minimum",
  "maximum": "maximum",
  "valeur_maximale": "maximum",
  "plus_grande_valeur": "maximum",
  "max": "maximum",
  "maximum_value": "maximum",
  "highest_value": "maximum",
  "mediane": "median",
  "valeur_mediane": "median",
  "median": "median",
  "median_value": "median",
  "statut": "status",
  "etat": "status",
  "situation": "status",
  "status": "status",
  "state": "status",
  "condition": "status",
  "type": "type",
  "classe": "type",
  "nature": "type",
  "genre": "type",
  "type_of": "type",
  "class": "type",
  "kind": "type",
  "description": "description",
  "detail": "description",
  "commentaire": "description",
  "notes": "description",
  "remarque": "description",
  "information": "description",
  "details": "description",
  "comment": "description",
  "remarks": "description",
  "devise": "currency",
  "monnaie": "currency",
  "currency": "currency",
  "currency_code": "currency",
  "currency_type": "currency",
  "monnaie_utilisee": "currency",

  // --- KAGGLE / STANDARD DATASETS ADDITIONS ---
  // Kaggle Superstore / E-Commerce
  "ship_date": "shipping_date",
  "ship_mode": "shipping_method",
  "customer_name": "customer_id",
  "segment": "customer_type",
  "postal_code": "zip_code",
  "sub_category": "category",
  "profit": "gross_margin",
  "discount": "discount",
  "quantity": "sales_quantity",

  // Kaggle Bank Transactions / Credit Card
  "txn_date": "date",
  "post_date": "date",
  "value_date": "date",
  "debit_amount": "expense_amount",
  "credit_amount": "income_amount",
  "txn_desc": "description",
  "merch_name": "source",
  "merchant": "source",
  "mcc": "category",
  "statement_bal": "closing_cash",
  
  // Kaggle Churn / CRM
  "customerid": "customer_id",
  "surname": "last_name",
  "creditscore": "quality_score",
  "geography": "country",
  "gender": "gender",
  "tenure": "customer_tenure",
  "balance": "balance",
  "numofproducts": "total_orders",
  "hascrcard": "has_credit_card",
  "isactivemember": "status",
  "estimatedsalary": "estimated_revenue",
  "exited": "churn_risk",

  // Kaggle HR / Payroll
  "employee_name": "employee_id",
  "empid": "employee_id",
  "salary": "regular_pay",
  "position": "role",
  "dob": "birth_date",
  "sex": "gender",
  "maritaldesc": "marital_status",
  "employmentstatus": "status",
  "managername": "manager_id",
  "performancescore": "quality_score",
  
  // Kaggle Marketing / Ads
  "campaign_id": "campaign_id",
  "cost": "spend",
  "conversions": "conversions",

  // --- OPEN DATA / HUGGING FACE / DONNEES QUEBEC ADDITIONS ---
  // Quebec / Canadian standard terminology (Tax, accounting, retail)
  "tps": "tax_amount",
  "tvq": "tax_amount",
  "taxes": "tax_amount",
  "escompte": "discount",
  "no_facture": "order_id",
  "article": "product_name",
  "qte": "quantity",
  
  // Finance / Accounting Data (Accounts receivable/payable, Cash flow)
  "encours": "balance",
  
  // Inventory & Supply Chain
  "inventory": "inventory_level",
  "inventaire": "inventory_level",
  "stock_on_hand": "inventory_level",
  "qte_en_stock": "inventory_level",
  "qte_stock": "inventory_level",
  "stock_disponible": "inventory_level",
  "seuil_d_alerte": "reorder_point",
  "seuil_alerte": "reorder_point",
  "valeur_du_stock_cout": "inventory_value",
  "valeur_stock_cout": "inventory_value",
  "valeur_stock_vente": "inventory_value",
  "valeur_du_stock": "inventory_value",
  "prix_de_vente": "selling_price",
  "prix_vente": "selling_price",
  "ugs": "sku",
  "fournisseur": "supplier_name",
  "supplier": "supplier_name",
  "lead_time": "delivery_time",
  "cout_des_marchandises": "cogs",
  "coutant": "unit_cost",
  
  // Store Performance & Business KPIs
  "store_performance": "quality_score",
  "store_id": "location_id",
  "demand_forecast": "predicted_sales",
  "economic_indicator": "external_metric",
  "competitor_price": "competitor_price",

  // Quebec & Canadian Payroll & HR
  "statut_syndical": "union_status",
  "taux_horaire": "hourly_rate",
  "taux_horaire_cad": "hourly_rate",
  "salaire_base_annuel": "annual_salary",
  "salaire_base_annuel_cad": "annual_salary",
  "cotisation_rrq_patronale": "cpp_employer",
  "rrq": "cpp_employer",
  "rrq_patronale": "cpp_employer",
  "cotisation_rqap_patronale": "qpip_employer",
  "rqap": "qpip_employer",
  "rqap_patronale": "qpip_employer",
  "cotisation_cnesst": "cnesst",
  "cnesst": "cnesst",
  "cotisation_fss_qc": "fss_qc",
  "fss_qc": "fss_qc",
  "fss": "fss_qc",
  "assurance_collective_part_patronale": "group_insurance",
  "assurance_collective": "group_insurance",
  "regime_reer_collectif_employeur": "rrsp_employer",
  "reer_collectif": "rrsp_employer",
  "reer_employeur": "rrsp_employer",

  // Warehousing & Multi-Depot Inventory
  "code_cup_upc": "sku",
  "upc": "sku",
  "cup": "sku",
  "id_depot": "warehouse_id",
  "nom_depot": "warehouse_name",
  "quantite_disponible": "closing_stock",
  "qte_disponible": "closing_stock",
  "cout_moyen_pondere_cad": "unit_cost",
  "cout_moyen_pondere": "unit_cost",
  "cout_moyen": "unit_cost",
  "prix_vente_cad": "selling_price",
  "origine_fabrication": "origin_country",
  "pays_origine": "origin_country",
  "code_sh_douane": "customs_code",
  "code_sh": "customs_code",
  "code_douane": "customs_code",

  // Suppliers & Procurement
  "province_pays": "country",
  "devise_achat": "purchase_currency",
  "modalites_paiement": "payment_terms",
  "modalite_paiement": "payment_terms",

  // Customers & CRM
  "langue_communication": "language",
  "langue": "language",
  "adresse": "address",
  "statut_compte": "status",
  "total_achats_ttc_cad": "total_revenue",
  "total_achats": "total_revenue",

  // Sales Orders & Retail
  "date_heure": "date",
  "canal_vente": "channel",
  "nom_client": "customer_name",
  "id_vendeur": "employee_id",
  "remise_ligne": "discount",
  "prix_net": "unit_price",
  "province_livraison": "province",
  "mode_paiement": "payment_method",
  "id_ligne": "notes",

  // Genere depuis le registre unique (registry/conceptRegistry.ts, spec v2
  // section 3) : concepts de mesure (revenu, couts, marketing...), y compris
  // les en-tetes de canal publicitaire ("Facebook Ads", "Google Ads"...) qui
  // n'avaient jamais d'alias de COLONNE ici — seulement de VALEUR de cellule
  // dans ENUM_TRANSLATIONS, ce qui les rendait invisibles a l'import quand un
  // fichier a une colonne nommee "Facebook Ads" plutot qu'une colonne
  // "canal" contenant la valeur "Facebook Ads". Place en dernier : gagne sur
  // toute collision avec les alias structurels ecrits a la main ci-dessus.
  ...buildFieldAliasesFromRegistry(),
};

// FIELD_ALIASES/ALIAS_CANONIQUES resolve every revenue synonym (CA, Ventes,
// Sales, Revenue, Net Sales, "Chiffre d'affaires" with the apostrophe...) to
// one of these canonical concept names, regardless of which entity is being
// imported. No entity schema actually has a field literally called "revenue"
// — Transaction/Expense track it as "amount", Order/Customer/ExecutiveSummary
// as "total_revenue" — so whenever the resolved alias didn't happen to be the
// exact target field, the row's money value was silently dropped and the row
// quarantined for a missing required field. A financial column this central
// must never disappear without explanation, so on a schema mismatch we place
// it in whichever generic revenue-carrying field the target entity actually
// has, instead of an alias name nothing declares.
const REVENUE_CONCEPT_ALIASES = new Set(["revenue", "net_revenue", "gross_revenue", "total_revenue"]);
// "revenue" doit etre en tete de liste : c'est le nom reel du champ argent
// sur Campaign (Campaign.jsonc n'a pas de "total_revenue"), et il manquait
// ici — toute colonne de revenu marketing sans alias exact n'avait donc
// jamais de champ ou atterrir sur cette entite.
const REVENUE_LANDING_FIELDS = ["revenue", "total_revenue", "amount", "gross_revenue", "net_revenue"];

export function normalizeKeys(
  row: Record<string, any>,
  properties?: Record<string, any>,
  unmapped?: Set<string>,
  companyDictionary?: Record<string, string>,
): Record<string, any> {
  const out: Record<string, any> = {};
  const schemaFields = properties ? Object.keys(properties) : [];
  for (const [k, v] of Object.entries(row || {})) {
    const lower = k.toLowerCase().trim();
    const canon = cleCanonique(k);
    const variants = variantesCanoniques(k);

    // 1. Recherche directe dans les champs du schéma
    let targetField: string | null = null;
    if (schemaFields.includes(k)) targetField = k;
    else if (schemaFields.includes(lower)) targetField = lower;
    else if (schemaFields.includes(canon)) targetField = canon;
    else {
      for (const vr of variants) {
        if (schemaFields.includes(vr)) {
          targetField = vr;
          break;
        }
      }
    }

    // 2. Recherche dans le dictionnaire d'entreprise
    if (!targetField && companyDictionary) {
      if (companyDictionary[canon] && schemaFields.includes(companyDictionary[canon])) {
        targetField = companyDictionary[canon];
      } else {
        for (const vr of variants) {
          if (companyDictionary[vr] && schemaFields.includes(companyDictionary[vr])) {
            targetField = companyDictionary[vr];
            break;
          }
        }
      }
    }

    // 3. Recherche via FIELD_ALIASES et ALIAS_CANONIQUES
    let alias: string | null = targetField;
    if (!targetField) {
      for (const vr of variants) {
        const mapped = FIELD_ALIASES[vr] || ALIAS_CANONIQUES[vr];
        if (mapped) {
          if (schemaFields.includes(mapped)) {
            targetField = mapped;
            break;
          }
          if (!alias) alias = mapped;
        }
      }
    }

    if (!alias) {
      alias = (companyDictionary && companyDictionary[canon])
        || FIELD_ALIASES[lower]
        || FIELD_ALIASES[lower.replace(/[\s-]/g, "_")]
        || FIELD_ALIASES[canon]
        || ALIAS_CANONIQUES[canon]
        || (schemaFields.includes(canon) ? canon : lower);
    }

    // Si on a un targetField valide direct, on l'écrit
    if (targetField && schemaFields.includes(targetField)) {
      out[targetField] = v;
      continue;
    }

    // If alias is not a schema field, try fuzzy match against schema field names or contextual adaptations
    if (schemaFields.length > 0 && !schemaFields.includes(alias)) {
      let fuzzyMatch: string | undefined = schemaFields.find((f) => variants.includes(cleCanonique(f)));
      if (!fuzzyMatch) {
        let bestScore = 0;
        let bestField: string | undefined;
        for (const f of schemaFields) {
          const canonF = cleCanonique(f);
          for (const vr of variants) {
            const sim = stringSimilarity(vr, canonF);
            if (sim >= 0.85 && sim > bestScore) {
              bestScore = sim;
              bestField = f;
            }
          }
        }
        if (bestField) fuzzyMatch = bestField;
      }
      if (fuzzyMatch) {
        out[fuzzyMatch] = v;
        continue;
      }
      // Last resort: a revenue-family column with nowhere else to go.
      if (REVENUE_CONCEPT_ALIASES.has(alias) || REVENUE_CONCEPT_ALIASES.has(canon) || variants.some((vr) => REVENUE_CONCEPT_ALIASES.has(vr))) {
        const landing = REVENUE_LANDING_FIELDS.find((f) => schemaFields.includes(f) && out[f] === undefined);
        if (landing) {
          out[landing] = v;
          continue;
        }
      }
      if (alias === "status" && schemaFields.includes("fulfillment_status") && !schemaFields.includes("status")) {
        out["fulfillment_status"] = v;
        continue;
      }
      if (alias === "amount" && schemaFields.includes("total") && !schemaFields.includes("amount")) {
        out["total"] = v;
        continue;
      }
      if (alias === "total" && schemaFields.includes("total_revenue") && !schemaFields.includes("total")) {
        out["total_revenue"] = v;
        continue;
      }
      if ((alias === "nb_transactions" || alias === "total_orders" || variants.includes("nb_transactions")) && schemaFields.includes("total_orders")) {
        out["total_orders"] = v;
        continue;
      }
      // Customer: Nom complet -> prénom/nom
      if ((alias === "full_name" || alias === "nom_complet" || alias === "name" || alias === "client" || alias === "customer_name" || variants.includes("nom_complet")) && schemaFields.includes("first_name")) {
        if (schemaFields.includes("full_name")) out["full_name"] = v;
        if (!out["first_name"]) {
          const strVal = String(v ?? "").trim();
          if (strVal.includes(",")) {
            const [lName, fName] = strVal.split(",").map((s) => s.trim());
            out["first_name"] = fName || lName;
            out["last_name"] = lName;
          } else {
            const parts = strVal.split(/\s+/);
            out["first_name"] = parts[0] || "";
            if (parts.length > 1) out["last_name"] = parts.slice(1).join(" ");
          }
        }
        continue;
      }
      if (alias === "customer_name" && schemaFields.includes("customer_id") && !schemaFields.includes("customer_name")) {
        out["customer_id"] = v;
        continue;
      }
      // Campaign
      if ((alias === "cout_clic" || alias === "cost_per_click" || alias === "cpc" || variants.includes("cout_clic")) && schemaFields.includes("cpc")) {
        out["cpc"] = v;
        continue;
      }
      if ((alias === "budget_cad" || alias === "budget" || variants.includes("budget_cad")) && schemaFields.includes("budget")) {
        out["budget"] = v;
        continue;
      }
      // Inventory
      if ((alias === "qte_en_stock" || alias === "inventory_level" || alias === "stock_quantity" || variants.includes("qte_en_stock")) && schemaFields.includes("closing_stock")) {
        out["closing_stock"] = v;
        continue;
      }
      if ((alias === "seuil_d_alerte" || alias === "seuil_alerte" || alias === "reorder_point" || variants.includes("seuil_d_alerte") || variants.includes("seuil_alerte")) && schemaFields.includes("reorder_point")) {
        out["reorder_point"] = v;
        continue;
      }
      if ((alias === "fournisseur" || alias === "supplier_name") && (schemaFields.includes("supplier_id") || schemaFields.includes("supplier_name"))) {
        if (schemaFields.includes("supplier_name")) out["supplier_name"] = v;
        else out["supplier_id"] = v;
        continue;
      }
      if ((alias === "valeur_stock_cout" || alias === "valeur_stock_cout_cad" || variants.includes("valeur_stock_cout")) && schemaFields.includes("inventory_value")) {
        out["inventory_value"] = v;
        continue;
      }
      if ((alias === "description" || variants.includes("description")) && schemaFields.includes("product_name") && !schemaFields.includes("description")) {
        out["product_name"] = v;
        continue;
      }
      // Supplier
      if ((alias === "contact_principal" || alias === "contact_name" || variants.includes("contact_principal")) && schemaFields.includes("contact_name")) {
        out["contact_name"] = v;
        continue;
      }
      if ((alias === "conditions_paiement" || alias === "condition_paiement" || alias === "payment_terms" || variants.includes("conditions_paiement")) && schemaFields.includes("payment_terms")) {
        out["payment_terms"] = v;
        continue;
      }
      // Employee
      if ((alias === "role_poste" || alias === "poste" || alias === "role" || variants.includes("role_poste")) && schemaFields.includes("role")) {
        out["role"] = v;
        continue;
      }
      if ((alias === "taux_commission" || alias === "commission_rate" || variants.includes("taux_commission")) && schemaFields.includes("commission_rate")) {
        out["commission_rate"] = v;
        continue;
      }
      // Expenses
      if (alias === "expense" && schemaFields.includes("expense_amount") && !schemaFields.includes("expense")) {
        out["expense_amount"] = v;
        continue;
      }
      if (["expense", "depense", "debit"].includes(alias) && schemaFields.includes("amount") && !schemaFields.includes(alias)) {
        out["amount"] = v;
        continue;
      }
      if (alias === "transaction_id" && schemaFields.includes("order_id") && !schemaFields.includes("transaction_id")) {
        out["order_id"] = v;
        continue;
      }
      // Ignorer les colonnes fantômes / artificielles de grille vide (ex: "col_7", "col_8", "__EMPTY_1")
      if (unmapped) {
        const isArtificialCol = /^(col_?\d+|colonne_?\d+|column_?\d+|__empty)/i.test(k);
        const isEmptyVal = v === null || v === undefined || String(v).trim() === "";
        if (!isArtificialCol || !isEmptyVal) {
          unmapped.add(k);
        }
      }
      continue;
    }
    out[alias] = v;
  }
  return out;
}

// English → French enum translations (context-aware: checked against target enum)
const ENUM_TRANSLATIONS: Record<string, string[]> = {
  // Statuses (orders, tasks, campaigns, general)
  "paid": ["paye"], "pending": ["en_attente", "en_cours"], "failed": ["echoue"], "refunded": ["rembourse"],
  "shipped": ["expedie"], "processing": ["en_preparation", "en_cours"], "completed": ["livre", "terminee", "complete"], "cancelled": ["annule", "annulee"], "returned": ["retourne"],
  "received": ["recu"], "done": ["terminee"], "todo": ["a_faire"], "in progress": ["en_cours"], "in_progress": ["en_cours"],
  "none": ["aucun"], "requested": ["demande"], "approved": ["approuve"], "rejected": ["refuse", "rejetee"],

  // Levels, Priorities, Risks
  "low": ["faible", "bas", "basse", "inferieur"], "medium": ["moyenne", "modere", "moyen", "egal"], "high": ["elevee", "eleve", "important", "superieur", "haute"], "urgent": ["urgente", "critique"],
  "critical": ["critique", "urgente"],

  // States
  "new": ["nouveau", "nouvelle"], "seen": ["vu", "lue"], "resolved": ["resolu"], "archived": ["archivee", "archive"],
  "active": ["active", "actif"], "actif": ["active", "actif"], "inactive": ["inactif", "pause", "terminee"], "inactif": ["inactif", "pause", "terminee"], "lost": ["perdu"], "dormant": ["dormant"], "terminated": ["terminee"],
  "paused": ["pause"], "planned": ["planifiee"], "discontinued": ["discontinue"],
  "terminee": ["terminee"], "termine": ["terminee"],

  // Channels & Marketing
  "web": ["web", "shopify", "display"],
  "google ads": ["google_ads"], "google": ["google_ads"], "sea": ["google_ads"],
  "meta ads": ["meta_ads"], "meta": ["meta_ads"], "facebook ads": ["meta_ads"],
  "facebook": ["meta_ads"], "fb ads": ["meta_ads"], "fb": ["meta_ads"],
  "instagram": ["instagram", "meta_ads"], "instagram ads": ["instagram", "meta_ads"],
  "tiktok": ["tiktok"], "tiktok ads": ["tiktok"],
  "email": ["email"], "courriel": ["email"], "courriels": ["email"],
  "infolettre": ["email"], "infolettres": ["email"], "newsletter": ["email"], "newsletters": ["email"],
  "mailing": ["email"], "mail": ["email"], "e-mail": ["email"],
  "affichage / web": ["display", "web"], "affichage": ["display", "web"],
  "web / affichage": ["display", "web"], "display": ["display", "web"],
  "banniere": ["display", "web"], "banner": ["display", "web"],
  "partenariat": ["partenariat", "affiliation"], "partenariats": ["partenariat"],
  "sponsor": ["partenariat"], "sponsoring": ["partenariat"], "sepaq": ["partenariat"],
  "affiliation": ["affiliation"], "affilie": ["affiliation"],
  "influenceur": ["influenceurs", "instagram", "tiktok"], "influenceurs": ["influenceurs"],
  "linkedin": ["linkedin"], "linkedin ads": ["linkedin"],
  "youtube": ["youtube"], "youtube ads": ["youtube"],
  "sms": ["sms"], "print": ["print"], "courrier": ["print"],
  "autre": ["autre"], "other": ["autre"], "divers": ["autre"],

  // Employee & Customer types & Departments
  "full time": ["temps_plein"], "part time": ["temps_partiel"], "contractor": ["contractuel"], "intern": ["stagiaire"],
  "departed": ["depart"], "on leave": ["conge"], "probation": ["essai"],
  "individual": ["particulier"], "business": ["entreprise", "b2b"],
  // "Occasionnel" (client qui achete peu souvent) est un segment courant dans
  // les exports CRM francophones, mais absent de l'enum Customer.segment
  // (nouveau/regulier/vip/inactif/b2b/haute_valeur/a_risque). Faute d'un
  // segment "achat ponctuel" dedie, on le rattache au segment generique
  // plutot que de perdre la ligne : mieux vaut un segment approximatif
  // qu'un client entier mis en quarantaine pour un mot absent du dictionnaire.
  "occasionnel": ["regulier"], "occasionnels": ["regulier"], "ponctuel": ["regulier"], "irregulier": ["regulier"],
  "service client": ["service_client"], "service clientele": ["service_client"], "service a la clientele": ["service_client"], "customer service": ["service_client"], "support": ["service_client"], "operations": ["logistique", "atelier"],

  // Sentiment & Impact
  "positive": ["positif"], "neutral": ["neutre"], "negative": ["negatif"], "very negative": ["tres_negatif"],

  // Competitor
  "leader": ["leader"], "challenger": ["challenger"], "follower": ["suiveur"], "niche": ["niche"],

  // Inventory
  "optimal": ["optimal"], "out of stock": ["rupture"], "overstock": ["surstock"], "low stock": ["faible", "proche_rupture"],
  // French capitalized/common variants → canonical enum values
  "alerte": ["proche_rupture", "faible"], "normal": ["optimal"],
  "bas": ["inferieur"], "moyen": ["egal"], "eleve": ["superieur"],
  "depart": ["depart"], "conge": ["conge"], "essai": ["essai"], "perdu": ["perdu"],
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
  // Si la valeur spécifique est inconnue mais que l'entité prévoit "autre",
  // replier sur "autre" au lieu de rejeter la ligne de données.
  if (enumOptions.includes("autre")) {
    return "autre";
  }
  return value;
}

/**
 * Détecte si une ligne brute (tableau) ou un enregistrement (objet) représente une ligne
 * de total, sous-total, synthèse ou moyenne Excel qui ne doit pas être traitée
 * comme un enregistrement individuel de données (évite les fausses alertes de quarantaine
 * et les doublons de chiffres d'affaires).
 */
export function isSummaryOrTotalRow(rowOrArray: any): boolean {
  if (!rowOrArray) return false;

  const SUMMARY_KEYWORDS = [
    "total", "totaux", "sous-total", "sous total", "subtotal", "sub-total",
    "total general", "total global", "grand total", "somme", "sum", "moyenne",
    "average", "recapitulatif", "synthese", "totales", "totale"
  ];

  // Cas 1 : Matrice brute (tableau de cellules)
  if (Array.isArray(rowOrArray)) {
    const nonEmpties = rowOrArray.filter((c) => String(c ?? "").trim() !== "");
    if (nonEmpties.length === 0) return false;

    const firstVal = stripAccents(String(nonEmpties[0]).toLowerCase().trim());
    if (SUMMARY_KEYWORDS.some((kw) => firstVal === kw || firstVal.startsWith(kw + " ") || firstVal.endsWith(" " + kw))) {
      // Une ligne de total contient très souvent des cellules vides là où se trouvent les libellés détaillés
      const emptyCount = rowOrArray.length - nonEmpties.length;
      if (emptyCount >= Math.max(1, Math.floor(rowOrArray.length * 0.2))) {
        return true;
      }
    }
    return false;
  }

  // Cas 2 : Objet mappé
  if (typeof rowOrArray === "object") {
    // 1. Vérifier les champs identifiants majeurs (order_id, id, transaction_id, etc.)
    const idFields = ["order_id", "id", "transaction_id", "invoice_id", "campaign_id", "customer_id", "product_id", "employee_id", "supplier_id"];
    for (const f of idFields) {
      if (rowOrArray[f]) {
        const str = stripAccents(String(rowOrArray[f]).toLowerCase().trim());
        if (SUMMARY_KEYWORDS.some((kw) => str === kw || str.startsWith(kw + " ") || str.endsWith(" " + kw))) {
          return true;
        }
      }
    }

    // 2. Vérifier si un champ textuel vaut "TOTAL" / "Sous-total" alors que date ou nom est vide
    const hasTotalWord = Object.values(rowOrArray).some((v) => {
      if (typeof v !== "string") return false;
      const s = stripAccents(v.toLowerCase().trim());
      return SUMMARY_KEYWORDS.includes(s);
    });

    if (hasTotalWord) {
      if (!rowOrArray.date || String(rowOrArray.date).trim() === "" ||
          !rowOrArray.customer_id || String(rowOrArray.customer_id).trim() === "") {
        return true;
      }
    }
  }

  return false;
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
  // A value that was ALL letters ("abc", "texte-invalide", a stray currency
  // code with no amount attached) has nothing left after stripping -- no
  // digit anywhere. Number("") is 0 in JS, so without this check unreadable
  // text silently became a valid $0 instead of being rejected: it passed
  // validation, was counted in volumes, and stayed invisible in every sum.
  if (!/\d/.test(s)) return null;
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
  // "15 janv. 2025" / "15 janvier 2025" / "1er janvier 2025" (ordinal du 1er du mois)
  m = stripAccents(s.toLowerCase()).match(/^(\d{1,2})(?:er|e|eme)?\s+([a-z]+)\.?\s+(\d{4})$/);
  if (m) {
    const mm = MONTHS_FR[m[2].slice(0, 4)] || MONTHS_FR[m[2].slice(0, 3)];
    if (mm) return dateReelle(m[3], mm, m[1]) ? `${m[3]}-${mm}-${m[1].padStart(2, "0")}` : null;
  }
  // YYYY-MM (period) → first day of month
  m = s.match(/^(\d{4})[\/\-](\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-01`;
  // "Janvier 2026" / "janv. 2025" (rapports mensuels sans jour) → 1er du mois.
  // Ces exports (marketing, trésorerie) donnent une période, pas une date
  // précise ; sans ce motif la valeur restait lisible dans l'aperçu mais ne
  // parsait jamais, et la ligne finissait en quarantaine pour "date manquante"
  // alors que la colonne était bien reliée.
  m = stripAccents(s.toLowerCase()).match(/^([a-z]+)\.?\s+(\d{4})$/);
  if (m) {
    const mm = MONTHS_FR[m[1].slice(0, 4)] || MONTHS_FR[m[1].slice(0, 3)];
    if (mm) return `${m[2]}-${mm}-01`;
  }
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
      // Same principle as the date branch just above, generalized: this used
      // to return the unparsed value as-is on failure, so a malformed number
      // (bad separator, stray text, an unrecognized unit) was stored VERBATIM
      // in a numeric field - passing `missingRequired` (the key isn't blank,
      // just unreadable) and then reading as NaN → 0 everywhere downstream
      // does `Number(x) || 0`. Only Transaction.amount got this fix before;
      // every other entity's numeric fields (Expense.amount, Order.total,
      // Payroll.total_cost, Cashflow balances...) kept the old behavior.
      const n = parseNumber(value);
      return n === null ? null : n;
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

// Entités où un identifiant/nom individuel est exigé par le schéma mais où
// de nombreux exports réels n'en fournissent aucun (rollup mensuel par
// canal, par exemple) : plutôt que rejeter 100% des lignes pour une colonne
// qui n'a jamais existé dans le fichier, on dérive un identifiant de repli à
// partir de ce que le mapping a effectivement reconnu.
const FALLBACK_IDENTITY: Record<string, { id: string; name?: string; from: string[] }> = {
  Campaign: { id: "campaign_id", name: "campaign_name", from: ["channel", "date"] },
};

export function deriveFallbackIdentity(entityName: string, row: Record<string, any>, index: number): void {
  const rule = FALLBACK_IDENTITY[entityName];
  if (!rule) return;
  if (row[rule.id] && (!rule.name || row[rule.name])) return;
  const parts = rule.from.map((f) => row[f]).filter((v) => v !== undefined && v !== null && v !== "");
  const label = parts.length > 0 ? parts.join(" - ") : `${entityName} ${index + 1}`;
  if (!row[rule.id]) row[rule.id] = `AUTO-${label}`.slice(0, 60);
  if (rule.name && !row[rule.name]) row[rule.name] = label;
}

// Company.company_dictionary est stocke tel que l'utilisateur l'a tape
// ("ID Transaction" -> "order_id") : l'indexer une seule fois par import,
// sous la meme forme canonique que cleCanonique() utilise pour chercher un
// en-tete de colonne, plutot que de re-canonicaliser a chaque ligne.
export function buildCompanyDictionaryIndex(raw: Record<string, string> | null | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [term, concept] of Object.entries(raw)) {
    if (!term || !concept) continue;
    out[cleCanonique(term)] = String(concept).trim();
  }
  return out;
}

// Detection d'entite par en-tetes, deplacee depuis sheetDetect.ts (18 sept
// 2026) : fonctions pures, aucune dependance a XLSX, contrairement au reste
// de ce fichier — les y laisser empechait de les tester sous le test runner
// Node du repo (npm:xlsx@0.18.5 n'est resolvable que sous Deno). sheetDetect.ts
// les re-exporte pour ne rien casser chez les appelants existants.
const HEADER_SIGNATURES: { entity: string; must: string[] }[] = [
  { entity: "CampaignDaily", must: ["campaign_id", "date"] },
  { entity: "Campaign", must: ["campaign_id"] },
  { entity: "Inventory", must: ["product_id", "closing_stock"] },
  { entity: "Inventory", must: ["product_id", "opening_stock"] },
  { entity: "Purchase", must: ["supplier_id", "product_id"] },
  { entity: "Order", must: ["order_id"] },
  { entity: "Customer", must: ["customer_id"] },
  { entity: "Product", must: ["product_id"] },
  { entity: "Supplier", must: ["supplier_id"] },
  { entity: "Payroll", must: ["employee_id", "period"] },
  { entity: "Employee", must: ["employee_id"] },
  { entity: "Cashflow", must: ["closing_cash"] },
  { entity: "Cashflow", must: ["cash_in", "cash_out"] },
  { entity: "Expense", must: ["expense_id"] },
  { entity: "Interaction", must: ["interaction_id"] },
  { entity: "Competitor", must: ["competitor_id"] },
  { entity: "Goal", must: ["goal_id"] },
  { entity: "Event", must: ["event_id"] },
  { entity: "Transaction", must: ["date", "amount", "type"] },
];

const HEADER_ALIASES: Record<string, string> = {
  "id_commande": "order_id", "commande_id": "order_id", "no_commande": "order_id",
  "id_client": "customer_id", "client_id": "customer_id",
  "id_produit": "product_id", "produit_id": "product_id",
  "id_fournisseur": "supplier_id", "fournisseur_id": "supplier_id",
  "id_employe": "employee_id", "employe_id": "employee_id",
  "id_campagne": "campaign_id", "campagne_id": "campaign_id",
  "id_depense": "expense_id", "depense_id": "expense_id",
  "montant": "amount", "date_operation": "date", "periode": "period",
  "stock_cloture": "closing_stock", "stock_final": "closing_stock",
  "stock_ouverture": "opening_stock", "stock_initial": "opening_stock",
  "solde_cloture": "closing_cash", "solde_final": "closing_cash",
  "encaissements": "cash_in", "decaissements": "cash_out",
  "entrees": "cash_in", "sorties": "cash_out",
};

function normalizeHeader(h: string, companyDictionary?: Record<string, string>): string {
  const raw = String(h || "").toLowerCase().trim();
  const base = stripAccents(raw).replace(/[\s\-.]+/g, "_");
  // The importer's own alias table is consulted too, so a column the import can
  // actually read ("catégorie", "montant_total") is also visible to detection.
  // Le dictionnaire d'entreprise (mot propre a une PME, ex. "Ref. Vte") est
  // consulte en dernier plutot qu'en premier ici : contrairement au mapping de
  // colonnes (normalizeKeys), une detection de FEUILLE se trompe rarement sur
  // un terme deja standard — mieux vaut ne pas laisser une entree de
  // dictionnaire mal choisie ecraser une reconnaissance generique qui marche.
  return HEADER_ALIASES[base] || FIELD_ALIASES[raw] || FIELD_ALIASES[base] || (companyDictionary && companyDictionary[base]) || base;
}

/**
 * Last-resort detection: which entity do these columns describe best?
 *
 * The signatures above demand an exact key column ("order_id", "customer_id"…).
 * A perfectly importable export that names its columns differently, or has no id
 * column at all, matched nothing — the sheet was reported "Type non reconnu" and
 * zero rows were imported even though every other column lined up. This scores
 * each entity by how many of the file's columns it explains, and only accepts a
 * candidate whose required fields are all present, so the rows can actually be
 * stored rather than quarantined one by one.
 */
export function detectEntityByFieldOverlap(headers: string[], companyDictionary?: Record<string, string>): string | null {
  const set = new Set((headers || []).map((h) => normalizeHeader(h, companyDictionary)).filter(Boolean));
  if (set.size === 0) return null;
  let best: string | null = null;
  let bestScore = 0;
  for (const [entity, schema] of Object.entries(ENTITY_SCHEMAS)) {
    if (!(schema.required || []).every((r) => set.has(r))) continue;
    const fields = Object.keys(schema.properties).filter((f) => f !== "import_id");
    const matched = fields.filter((f) => set.has(f)).length;
    const coverage = matched / set.size;
    if (matched < 3 || coverage < 0.5) continue;
    const score = matched + coverage;
    if (score > bestScore) { bestScore = score; best = entity; }
  }
  return best;
}

/**
 * Les colonnes permettent-elles de stocker cette entite ?
 *
 * Le nom du fichier l'emportait sur les colonnes : un releve de transactions
 * appele "ventes.csv" partait en Order, ou order_id est obligatoire, et chaque
 * ligne etait mise en quarantaine. Le nom reste prioritaire, mais seulement
 * quand le fichier peut effectivement alimenter l'entite qu'il annonce.
 */
export function entiteCompatible(entity: string, headers: string[], companyDictionary?: Record<string, string>): boolean {
  const schema = (ENTITY_SCHEMAS as Record<string, any>)[entity];
  if (!schema) return false;
  const set = new Set((headers || []).map((h) => normalizeHeader(h, companyDictionary)).filter(Boolean));
  return (schema.required || []).every((r: string) => set.has(r));
}

export function detectEntityByHeaders(headers: string[], companyDictionary?: Record<string, string>): string | null {
  const set = new Set((headers || []).map((h) => normalizeHeader(h, companyDictionary)));
  for (const sig of HEADER_SIGNATURES) {
    if (sig.must.every((m) => set.has(m))) return sig.entity;
  }
  return null;
}

// construirePrompt/SCHEMA_REPONSE, deplaces depuis importPlan.ts (18 sept
// 2026) : fonctions pures, sans dependance a XLSX — importPlan.ts les
// ré-exporte, aucun appelant existant ne change.
//
// Phase 5 du chantier "reconnaissance universelle" : la consigne interdisait
// jusqu'ici tout rapprochement au-dela du nom exact ("mets champ: null
// plutot que de forcer un rapprochement"), ce qui empechait l'IA de faire le
// lien evident entre une colonne "transaction_id" et le champ order_id d'une
// entite qui n'a pas de champ transaction_id — exactement le genre de cas
// que le rattrapage deterministe doit ensuite deviner sans le contexte de
// l'IA. La consigne autorise maintenant explicitement ce raisonnement pour
// les identifiants, sans autoriser l'invention de champs pour le reste.
export function construirePrompt(
  echantillon: string,
  nomFichier: string,
  entites: string[],
  // Vocabulaire deja connu de CETTE entreprise (Company.company_dictionary) :
  // le donner a l'IA en contexte evite qu'elle redecouvre a l'aveugle un mot
  // deja corrige une fois, et lui montre le format de reponse attendu.
  companyDictionary?: Record<string, string>,
): string {
  const dictEntries = companyDictionary ? Object.entries(companyDictionary) : [];
  const dictBlock = dictEntries.length > 0
    ? [
      "",
      "Cette entreprise a deja corrige ces correspondances par le passe — reutilise-les telles quelles si tu revois ces intitules (ou un intitule tres proche) :",
      ...dictEntries.map(([terme, concept]) => `- "${terme}" -> ${concept}`),
    ]
    : [];
  return [
    "Tu analyses un fichier exporte par une PME (comptabilite, caisse, tableur maison).",
    "Ta tache est de DECRIRE comment lire ce fichier. Tu ne recopies aucune valeur.",
    "",
    `Nom du fichier : ${nomFichier}`,
    `Types de donnees possibles : ${entites.join(", ")}`,
    ...dictBlock,
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
    "Si une colonne ne correspond vraiment a rien, mets champ: null plutot que de forcer un rapprochement.",
    "Exception delibérée : si le type de donnees choisi a un identifiant obligatoire",
    "(ex. order_id, campaign_id) et qu'aucune colonne ne porte ce nom exact, mais qu'une",
    "colonne sert clairement de reference/numero unique a chaque ligne (ex. \"transaction_id\",",
    "\"Ref. Vente\", \"No Bon\"), rapproche-la de cet identifiant plutot que de repondre null —",
    "c'est le meme champ, seulement nomme differemment par cette entreprise.",
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

export function normalizeRow(
  entityName: string,
  row: Record<string, any>,
  importId: string = "default",
  properties: Record<string, any> | null = null,
  sourceType?: string,
  enumIssues?: EnumIssue[],
  unmapped?: Set<string>,
  companyDictionary?: Record<string, string>,
): Record<string, any> {
  const schemaProps = properties || ENTITY_SCHEMAS[entityName]?.properties || null;

  if (isSummaryOrTotalRow(row)) return {};
  const r = normalizeKeys(row, schemaProps, unmapped, companyDictionary);
  if (isSummaryOrTotalRow(r)) return {};

  // Preserve explicit Transaction headers before aliases or legacy plans can
  // reinterpret them. This is intentionally based on the raw row: a previous
  // version mapped `catégorie` to `type`, so looking only at `r` was already
  // too late to recover the distinction.
  if (entityName === "Transaction") {
    const rawType = Object.entries(row || {}).find(([key]) => cleCanonique(key) === "type")?.[1];
    const rawCategory = Object.entries(row || {}).find(([key]) => ["category", "categorie"].includes(cleCanonique(key)))?.[1];
    if (rawType !== undefined) r.type = rawType;
    if (rawCategory !== undefined) r.category = rawCategory;
  }

  // A single "name"/"nom"/"full_name" column on an entity that stores first + last name would
  // otherwise be dropped entirely, leaving nameless records.
  if (schemaProps?.first_name && (r.name || r.full_name) && !r.first_name) {
    const rawN = String(r.full_name || r.name).trim();
    if (rawN.includes(",")) {
      const [lName, fName] = rawN.split(",").map((s) => s.trim());
      r.first_name = fName || lName;
      r.last_name = lName;
    } else {
      const parts = rawN.split(/\s+/);
      r.first_name = parts[0];
      if (parts.length > 1) r.last_name = parts.slice(1).join(" ");
    }
  }

  if (entityName === "Transaction") {
    // Meme principe que la date ci-dessous : un montant absent ou illisible ne
    // doit pas devenir 0 en silence. Le `|| 0` faisait passer la validation a
    // une ligne sans montant, et un fichier dont la colonne montant est mal
    // nommee s'importait "avec succes" avec toutes ses transactions a 0 $ —
    // comptees dans les volumes, invisibles dans les sommes.
    const amount = parseNumber(r.amount);
    let type = (r.type || "").toLowerCase().trim();
    const categoryType = (r.category || "").toLowerCase().trim();
    const recognizedTypes = ["revenu", "revenue", "credit", "entree", "income", "depense", "expense", "debit", "sortie", "decaissement", "remboursement", "achat", "charge", "refund", "transfer", "transfert"];
    const typeNormRaw = stripAccents(type);
    const categoryNormRaw = stripAccents(categoryType);

    if (!recognizedTypes.includes(typeNormRaw)) {
      // Le champ "type" contient une catégorie métier (ex: "utilitaires", "salaires").
      // On la sauvegarde dans category si category est vide, et on déduit le type
      // financier réel à partir du signe du montant ou du contenu de category.
      if (!categoryType) {
        r.category = r.type; // ex: "utilitaires"
      }
      if (recognizedTypes.includes(categoryNormRaw)) {
        type = categoryType; // category avait un type reconnu
      } else {
        // Déduction par signe du montant
        type = (amount ?? 0) >= 0 ? "income" : "expense";
      }
    }
    if (!type) type = (amount ?? 0) >= 0 ? "income" : "expense";
    const typeNorm = stripAccents(type);
    if (["revenu", "revenue", "credit", "entree", "income"].includes(typeNorm)) type = "income";
    if (["depense", "expense", "debit", "sortie"].includes(typeNorm)) type = "expense";
    if (["achat", "charge", "charges", "frais", "remboursement", "refund", "transfer", "transfert"].includes(typeNorm)) type = "expense";
    // An unparseable date must NOT silently become today. Those rows used to
    // land in the in-progress month, which every calculation excludes — so they
    // vanished from all analyses while still inflating the all-time totals, and
    // the "lignes sans date" quality check could not see them because they had
    // a date. Leaving the field empty sends the row to quarantine, where it is
    // counted and reported to the user.
    const parsedDate = parseDate(r.date);
    const normalizedType = ["income", "expense"].includes(type) ? type : undefined;
    return {
      date: parsedDate,
      description: r.description || "",
      // undefined (et non 0) : missingRequired met alors la ligne en quarantaine.
      amount: amount === null ? undefined : Math.abs(amount),
      type: normalizedType,
      category: r.category || "",
      source: sourceType || "csv",
      // Une colonne Devise/Currency explicite doit etre respectee : sans ce
      // fallback, un fichier en USD ou EUR etait toujours etiquete CAD,
      // faussant silencieusement toute conversion ou tout total multi-devise.
      currency: r.currency || "CAD",
      client: r.client || r.customer_id || "",
      product: r.product || r.product_id || "",
      import_id: importId,
      original_data: JSON.stringify(row)
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

  // Les inventaires instantanés n'ont souvent pas de colonne date explicite.
  // Assurer une date du jour par défaut évite le rejet en base de données.
  if (entityName === "Inventory" && !r.date) {
    r.date = new Date().toISOString().slice(0, 10);
  }

  // Pour les employés avec salaire annuel sans taux horaire, dériver le taux horaire.
  if (entityName === "Employee") {
    if (r.annual_salary && !r.hourly_rate) {
      const sal = parseNumber(r.annual_salary);
      const hours = parseNumber(r.weekly_hours) || 37.5;
      if (sal) r.hourly_rate = Math.round((sal / (52 * hours)) * 100) / 100;
    }
  }

  // --- ORDER RESCUE HOOKS ---
  if (entityName === "Order") {
    if (!r.order_id) {
      r.order_id = r.transaction_id || r.id_transaction || r.num_cde || r.no_cde || r.num_commande || r.numero_commande || r.order_number || r.cde_no || r.cde_id || r.ref_commande || r.code_commande || r.id;
      if (!r.order_id && (r.location_id || r.succursale || r.store || r.location)) {
        const loc = String(r.location_id || r.succursale || r.store || r.location).trim();
        r.order_id = `ORD-${stripAccents(loc).toUpperCase().replace(/[^A-Z0-9]/g, "_")}`;
      }
    }
    if (!r.date) {
      r.date = new Date().toISOString().slice(0, 10);
    } else if (typeof r.date === "number") {
      const d = new Date(Math.round((r.date - 25569) * 86400 * 1000));
      if (!isNaN(d.getTime())) r.date = d.toISOString().slice(0, 10);
    } else if (typeof r.date === "string" && r.date.includes(" ")) {
      r.date = r.date.split(" ")[0];
    }

    // Déduction succursale / canal
    const channelRaw = String(r.channel || "");
    if (!r.location_id) {
      if (/l[ée]vis/i.test(channelRaw)) {
        r.location_id = "Lévis";
        r.channel = "magasin";
      } else if (/sainte[- ]foy|ste[- ]foy/i.test(channelRaw)) {
        r.location_id = "Sainte-Foy";
        r.channel = "magasin";
      } else if (/chicoutimi/i.test(channelRaw)) {
        r.location_id = "Chicoutimi";
        r.channel = "magasin";
      } else if (/shopify|web|en[- ]ligne/i.test(channelRaw)) {
        r.location_id = "Web / E-Commerce";
        r.channel = "web";
      } else if (/b2b|grossiste|commercial/i.test(channelRaw)) {
        r.location_id = "Siège social";
        r.channel = "b2b";
      }
    }
    if (!r.succursale && r.location_id) r.succursale = r.location_id;

    // Prix, remises et sous-total HT
    const qty = parseNumber(r.quantity) || 1;
    const discount = parseNumber(r.discount) || 0;
    const grossPrice = parseNumber(r.price);
    let netPrice = parseNumber(r.unit_price);

    if ((netPrice == null || netPrice === 0) && grossPrice != null && grossPrice > 0) {
      netPrice = Math.round(grossPrice * (1 - discount) * 100) / 100;
      r.unit_price = netPrice;
    }
    if ((grossPrice == null || grossPrice === 0) && netPrice != null && netPrice > 0) {
      r.price = discount > 0 ? Math.round((netPrice / (1 - discount)) * 100) / 100 : netPrice;
    }
    const unitP = netPrice || grossPrice || 0;

    if (r.subtotal == null || r.subtotal === "") {
      r.subtotal = Math.round(qty * unitP * 100) / 100;
    }
    const subtot = parseNumber(r.subtotal) || 0;

    // Calcul automatique fiscalité pancanadienne (TPS + TVQ / TVH / PST)
    const isExempt = /wendake|s[ée]paq/i.test(String(r.customer_name || "")) ||
      r.customer_id === "CL-00623" || r.customer_id === "CL-00945";

    if (r.tax_federal == null || r.tax_federal === "") {
      r.tax_federal = isExempt ? 0 : Math.round(subtot * 0.05 * 100) / 100;
    }

    if (r.tax_provincial == null || r.tax_provincial === "") {
      if (isExempt) {
        r.tax_provincial = 0;
      } else {
        const prov = String(r.province || "QC").toUpperCase().trim();
        if (prov === "QC") {
          r.tax_provincial = Math.round(subtot * 0.09975 * 100) / 100;
        } else if (prov === "ON") {
          r.tax_provincial = Math.round(subtot * 0.08 * 100) / 100;
        } else if (["NB", "NS", "NL", "PE"].includes(prov)) {
          r.tax_provincial = Math.round(subtot * 0.10 * 100) / 100;
        } else if (["BC", "MB"].includes(prov)) {
          r.tax_provincial = Math.round(subtot * 0.07 * 100) / 100;
        } else if (prov === "SK") {
          r.tax_provincial = Math.round(subtot * 0.06 * 100) / 100;
        } else {
          r.tax_provincial = 0;
        }
      }
    }

    if (r.tax == null || r.tax === "") {
      const fedTax = parseNumber(r.tax_federal) || 0;
      const provTax = parseNumber(r.tax_provincial) || 0;
      r.tax = Math.round((fedTax + provTax) * 100) / 100;
    }

    if (r.total == null || r.total === "") {
      r.total = Math.round((subtot + (parseNumber(r.tax) || 0)) * 100) / 100;
    }

    if (r.total_revenue == null || r.total_revenue === "") {
      r.total_revenue = subtot;
    }
    const cost = parseNumber(r.unit_cost) || 0;
    if (r.total_cost == null || r.total_cost === "") {
      if (cost > 0) r.total_cost = Math.round(qty * cost * 100) / 100;
    }
    if (r.gross_profit == null || r.gross_profit === "") {
      const totRev = parseNumber(r.total_revenue) || 0;
      const totCost = parseNumber(r.total_cost) || 0;
      r.gross_profit = Math.round((totRev - totCost) * 100) / 100;
    }
    if (r.gross_margin == null || r.gross_margin === "") {
      const totRev = parseNumber(r.total_revenue) || 0;
      const profit = parseNumber(r.gross_profit) || 0;
      if (totRev > 0) r.gross_margin = Math.round((profit / totRev) * 10000) / 100;
    }
  }

  // --- EXECUTIVE SUMMARY RESCUE HOOKS ---
  if (entityName === "ExecutiveSummary") {
    if (!r.location_id) {
      r.location_id = r.succursale || r.store || r.location || r.ville || r.site || "SIEGE";
    }
    if (!r.summary_id) {
      r.summary_id = `SUM-${stripAccents(String(r.location_id)).toUpperCase().replace(/[^A-Z0-9]/g, "_")}`;
    }
    const rev = parseNumber(r.total_revenue);
    const cost = parseNumber(r.total_cost);
    if (r.gross_profit == null || r.gross_profit === "") {
      if (rev != null && cost != null) r.gross_profit = Math.round((rev - cost) * 100) / 100;
    }
    if (r.gross_margin == null || r.gross_margin === "") {
      const profit = parseNumber(r.gross_profit);
      if (rev && profit != null) r.gross_margin = Math.round((profit / rev) * 10000) / 100;
    }
  }

  // --- EMPLOYEE RESCUE HOOKS ---
  if (entityName === "Employee") {
    const sal = parseNumber(r.annual_salary) || 0;
    if (sal > 0) {
      if (r.total_social_charges == null || r.total_social_charges === "") {
        const rrq = parseNumber(r.cpp_employer) || 0;
        const rqap = parseNumber(r.qpip_employer) || 0;
        const cnesst = parseNumber(r.cnesst) || 0;
        const fss = parseNumber(r.fss_qc) || 0;
        const assurance = parseNumber(r.group_insurance) || 0;
        const reer = parseNumber(r.rrsp_employer) || 0;
        const totalRate = rrq + rqap + cnesst + fss + assurance + reer;
        if (totalRate > 0) {
          r.total_social_charges = Math.round(sal * totalRate * 100) / 100;
        }
      }
      if (r.total_employer_cost == null || r.total_employer_cost === "") {
        const charges = parseNumber(r.total_social_charges) || 0;
        r.total_employer_cost = Math.round((sal + charges) * 100) / 100;
      }
    }
    if (r.seniority_years == null && r.hire_date) {
      const hireY = new Date(r.hire_date).getFullYear();
      if (!isNaN(hireY)) {
        r.seniority_years = Math.max(0, 2026 - hireY);
      }
    }
    const deptRaw = String(r.department || "").trim();
    const allowedDepts = ["direction", "ventes", "marketing", "logistique", "administration", "service_client", "atelier"];
    const deptNorm = stripAccents(deptRaw.toLowerCase());
    if (deptRaw && !allowedDepts.includes(deptNorm)) {
      if (!r.location) r.location = deptRaw;
      const roleStr = stripAccents(String(r.role || "").toLowerCase());
      if (roleStr.includes("vente") || roleStr.includes("rep") || roleStr.includes("vendeur") || roleStr.includes("gerant") || roleStr.includes("magasin")) {
        r.department = "ventes";
      } else if (roleStr.includes("commerce") || roleStr.includes("web") || roleStr.includes("marketing")) {
        r.department = "marketing";
      } else if (roleStr.includes("logistique") || roleStr.includes("entrepot") || roleStr.includes("stock") || roleStr.includes("livr")) {
        r.department = "logistique";
      } else if (roleStr.includes("direct") || roleStr.includes("dg") || roleStr.includes("admin")) {
        r.department = "direction";
      } else if (roleStr.includes("client") || roleStr.includes("support")) {
        r.department = "service_client";
      } else if (roleStr.includes("atelier") || roleStr.includes("technicien")) {
        r.department = "atelier";
      } else {
        r.department = "autre";
      }
    }
  }

  // --- PRODUCT RESCUE HOOKS ---
  if (entityName === "Product") {
    if (!r.product_id) {
      r.product_id = r.sku || r.ugs || r.code_produit || r.id;
    }
    if (r.inventory_level == null && r.closing_stock != null) {
      r.inventory_level = r.closing_stock;
    }
    if (r.selling_price == null && r.price != null) {
      r.selling_price = r.price;
    }
    if (r.purchase_cost == null && r.unit_cost != null) {
      r.purchase_cost = r.unit_cost;
    }
    if (r.gross_margin == null || r.gross_margin === "") {
      const price = parseNumber(r.selling_price);
      const cost = parseNumber(r.purchase_cost);
      if (price && cost != null) {
        r.gross_margin = Math.round(((price - cost) / price) * 10000) / 100;
      }
    }
  }

  // --- INVENTORY RESCUE HOOKS ---
  if (entityName === "Inventory") {
    if (r.closing_stock == null && r.inventory_level != null) {
      r.closing_stock = r.inventory_level;
    }
    const closing = parseNumber(r.closing_stock) || 0;
    const cost = parseNumber(r.unit_cost) || parseNumber(r.purchase_cost) || 0;
    if (r.inventory_value == null || r.inventory_value === "") {
      if (closing > 0 && cost > 0) {
        r.inventory_value = Math.round(closing * cost * 100) / 100;
      }
    }
  }

  // --- ASSET RESCUE HOOKS ---
  if (entityName === "Asset") {
    if (!r.asset_id && r.description) {
      r.asset_id = `AST-${stripAccents(String(r.description)).toUpperCase().replace(/[^A-Z0-9]/g, "_").slice(0, 20)}`;
    }
    if (r.net_book_value == null && r.initial_cost != null && r.accumulated_depreciation != null) {
      const initial = parseNumber(r.initial_cost) || 0;
      const accum = parseNumber(r.accumulated_depreciation) || 0;
      r.net_book_value = Math.max(0, initial - accum);
    }
    if (!r.location_id) {
      const text = `${r.description || ""} ${r.historical_comment || ""}`;
      if (/l[ée]vis/i.test(text)) r.location_id = "Lévis";
      else if (/sainte[- ]foy|ste[- ]foy/i.test(text)) r.location_id = "Sainte-Foy";
      else if (/b[ée]cancour/i.test(text)) r.location_id = "Bécancour";
      else r.location_id = "Siège social";
    }
  }

  // For other entities: normalize enums, coerce types, keep only schema fields, strip empty values
  const withEnums = normalizeEnums(r, schemaProps || {});
  const cleaned: Record<string, any> = {};
  for (const [k, v] of Object.entries(withEnums)) {
    if (BUILTIN_FIELDS.includes(k)) continue;
    if (v === null || v === undefined || v === "") continue;
    const prop = schemaProps?.[k];
    if (prop) {
      // Field is in schema: validate enum, coerce type
      if (prop.enum) {
        const coerced = coerceEnum(v, prop.enum);
        if (!prop.enum.includes(coerced)) {
          if (prop.enum.includes("autre")) {
            cleaned[k] = "autre";
            continue;
          }
          // Skip the invalid value rather than failing the whole row, but record
          // it so the import can explain what was refused and why.
          if (enumIssues) enumIssues.push({ field: k, value: String(v), allowed: prop.enum });
          continue;
        }
        cleaned[k] = coerceType(coerced, prop);
      } else {
        cleaned[k] = coerceType(v, prop);
      }
    } else if (!schemaProps) {
      // No schema available: keep value as-is
      cleaned[k] = v;
    }
    // else: field not in schema, skip
  }
  if (importId) cleaned["import_id"] = importId;
  if (schemaProps && schemaProps.original_data) cleaned["original_data"] = JSON.stringify(row);
  return cleaned;
}