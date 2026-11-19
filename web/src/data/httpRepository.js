// Repositorio local: le os JSON gerados pelo pipeline, a partir da pasta do projeto.
// Caminhos resolvidos a partir deste modulo (web/src/data/), para valer em qualquer pagina.
// Requer servir a pasta raiz do projeto (python -m http.server na raiz, abrir /web/).

import { DataError, normalizeDataset } from "./repository.js";

const FILES = {
  vehicles: new URL("../../../saida/veiculos.json", import.meta.url),
  terms: new URL("../../../tesauro.json", import.meta.url),
  meta: new URL("../../../carga/meta/base.json", import.meta.url),
};

async function getJson(url) {
  let res;
  try {
    res = await fetch(url, { cache: "no-cache" });
  } catch (_) {
    throw new DataError("network", `Não foi possível ler ${decodeURIComponent(url.pathname)}. Sirva a pasta raiz do projeto com "python -m http.server" e abra /web/.`);
  }
  if (!res.ok) throw new DataError("http", `${decodeURIComponent(url.pathname)} respondeu com erro ${res.status}.`);
  try {
    return await res.json();
  } catch (_) {
    throw new DataError("json", `${decodeURIComponent(url.pathname)} não é um JSON válido.`);
  }
}

export function createHttpRepository(files = FILES) {
  return {
    source: "arquivos",
    async loadAll() {
      const [vehicles, terms, meta] = await Promise.all([
        getJson(files.vehicles),
        getJson(files.terms),
        getJson(files.meta).catch(() => null),
      ]);
      if (!Array.isArray(vehicles) || !vehicles.length) throw new DataError("empty", "O arquivo de veículos está vazio.");
      return normalizeDataset({ vehicles, terms: Array.isArray(terms) ? terms : [], meta, source: "arquivos" });
    },
  };
}
