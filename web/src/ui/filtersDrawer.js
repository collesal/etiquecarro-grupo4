// Painel de filtros: coluna no desktop; painel que desliza da direita (300ms, com scrim) no celular.
// Foco preservado por id entre renderizacoes; campos numericos com rotulo, unidade e erro visivel.

import { $, delegate, html, keepFocus, raw, setHtml } from "./dom.js";
import { facetModel } from "../domain/filters.js";
import { norm, parseDecimal } from "../domain/text.js";

const MOBILE_QUERY = "(max-width: 899px)";

export function mountFilters(ctx) {
  const box = $("#fbody");
  const aside = $("#filtros");
  const scrim = $("#scrim");
  const toggle = $("#ftoggle");
  const applyBtn = $("#fapply");

  const helpOpen = new Set();
  const numErr = { autMin: false, mjMax: false };
  const numText = { autMin: "", mjMax: "" };
  let last = null;

  const isMobile = () => window.matchMedia(MOBILE_QUERY).matches;

  function setOpen(open, { focus = false } = {}) {
    aside.classList.toggle("is-open", open);
    scrim.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    if (open && focus) {
      const first = aside.querySelector("button, input");
      if (first) first.focus();
    }
  }

  function closeAndReturn() {
    const wasOpen = aside.classList.contains("is-open");
    setOpen(false);
    if (wasOpen && isMobile()) toggle.focus();
  }

  function facetHtml(m) {
    const F = m.facet;
    const k = F.k;
    const expanded = helpOpen.has(k);
    const letterLike = F.letters || k === "reducao";
    const opt = o => {
      const id = `f-${k}-${norm(o.value).replace(/[^a-z0-9]+/g, "-")}`;
      const label = letterLike
        ? html`<span class="letter L-${o.value}" aria-hidden="true">${o.value}</span><span class="lt"><span class="sr-only">classe ${o.value}, </span>${o.description}</span>`
        : html`<span class="lt">${o.value}</span>`;
      return html`<label class="opt${o.count ? "" : " is-zero"}" for="${id}">
        <input type="checkbox" id="${id}" data-f="${k}" value="${o.value}" data-focus-key="${id}"${o.selected ? raw(" checked") : ""}>
        ${label}
        <span class="n num"><span class="sr-only">Veículos: </span>${o.count}</span>
      </label>`;
    };
    const helpBody = html`<p class="help-text">${m.help.text}</p>${m.help.values.length
      ? html`<dl class="help-list">${m.help.values.map(x => html`<dt>${x.value}</dt><dd>${x.text}</dd>`)}</dl>`
      : ""}`;
    return html`<fieldset class="facet">
      <legend><span>${F.label}</span>
        <button type="button" class="help-btn" id="hb-${k}" data-help="${k}" aria-expanded="${String(expanded)}" aria-controls="h-${k}" aria-label="O que é ${F.label}?" data-focus-key="hb-${k}">?</button>
      </legend>
      <div class="help" id="h-${k}"${expanded ? "" : raw(" hidden")}>${helpBody}</div>
      <div class="opts">${m.shown.map(opt)}</div>
      ${m.hasMore ? html`<button type="button" class="more" data-more="${k}" aria-expanded="${String(m.expanded)}" data-focus-key="more-${k}">${m.expanded ? "Mostrar menos" : `Mostrar todas (${m.total})`}</button>` : ""}
    </fieldset>`;
  }

  function numField(key, id, label, placeholder, hint, unitValue, inputmode) {
    const bad = numErr[key];
    const shown = bad ? numText[key] : unitValue == null ? "" : String(unitValue).replace(".", ",");
    const describedBy = [`${id}-hint`, bad ? `${id}-err` : ""].filter(Boolean).join(" ");
    return html`<div class="range">
      <label for="${id}">${label}</label>
      <input id="${id}" type="text" inputmode="${inputmode}" placeholder="${placeholder}" value="${shown}" aria-describedby="${describedBy}"${bad ? raw(' aria-invalid="true"') : ""} data-focus-key="${id}">
      <span class="field-hint" id="${id}-hint">${hint}</span>
      ${bad ? html`<span class="field-error" id="${id}-err">Digite um número igual ou maior que zero, usando vírgula para decimais.</span>` : ""}
    </div>`;
  }

  function numericHtml(state) {
    return html`<fieldset class="facet">
      <legend><span>Faixas numéricas</span></legend>
      ${numField("autMin", "autmin", "Autonomia elétrica mínima (km)", "ex.: 300", "Número inteiro, em quilômetros.", state.filters.autMin, "numeric")}
      ${numField("mjMax", "mjmax", "Consumo energético máximo (MJ/km)", "ex.: 1,5", "Menor valor é mais eficiente.", state.filters.mjMax, "decimal")}
    </fieldset>`;
  }

  function render(state, view) {
    const models = facetModel(ctx.data.vehicles, view.base, state.filters, state.openAll, ctx.vocab);
    keepFocus(box, () => setHtml(box, html`${models.map(facetHtml)}${numericHtml(state)}`));
    const n = view.results.length;
    applyBtn.textContent = `Aplicar (${n.toLocaleString("pt-BR")} ${n === 1 ? "resultado" : "resultados"})`;
  }

  function resetNumeric() {
    numErr.autMin = numErr.mjMax = false;
    numText.autMin = numText.mjMax = "";
  }

  function rerender() {
    if (last) render(last.state, last.view);
  }

  delegate(box, "change", "input[data-f]", (e, el) => {
    ctx.actions.toggleFacet(el.dataset.f, el.value, el.checked);
  });

  delegate(box, "change", "#autmin, #mjmax", (e, el) => {
    const key = el.id === "autmin" ? "autMin" : "mjMax";
    const r = parseDecimal(el.value);
    if (r.error) {
      numErr[key] = true;
      numText[key] = el.value;
      rerender();
      return;
    }
    numErr[key] = false;
    numText[key] = "";
    ctx.actions.setNumeric(key, r.value);
    rerender();
  });

  delegate(box, "click", "[data-help]", (e, el) => {
    const k = el.dataset.help;
    if (helpOpen.has(k)) helpOpen.delete(k); else helpOpen.add(k);
    rerender();
  });

  delegate(box, "click", "[data-more]", (e, el) => {
    ctx.actions.toggleOpenAll(el.dataset.more);
  });

  $("#fclear").addEventListener("click", () => {
    resetNumeric();
    ctx.actions.clearFilters();
    rerender();
  });

  $("#fclose").addEventListener("click", () => closeAndReturn());
  scrim.addEventListener("click", () => closeAndReturn());
  applyBtn.addEventListener("click", () => {
    closeAndReturn();
    const rt = document.getElementById("rtitle");
    if (rt) rt.focus();
  });

  aside.addEventListener("keydown", e => {
    if (e.key === "Escape" && aside.classList.contains("is-open")) {
      e.stopPropagation();
      closeAndReturn();
    }
  });

  toggle.addEventListener("click", () => {
    const open = !aside.classList.contains("is-open");
    setOpen(open, { focus: open });
  });

  // Ao sair do modo celular, o painel volta a ser coluna normal.
  window.matchMedia(MOBILE_QUERY).addEventListener("change", e => {
    if (!e.matches) setOpen(false);
  });

  return {
    update(state, view) {
      last = { state, view };
      render(state, view);
    },
    open({ focus = false } = {}) {
      setOpen(true, { focus });
    },
    isMobile,
  };
}
