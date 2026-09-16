// ─────────────────────────────────────────────────────────────────────────────
// GESCOP Data Intelligence Core - Entity Relation Graph
// ─────────────────────────────────────────────────────────────────────────────
//
// Declarative graph of relationships between Base44 entities.
// Enables: KPI dependency resolution, data lineage, cross-entity validation,
// and automatic discovery of calculation paths.
//
// Example chains:
//   Customer → Order → Product → Inventory → Supplier
//   Campaign → CampaignDaily → Order → Revenue → Margin
//   Employee → Payroll → Expense
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Relation types between entities.
 */
export const RELATION_TYPES = Object.freeze({
  /** Parent-child: one parent has many children (Customer → Orders) */
  ONE_TO_MANY: "one_to_many",
  /** Reference: one entity references another (Order.product_id → Product) */
  MANY_TO_ONE: "many_to_one",
  /** Association: related but not strictly parent-child */
  ASSOCIATED: "associated",
  /** Derived: one entity's value is derived from another's data */
  DERIVED: "derived",
  /** Temporal: same entity at different points in time */
  TEMPORAL: "temporal",
});

/**
 * Complete relation graph between GESCOP entities.
 *
 * Each relation defines:
 * - source: the entity that "owns" the relationship
 * - target: the entity being referenced
 * - type: the nature of the relationship
 * - joinField: the field used to join (on the source side)
 * - targetField: the field used to join (on the target side, if different)
 * - description: human-readable explanation in French
 * - dataFlow: direction of value derivation ('source_to_target' or 'target_to_source')
 */
export const ENTITY_RELATIONS = Object.freeze([
  // ── Customer as root ──
  {
    source: "Customer",
    target: "Order",
    type: RELATION_TYPES.ONE_TO_MANY,
    joinField: "customer_id",
    targetField: "customer_id",
    description: "Un client passe plusieurs commandes",
    dataFlow: "source_to_target",
  },
  {
    source: "Customer",
    target: "Interaction",
    type: RELATION_TYPES.ONE_TO_MANY,
    joinField: "customer_id",
    targetField: "customer_id",
    description: "Un client a plusieurs interactions (support, tickets)",
    dataFlow: "source_to_target",
  },

  // ── Order relationships ──
  {
    source: "Order",
    target: "Product",
    type: RELATION_TYPES.MANY_TO_ONE,
    joinField: "product_id",
    targetField: "product_id",
    description: "Une commande concerne un produit",
    dataFlow: "target_to_source",
  },
  {
    source: "Order",
    target: "Transaction",
    type: RELATION_TYPES.DERIVED,
    joinField: null,
    targetField: null,
    description: "Les commandes génèrent des transactions de revenus",
    dataFlow: "source_to_target",
  },

  // ── Product relationships ──
  {
    source: "Product",
    target: "Inventory",
    type: RELATION_TYPES.ONE_TO_MANY,
    joinField: "product_id",
    targetField: "product_id",
    description: "Un produit a un historique d'inventaire",
    dataFlow: "source_to_target",
  },
  {
    source: "Product",
    target: "Purchase",
    type: RELATION_TYPES.ONE_TO_MANY,
    joinField: "product_id",
    targetField: "product_id",
    description: "Un produit est approvisionné par des achats",
    dataFlow: "target_to_source",
  },

  // ── Supplier relationships ──
  {
    source: "Supplier",
    target: "Purchase",
    type: RELATION_TYPES.ONE_TO_MANY,
    joinField: "supplier_id",
    targetField: "supplier_id",
    description: "Un fournisseur fournit plusieurs achats",
    dataFlow: "source_to_target",
  },
  {
    source: "Supplier",
    target: "Expense",
    type: RELATION_TYPES.ASSOCIATED,
    joinField: "supplier_id",
    targetField: "supplier",
    description: "Les dépenses peuvent être liées à un fournisseur",
    dataFlow: "target_to_source",
  },

  // ── Employee relationships ──
  {
    source: "Employee",
    target: "Payroll",
    type: RELATION_TYPES.ONE_TO_MANY,
    joinField: "employee_id",
    targetField: "employee_id",
    description: "Un employé a un historique de paie",
    dataFlow: "source_to_target",
  },

  // ── Campaign relationships ──
  {
    source: "Campaign",
    target: "CampaignDaily",
    type: RELATION_TYPES.ONE_TO_MANY,
    joinField: "campaign_id",
    targetField: "campaign_id",
    description: "Une campagne a des métriques quotidiennes",
    dataFlow: "source_to_target",
  },
  {
    source: "Campaign",
    target: "Order",
    type: RELATION_TYPES.DERIVED,
    joinField: null,
    targetField: null,
    description: "Les campagnes marketing génèrent des commandes (attribution)",
    dataFlow: "source_to_target",
  },

  // ── Financial flows ──
  {
    source: "Expense",
    target: "Transaction",
    type: RELATION_TYPES.DERIVED,
    joinField: null,
    targetField: null,
    description: "Les dépenses se traduisent en transactions de sortie",
    dataFlow: "source_to_target",
  },
  {
    source: "Transaction",
    target: "Cashflow",
    type: RELATION_TYPES.DERIVED,
    joinField: null,
    targetField: null,
    description: "Les transactions alimentent le flux de trésorerie",
    dataFlow: "source_to_target",
  },
  {
    source: "Payroll",
    target: "Expense",
    type: RELATION_TYPES.DERIVED,
    joinField: null,
    targetField: null,
    description: "La masse salariale est une composante des dépenses",
    dataFlow: "source_to_target",
  },
]);

