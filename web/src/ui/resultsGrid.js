// Resultados: contagem, ordenacao, filtros ativos, cartoes, estado vazio com sugestoes e "Mostrar mais".

import { $, delegate, html, join, keepFocus, setHtml } from "./dom.js";
import { vehicleCard } from "./vehicleCard.js";
import { announce } from "./announcer.js";
import { suggestions } from "../domain/query.js";
import { FACETS, PAGE_SIZE } from "../domain/constants.js";
import { fmt, plural } from "../domain/text.js";
import { hasFilters } from "../domain/filters.js";

const slug = s => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-");

function activeHtml(state) {
  const chips = [];
  FACETS.forEach(F => (state.filters.facets[F.k] || []).forEach(x => {
    chips.push(html`<button type="button" class="chip-active" data-rm="${F.k}" data-val="${x}" data-focus-key="rm-${F.k}-${slug(x)}">${F.label}: ${x}<span aria-hidden="true"> ×</span><span class="sr-only"> remover filtro</span></button>`);
  }));
  if (state.filters.autMin != null) {
    chips.push(html`<button type="button" class="chip-active" data-rmnum="autMin" data-focus-key="rm-autmin">Autonomia ≥ ${state.filters.autMin} km<span aria-hidden="true"> ×</span><span class="sr-only"> remover filtro</span></button>`);
  }
  if (state.filters.mjMax != null) {
    chips.push(html`<button type="button" class="chip-active" data-rmnum="mjMax" data-focus-key="rm-mjmax">Consumo ≤ ${fmt(state.filters.mjMax, 2)} MJ/km<span aria-hidden="true"> ×</span><span class="sr-only"> remover filtro</span></button>`);
  }
  if (!chips.length) return "";
  return html`${join(chips, " ")}<button type="button" class="link-btn" data-clear-filters>Limpar filtros</button>`;
}

function emptyHtml(state, ctx) {
  const sugg = suggestions(state.groups, ctx.data.vehicles, state.filters, ctx.vocab);
  const hint = hasFilters(state.filters) ? "Tente retirar um filtro ou usar um termo relacionado." : "Tente retirar uma condição ou usar um termo relacionado.";
  return html`<div class="empty">
    <h3>Nenhum veículo atende a todas as condições.</h3>
    <p>${hint}</p>
    ${sugg.length ? html`<div class="sugg">${sugg.map(s => html`<button class="chip" type="button" data-ex="${s.query}">${s.label}</button>`)}</div>` : ""}
  </div>`;
}

export function mountResults(ctx) {
  const rtitle = $("#rtitle");
  const rcount = $("#rcount");
  const rword = $("#rword");
  const sort = $("#sort");
  const active = $("#active");
  const grid = $("#results");
  const empty = $("#empty");
  const more = $("#more");
  const section = $("#results-section");

  let lastCount = null;
  let lastView = null;
  let pendingFocus = null;

  function update(state, view) {
    lastView = view;
    const n = view.results.length;
    rcount.textContent = n.toLocaleString("pt-BR");
    rword.textContent = n === 1 ? "veículo" : "veículos";
    if (sort.value !== state.sort) sort.value = state.sort;
    setHtml(active, activeHtml(state));

    const inCmp = new Set(state.cmp);
    const shown = view.results.slice(0, state.shown);
    keepFocus(grid, () => setHtml(grid, join(shown.map(v => vehicleCard(v, inCmp.has(v.id))))));

    const rest = n - state.shown;
    more.hidden = rest <= 0;
    if (rest > 0) {
      const now = Math.min(PAGE_SIZE, rest);
      more.textContent = `Mostrar mais ${now} · restam ${rest - now}`;
    }

    if (n === 0) setHtml(empty, emptyHtml(state, ctx));
    else setHtml(empty, "");

    if (lastCount !== null && lastCount !== n) {
      announce(`${n} ${plural(n, "veículo encontrado", "veículos encontrados")}.`);
    }
    lastCount = n;

    if (pendingFocus) {
      const el = section.querySelector(`[data-focus-key="${pendingFocus}"]`);
      pendingFocus = null;
      if (el) el.focus();
    }
  }

  sort.addEventListener("change", () => ctx.actions.setSort(sort.value));

  delegate(section, "click", "[data-ficha]", (e, el) => ctx.openFicha(el.dataset.ficha));

  delegate(section, "change", "[data-cmp]", (e, el) => {
    const ok = ctx.actions.toggleCompare(el.dataset.cmp, el.checked);
    if (!ok) el.checked = false;
  });

  delegate(section, "click", "[data-rm]", (e, el) => {
    ctx.actions.removeFacet(el.dataset.rm, el.dataset.val);
    rtitle.focus();
  });

  delegate(section, "click", "[data-rmnum]", (e, el) => {
    ctx.actions.setNumeric(el.dataset.rmnum, null);
    rtitle.focus();
  });

  delegate(section, "click", "[data-clear-filters]", () => {
    ctx.actions.clearFilters();
    rtitle.focus();
  });

  // Ao mostrar mais, o foco vai para o primeiro cartao novo.
  more.addEventListener("click", () => {
    const next = lastView ? lastView.results[ctx.store.get().shown] : null;
    if (next) pendingFocus = `ficha-${next.id}`;
    ctx.actions.showMore();
  });

  return { update };
}
