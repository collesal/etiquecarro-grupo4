// Ficha tecnica em <dialog> nativo: foco volta ao botao de origem ao fechar.

import { $, html, raw, setHtml } from "./dom.js";
import { fichaModel } from "../domain/ficha.js";
import { loadFuelPrices } from "../data/fuelPrices.js";
import { ufPadrao } from "../domain/cost.js";
import { renderCusto } from "./costCard.js";

function enceHtml(c) {
  return html`<div class="ence">
    <h3>${c.title}</h3>
    <p class="ence-text">Classe <b>${c.letter}</b>: ${c.description}.</p>
    <div class="ence-scale" aria-hidden="true">
      ${c.scale.map(s => html`<div class="erow${s.on ? " is-on" : ""}"><span class="ebar L-${s.letter}" style="width:${s.width}%">${s.letter}</span>${s.on ? html`<span class="ptr">este veículo</span>` : ""}</div>`)}
    </div>
    <p class="ne-inline">${c.note}</p>
  </div>`;
}

function valueHtml(r) {
  if (r.value == null) {
    return html`<span class="na">${r.unit === "NA_ESC" ? "Não se aplica: sem escapamento" : "Não se aplica"}</span>`;
  }
  if (typeof r.value === "object") {
    return html`<span class="letter L-${r.value.letter}" aria-hidden="true">${r.value.letter}</span><span class="sr-only">classe ${r.value.letter}</span>`;
  }
  const unit = r.unit && r.unit !== "NA_ESC" ? " " + r.unit : "";
  return html`<span class="num">${r.value}</span>${unit}`;
}

function rowHtml(r) {
  return html`<div>
    <dt>${r.label}${r.col ? html`<small>Coluna: ${r.col}</small>` : ""}${r.note ? html`<div class="ne-inline">${r.note}</div>` : ""}</dt>
    <dd>${valueHtml(r)}</dd>
  </div>`;
}

function fichaHtml(m, inCompare) {
  return html`<div class="dlg-head">
      <div>
        <h2 id="fh">${m.title}</h2>
        <p>${m.subtitle}</p>
      </div>
      <button class="btn btn-secondary btn-small" type="button" data-close>Fechar<span class="sr-only"> ficha</span></button>
    </div>
    <div class="dlg-body">
      <div class="ence-pair">${m.classes.map(enceHtml)}</div>
      ${m.sections.map(s => html`<section class="fgroup"><h3>${s.title}</h3><dl class="fields">${s.rows.map(rowHtml)}</dl></section>`)}
      <section class="fgroup custo-card" aria-labelledby="custo-h">
        <h3 id="custo-h">Custo de uso com o preço atual</h3>
        <div id="custo-body" aria-live="polite"></div>
      </section>
      <p class="dlg-cmp"><label class="cmp"><input type="checkbox" data-cmp="${m.id}"${inCompare ? raw(" checked") : ""}> <span>Incluir na comparação</span></label></p>
    </div>`;
}

export function mountFicha(ctx) {
  const dlg = $("#ficha");
  let lastFocus = null;
  let custo = null; // { v, state }: veiculo da ficha aberta e estado do card de custo

  function open(id) {
    const v = ctx.byId.get(id);
    if (!v) return;
    setHtml(dlg, fichaHtml(fichaModel(v, ctx.vocab), ctx.store.get().cmp.includes(id)));
    lastFocus = document.activeElement;
    dlg.showModal();

    const atual = { v, state: { status: "loading" } };
    custo = atual;
    renderCusto(dlg, v, atual.state);
    loadFuelPrices()
      .then(dados => {
        if (custo !== atual) return; // a ficha foi trocada enquanto carregava
        atual.state = { status: "ready", prices: dados.precos, uf: ufPadrao(dados.precos, v), coleta: dados.coleta, fonte: dados.fonte };
        renderCusto(dlg, v, atual.state);
      })
      .catch(() => {
        if (custo !== atual) return;
        atual.state = { status: "error" };
        renderCusto(dlg, v, atual.state);
      });
  }

  dlg.addEventListener("close", () => {
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
  });
  dlg.addEventListener("click", e => {
    if (e.target.closest("[data-close]") || e.target === dlg) dlg.close();
  });
  dlg.addEventListener("change", e => {
    const t = e.target;
    if (t instanceof HTMLSelectElement && t.dataset.uf !== undefined) {
      if (custo && custo.state.status === "ready") {
        custo.state.uf = t.value;
        renderCusto(dlg, custo.v, custo.state);
      }
      return;
    }
    if (!(t instanceof HTMLInputElement) || !t.dataset.cmp) return;
    const id = t.dataset.cmp;
    const ok = ctx.actions.toggleCompare(id, t.checked);
    t.checked = ctx.store.get().cmp.includes(id);
    if (!ok) t.checked = false;
  });

  return { open };
}
