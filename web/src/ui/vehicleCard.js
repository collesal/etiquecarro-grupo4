// Cartao de veiculo: eficiencia em numero grande, etiquetas A–E com letra, dados secundarios em cinza.

import { html, raw } from "./dom.js";
import { consumptionLines, consumptionText } from "../domain/vehicle.js";
import { LDESC } from "../domain/constants.js";
import { fmt } from "../domain/text.js";

export function letterBadge(L, label) {
  return html`<span class="letter L-${L}" aria-hidden="true">${L}</span><span class="sr-only">${label}: classe ${L}, ${LDESC[L]}</span>`;
}

export function vehicleCard(v, inCompare) {
  const name = `${v.marca} ${v.modelo} ${v.versao}`;
  const secondary = v.autonomia_km != null
    ? html`<div class="stat-2"><b class="num">${v.autonomia_km}</b><span>km de autonomia elétrica</span></div>`
    : v.co2_fossil != null
      ? html`<div class="stat-2"><b class="num">${v.co2_fossil}</b><span>g/km de CO2 fóssil</span></div>`
      : "";
  const lines = consumptionLines(v).map(l => html`<li>${consumptionText(l)}</li>`);
  return html`<li class="card">
    <div class="card-top">
      <div class="card-title">
        <h3>${v.marca} ${v.modelo}</h3>
        <p class="card-version">${v.versao}</p>
      </div>
      <div class="card-classes" aria-label="Classificações">
        <span class="class-pill">${letterBadge(v.clsGeral, "Geral")}<span aria-hidden="true" class="class-name">Geral</span></span>
        <span class="class-pill">${letterBadge(v.clsCat, "Na categoria")}<span aria-hidden="true" class="class-name">Categoria</span></span>
      </div>
    </div>
    <div class="card-efficiency">
      <div class="stat-1"><b class="num">${fmt(v.mj_km, 2)}</b><span>MJ/km · consumo energético</span></div>
      ${secondary}
    </div>
    <ul class="card-meta" aria-label="Características">
      <li>${v.categoria}</li><li>${v.propulsao}</li><li>${v.combustivel}</li>
    </ul>
    ${lines.length ? html`<ul class="card-consumo" aria-label="Quilometragem por litro">${lines}</ul>` : ""}
    <div class="card-actions">
      <button class="btn btn-secondary btn-small" type="button" data-ficha="${v.id}" data-focus-key="ficha-${v.id}">Ver ficha<span class="sr-only"> de ${name}</span></button>
      <label class="cmp">
        <input type="checkbox" data-cmp="${v.id}" data-focus-key="cmp-${v.id}"${inCompare ? raw(" checked") : ""}>
        <span>Comparar<span class="sr-only"> ${name}</span></span>
      </label>
    </div>
  </li>`;
}
