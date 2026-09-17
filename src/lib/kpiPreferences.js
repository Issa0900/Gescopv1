// Per-user KPI card preferences for the /kpis page: which cards are hidden
// and in what order each domain's cards are shown.
//
// Stored in localStorage, keyed by user id, so it's per-user (even on a
// shared company account) but does not follow the user across devices -
// that would require a backend field on the User entity, which is a bigger
// change than this view preference warrants.

const STORAGE_PREFIX = "gescop.kpiPrefs.";

/** Stable id for a KPI card, derived from its domain and name. */
export function kpiId(kpi) {
  const slug = String(kpi.name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `${kpi.domain || "autre"}.${slug}`;
}

const EMPTY_PREFS = { hidden: [], order: {}, added: [] };

export function loadKpiPreferences(userId) {
  if (!userId || typeof localStorage === "undefined") return EMPTY_PREFS;
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + userId);
    if (!raw) return EMPTY_PREFS;
    const parsed = JSON.parse(raw);
    return {
      hidden: Array.isArray(parsed.hidden) ? parsed.hidden : [],
      order: parsed.order && typeof parsed.order === "object" ? parsed.order : {},
      // Registry KPI ids the user opted into via "+ Ajouter un indicateur",
      // beyond the default set already computed on this page.
      added: Array.isArray(parsed.added) ? parsed.added : [],
    };
  } catch {
    return EMPTY_PREFS;
  }
}

export function saveKpiPreferences(userId, prefs) {
  if (!userId || typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_PREFIX + userId, JSON.stringify(prefs));
  } catch {
    // Storage unavailable (private browsing, quota exceeded) - the
    // preference simply won't persist for this session.
  }
}

/**
 * Re-order each domain's KPI list per the saved preference. A card that is
 * newly available (not in the saved order - e.g. new data just got
 * imported) keeps its natural position, appended after the saved ones.
 */
export function orderKpisByPreference(itemsByDomain, prefs) {
  const savedOrder = prefs?.order || {};
  const result = {};
  for (const [domain, items] of Object.entries(itemsByDomain)) {
    const remaining = new Map(items.map((k) => [kpiId(k), k]));
    const ordered = [];
    (savedOrder[domain] || []).forEach((id) => {
      if (remaining.has(id)) {
        ordered.push(remaining.get(id));
        remaining.delete(id);
      }
    });
    remaining.forEach((k) => ordered.push(k));
    result[domain] = ordered;
  }
  return result;
}

export function isKpiHidden(kpi, prefs) {
  return (prefs?.hidden || []).includes(kpiId(kpi));
}
