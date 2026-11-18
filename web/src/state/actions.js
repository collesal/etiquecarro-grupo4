// Acoes do usuario: cada uma atualiza o estado a partir das funcoes do dominio.

import { parse } from "../domain/query.js";
import { emptyFilters } from "../domain/filters.js";
import { PAGE_SIZE, COMPARE_LIMIT } from "../domain/constants.js";

export function createActions(store, vocab) {
  const replaceFacet = (filters, key, values) => ({
    ...filters,
    facets: { ...filters.facets, [key]: values },
  });

  return {
    /** Roda uma consulta. resetFilters limpa facetas e faixas (usado por exemplos e sugestoes). */
    search(q, { resetFilters = false } = {}) {
      store.set(s => ({
        q,
        groups: parse(q, vocab.voc),
        filters: resetFilters ? emptyFilters() : s.filters,
        shown: PAGE_SIZE,
      }));
    },

    toggleFacet(key, value, on) {
      store.set(s => {
        const cur = s.filters.facets[key] || [];
        const next = on ? (cur.includes(value) ? cur : [...cur, value]) : cur.filter(x => x !== value);
        return { filters: replaceFacet(s.filters, key, next), shown: PAGE_SIZE };
      });
    },

    removeFacet(key, value) {
      store.set(s => ({ filters: replaceFacet(s.filters, key, (s.filters.facets[key] || []).filter(x => x !== value)) }));
    },

    /** key: "autMin" | "mjMax". value: numero ou null. */
    setNumeric(key, value) {
      store.set(s => ({ filters: { ...s.filters, [key]: value }, shown: PAGE_SIZE }));
    },

    clearFilters() {
      store.set({ filters: emptyFilters(), shown: PAGE_SIZE });
    },

    setSort(sort) {
      store.set({ sort });
    },

    toggleOpenAll(key) {
      store.set(s => ({ openAll: { ...s.openAll, [key]: !s.openAll[key] } }));
    },

    showMore() {
      store.set(s => ({ shown: s.shown + PAGE_SIZE }));
    },

    /** Inclui ou retira um veiculo da comparacao. Devolve false se o limite foi atingido. */
    toggleCompare(id, on) {
      const s = store.get();
      const has = s.cmp.includes(id);
      if (on && !has) {
        if (s.cmp.length >= COMPARE_LIMIT) {
          store.set({ cmpNotice: `Você já escolheu ${COMPARE_LIMIT} veículos. Retire um para incluir outro.` });
          return false;
        }
        store.set({ cmp: [...s.cmp, id], cmpNotice: "" });
        return true;
      }
      if (!on && has) store.set({ cmp: s.cmp.filter(x => x !== id), cmpNotice: "" });
      return true;
    },

    clearCompare() {
      store.set({ cmp: [], cmpNotice: "" });
    },

    setRoute(route) {
      store.set({ route });
    },
  };
}
