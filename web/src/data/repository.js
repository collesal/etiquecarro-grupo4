// Contrato da camada de dados.
// Um repositorio tem loadAll() -> Promise<{vehicles, terms, meta, source}>.
// Qualquer fonte (banco do Claude ou arquivos locais) deve passar por normalizeDataset.

/** Erro com codigo para a interface mostrar uma mensagem util. */
export class DataError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "DataError";
    this.code = code;
  }
}

/** Ordena veiculos por id e termos por ordem; termos sem "ordem" recebem a posicao do arquivo. */
export function normalizeDataset({ vehicles, terms, meta, source }) {
  const vs = [...vehicles].sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const ts = terms
    .map((e, i) => ({ ...e, ordem: e.ordem ?? i + 1 }))
    .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
  return { vehicles: vs, terms: ts, meta: meta || null, source };
}
