// Hero de busca: campo grande, exemplos, interpretacao da consulta e dados da base.

import { $, html, join, raw, setHtml } from "./dom.js";
import { describeLiteral } from "../domain/query.js";
import { hasFilters } from "../domain/filters.js";

function tokenHtml(l) {
  const d = describeLiteral(l);
  const fieldText = d.field ? (d.op ? `${d.field} ${d.op}` : `${d.field}: `) : "";
  return html`<span class="tok${d.neg ? " is-neg" : ""}">${d.neg ? "NÃO " : ""}${fieldText}<b>${d.value}</b><small>${d.detail}</small></span>`;
}

function interpHtml(groups) {
  const or = raw(' <span class="op">OU</span> ');
  const and = raw(' <span class="op">E</span> ');
  return html`<p class="interp-title">Como entendemos a sua busca:</p>
    <div class="interp-ops">${join(groups.map(g => join(g.map(tokenHtml), or)), and)}</div>`;
}

const FACT_SOURCE = {
  db: "Dados lidos do banco do EtiqueCarro",
  arquivos: "Dados lidos dos arquivos locais do projeto",
};

export function mountSearch(ctx) {
  const form = $("#qform");
  const input = $("#q");
  const interp = $("#interp");
  const hero = $("#hero");
  let timer = null;

  form.addEventListener("submit", e => {
    e.preventDefault();
    clearTimeout(timer);
    ctx.actions.search(input.value);
  });

  input.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(() => ctx.actions.search(input.value), 350);
  });

  // Exemplos, sugestoes e links internos que levam uma consulta: qualquer [data-ex].
  document.addEventListener("click", e => {
    const t = e.target instanceof Element ? e.target.closest("[data-ex]") : null;
    if (!t) return;
    e.preventDefault();
    const q = t.dataset.ex;
    ctx.showRoute("buscar");
    input.value = q;
    ctx.actions.search(q, { resetFilters: true });
    input.focus();
  });

  // Datos da base, a partir do que foi carregado (nada fixo no codigo).
  function setFacts(stats, source) {
    $("#f-v").textContent = stats.vehicles.toLocaleString("pt-BR");
    $("#f-m").textContent = stats.models.toLocaleString("pt-BR");
    $("#f-b").textContent = stats.brands.toLocaleString("pt-BR");
    $("#f-c").textContent = stats.categories.toLocaleString("pt-BR");
    $("#f-t").textContent = stats.terms.toLocaleString("pt-BR");
    $("#f-db").textContent = FACT_SOURCE[source] || FACT_SOURCE.arquivos;
  }

  return {
    setFacts,
    update(state) {
      if (input.value !== state.q && document.activeElement !== input) input.value = state.q;
      if (state.groups.length) {
        setHtml(interp, interpHtml(state.groups));
        interp.hidden = false;
      } else {
        setHtml(interp, "");
        interp.hidden = true;
      }
      hero.classList.toggle("is-compact", state.groups.length > 0 || hasFilters(state.filters));
    },
  };
}
