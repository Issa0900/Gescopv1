import test from "node:test";
import assert from "node:assert/strict";
import { coerceEnum, normalizeRow, isSummaryOrTotalRow } from "../base44/shared/importUtils.ts";
import { getSchema } from "../base44/shared/entitySchemas.ts";
import { missingRequired } from "../base44/shared/bulkInsert.ts";
import { detectEntityByName, entiteCompatible } from "../base44/shared/sheetDetect.ts";

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

test("Robustesse Import - Normalisation Customer Segment (Regular -> regulier)", () => {
  const customerSchema = getSchema("Customer");
  const enumIssues = [];

  const row = {
    customer_id: "100001",
    city: "Tehran",
    segment: "Regular"
  };

  const norm = normalizeRow("Customer", row, "test-import", customerSchema.properties, "csv", enumIssues);
  assert.equal(norm.customer_id, "100001");
  assert.equal(norm.segment, "regulier", "Regular doit être normalisé en regulier");
  assert.equal(enumIssues.length, 0, "Aucun enumIssue pour Regular");
});

test("Robustesse Import - Normalisation Product (Category Electronics & UnitPrice -> selling_price)", () => {
  const productSchema = getSchema("Product");
  const enumIssues = [];

  const row = {
    product_id: "2001",
    name: "Wireless Mouse",
    category: "Electronics",
    unit_price: "18.0"
  };

  const norm = normalizeRow("Product", row, "test-import", productSchema.properties, "csv", enumIssues);
  assert.equal(norm.product_id, "2001");
  assert.equal(norm.product_name, "Wireless Mouse", "name doit être mappé sur product_name");
  assert.equal(norm.category, "Electronics", "Category Electronics doit être acceptée sans restriction");
  assert.equal(norm.selling_price, 18, "unit_price doit alimenter selling_price");
  assert.equal(enumIssues.length, 0, "Aucun enumIssue pour Electronics");
});

test("Robustesse Import - Normalisation Order Payment Status (Completed -> paye)", () => {
  const orderSchema = getSchema("Order");
  const enumIssues = [];

  const row = {
    order_id: "500001",
    date: "2025-08-28",
    payment_status: "Completed"
  };

  const norm = normalizeRow("Order", row, "test-import", orderSchema.properties, "csv", enumIssues);
  assert.equal(norm.order_id, "500001");
  assert.equal(norm.payment_status, "paye", "Completed doit être normalisé en paye");
  assert.equal(enumIssues.length, 0, "Aucun enumIssue pour Completed");
});

test("Robustesse Import - Benchmark Kaggle Superstore Sales", () => {
  const orderSchema = getSchema("Order");
  const enumIssues = [];

  const superstoreRow = {
    "Row ID": "1",
    "Order ID": "CA-2016-152156",
    "Order Date": "11/8/2016",
    "Ship Date": "11/11/2016",
    "Ship Mode": "Second Class",
    "Customer ID": "CG-12520",
    "Customer Name": "Claire Gute",
    "Segment": "Consumer",
    "Country": "United States",
    "City": "Henderson",
    "State": "Kentucky",
    "Postal Code": "42420",
    "Region": "South",
    "Product ID": "FUR-BO-10001798",
    "Category": "Furniture",
    "Sub-Category": "Bookcases",
    "Product Name": "Bush Somerset Collection Bookcase",
    "Sales": "261.96",
    "Quantity": "2",
    "Discount": "0",
    "Profit": "41.9136"
  };

  const norm = normalizeRow("Order", superstoreRow, "superstore-import", orderSchema.properties, "csv", enumIssues);
  assert.equal(norm.order_id, "CA-2016-152156", "Order ID doit être normalisé en order_id");
  assert.equal(norm.customer_id, "CG-12520", "Customer ID doit être normalisé en customer_id");
  assert.equal(norm.product_id, "FUR-BO-10001798", "Product ID doit être normalisé en product_id");
  assert.equal(norm.total, 261.96, "Sales doit être normalisé en total");
  assert.equal(norm.quantity, 2, "Quantity doit être normalisé en quantity");
  assert.equal(norm.date, "2016-11-08", "Order Date doit être normalisé en date ISO");
  assert.equal(enumIssues.length, 0, "Zéro rejet sur Kaggle Superstore");
});

