// Testes da camada de dominio (puro). Rodar a partir da pasta do projeto: node --test web/tests/
// Os valores esperados vieram do comportamento de etiquecarro.html (mesma logica, verificada por comparacao
// direta com as funcoes originais sobre os dados de saida/veiculos.json e tesauro.json).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { norm, fmt, parseDecimal } from "../src/domain/text.js";
import { buildVocabulary } from "../src/domain/vocabulary.js";
import { withSearchText, consumptionLines, datasetStats } from "../src/domain/vehicle.js";
import { parse, passQ, describeLiteral, suggestions } from "../src/domain/query.js";
import { emptyFilters, passFacets, facetModel, sortVehicles } from "../src/domain/filters.js";
import { runSearch } from "../src/domain/search.js";
import { compareModel } from "../src/domain/compare.js";
import { fichaModel } from "../src/domain/ficha.js";
import { glossaryModel } from "../src/domain/glossary.js";

const readJson = rel => JSON.parse(readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8"));
const RAW_VEHICLES = readJson("../../saida/veiculos.json");
const TERMS = readJson("../../tesauro.json");
const VOCAB = buildVocabulary(TERMS);
const VEHICLES = RAW_VEHICLES.map(withSearchText);

const ids = list => list.map(v => v.id);
const search = q => ids(VEHICLES.filter(v => passQ(v, parse(q, VOCAB.voc))));

// ---------- texto ----------

test("norm remove acentos, põe em minúsculas e colapsa espaços", () => {
  assert.equal(norm("  SUV   Elétrico "), "suv eletrico");
  assert.equal(norm("Híbrido OU Plug-in"), "hibrido ou plug-in");
});

test("fmt formata em pt-BR e devolve null para ausente", () => {
  assert.equal(fmt(null), null);
  assert.equal(fmt(1.5, 2), "1,50");
  assert.equal(fmt(280), "280,0");
});

test("parseDecimal aceita vírgula, vazio e rejeita negativo ou texto", () => {
  assert.deepEqual(parseDecimal("1,5"), { value: 1.5, error: false });
  assert.deepEqual(parseDecimal(""), { value: null, error: false });
  assert.deepEqual(parseDecimal("-2"), { value: null, error: true });
  assert.deepEqual(parseDecimal("abc"), { value: null, error: true });
});

// ---------- vocabulario ----------

test("vocabulario tem as 226 entradas que o site original gerava", () => {
  assert.equal(VOCAB.voc.size, 226);
});

test("termo preferido e sinonimo levam ao mesmo termo do tesauro", () => {
  assert.equal(VOCAB.voc.get(norm("PHEV")).e.t, "Plug-in");
  assert.equal(VOCAB.voc.get(norm("SUVs")).e.t, "Utilitário esportivo (SUV)");
  assert.equal(VOCAB.voc.get("ue compacto").how, "código da tabela");
});

test("find devolve o termo pelo nome exato ou pelo começo do nome", () => {
  assert.equal(VOCAB.find("Marca").t, "Marca");
  // mesmo comportamento do tfind original: nome parcial pega o primeiro termo que comeca com ele
  assert.equal(VOCAB.find("Consumo Energético").t, "Consumo Energético (MJ/km)");
});

// ---------- parse ----------

test("parse: espaço e E exigem todos os termos; OU liga vizinhos", () => {
  const groups = parse("híbrido OU plug-in E picape", VOCAB.voc);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].length, 2);
  assert.equal(groups[1].length, 1);
  assert.equal(groups[0][1].or, true);
});

test("parse: NÃO e sinal de menos marcam o literal como excluído", () => {
  const [[a], [b]] = parse("picape NÃO diesel -Fiat", VOCAB.voc);
  assert.equal(a.neg, false);
  assert.equal(b.neg, true);
  assert.equal(parse("picape NÃO diesel", VOCAB.voc)[1][0].neg, true);
});

test("parse: literal numérico autonomia>=400 e consumo<=0,6", () => {
  const [[a]] = parse("autonomia>=400", VOCAB.voc);
  assert.equal(a.kind, "cmp");
  assert.equal(a.key, "autonomia");
  assert.equal(a.op, ">=");
  assert.equal(a.n, 400);
  const [[b]] = parse("consumo<=0,6", VOCAB.voc);
  assert.equal(b.n, 0.6);
});

