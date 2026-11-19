// Card "Custo de uso": quanto custa rodar 100 km com o preco atual do combustivel, por estado.
// Mostra estados de carregamento, erro e de veiculo sem calculo (eletrico, etanol).

import { html, setHtml } from "./dom.js";
import { custoVeiculo, chaveCombustivel, ufsComPreco, UF_NOMES } from "../domain/cost.js";
import { fmt } from "../domain/text.js";

function dataBr(coleta) {
  // "2026-11-18 17:35:15" -> "18/11/2026 às 17:35"
  const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/.exec(coleta || "");
  return m ? `${m[3]}/${m[2]}/${m[1]} às ${m[4]}:${m[5]}` : "";
}

/** Opcoes de estado. Estados sem preco do combustivel do veiculo ficam desabilitados e marcados. */
function ufOptions(prices, atual, v) {
  const chave = chaveCombustivel(v);
  const com = new Set(chave ? ufsComPreco(prices, chave) : []);
  const ufs = Object.keys(UF_NOMES)
    .filter(uf => prices.gasolina[uf] !== undefined || prices.diesel[uf] !== undefined || uf === "br")
    .sort((a, b) => (a === "br" ? -1 : b === "br" ? 1 : UF_NOMES[a].localeCompare(UF_NOMES[b], "pt-BR")));
  return html`${ufs.map(uf => {
    const sem = chave && !com.has(uf);
    return html`<option value="${uf}"${uf === atual ? " selected" : ""}${sem ? " disabled" : ""}>${UF_NOMES[uf]}${sem ? " (sem preço nesta coleta)" : ""}</option>`;
  })}`;
}

function resultadoHtml(r) {
  if (r.status !== "ok") return html`<p class="custo-nota">${r.nota}</p>`;
  return html`<dl class="custo-valores">
    <div><dt>Por 100 km na cidade</dt><dd><span class="num">R$ ${fmt(r.cidade, 2)}</span></dd></div>
    <div><dt>Por 100 km na estrada</dt><dd><span class="num">R$ ${fmt(r.estrada, 2)}</span></dd></div>
  </dl>
  <p class="custo-nota">Preço do litro de ${r.combustivel.toLowerCase()}: <b>R$ ${fmt(r.preco, 2)}</b>.${r.nota ? " " + r.nota : ""}</p>`;
}

/** HTML do corpo do card. state: { status: "loading" | "error" | "ready", prices, uf, coleta, fonte }. */
export function costBodyHtml(v, state) {
  if (state.status === "loading") {
    return html`<p class="custo-nota">Carregando os preços atuais…</p>`;
  }
  if (state.status === "error") {
    return html`<p class="custo-nota">Não foi possível carregar os preços agora. Tente abrir a ficha de novo em alguns minutos.</p>`;
  }
  const r = custoVeiculo(v, state.prices, state.uf);
  return html`<div class="custo-controles">
      <label for="uf-custo">Estado</label>
      <select id="uf-custo" data-uf>${ufOptions(state.prices, state.uf, v)}</select>
    </div>
    ${resultadoHtml(r)}
    <p class="custo-fonte">Fonte: <a href="${state.fonte}" rel="noopener">Petrobras</a>${state.coleta ? ", coleta de " + dataBr(state.coleta) : ""}, via API Combustível. Cálculo: 100 ÷ consumo (km/l) × preço do litro.</p>`;
}

/** Preenche o card dentro da ficha. */
export function renderCusto(root, v, state) {
  const body = root.querySelector("#custo-body");
  if (body) setHtml(body, costBodyHtml(v, state));
}