test("Robustesse Import - Benchmark Kaggle Olist Brazilian E-Commerce", () => {
  const orderSchema = getSchema("Order");
  const enumIssues = [];

  const olistRow = {
    "order_id": "e481f51cbdc54678b7cc49136f2d6af7",
    "customer_id": "9ef432eb6251297304e76186b10a928d",
    "order_status": "delivered",
    "order_purchase_timestamp": "2017-10-02 10:56:33",
    "price": "29.99",
    "freight_value": "8.72"
  };

  const norm = normalizeRow("Order", olistRow, "olist-import", orderSchema.properties, "csv", enumIssues);
  assert.equal(norm.order_id, "e481f51cbdc54678b7cc49136f2d6af7");
  assert.equal(norm.customer_id, "9ef432eb6251297304e76186b10a928d");
  assert.equal(norm.date, "2017-10-02");
  assert.equal(norm.unit_price, 29.99, "price doit alimenter unit_price");
  assert.equal(norm.shipping, 8.72, "freight_value doit alimenter shipping");
  assert.equal(enumIssues.length, 0, "Zéro rejet sur Kaggle Olist");
});

test("Robustesse Import - Ligne Réelle clean_final_data.csv", () => {
  const orderSchema = getSchema("Order");
  const enumIssues = [];

  const cleanDataRow = {
    OrderID: "500001",
    CustomerID: "103695",
    OrderDate: "2025-08-28",
    ProductID: "2003",
    Quantity: "4.0",
    Discount: "10.0",
    PaymentMethod: "Gateway",
    Status: "Completed",
    Age: "36.0",
    City: "Qom",
    SignupDate: "2024-03-05",
    CustomerSegment: "Regular",
    ProductName: "USB-C Cable",
    Category: "Accessories",
    UnitPrice: "9.0",
    Sales: "32.0",
    OrderValue: "32.0"
  };

  const norm = normalizeRow("Order", cleanDataRow, "clean-data-import", orderSchema.properties, "csv", enumIssues);
  assert.equal(norm.order_id, "500001");
  assert.equal(norm.customer_id, "103695");
  assert.equal(norm.date, "2025-08-28");
  assert.equal(norm.product_id, "2003");
  assert.equal(norm.quantity, 4);
  assert.equal(norm.total, 32);
  assert.equal(norm.order_value, 32);
  assert.equal(norm.unit_price, 9);
  assert.equal(norm.product_name, "USB-C Cable");
  assert.equal(norm.category, "Accessories");
  assert.equal(norm.city, "Qom");
  assert.equal(norm.age, 36);
  assert.equal(norm.signup_date, "2024-03-05");
  assert.equal(norm.customer_segment, "regulier");
  assert.equal(norm.segment, "regulier");
  assert.equal(enumIssues.length, 0, "Zéro rejet sur clean_final_data.csv");
});

test("Robustesse Import - payments.csv (Reconnaissance Order & Zéro Rejet)", () => {
  const orderSchema = getSchema("Order");
  const headers = ["PaymentID", "OrderID", "PaymentDate", "PaymentStatus"];

  // 1. Détection de l'entité
  assert.equal(detectEntityByName("payments.csv"), "Order", "payments.csv doit être dirigé vers Order");
  assert.equal(entiteCompatible("Order", headers), true, "Order doit être compatible avec les colonnes de paiements");
  assert.equal(entiteCompatible("Transaction", headers), false, "Transaction doit être rejetée car amount est absent");

  // 2. Normalisation de lignes
  const paymentRow1 = {
    PaymentID: "PAY-1001",
    OrderID: "ORD-9901",
    PaymentDate: "2025-08-28 14:32:00",
    PaymentStatus: "Completed"
  };
  const enumIssues = [];
  const norm = normalizeRow("Order", paymentRow1, "payments-import", orderSchema.properties, "csv", enumIssues);
  assert.equal(norm.order_id, "ORD-9901");
  assert.equal(norm.date, "2025-08-28");
  assert.equal(norm.payment_status, "paye", "Completed doit être normalisé en paye");
  assert.equal(enumIssues.length, 0, "Zéro problème d'enum");

  const missing = missingRequired(norm, orderSchema.required);
  assert.equal(missing.length, 0, "Aucun champ requis manquant pour Order");
});

