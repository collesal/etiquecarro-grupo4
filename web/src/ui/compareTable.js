// Pagina de comparacao: colunas = veiculos, linhas = specs; coluna de rotulos fixa;
// "melhor valor" com texto visivel e rotulo para leitor de tela; regiao rolavel focavel.

import { $, delegate, html, join, setHtml } from "./dom.js";
import { compareModel } from "../domain/compare.js";
import { plural } from "../domain/text.js";

function cellHtml(c) {
  const letter = c.letter
    ? html`<span class="sr-only">Classe ${c.letter}: </span><span class="letter L-${c.letter}" aria-hidden="true">${c.letter}</span> `
    : "";
  const lines = join(c.lines.map(line => html`<span class="cell-line">${line}</span>`));
  const best = c.best ? html`<span class="best-tag"><span aria-hidden="true">★ </span>Melhor valor<span class="sr-only"> desta linha</span></span>` : "";
  return html`<td class="num${c.best ? " is-best" : ""}">${letter}${lines}${best}</td>`;
}

export function mountCompare(ctx) {
  const out = $("#cmp-out");
  const region = () => out.querySelector(".cmp-wrap");

  function syncScrollable() {
    const el = region();
    if (!el) return;
    if (el.scrollWidth > el.clientWidth + 1) el.setAttribute("tabindex", "0");
    else el.removeAttribute("tabindex");
  }

  function render(state) {
    const vs = state.cmp.map(id => ctx.byId.get(id)).filter(Boolean);
    if (!vs.length) {
      setHtml(out, html`<div class="empty">
        <h2>Nenhum veículo escolhido ainda.</h2>
        <p>Na busca, marque “Comparar” em até quatro veículos. Para começar, veja os <button class="link-btn" type="button" data-ex="SUV elétrico">SUVs elétricos</button>.</p>
      </div>`);
      return;
    }
    const rows = compareModel(vs);
    setHtml(out, html`<div class="cmp-wrap" role="region" aria-label="Tabela de comparação de ${vs.length} ${plural(vs.length, "veículo", "veículos")}">
      <table class="cmpt">
        <caption class="sr-only">Comparação de ${vs.length} ${plural(vs.length, "veículo", "veículos")}</caption>
        <thead><tr>
          <th scope="col" class="col-label">Atributo</th>
          ${vs.map(v => html`<th scope="col">
            <span class="th-name">${v.marca} ${v.modelo}</span>
            <span class="th-version">${v.versao}</span>
            <button class="link-btn" type="button" data-uncmp="${v.id}">Retirar<span class="sr-only"> ${v.marca} ${v.modelo}</span></button>
          </th>`)}
        </tr></thead>
        <tbody>
          ${rows.map(r => html`<tr><th scope="row" class="col-label">${r.label}</th>${r.cells.map(cellHtml)}</tr>`)}
        </tbody>
      </table>
    </div>`);
    syncScrollable();
  }

  delegate(out, "click", "[data-uncmp]", (e, el) => {
    ctx.actions.toggleCompare(el.dataset.uncmp, false);
    $("#h-comparar").focus();
  });

  window.addEventListener("resize", syncScrollable);

  return {
    update(state) {
      if (state.route !== "comparar") return;
      render(state);
    },
  };
}
