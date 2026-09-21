// Paginated read helper.
// A single list() call returns at most 500 records. Reading a source with one
// call therefore silently truncates it, and any total computed on that slice is
// wrong (and inconsistent with a source read from a different angle).
//
// maxPages default was 500 (up to 250 000 rows, fetched one page at a time,
// each awaited before the next starts). On an account with tens of thousands
// of orders this means dozens of sequential round trips before the page can
// render anything - in practice the screen just shows "Chargement..." for a
// very long time, or effectively never finishes, on every single page that
// reads orders (there is no cross-page cache: each page's own useQuery key
// re-fetches from page 0). Capped to the 10 000 most recent rows (sort is
// almost always "-date"/"-created_date", so this is the most recent slice,
// not an arbitrary one) - enough for any per-page KPI or trend this app
// computes, and small enough to render in a few seconds instead of minutes.
const PAGE = 500;
const DEFAULT_MAX_PAGES = 20; // 20 * 500 = 10 000 rows

export async function fetchAll(entity, sort = "-created_date", maxPages = DEFAULT_MAX_PAGES) {
  const out = [];
  for (let page = 0; page < maxPages; page += 1) {
    const batch = await entity.list(sort, PAGE, page * PAGE);
    out.push(...(batch || []));
    if (!batch || batch.length < PAGE) break;
  }
  return out;
}