test("Robustesse Import - customers.csv (Segments Regular, New, et Fallback Autre)", () => {
  const customerSchema = getSchema("Customer");

  // 1. Regular -> regulier
  const c1 = {
    CustomerID: "CUST-101",
    FirstName: "Jean",
    LastName: "Tremblay",
    Email: "jean@example.com",
    City: "Montreal",
    Segment: "Regular",
    Age: "42",
    SignupDate: "2024-01-15"
  };
  const issues1 = [];
  const norm1 = normalizeRow("Customer", c1, "cust-import", customerSchema.properties, "csv", issues1);
  assert.equal(norm1.customer_id, "CUST-101");
  assert.equal(norm1.segment, "regulier", "Regular doit être traduit en regulier");
  assert.equal(norm1.age, 42);
  assert.equal(norm1.signup_date, "2024-01-15");
  assert.equal(issues1.length, 0, "Zéro rejet pour Regular");
  assert.equal(missingRequired(norm1, customerSchema.required).length, 0);

  // 2. New -> nouveau
  const c2 = {
    CustomerID: "CUST-102",
    FirstName: "Alice",
    LastName: "Smith",
    Email: "alice@example.com",
    City: "Quebec",
    Segment: "New",
    Age: "28",
    SignupDate: "2024-06-20"
  };
  const issues2 = [];
  const norm2 = normalizeRow("Customer", c2, "cust-import", customerSchema.properties, "csv", issues2);
  assert.equal(norm2.segment, "nouveau", "New doit être traduit en nouveau");
  assert.equal(issues2.length, 0, "Zéro rejet pour New");

  // 3. Segment inconnu -> autre (ne pas rejeter ni mettre en quarantaine)
  const c3 = {
    CustomerID: "CUST-103",
    FirstName: "Marc",
    LastName: "Dubois",
    Email: "marc@example.com",
    City: "Laval",
    Segment: "Tier 3 Explorer",
    Age: "35",
    SignupDate: "2024-08-10"
  };
  const issues3 = [];
  const norm3 = normalizeRow("Customer", c3, "cust-import", customerSchema.properties, "csv", issues3);
  assert.equal(norm3.segment, "autre", "Segment inconnu replié sur autre");
  assert.equal(issues3.length, 0, "Zéro rejet avec repli autre");
});

test("Robustesse Import - products.csv (Catégories ouvertes Electronics & Accessories)", () => {
  const productSchema = getSchema("Product");

  const p1 = {
    ProductID: "PROD-201",
    ProductName: "Wireless Headphones",
    Category: "Electronics",
    UnitPrice: "89.99"
  };
  const issues1 = [];
  const norm1 = normalizeRow("Product", p1, "prod-import", productSchema.properties, "csv", issues1);
  assert.equal(norm1.product_id, "PROD-201");
  assert.equal(norm1.product_name, "Wireless Headphones");
  assert.equal(norm1.category, "Electronics", "Category Electronics acceptée sans enum fermé");
  assert.equal(norm1.selling_price, 89.99);
  assert.equal(issues1.length, 0, "Zéro enum issue");
  assert.equal(missingRequired(norm1, productSchema.required).length, 0);

  const p2 = {
    ProductID: "PROD-202",
    ProductName: "Phone Stand",
    Category: "Accessories",
    UnitPrice: "14.50"
  };
  const issues2 = [];
  const norm2 = normalizeRow("Product", p2, "prod-import", productSchema.properties, "csv", issues2);
  assert.equal(norm2.category, "Accessories");
  assert.equal(norm2.selling_price, 14.50);
  assert.equal(issues2.length, 0);
});


