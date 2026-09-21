import React, { useEffect, useMemo, useState } from "react";
import { ArrowUp, ArrowDown, ArrowUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell,
} from "@/components/ui/table";

/**
 * Tableau générique : tri, recherche en mémoire, pagination et empty state.
 * @param {Object} props
 * @param {Array<{key: string, header: React.ReactNode, align?: string, sortable?: boolean, render?: (row: any) => React.ReactNode, sortValue?: (row: any) => any, searchValue?: (row: any) => string, footer?: (rows: any[]) => React.ReactNode, className?: string, headerClassName?: string}>} props.columns
 * @param {any[]} props.data
 * @param {(row: any, index: number) => (string|number)} [props.rowKey]
 * @param {boolean} [props.searchable]
 * @param {string} [props.searchPlaceholder]
 * @param {number[]} [props.pageSizeOptions]
 * @param {number} [props.defaultPageSize]
 * @param {boolean} [props.footer] Affiche une ligne de totaux (utilise `column.footer`).
 * @param {React.ComponentType<{className?: string}>} [props.emptyIcon]
 * @param {string} [props.emptyTitle]
 * @param {string} [props.emptyDescription]
 * @param {string} [props.className]
 */
export default function DataTable({
  columns,
  data,
  rowKey = (row) => row.id,
  searchable = true,
  searchPlaceholder = "Rechercher…",
  pageSizeOptions = [25, 50, 100],
  defaultPageSize = 25,
  footer = false,
  emptyIcon: EmptyIcon,
  emptyTitle = "Aucune donnée",
  emptyDescription,
  className,
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState({ key: null, dir: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const defaultSearchValue = (row, col) => {
    const v = col.searchValue ? col.searchValue(row) : row[col.key];
    return v === null || v === undefined ? "" : String(v);
  };

  // Callers define `columns` as an inline array literal in their render body
  // (most have to: the column set depends on data-derived flags like
  // `hasSupplier`, computed after hooks can no longer be added), so it's a
  // new reference every render. Depending on that reference directly would
  // recompute `filtered`/`sorted` on every unrelated re-render, defeating
  // the memoization. Depending on the column *keys* instead is enough: every
  // sortValue/searchValue in this codebase reads its own row (no closures
  // over other changing arrays), so re-running them only when the actual set
  // of columns changes — not just their identity — is safe.
  const columnsKey = columns.map((c) => c.key).join("|");

  const filtered = useMemo(() => {
    const rows = data || [];
    if (!searchable || !query.trim()) return rows;
    const q = query.trim().toLowerCase();
    return rows.filter((row) =>
      columns.some((col) => defaultSearchValue(row, col).toLowerCase().includes(q))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, query, searchable, columnsKey]);

  const sorted = useMemo(() => {
    if (!sort.key) return filtered;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return filtered;
    const getVal = col.sortValue || ((row) => row[col.key]);
    const copy = [...filtered];
    copy.sort((a, b) => {
      const va = getVal(a);
      const vb = getVal(b);
      if (va === vb) return 0;
      if (va === null || va === undefined) return 1;
      if (vb === null || vb === undefined) return -1;
      const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), "fr-CA");
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return copy;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, sort, columnsKey]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pageCount);
  // Garde `page` synchronisé avec `safePage` : sans ça, un filtre qui réduit
  // pageCount pendant qu'on est sur une page plus loin laisse `page` figé
  // au-delà de la nouvelle fin, et Précédent doit être cliqué plusieurs fois
  // avant que quoi que ce soit ne bouge à l'écran.
  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [safePage, page]);
  const paginated = useMemo(
    () => sorted.slice((safePage - 1) * pageSize, safePage * pageSize),
    [sorted, safePage, pageSize]
  );

  const toggleSort = (key) => {
    setPage(1);
    setSort((prev) => {
      if (prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return { key: null, dir: "asc" };
    });
  };

  const from = sorted.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, sorted.length);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-3 px-1">
        {searchable ? (
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              placeholder={searchPlaceholder}
              className="h-9 pl-8 text-sm"
              aria-label={searchPlaceholder}
            />
          </div>
        ) : <span />}
        {/* Toujours visible, même sans barre de recherche (ex. Produits, qui a
            déjà son propre champ de recherche dans ProductFilters) : c'est ce
            compteur qui dit explicitement combien de lignes sont montrées par
            rapport au total, au lieu de les tronquer en silence. */}
        <p className="whitespace-nowrap text-xs text-muted-foreground">
          {sorted.length === 0
            ? "0 résultat"
            : `Affichage ${from}–${to} sur ${sorted.length}${data && sorted.length !== data.length ? ` (${data.length} au total)` : ""}`}
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="hover:bg-transparent">
              {columns.map((col, i) => {
                const isSorted = sort.key === col.key;
                const canSort = col.sortable !== false;
                return (
                  <TableHead
                    key={col.key}
                    className={cn(
                      "whitespace-nowrap text-xs font-medium uppercase tracking-wide text-muted-foreground",
                      col.align === "right" && "text-right",
                      i === 0 && "sticky left-0 z-10 bg-muted/50",
                      col.headerClassName
                    )}
                  >
                    {canSort ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(col.key)}
                        className={cn(
                          "inline-flex items-center gap-1 rounded focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
                          col.align === "right" && "flex-row-reverse"
                        )}
                      >
                        {col.header}
                        {isSorted ? (
                          sort.dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-30" />
                        )}
                      </button>
                    ) : (
                      col.header
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.map((row, rowIdx) => (
              <TableRow key={rowKey(row, rowIdx)}>
                {columns.map((col, colIdx) => (
                  <TableCell
                    key={col.key}
                    className={cn(
                      "text-sm",
                      col.align === "right" && "text-right tabular-nums",
                      colIdx === 0 && "sticky left-0 z-10 bg-card font-medium",
                      col.className
                    )}
                  >
                    {col.render ? col.render(row) : row[col.key]}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {paginated.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length} className="py-10 text-center">
                  <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
                    {EmptyIcon && <EmptyIcon className="h-6 w-6" aria-hidden="true" />}
                    <p className="text-sm font-medium text-foreground">{emptyTitle}</p>
                    {emptyDescription && <p className="max-w-sm text-xs">{emptyDescription}</p>}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          {footer && sorted.length > 0 && (
            <TableFooter>
              <TableRow className="hover:bg-transparent">
                {columns.map((col, i) => (
                  <TableCell
                    key={col.key}
                    className={cn(
                      "text-sm font-semibold",
                      col.align === "right" && "text-right tabular-nums",
                      i === 0 && "sticky left-0 z-10 bg-muted/50"
                    )}
                  >
                    {col.footer ? col.footer(sorted) : null}
                  </TableCell>
                ))}
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>

      {sorted.length > pageSize && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Lignes par page</span>
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
              <SelectTrigger className="h-8 w-[72px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1}>
              Précédent
            </Button>
            <span className="text-xs text-muted-foreground">Page {safePage} / {pageCount}</span>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={safePage >= pageCount}>
              Suivant
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
