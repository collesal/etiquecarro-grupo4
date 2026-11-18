// Glossario (tesauro): agrupamento por faceta, busca por texto e indice A–Z. Puro.
// Logica movida de renderGl em etiquecarro.html.

import { FACS } from "./constants.js";
import { norm } from "./text.js";

/** Ancora estavel de um termo, baseada na posicao no tesauro. */
export function termAnchor(terms, e) {
  return "t-" + terms.indexOf(e);
}

/**
 * @param {Array} terms tesauro na ordem de exibicao
 * @param {string} query texto do filtro
 * @returns {{sections: Array, index: Array<{letter: string, anchor: string}>, query: string}}
 */
export function glossaryModel(terms, query) {
  const q = norm(query || "");
  const match = e => !q || norm([e.t, e.def, e.ne, (e.up || []).join(" ")].join(" ")).includes(q);
  const sections = [];
  FACS.forEach(fc => {
    const all = terms.filter(e => (e.fac || (e.t === fc ? fc : "")) === fc && !e.busca && match(e));
    if (!all.length) return;
    sections.push({
      fc,
      id: "g-" + norm(fc).replace(/\W+/g, "-"),
      brands: all.filter(e => e.f === "marca"),
      rest: all.filter(e => e.f !== "marca"),
      count: all.length,
      terms: all.map(e => ({ e, anchor: termAnchor(terms, e) })),
    });
  });
  const seen = new Map();
  sections.forEach(s => s.terms.forEach(({ e, anchor }) => {
    const letter = norm(e.t).charAt(0).toUpperCase();
    if (letter && !seen.has(letter)) seen.set(letter, anchor);
  }));
  const index = [...seen.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], "pt-BR"))
    .map(([letter, anchor]) => ({ letter, anchor }));
  return { sections, index, query: q };
}
