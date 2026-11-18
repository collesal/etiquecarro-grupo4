// Precos de combustivel da API Combustivel (GET /api/precos/). Sem chave; a API libera CORS.
// Cache de 2 horas (a propria API atualiza a cada 2 horas) em localStorage, com try/catch:
// se o armazenamento estiver bloqueado, a pagina so perde o cache.

const URL = "https://combustivelapi.com.br/api/precos/";
const CHAVE = "ec-precos-combustivel";
const TTL_MS = 2 * 60 * 60 * 1000;
const TIMEOUT_MS = 8000;

function lerCache() {
  try {
    const raw = JSON.parse(localStorage.getItem(CHAVE) || "null");
    if (raw && Date.now() - raw.em < TTL_MS) return raw.dados;
  } catch (_) { /* armazenamento indisponivel */ }
  return null;
}

function gravarCache(dados) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify({ em: Date.now(), dados }));
  } catch (_) { /* armazenamento indisponivel */ }
}

/** Valida o formato minimo da resposta. Lanca erro se nao reconhecer. */
function validar(json) {
  const p = json && json.precos;
  if (!p || typeof p.gasolina !== "object" || typeof p.diesel !== "object") {
    throw new Error("formato inesperado");
  }
  return {
    coleta: json.data_coleta || "",
    fonte: json.fonte || "https://precos.petrobras.com.br/",
    precos: { gasolina: p.gasolina, diesel: p.diesel },
  };
}

/**
 * Carrega os precos. Retorna { coleta, fonte, precos } ou lanca erro.
 * Usa o cache se ainda valer; senao busca na API com limite de tempo.
 */
export async function loadFuelPrices() {
  const cache = lerCache();
  if (cache) return cache;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(URL, { signal: ctrl.signal, headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const dados = validar(await res.json());
    gravarCache(dados);
    return dados;
  } finally {
    clearTimeout(timer);
  }
}
