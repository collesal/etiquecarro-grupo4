// Analise da consulta: OU liga vizinhos; espaco/E exige todos; NÃO exclui.
// parse, compile e passQ movidos de etiquecarro.html. Puro: recebe o vocabulario por parametro.

import { norm, fmt } from "./text.js";
import { NUMF, FL } from "./constants.js";
import { passFacets } from "./filters.js";

/**
 * Converte a consulta em grupos (E entre grupos, OU dentro do grupo).
 * @param {string} q
 * @param {Map} voc vocabulario (buildVocabulary(...).voc)
 * @returns {Array<Array<object>>}
 */
export function parse(q, voc) {
  q = q.replace(/[()]/g, " ").replace(/\s*(>=|<=|>|<|=)\s*/g, "$1");
  const raw = q.match(/"[^"]*"|\S+/g) || [];
  const lits = [];
  let neg = false, orNext = false;
  for (let i = 0; i < raw.length; i++) {
    let t = raw[i];
    const u = t.toUpperCase();
    if (u === "E" || u === "AND" || u === "&") continue;
    if (u === "OU" || u === "OR" || u === "|") { orNext = true; continue; }
    if (u === "NÃO" || u === "NAO" || u === "NOT") { neg = true; continue; }
    if (t.length > 1 && t[0] === "-" && !/^-\d/.test(t)) { neg = true; t = t.slice(1); raw[i] = t; }
    let lit = null;
    if (t[0] === '"') {
      lit = { kind: "txt", txt: norm(t.replace(/"/g, "")), typed: t, exact: true };
    } else {
      const m = norm(t).match(/^(autonomia|consumo|co2)(>=|<=|>|<|=)([\d.,]+)$/);
      if (m) {
        lit = { kind: "cmp", key: m[1], op: m[2], n: parseFloat(m[3].replace(",", ".")), typed: t };
      } else {
        for (let j = Math.min(raw.length, i + 4); j > i; j--) {
          const ph = raw.slice(i, j);
          if (ph.some(x => /^(E|OU|NÃO|NAO)$/.test(x) || x[0] === '"')) continue;
          const hit = voc.get(norm(ph.join(" ")));
          if (hit) {
            lit = { kind: "voc", e: hit.e, how: hit.how, typed: ph.join(" ") };
            i = j - 1;
            break;
          }
        }
        if (!lit) {
          const pre = t.endsWith("*");
          lit = { kind: "txt", txt: norm(t.replace(/\*+$/, "")), typed: t, prefix: pre };
        }
      }
    }
    lit.neg = neg;
    lit.or = orNext && lits.length > 0;
    neg = false;
    orNext = false;
    lits.push(lit);
  }
  const groups = [];
  lits.forEach(l => { if (l.or) groups[groups.length - 1].push(l); else groups.push([l]); });
  groups.forEach(g => g.forEach(l => { l.test = compile(l); }));
  return groups;
}

/** Cria o predicado de um literal. */
export function compile(l) {
  if (l.kind === "voc") {
    const vals = new Set([].concat(l.e.v));
    const f = l.e.f;
    if (f === "marca") {
      const w = " " + norm(l.typed) + " ";
      return v => vals.has(v.marca) || v._h.includes(w);
    }
    return v => vals.has(v[f]);
  }
  if (l.kind === "cmp") {
    const [k] = NUMF[l.key];
    const n = l.n;
    const ops = {
      ">=": a => a >= n,
      "<=": a => a <= n,
      ">": a => a > n,
      "<": a => a < n,
      "=": a => Math.abs(a - n) < 1e-9,
    };
    return v => v[k] != null && ops[l.op](v[k]);
  }
  const s = l.txt.replace(/[^a-z0-9.]+/g, " ").trim();
  if (!s) return () => true;
  const needle = " " + s + (l.prefix ? "" : " ");
  return v => v._h.includes(needle);
}

/** Verdadeiro se o veiculo atende a todos os grupos (cada grupo: algum literal, respeitando NÃO). */
export function passQ(v, groups) {
  return groups.every(g => g.some(l => (l.neg ? !l.test(v) : l.test(v))));
}

/** Descricao de um literal para a interpretacao da busca (dados, sem HTML). */
export function describeLiteral(l) {
  const neg = !!l.neg;
  if (l.kind === "voc") {
    const pref = l.e.t;
    const via = norm(l.typed) === norm(pref) ? "termo do tesauro" : `você digitou “${l.typed}” (${l.how})`;
    return { neg, field: FL[l.e.f] || "", value: pref, detail: via };
  }
  if (l.kind === "cmp") {
    const [, lab, u] = NUMF[l.key];
    return { neg, field: lab, op: l.op, value: `${fmt(l.n, l.key === "consumo" ? 2 : 0)} ${u}`, detail: "comparação numérica" };
  }
  const kind = l.exact ? "frase exata" : l.prefix ? "começa com" : "palavra";
  return { neg, field: "", value: l.typed, detail: `${kind} em marca, modelo ou versão` };
}

function queryText(g) {
  return g.map(l => (l.neg ? "NÃO " : "") + (l.kind === "voc" ? l.e.t : l.typed)).join(" OU ");
}

/**
 * Sugestoes quando a busca nao tem resultado: retirar um grupo ou trocar por termo relacionado.
 * @returns {Array<{kind: "drop"|"related", label: string, query: string, count: number}>}
 */
export function suggestions(groups, all, filters, vocab) {
  const out = [];
  if (groups.length > 1) {
    groups.forEach((g, i) => {
      const rest = groups.filter((_, j) => j !== i);
      const n = all.filter(v => passQ(v, rest) && passFacets(v, filters)).length;
      if (n) out.push({ kind: "drop", label: `Sem “${queryText(g)}”: ${n} veículo${n > 1 ? "s" : ""}`, query: rest.map(queryText).join(" "), count: n });
    });
  }
  groups.flat().filter(l => l.kind === "voc").forEach(l => {
    (l.e.tr || []).forEach(tr => {
      const e = vocab.byName.get(tr);
      if (!e || !e.f) return;
      const alt = groups.map(g => (g.includes(l) ? [{ ...l, e, typed: e.t, test: compile({ ...l, e, typed: e.t }) }] : g));
      const n = all.filter(v => passQ(v, alt) && passFacets(v, filters)).length;
      if (n) out.push({ kind: "related", label: `Termo relacionado: ${e.t} (${n})`, query: alt.map(queryText).join(" "), count: n });
    });
  });
  return out;
}
