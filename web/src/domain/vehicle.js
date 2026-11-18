// Regras sobre veiculos: texto de busca, linhas de consumo e estatisticas da base. Puro.

import { norm, fmt } from "./text.js";

/** Devolve uma copia do veiculo com o texto normalizado usado pela busca (_h). Nao muta o original. */
export function withSearchText(v) {
  const text = norm([v.marca, v.modelo, v.versao, v.motor].join(" ")).replace(/[^a-z0-9.]+/g, " ");
  return { ...v, _h: " " + text + " " };
}

/** Linhas de consumo (cidade/estrada) de um veiculo. Cada item tem label, cidade, estrada e unidade. */
export function consumptionLines(v) {
  const lines = [];
  const add = (label, cidade, estrada, unit) => {
    if (cidade == null) return;
    lines.push({ label, cidade: fmt(cidade), estrada: fmt(estrada) ?? "–", unit });
  };
  add("Etanol", v.km_etanol_cid, v.km_etanol_est, "km/l");
  add(v.combustivel === "Diesel" ? "Diesel" : "Gasolina", v.km_gas_die_cid, v.km_gas_est, "km/l");
  add("Elétrico", v.km_ele_cid, v.km_ele_est, "km/l equivalente");
  return lines;
}

/** Texto plano de uma linha de consumo, ex.: "Etanol cidade 7,1 · estrada 8,0 km/l". */
export function consumptionText(line) {
  return `${line.label} cidade ${line.cidade} · estrada ${line.estrada} ${line.unit}`;
}

/** Estatisticas derivadas dos dados carregados (nada fixo no codigo). */
export function datasetStats(vehicles, terms) {
  return {
    vehicles: vehicles.length,
    models: new Set(vehicles.map(v => v.marca + "|" + String(v.modelo).toUpperCase())).size,
    brands: new Set(vehicles.map(v => v.marca)).size,
    categories: new Set(vehicles.map(v => v.categoria)).size,
    terms: terms.length,
  };
}