test("parse: aspas viram frase exata e asterisco vira prefixo", () => {
  const [[exact]] = parse('"dolphin mini"', VOCAB.voc);
  assert.equal(exact.exact, true);
  assert.equal(exact.txt, "dolphin mini");
  const [[prefix]] = parse("Tiggo*", VOCAB.voc);
  assert.equal(prefix.prefix, true);
  assert.equal(prefix.txt, "tiggo");
});

test("describeLiteral explica o termo do tesauro e a comparação numérica", () => {
  const [[voc]] = parse("PHEV", VOCAB.voc);
  assert.equal(describeLiteral(voc).value, "Plug-in");
  assert.match(describeLiteral(voc).detail, /você digitou “PHEV”/);
  const [[cmp]] = parse("autonomia>=400", VOCAB.voc);
  assert.equal(describeLiteral(cmp).value, "400 km");
});

// ---------- passQ (resultados da busca) ----------

test("passQ: contagens de busca iguais ao site original", () => {
  assert.equal(search("SUV elétrico").length, 25);
  assert.equal(search("PHEV").length, 112);
  assert.equal(search("Tiggo*").length, 17);
  assert.equal(search("picape NÃO diesel").length, 29);
  assert.equal(search("Onix").length, 23);
});

test("passQ: OU amplia e NÃO exclui", () => {
  const plug = new Set(search("plug-in"));
  const hib = new Set(search("híbrido"));
  const both = new Set(search("híbrido OU plug-in"));
  assert.ok(both.size >= plug.size && both.size >= hib.size);
  for (const id of [...plug, ...hib]) assert.ok(both.has(id));
  const diesel = new Set(search("diesel"));
  for (const id of search("picape NÃO diesel")) assert.ok(!diesel.has(id));
});

test("passQ: consulta sem termos devolve todos os veiculos", () => {
  assert.equal(search("").length, 968);
});

test("passQ: vazio nao quebra e 'e' sozinho e ignorado", () => {
  assert.equal(search("e").length, 968);
});

// ---------- facetas, filtros e ordenacao ----------

test("passFacets: combinacoes de facetas e faixas iguais ao site original", () => {
  const count = f => VEHICLES.filter(v => passFacets(v, f)).length;
  const withF = (facets, extra = {}) => ({ ...emptyFilters(), ...extra, facets: { ...emptyFilters().facets, ...facets } });
  assert.equal(count(withF({ propulsao: ["Elétrico"], clsGeral: ["A"] })), 174);
  assert.equal(count(withF({ marca: ["BYD", "Toyota"] })), 69);
  assert.equal(count(emptyFilters(), {}), 968);
  assert.equal(count(withF({}, { autMin: 300 })), 124);
  assert.equal(count(withF({}, { mjMax: 0.6 })), 121);
  assert.equal(count(withF({ combustivel: ["Flex"], reducao: ["A"] }, { autMin: 100, mjMax: 1.5 })), 2);
});

test("passFacets: skip ignora a propria faceta na contagem", () => {
  const f = { ...emptyFilters(), facets: { ...emptyFilters().facets, marca: ["BYD"] } };
  const withSkip = VEHICLES.filter(v => passFacets(v, f, "marca")).length;
  assert.ok(withSkip > VEHICLES.filter(v => passFacets(v, f)).length);
});

test("facetModel: marca mostra 8 primeiras e sinaliza 'Mostrar todas'", () => {
  const f = emptyFilters();
  const models = facetModel(VEHICLES, VEHICLES, f, {}, VOCAB);
  const marca = models.find(m => m.facet.k === "marca");
  assert.equal(marca.shown.length, 8);
  assert.equal(marca.total, 42);
  assert.equal(marca.hasMore, true);
});

test("sortVehicles: ordem geral coloca classe A antes de E", () => {
  const sorted = sortVehicles(VEHICLES, "geral");
  assert.equal(sorted[0].clsGeral, "A");
  assert.equal(sorted[sorted.length - 1].clsGeral, "E");
});