// ─────────────────────────────────────────────────────────────────────────────
// GRAPH QUERIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get all entities directly related to a given entity.
 *
 * @param {string} entityName
 * @returns {{ entity: string, relation: string, type: string, direction: string }[]}
 */
export function getRelatedEntities(entityName) {
  const results = [];

  for (const rel of ENTITY_RELATIONS) {
    if (rel.source === entityName) {
      results.push({
        entity: rel.target,
        relation: rel.description,
        type: rel.type,
        direction: "outgoing",
        joinField: rel.joinField,
      });
    }
    if (rel.target === entityName) {
      results.push({
        entity: rel.source,
        relation: rel.description,
        type: rel.type,
        direction: "incoming",
        joinField: rel.targetField || rel.joinField,
      });
    }
  }

  return results;
}

/**
 * Find the shortest path between two entities in the relation graph.
 * Uses BFS (breadth-first search).
 *
 * @param {string} fromEntity
 * @param {string} toEntity
 * @returns {{ found: boolean, path: string[], relations: Object[] }}
 */
export function findPath(fromEntity, toEntity) {
  if (fromEntity === toEntity) {
    return { found: true, path: [fromEntity], relations: [] };
  }

  // Build adjacency list
  const adj = new Map();
  for (const rel of ENTITY_RELATIONS) {
    if (!adj.has(rel.source)) adj.set(rel.source, []);
    if (!adj.has(rel.target)) adj.set(rel.target, []);
    adj.get(rel.source).push({ entity: rel.target, relation: rel });
    adj.get(rel.target).push({ entity: rel.source, relation: rel });
  }

  // BFS
  const visited = new Set([fromEntity]);
  const queue = [[fromEntity]];
  const relPaths = [[]];

  while (queue.length > 0) {
    const path = queue.shift();
    const rels = relPaths.shift();
    const current = path[path.length - 1];

    const neighbors = adj.get(current) || [];
    for (const { entity, relation } of neighbors) {
      if (visited.has(entity)) continue;
      visited.add(entity);

      const newPath = [...path, entity];
      const newRels = [...rels, relation];

      if (entity === toEntity) {
        return { found: true, path: newPath, relations: newRels };
      }

      queue.push(newPath);
      relPaths.push(newRels);
    }
  }

  return { found: false, path: [], relations: [] };
}

/**
 * Check if a KPI can be derived from the available entities.
 *
 * @param {string[]} requiredEntities - Entities needed for the KPI
 * @param {string[]} availableEntities - Entities that have data
 * @returns {{ possible: boolean, missingEntities: string[], paths: Object[] }}
 */
export function canDeriveKpi(requiredEntities, availableEntities) {
  const available = new Set(availableEntities);
  const missing = requiredEntities.filter((e) => !available.has(e));

  if (missing.length === 0) {
    return { possible: true, missingEntities: [], paths: [] };
  }

  // Check if missing entities can be derived from available ones
  const derivablePaths = [];
  const stillMissing = [];

  for (const entity of missing) {
    // Check if there's a DERIVED relation from an available entity
    const derivedFrom = ENTITY_RELATIONS.filter(
      (r) =>
        r.target === entity &&
        r.type === RELATION_TYPES.DERIVED &&
        available.has(r.source)
    );

    if (derivedFrom.length > 0) {
      derivablePaths.push({
        entity,
        derivedFrom: derivedFrom.map((r) => r.source),
        relation: derivedFrom[0].description,
      });
    } else {
      stillMissing.push(entity);
    }
  }

  return {
    possible: stillMissing.length === 0,
    missingEntities: stillMissing,
    paths: derivablePaths,
  };
}

/**
 * Get the complete dependency tree for a given entity.
 * Useful for data lineage visualization.
 *
 * @param {string} entityName
 * @param {number} [maxDepth=3]
 * @returns {Object} Tree structure { entity, children: [...] }
 */
export function getDependencyTree(entityName, maxDepth = 3) {
  const visited = new Set();

  function buildTree(entity, depth) {
    if (depth >= maxDepth || visited.has(entity)) {
      return { entity, children: [] };
    }
    visited.add(entity);

    const children = [];
    for (const rel of ENTITY_RELATIONS) {
      if (rel.source === entity && rel.dataFlow === "source_to_target") {
        children.push({
          ...buildTree(rel.target, depth + 1),
          relation: rel.description,
          type: rel.type,
        });
      }
    }

    return { entity, children };
  }

  return buildTree(entityName, 0);
}

/**
 * List all unique entities referenced in the relation graph.
 * @returns {string[]}
 */
export function listGraphEntities() {
  const entities = new Set();
  for (const rel of ENTITY_RELATIONS) {
    entities.add(rel.source);
    entities.add(rel.target);
  }
  return [...entities].sort();
}
