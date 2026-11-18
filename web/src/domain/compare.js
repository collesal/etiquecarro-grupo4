// Comparacao de veiculos: linhas de specs e regra do "melhor valor" por linha. Puro.
// Logica movida de renderCmp em etiquecarro.html (sem mutar os veiculos).

import { RANK, LDESC } from "./constants.js";
import { fmt, plural } from "./text.js";
import { consumptionLines, consumptionText } from "./vehicle.js";

const transmissionText = v => v.transmissao + (v.marchas ? `, ${v.marchas} ${plural(v.marchas, "marcha", "marchas")}` : "");

/**
 * Linhas da tabela. `score` gera um numero para decidir o melhor valor;
 * `dir` -1 = menor e melhor, 1 = maior e melhor. `letter` marca linhas de classe A–E.
 */
export const COMPARE_ROWS = [
  { label: "Classificação geral", letter: v => v.clsGeral, text: v => LDESC[v.clsGeral], score: v => RANK[v.clsGeral], dir: -1 },
  { label: "Classificação na categoria", letter: v => v.clsCat, text: v => LDESC[v.clsCat], score: v => RANK[v.clsCat], dir: -1 },
  { label: "Consumo energético (MJ/km), menor é melhor", text: v => fmt(v.mj_km, 2) ?? "Não informado", score: v => v.mj_km, dir: -1 },
  { label: "Autonomia no modo elétrico (km)", text: v => v.autonomia_km ?? "Não se aplica", score: v => v.autonomia_km, dir: 1 },
  { label: "CO2 fóssil (g/km)", text: v => v.co2_fossil ?? "Não informado", score: v => v.co2_fossil, dir: -1 },
  { label: "Quilometragem por litro", text: v => {
    const lines = consumptionLines(v).map(consumptionText);
    return lines.length ? lines : "Não se aplica";
  } },
  { label: "Categoria", text: v => v.categoria },
  { label: "Tipo de propulsão", text: v => v.propulsao },
  { label: "Combustível", text: v => v.combustivel },
  { label: "Motor", text: v => v.motor },
  { label: "Transmissão", text: v => transmissionText(v) },
];

/**
 * Modelo da tabela de comparacao.
 * @param {Array} vs veiculos escolhidos (ja resolvidos)
 * @returns {Array<{label: string, cells: Array<{lines: string[], letter: string|null, best: boolean}>}>}
 */
export function compareModel(vs) {
  return COMPARE_ROWS.map(row => {
    const scores = row.score ? vs.map(row.score) : [];
    let best = null;
    if (row.score) {
      const xs = scores.filter(x => x != null);
      if (xs.length >= 2 && Math.min(...xs) !== Math.max(...xs)) {
        best = row.dir < 0 ? Math.min(...xs) : Math.max(...xs);
      }
    }
    return {
      label: row.label,
      cells: vs.map((v, i) => {
        const text = row.text(v);
        return {
          lines: [].concat(text).map(String),
          letter: row.letter ? row.letter(v) : null,
          best: best != null && scores[i] === best,
        };
      }),
    };
  });
}
