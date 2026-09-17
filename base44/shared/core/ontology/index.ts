// ─────────────────────────────────────────────────────────────────────────────
// GESCOP Universal Commercial Ontology (UCO) — Central Registry
// Version 5.0 — Septembre 2026
// ─────────────────────────────────────────────────────────────────────────────

import type { CanonicalConcept } from "./types.ts";
import { SALES_CONCEPTS } from "./domains/sales.ts";
import { TREASURY_CONCEPTS } from "./domains/treasury.ts";
import { FINANCE_CONCEPTS } from "./domains/finance.ts";
import { MARKETING_CONCEPTS } from "./domains/marketing.ts";
import { CUSTOMER_CONCEPTS } from "./domains/customers.ts";
import { PRODUCT_CONCEPTS } from "./domains/products.ts";
import { INVENTORY_CONCEPTS } from "./domains/inventory.ts";
import { HR_CONCEPTS } from "./domains/hr.ts";
import { PROCUREMENT_CONCEPTS } from "./domains/procurement.ts";
import { LOGISTICS_CONCEPTS } from "./domains/logistics.ts";
import { ECOMMERCE_CONCEPTS } from "./domains/ecommerce.ts";
import { ACCOUNTING_CONCEPTS } from "./domains/accounting.ts";
import { COMMON_CONCEPTS } from "./domains/common.ts";

export * from "./types.ts";

/**
 * Répertoire complet de tous les concepts canoniques
 */
export const ALL_CONCEPTS: Record<string, CanonicalConcept> = Object.freeze({
  ...SALES_CONCEPTS,
  ...TREASURY_CONCEPTS,
  ...FINANCE_CONCEPTS,
  ...MARKETING_CONCEPTS,
  ...CUSTOMER_CONCEPTS,
  ...PRODUCT_CONCEPTS,
  ...INVENTORY_CONCEPTS,
  ...HR_CONCEPTS,
  ...PROCUREMENT_CONCEPTS,
  ...LOGISTICS_CONCEPTS,
  ...ECOMMERCE_CONCEPTS,
  ...ACCOUNTING_CONCEPTS,
  ...COMMON_CONCEPTS,
});

/**
 * Nettoyage standard pour l'indexation de texte
 */
export function normalizeKey(str: string): string {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Index inversé de recherche rapide :
 * Clé normalisée -> tableau de concepts canoniques correspondants
 */
class OntologyRegistry {
  private conceptMap: Map<string, CanonicalConcept> = new Map();
  private nameMap: Map<string, CanonicalConcept> = new Map();
  private synonymIndex: Map<string, CanonicalConcept[]> = new Map();
  private abbreviationIndex: Map<string, CanonicalConcept[]> = new Map();
  private entityBindingIndex: Map<string, CanonicalConcept> = new Map(); // "Entity.field" -> Concept

  constructor(concepts: Record<string, CanonicalConcept>) {
    for (const [id, concept] of Object.entries(concepts)) {
      this.conceptMap.set(id, concept);
      this.nameMap.set(normalizeKey(concept.canonicalName), concept);

      // Indexation des synonymes dans toutes les langues
      for (const [lang, synList] of Object.entries(concept.synonyms)) {
        if (!Array.isArray(synList)) continue;
        for (const syn of synList) {
          const norm = normalizeKey(syn);
          if (!norm) continue;
          const current = this.synonymIndex.get(norm) || [];
          if (!current.some((c) => c.conceptId === concept.conceptId)) {
            current.push(concept);
          }
          this.synonymIndex.set(norm, current);
        }
      }

      // Indexation des abréviations
      if (concept.abbreviations) {
        for (const abbr of concept.abbreviations) {
          const norm = normalizeKey(abbr);
          if (!norm) continue;
          const current = this.abbreviationIndex.get(norm) || [];
          if (!current.some((c) => c.conceptId === concept.conceptId)) {
            current.push(concept);
          }
          this.abbreviationIndex.set(norm, current);
        }
      }

      // Indexation des liaisons entités Base44
      if (concept.entityBindings) {
        for (const binding of concept.entityBindings) {
          const key = `${binding.entity}.${binding.field}`;
          if (!this.entityBindingIndex.has(key) || binding.isDefault) {
            this.entityBindingIndex.set(key, concept);
          }
        }
      }
    }
  }

  public getConcept(conceptId: string): CanonicalConcept | undefined {
    return this.conceptMap.get(conceptId);
  }

  public getByCanonicalName(name: string): CanonicalConcept | undefined {
    return this.nameMap.get(normalizeKey(name));
  }

  public findBySynonym(term: string): CanonicalConcept[] {
    const norm = normalizeKey(term);
    return this.synonymIndex.get(norm) || [];
  }

  public findByAbbreviation(abbr: string): CanonicalConcept[] {
    const norm = normalizeKey(abbr);
    return this.abbreviationIndex.get(norm) || [];
  }

  public getConceptForEntityField(entity: string, field: string): CanonicalConcept | undefined {
    return this.entityBindingIndex.get(`${entity}.${field}`);
  }

  public getAllConcepts(): CanonicalConcept[] {
    return Array.from(this.conceptMap.values());
  }

  public getConceptsByDomain(domain: string): CanonicalConcept[] {
    return Array.from(this.conceptMap.values()).filter((c) => c.domain === domain);
  }
}

export const Registry = new OntologyRegistry(ALL_CONCEPTS);
