// Bandeja fixa com a selecao da comparacao. Mostra o aviso visivel do limite de quatro veiculos.

import { $ } from "./dom.js";
import { COMPARE_LIMIT } from "../domain/constants.js";

export function mountTray(ctx) {
  const tray = $("#tray");
  const text = $("#traytxt");
  const note = $("#traynote");

  $("#trayclear").addEventListener("click", () => ctx.actions.clearCompare());

  return {
    update(state) {
      const n = state.cmp.length;
      tray.hidden = !n || state.route === "comparar";
      text.textContent = n ? `${n} de ${COMPARE_LIMIT} veículos escolhidos para comparar` : "";
      note.textContent = state.cmpNotice || "";
      note.hidden = !state.cmpNotice;
    },
  };
}
