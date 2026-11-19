// Helpers de DOM: escape obrigatorio, template html`` e foco preservado entre renderizacoes.
// Todo valor interpolado e escapado; so raw(...) ou html`` (ja escapados) entram sem escape.

const RAW = Symbol("raw");
const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ESC[c]);
}

/** Marca um trecho de HTML ja seguro como nao escapavel. */
export function raw(s) {
  return { [RAW]: true, s: String(s) };
}

function stringify(v) {
  if (v == null || v === false) return "";
  if (Array.isArray(v)) return v.map(stringify).join("");
  if (typeof v === "object" && v[RAW]) return v.s;
  return esc(v);
}

/** Template: html`<p>${texto}</p>`. Interpolacoes sao escapadas; resultado e raw. */
export function html(strings, ...values) {
  let out = "";
  strings.forEach((s, i) => {
    out += s;
    if (i < values.length) out += stringify(values[i]);
  });
  return raw(out);
}

/** Junta pedacos de HTML com um separador ja seguro. */
export function join(items, separator = "") {
  return raw(items.map(stringify).join(stringify(separator)));
}

export function setHtml(el, value) {
  el.innerHTML = stringify(value);
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/**
 * Renderiza de novo um bloco e devolve o foco ao mesmo elemento (procurado por id ou data-focus-key).
 * Evita que a troca de innerHTML jogue o foco para o body.
 */
export function keepFocus(root, render) {
  const active = document.activeElement;
  let key = null;
  if (active && root.contains(active)) {
    key = active.id ? { attr: "id", val: active.id } : active.dataset && active.dataset.focusKey ? { attr: "data-focus-key", val: active.dataset.focusKey } : null;
  }
  const hadFocus = !!key;
  const sel = key ? (key.attr === "id" ? `#${CSS.escape(key.val)}` : `[data-focus-key="${CSS.escape(key.val)}"]`) : null;
  const selStart = active && typeof active.selectionStart === "number" ? active.selectionStart : null;
  render();
  if (hadFocus) {
    const el = root.querySelector(sel);
    if (el) {
      el.focus({ preventScroll: true });
      if (selStart != null && el.setSelectionRange) {
        try { el.setSelectionRange(selStart, selStart); } catch (_) { /* tipo sem selecao */ }
      }
    }
  }
}

/** Escuta um evento delegado: handler roda para o alvo mais proximo que casa com o seletor. */
export function delegate(root, type, selector, handler) {
  root.addEventListener(type, e => {
    const target = e.target instanceof Element ? e.target.closest(selector) : null;
    if (target && root.contains(target)) handler(e, target);
  });
}
