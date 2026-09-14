// Paginated read helper.
// A single list() call returns at most 500 records. Reading a source with one
// call therefore silently truncates it, and any total computed on that slice is
// wrong (and inconsistent with a source read from a different angle).

const PAGE = 500;

export async function fetchAll(entity, sort = "-created_date", maxPages = 40) {
  const out = [];
  for (let page = 0; page < maxPages; page += 1) {
    const batch = await entity.list(sort, PAGE, page * PAGE);
    out.push(...(batch || []));
    if (!batch || batch.length < PAGE) break;
  }
  return out;
}