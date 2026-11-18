// Barra de acessibilidade: alto contraste e tamanho do texto.

import { $ } from "./dom.js";
import { readPrefs, writePref, clampFont, FONT_STEP, KEY_CONTRAST, KEY_FONT } from "../state/prefs.js";

export function mountA11yBar(ctx) {
  const root = document.documentElement;
  const contraste = $("#contraste");
  const prefs = readPrefs();
  let fs = prefs.fontScale;

  function applyFont() {
    root.style.fontSize = fs + "%";
  }

  root.classList.toggle("alto-contraste", prefs.contrast);
  contraste.setAttribute("aria-pressed", String(prefs.contrast));
  applyFont();

  contraste.addEventListener("click", () => {
    const on = root.classList.toggle("alto-contraste");
    contraste.setAttribute("aria-pressed", String(on));
    writePref(KEY_CONTRAST, on ? "1" : "0");
  });

  function setFont(n) {
    fs = clampFont(n);
    applyFont();
    writePref(KEY_FONT, fs);
  }
  $("#fmais").addEventListener("click", () => setFont(fs + FONT_STEP));
  $("#fmenos").addEventListener("click", () => setFont(fs - FONT_STEP));

}
