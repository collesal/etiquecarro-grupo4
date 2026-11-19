// Vocabulario controlado: termo preferido + remissivas (sinonimos, plurais, codigos).
// Logica movida de addVoc/TBY/tfind em etiquecarro.html. Puro.

import { norm } from "./text.js";

const ALIASES = [
  ["Sub Compacto", "Subcompacto"],
  ["Extra Grande", "Extragrande"],
  ["Comercial", "Comercial leve"],
  ["picapes", "Picape"],
  ["eletricos", "Elétrico"],
  ["hibridos", "Híbrido"],
  ["plug in", "Plug-in"],
  ["plugin", "Plug-in"],
  ["volks", "Volkswagen"],
];

/**
 * Monta o vocabulario a partir dos termos do tesauro.
 * @returns {{voc: Map<string, {e: object, how: string}>, byName: Map<string, object>, find: (name: string) => object|undefined}}
 */
export function buildVocabulary(terms) {
  const byName = new Map(terms.map(e => [e.t, e]));
  const voc = new Map();

  function addVoc(k, e, how) {
    k = norm(k.replace(/\s*\((?:combust[ií]vel|dire[cç][aã]o|efici[eê]ncia)\)/i, ""));
    if (k.length < 2 || voc.has(k)) return;
    voc.set(k, { e, how });
  }

  terms.forEach(e => { if (!e.f) return; addVoc(e.t, e, "termo preferido"); });
  terms.forEach(e => { if (!e.f) return; (e.up || []).forEach(u => addVoc(u, e, "sinônimo")); });
  terms.forEach(e => {
    if (!e.f || e.f !== "categoria") return;
    const t = e.t;
    addVoc(t + "s", e, "plural");
    if (t.startsWith("Utilitário esportivo ")) {
      const r = t.slice(21);
      addVoc("ue " + r, e, "código da tabela");
      addVoc("suv " + r, e, "sinônimo");
    }
    if (t.startsWith("Fora de estrada ")) addVoc("fe " + t.slice(16), e, "código da tabela");
  });
  terms.forEach(e => { if (e.f === "propulsao" || e.f === "combustivel") addVoc(e.t + "s", e, "plural"); });
  ALIASES.forEach(([k, t]) => { const target = byName.get(t); if (target) addVoc(k, target, "sinônimo"); });

  function find(name) {
    return byName.get(name) || terms.find(e => norm(e.t).startsWith(norm(name)));
  }

  return { voc, byName, find };
}
