// Facetas e filtros numericos: passFacets, contagens, rotulos, ordenacao. Puro.
// Logica movida de passFacets/valueLabel/renderFacets/SORTS em etiquecarro.html.

import { FACETS, LDESC, REDUCAO_DESC, RANK } from "./constants.js";

/** Estado de filtros: facetas (listas de valores) e faixas numericas. */
export function emptyFilters() {
  return {
    facets: Object.fromEntries(FACETS.map(F => [F.k, []])),
    autMin: null,
    mjMax: null,
  };
}

export function hasFilters(filters) {
  return filters.autMin != null || filters.mjMax != null || Object.values(filters.facets).some(xs => xs.length > 0);
}

/** Verdadeiro se o veiculo passa nas facetas e faixas. `skip` ignora uma faceta (para contagens). */
export function passFacets(v, filters, skip) {
  for (const F of FACETS) {
    if (F.k === skip) continue;
    const sel = filters.facets[F.k] || [];
    if (sel.length && !sel.includes(v[F.k])) return false;
  }
  if (filters.autMin != null && !(v.autonomia_km >= filters.autMin)) return false;
  if (filters.mjMax != null && !(v.mj_km <= filters.mjMax)) return false;
  return true;
}

/** Rotulo completo de um valor de faceta (ex.: "A · mais eficiente"). */
export function valueLabel(F, val) {
  if (F.letters) return val + " · " + LDESC[val];
  if (F.k === "reducao") return val + (REDUCAO_DESC[val] ? " · " + REDUCAO_DESC[val] : "");
  return val;
}

/** Descricao curta do valor (sem a letra), usada ao lado das letras A–E. */
export function valueDescription(F, val) {
  if (F.letters) return LDESC[val];
  if (F.k === "reducao") return REDUCAO_DESC[val] || "";
  return val;
}

/** Contagem por valor da faceta F, considerando os demais filtros. */
export function countsFor(base, filters, F) {
  const counts = {};
  base.forEach(v => {
    if (passFacets(v, filters, F.k)) counts[v[F.k]] = (counts[v[F.k]] || 0) + 1;
  });
  return counts;
}

/** Valores possiveis da faceta F, na ordem de exibicao. */
export function facetValues(F, all) {
  let vals;
  if (F.order) {
    vals = F.order.slice();
  } else {
    vals = [...new Set(all.map(v => v[F.k]).filter(x => x != null))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }
  return vals.filter(x => x != null && all.some(v => v[F.k] === x));
}

/**
 * Modelo de exibicao das facetas (sem HTML).
 * @param {Array} all todos os veiculos
 * @param {Array} base veiculos que passam na busca
 * @param {object} filters estado de filtros
 * @param {object} openAll facetas com "mostrar todas" ativo
 * @param {object} vocab buildVocabulary(...)
 */
export function facetModel(all, base, filters, openAll, vocab) {
  return FACETS.map(F => {
    const counts = countsFor(base, filters, F);
    const values = facetValues(F, all);
    if (F.k === "marca") values.sort((a, b) => (counts[b] || 0) - (counts[a] || 0) || a.localeCompare(b, "pt-BR"));
    const limit = F.limit && !openAll[F.k] ? F.limit : Infinity;
    const sel = filters.facets[F.k] || [];
    const shownValues = values.filter((x, i) => i < limit || sel.includes(x));
    const term = F.term ? vocab.find(F.term) : null;
    const help = {
      text: F.ne || (term && term.ne) || "",
      values: F.valsHelp
        ? values.map(x => { const e = vocab.byName.get(x); return e ? { value: x, text: e.ne } : null; }).filter(Boolean)
        : [],
    };
    return {
      facet: F,
      help,
      shown: shownValues.map(x => ({
        value: x,
        count: counts[x] || 0,
        selected: sel.includes(x),
        label: valueLabel(F, x),
        description: valueDescription(F, x),
      })),
      total: values.length,
      hasMore: values.length > shownValues.length || (!!F.limit && !!openAll[F.k]),
      expanded: !!openAll[F.k],
    };
  });
}

const SORTS = {
  geral: (a, b) => RANK[a.clsGeral] - RANK[b.clsGeral] || a.mj_km - b.mj_km,
  mj: (a, b) => a.mj_km - b.mj_km,
  aut: (a, b) => (b.autonomia_km ?? -1) - (a.autonomia_km ?? -1) || a.mj_km - b.mj_km,
  co2: (a, b) => (a.co2_fossil ?? 1e9) - (b.co2_fossil ?? 1e9) || a.mj_km - b.mj_km,
  az: (a, b) => (a.marca + a.modelo + a.versao).localeCompare(b.marca + b.modelo + b.versao, "pt-BR"),
};

/** Ordena uma copia da lista pela chave de ordenacao. */
export function sortVehicles(list, key) {
  return list.slice().sort(SORTS[key] || SORTS.geral);
}
