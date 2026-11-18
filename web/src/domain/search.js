// Busca completa: aplica a consulta (grupos), as facetas e a ordenacao. Puro.

import { passQ } from "./query.js";
import { passFacets, sortVehicles } from "./filters.js";

/**
 * @returns {{base: Array, results: Array}} base = passa na consulta; results = base + facetas, ordenado.
 */
export function runSearch(vehicles, groups, filters, sort) {
  const base = vehicles.filter(v => passQ(v, groups));
  const results = sortVehicles(base.filter(v => passFacets(v, filters)), sort);
  return { base, results };
}
