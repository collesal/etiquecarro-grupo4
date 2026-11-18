// Utilitarios de texto. Puro: sem DOM e sem window.

/** Normaliza para comparacao: sem acentos, minusculo, espacos simples. */
export function norm(s) {
  return String(s)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Numero no formato pt-BR com d casas decimais. null/undefined vira null. */
export function fmt(x, d = 1) {
  return x == null ? null : x.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
}

/** Le um numero digitado em pt-BR ("1,5"). Vazio = null. Invalido ou negativo = erro. */
export function parseDecimal(text) {
  const s = String(text ?? "").trim();
  if (s === "") return { value: null, error: false };
  const n = Number(s.replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return { value: null, error: true };
  return { value: n, error: false };
}

export function plural(n, one, many) {
  return n === 1 ? one : many;
}
