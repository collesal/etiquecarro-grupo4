// Testes do calculo de custo de uso (puro). Rodar a partir da pasta do projeto: node --test web/tests/
// Valores esperados calculados a mao: custo por 100 km = 100 / (km/l) x preco do litro.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { parsePreco, custoPor100km, custoVeiculo, ufsComPreco, ufPadrao } from "../src/domain/cost.js";

const readJson = rel => JSON.parse(readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8"));
const VEICULOS = readJson("../../saida/veiculos.json");
const achar = (pred) => VEICULOS.find(pred);

const PRECOS = {
  gasolina: { br: "6,48", sp: "6,36" },
  diesel: { br: "7,29" },
};

test("parsePreco converte o texto da API em numero", () => {
  assert.equal(parsePreco("6,48"), 6.48);
  assert.equal(parsePreco("7,29"), 7.29);
  assert.equal(parsePreco(""), null);
  assert.equal(parsePreco(undefined), null);
  assert.equal(parsePreco("0"), null);
  assert.equal(parsePreco("abc"), null);
});

test("custoPor100km aplica 100 / km_por_litro x preco", () => {
  assert.equal(custoPor100km(10, 6.5), 65);
  assert.equal(custoPor100km(0, 6.5), null);
  assert.equal(custoPor100km(null, 6.5), null);
  assert.equal(custoPor100km(10, null), null);
});

test("gasolina: calcula cidade e estrada com o preco do estado", () => {
  const v = achar(x => x.combustivel === "Gasolina" && x.km_gas_die_cid != null && x.km_gas_est != null);
  const r = custoVeiculo(v, PRECOS, "br");
  assert.equal(r.status, "ok");
  assert.equal(r.combustivel, "Gasolina");
  assert.equal(r.preco, 6.48);
  assert.equal(r.cidade, custoPor100km(v.km_gas_die_cid, 6.48));
  assert.equal(r.estrada, custoPor100km(v.km_gas_est, 6.48));
});

test("diesel: usa o preco do diesel", () => {
  const v = achar(x => x.combustivel === "Diesel" && x.km_gas_die_cid != null && x.km_gas_est != null);
  const r = custoVeiculo(v, PRECOS, "br");
  assert.equal(r.status, "ok");
  assert.equal(r.combustivel, "Diesel");
  assert.equal(r.preco, 7.29);
});

test("flex: usa gasolina e avisa que o etanol nao tem preco", () => {
  const v = achar(x => x.combustivel === "Flex" && x.km_gas_die_cid != null && x.km_gas_est != null);
  const r = custoVeiculo(v, PRECOS, "br");
  assert.equal(r.status, "ok");
  assert.equal(r.combustivel, "Gasolina");
  assert.match(r.nota, /etanol/);
});

test("etanol puro e eletrico nao geram custo", () => {
  const etanol = achar(x => x.combustivel === "Etanol puro");
  assert.equal(custoVeiculo(etanol, PRECOS, "br").status, "sem_preco");
  const ele = achar(x => x.combustivel === "Elétrico puro");
  assert.equal(custoVeiculo(ele, PRECOS, "br").status, "eletrico");
});

test("sem precos carregados: sem_dado", () => {
  const v = achar(x => x.combustivel === "Gasolina" && x.km_gas_die_cid != null);
  assert.equal(custoVeiculo(v, null, "br").status, "sem_dado");
});

test("preco N/A ou UF sem dado: sem_preco_uf com orientacao", () => {
  const v = achar(x => x.combustivel === "Gasolina" && x.km_gas_die_cid != null);
  const precos = { gasolina: { br: "N/A", sp: "6,36" }, diesel: { br: "7,29" } };
  const r = custoVeiculo(v, precos, "br");
  assert.equal(r.status, "sem_preco_uf");
  assert.match(r.nota, /Escolha outro estado/);
  assert.equal(custoVeiculo(v, precos, "zz").status, "sem_preco_uf");
  assert.equal(custoVeiculo(v, precos, "sp").status, "ok");
});

test("ufsComPreco ignora N/A", () => {
  const precos = { gasolina: { br: "N/A", sp: "6,36", am: "6,94" }, diesel: { br: "7,29" } };
  assert.deepEqual(ufsComPreco(precos, "gasolina").sort(), ["am", "sp"]);
  assert.deepEqual(ufsComPreco(null, "gasolina"), []);
});

test("ufPadrao: br se tiver preco, senao sp, senao o primeiro disponivel", () => {
  const gas = achar(x => x.combustivel === "Gasolina");
  const diesel = achar(x => x.combustivel === "Diesel");
  assert.equal(ufPadrao({ gasolina: { br: "6,48", sp: "6,36" }, diesel: {} }, gas), "br");
  assert.equal(ufPadrao({ gasolina: { br: "N/A", sp: "6,36", am: "6,94" }, diesel: {} }, gas), "sp");
  assert.equal(ufPadrao({ gasolina: { br: "N/A", am: "6,94" }, diesel: {} }, gas), "am");
  assert.equal(ufPadrao({ gasolina: { br: "N/A" }, diesel: { br: "7,29" } }, diesel), "br");
  const etanol = achar(x => x.combustivel === "Etanol puro");
  assert.equal(ufPadrao(PRECOS, etanol), "br");
});
