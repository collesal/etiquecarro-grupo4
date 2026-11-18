// Preferencias de acessibilidade do visitante: alto contraste e tamanho do texto.
// Persistidas em localStorage; toda leitura e escrita fica em try/catch (modo privado, dados bloqueados).

const KEY_CONTRAST = "ec-contraste";
const KEY_FONT = "ec-fs";
export const FONT_MIN = 87.5;
export const FONT_MAX = 150;
export const FONT_STEP = 12.5;

export function readPrefs() {
  try {
    return {
      contrast: localStorage.getItem(KEY_CONTRAST) === "1",
      fontScale: clampFont(Number(localStorage.getItem(KEY_FONT)) || 100),
    };
  } catch (_) {
    return { contrast: false, fontScale: 100 };
  }
}

export function clampFont(n) {
  return Math.max(FONT_MIN, Math.min(FONT_MAX, n));
}

export function writePref(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch (_) {
    /* sem persistencia: a preferencia vale so nesta pagina */
  }
}

export { KEY_CONTRAST, KEY_FONT };
