import test from "node:test";
import assert from "node:assert/strict";
import { coerceEnum, normalizeRow, isSummaryOrTotalRow } from "../base44/shared/importUtils.ts";
import { getSchema } from "../base44/shared/entitySchemas.ts";

test("Robustesse Import - Normalisation des Canaux Marketing Réels", () => {
  const campaignSchema = getSchema("Campaign");
  const channelOptions = campaignSchema.properties.channel.enum;

  // 1. "Facebook Ads" -> "meta_ads"
  const row1 = {
    campaign_id: "M-901",
    campaign_name: "Promo Randonnée d'Automne",
    channel: "Facebook Ads",
    budget: 3500,
    clicks: 5200,
    status: "Terminée"
  };
  const norm1 = normalizeRow("Campaign", row1, "test-import", campaignSchema.properties);
  assert.equal(norm1.channel, "meta_ads", "Facebook Ads doit être normalisé en meta_ads");
  assert.equal(norm1.status, "terminee", "Terminée doit être normalisé en terminee");
  assert.equal(norm1.campaign_id, "M-901");

  // 2. "Courriel" -> "email"
  const row2 = {
    campaign_id: "M-902",
    campaign_name: "Infolettre VIP - Équipement",
    channel: "Courriel",
    budget: 500,
    clicks: 1850,
    status: "Terminée"
  };
  const norm2 = normalizeRow("Campaign", row2, "test-import", campaignSchema.properties);
  assert.equal(norm2.channel, "email", "Courriel doit être normalisé en email");

  // 3. "Affichage / Web" -> "display" ou "web"
  const row3 = {
    campaign_id: "M-903",
    campaign_name: "Partenariat SEPAQ",
    channel: "Affichage / Web",
    budget: 7500,
    clicks: 9400,
    status: "Active"
  };
  const norm3 = normalizeRow("Campaign", row3, "test-import", campaignSchema.properties);
  assert.ok(["display", "web"].includes(norm3.channel), "Affichage / Web doit correspondre à display ou web");
  assert.equal(norm3.status, "active");

  // 4. "Partenariat SEPAQ" -> "partenariat"
  const row4 = {
    campaign_id: "M-904",
    campaign_name: "Partenariat",
    channel: "Partenariat SEPAQ",
    budget: 1000,
    status: "Active"
  };
  const norm4 = normalizeRow("Campaign", row4, "test-import", campaignSchema.properties);
  assert.equal(norm4.channel, "partenariat", "Partenariat SEPAQ doit être normalisé en partenariat");

  // 5. Canal totalement inconnu -> repli sur "autre" au lieu de crasher ou rejeter
  const row5 = {
    campaign_id: "M-905",
    campaign_name: "Campagne Mystère",
    channel: "Canal Inédit 2026",
    budget: 200,
    status: "Active"
  };
  const norm5 = normalizeRow("Campaign", row5, "test-import", campaignSchema.properties);
  assert.equal(norm5.channel, "autre", "Un canal non répertorié doit être mappé sur autre");
});

test("Robustesse Import - Détection et Élimination des Lignes de TOTAL Excel", () => {
  const orderSchema = getSchema("Order");

  // Ligne 1204 de l'utilisateur : TOTAL en fin de fichier
  const totalRow = {
    order_id: "TOTAL",
    date: "",
    customer_id: "",
    customer_name: "",
    product_id: "",
    product_name: "",
    category: "",
    quantity: "",
    unit_price: "",
    unit_cost: "",
    total_revenue: 125000
  };

  // 1. isSummaryOrTotalRow sur l'objet
  assert.equal(isSummaryOrTotalRow(totalRow), true, "La ligne TOTAL doit être identifiée comme ligne récapitulative");

  // 2. normalizeRow doit ignorer la ligne silencieusement sans lever d'erreur
  const enumIssues = [];
  const normalized = normalizeRow("Order", totalRow, "test-import", orderSchema.properties, "xlsx", enumIssues);
  assert.deepEqual(normalized, {}, "normalizeRow doit renvoyer un objet vide pour une ligne TOTAL");
  assert.equal(enumIssues.length, 0, "Aucun enumIssue ne doit être généré pour un total");

  // 3. Matrice brute Excel : ligne de total à la fin
  const bruteRow1 = ["TOTAL", "", "", "", "", "", 125000];
  const bruteRow2 = ["Total général", "", "", 500, 25000];
  const bruteRow3 = ["Sous-Total", "", "", 100, 5000];
  assert.equal(isSummaryOrTotalRow(bruteRow1), true);
  assert.equal(isSummaryOrTotalRow(bruteRow2), true);
  assert.equal(isSummaryOrTotalRow(bruteRow3), true);

  // 4. Ligne de commande normale ne doit JAMAIS être prise pour un total
  const normalRow = {
    order_id: "CMD-2026-001",
    date: "2026-03-15",
    customer_id: "CUST-123",
    customer_name: "Jean Dupont",
    product_id: "PROD-456",
    product_name: "Veste Imperméable",
    quantity: 2,
    unit_price: 150
  };
  assert.equal(isSummaryOrTotalRow(normalRow), false, "Une commande normale ne doit pas être prise pour un total");
  const normOrder = normalizeRow("Order", normalRow, "test-import", orderSchema.properties);
  assert.equal(normOrder.order_id, "CMD-2026-001");
  assert.equal(normOrder.quantity, 2);
});
