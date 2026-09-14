import React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

export default function ProductFilters({ filters, onChange, categories, statuses, statusLabels, count }) {
  const set = (key, value) => onChange({ ...filters, [key]: value });

  return (
    <div className="flex flex-col gap-3 border-b border-border bg-muted/30 p-4 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.search}
          onChange={(e) => set("search", e.target.value)}
          placeholder="Rechercher un produit…"
          className="pl-9"
        />
      </div>
      <Select value={filters.category} onValueChange={(v) => set("category", v)}>
        <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Catégorie" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toutes catégories</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c} value={c}>{c}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={filters.status} onValueChange={(v) => set("status", v)}>
        <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Statut stock" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les statuts</SelectItem>
          <SelectItem value="reorder">À réapprovisionner</SelectItem>
          {statuses.map((s) => (
            <SelectItem key={s} value={s}>{statusLabels[s] || s}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="shrink-0 text-xs text-muted-foreground">{count} produit{count === 1 ? "" : "s"}</span>
    </div>
  );
}