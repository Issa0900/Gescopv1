export function generateFingerprint(entityName: string, row: any): string {
  if (!row || typeof row !== "object") return "";

  // 1. Clés d'affaires spécifiques par entité
  if (entityName === "Order" && row.order_id) {
    return `Order:${String(row.order_id).trim()}:${String(row.product_id || "").trim()}`;
  }
  if (entityName === "Customer" && (row.customer_id || row.email)) {
    return `Customer:${String(row.customer_id || row.email).trim().toLowerCase()}`;
  }
  if (entityName === "Product" && (row.product_id || row.sku)) {
    return `Product:${String(row.product_id || row.sku).trim()}`;
  }
  if (entityName === "Campaign" && row.campaign_id) {
    return `Campaign:${String(row.campaign_id).trim()}`;
  }
  if (entityName === "CampaignDaily" && row.campaign_id && row.date) {
    return `CampaignDaily:${String(row.campaign_id).trim()}:${String(row.date).slice(0, 10)}`;
  }
  if (entityName === "Employee" && row.employee_id) {
    return `Employee:${String(row.employee_id).trim()}`;
  }
  if (entityName === "Payroll" && row.employee_id && row.period) {
    return `Payroll:${String(row.employee_id).trim()}:${String(row.period).trim()}`;
  }
  if (entityName === "Supplier" && row.supplier_id) {
    return `Supplier:${String(row.supplier_id).trim()}`;
  }
  if (entityName === "Cashflow" && row.date) {
    return `Cashflow:${String(row.date).slice(0, 10)}`;
  }
  if (entityName === "Expense" && row.expense_id) {
    return `Expense:${String(row.expense_id).trim()}`;
  }
  if (entityName === "Transaction") {
    const d = String(row.date || "").slice(0, 10);
    const a = Number(row.amount) || 0;
    const t = String(row.type || "");
    const desc = String(row.description || "").trim().toLowerCase();
    if (d && a) return `Txn:${d}:${a}:${t}:${desc}`;
  }

  // 2. Empreinte canonique (exclut import_id, fingerprint, original_data)
  const cleaned: Record<string, any> = {};
  for (const k of Object.keys(row).sort()) {
    if (["import_id", "fingerprint", "original_data", "id", "created_date", "updated_date"].includes(k)) continue;
    if (row[k] !== undefined && row[k] !== null && row[k] !== "") {
      cleaned[k] = row[k];
    }
  }
  return `${entityName}:${JSON.stringify(cleaned)}`;
}
