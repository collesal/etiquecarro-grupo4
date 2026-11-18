// Painel de estado (carregando, erro). Mensagens sao escapadas pelo template html``.

import { $, html, setHtml } from "./dom.js";

export function showStatus({ title, message = "", error = false, busy = false } = {}) {
  const el = $("#status");
  if (!title) {
    el.hidden = true;
    setHtml(el, "");
    return;
  }
  el.hidden = false;
  el.setAttribute("role", error ? "alert" : "status");
  el.setAttribute("aria-busy", String(busy));
  setHtml(el, html`<div class="status-box${error ? " is-error" : ""}"><h3>${title}</h3>${message ? html`<p>${message}</p>` : ""}</div>`);
}