test("runSearch aplica consulta e filtros juntos", () => {
  const groups = parse("SUV elétrico", VOCAB.voc);
  const f = { ...emptyFilters(), autMin: 300 };
  const { base, results } = runSearch(VEHICLES, groups, f, "aut");
  assert.equal(base.length, 25);
  assert.ok(results.every(v => v.autonomia_km >= 300));
});

test("suggestions propõe retirar um grupo quando a busca não tem resultado", () => {
  const groups = parse("picape NÃO diesel E Tiggo", VOCAB.voc);
  const list = suggestions(groups, VEHICLES, emptyFilters(), VOCAB);
  assert.ok(Array.isArray(list));
  assert.ok(list.every(s => typeof s.query === "string" && s.count > 0));
});

// ---------- veiculos e comparacao ----------

test("withSearchText nao muta o veiculo original", () => {
  const original = RAW_VEHICLES[0];
  assert.equal(original._h, undefined);
  assert.ok(VEHICLES[0]._h.startsWith(" "));
});

test("consumptionLines lista etanol, gasolina e elétrico quando existem", () => {
  const v = { combustivel: "Flex", km_etanol_cid: 7.1, km_etanol_est: 8, km_gas_die_cid: 9.9, km_gas_est: 11, km_ele_cid: null };
  const lines = consumptionLines(v);
  assert.deepEqual(lines.map(l => l.label), ["Etanol", "Gasolina"]);
  assert.equal(lines[0].cidade, "7,1");
});

test("compareModel: melhor valor e ausente em empate", () => {
  const a = { clsGeral: "A", clsCat: "B", mj_km: 0.4, autonomia_km: 300, co2_fossil: 0, categoria: "X", propulsao: "Elétrico", combustivel: "Elétrico puro", motor: "E", transmissao: "N", marchas: null, consumptionOther: null, km_ele_cid: null };
  const b = { ...a, clsGeral: "C", mj_km: 0.6, autonomia_km: 500, co2_fossil: 0 };
  const rows = compareModel([a, b]);
  const byLabel = Object.fromEntries(rows.map(r => [r.label, r.cells]));
  assert.equal(byLabel["Classificação geral"][0].best, true);
  assert.equal(byLabel["Classificação geral"][1].best, false);
  assert.equal(byLabel["Consumo energético (MJ/km), menor é melhor"][0].best, true);
  assert.equal(byLabel["Autonomia no modo elétrico (km)"][1].best, true);
  assert.equal(byLabel["CO2 fóssil (g/km)"][0].best, false, "empate nao tem melhor");
  assert.equal(byLabel["Classificação geral"][0].letter, "A");
});

test("compareModel: com um so veiculo nao ha melhor valor", () => {
  const rows = compareModel([VEHICLES[0]]);
  assert.ok(rows.every(r => r.cells.every(c => c.best === false)));
});

// ---------- ficha e glossario ----------

test("fichaModel: veiculo eletrico marca emissoes como sem escapamento", () => {
  const ele = VEHICLES.find(v => v.propulsao === "Elétrico");
  const m = fichaModel(ele, VOCAB);
  const emissoes = m.sections.find(s => s.title === "Emissões");
  const nmog = emissoes.rows.find(r => r.label.startsWith("Gases orgânicos"));
  assert.equal(nmog.unit, "NA_ESC");
  assert.equal(m.classes.length, 2);
  assert.equal(m.classes[0].scale.length, 5);
});

test("glossaryModel: agrupa termos por faceta e filtra por texto", () => {
  const all = glossaryModel(TERMS, "");
  const total = all.sections.reduce((n, s) => n + s.count, 0);
  assert.ok(total > 0 && total <= TERMS.length);
  const phev = glossaryModel(TERMS, "PHEV");
  assert.ok(phev.sections.every(s => s.count > 0));
  assert.ok(phev.index.length > 0);
});

// ---------- contagens derivadas dos dados (sem numeros fixos no site) ----------

test("datasetStats deriva contagens dos dados (968 veiculos, 107 termos)", () => {
  const s = datasetStats(RAW_VEHICLES, TERMS);
  assert.equal(s.vehicles, 968);
  assert.equal(s.terms, 107);
  assert.equal(s.brands, 42);
  assert.equal(s.models, 308);
  assert.equal(s.categories, 16);
});
