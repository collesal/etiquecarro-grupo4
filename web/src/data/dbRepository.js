// Repositorio do banco do Claude (window.claude.use("db")). Colecoes: veiculos, termos e meta/base.

import { DataError, normalizeDataset } from "./repository.js";

export function createDbRepository(db) {
  return {
    source: "db",
    async loadAll() {
      let vs, ts, meta;
      try {
        [vs, ts, meta] = await Promise.all([
          db.collection("veiculos").limit(1000).get(),
          db.collection("termos").limit(1000).get(),
          db.doc("meta/base").get(),
        ]);
      } catch (e) {
        throw new DataError("db", "O banco respondeu com erro (" + (e && e.code || "desconhecido") + "). Tente abrir a página de novo em alguns minutos.");
      }
      if (vs.empty) throw new DataError("empty", "O banco de dados ainda não recebeu os registros da tabela.");
      return normalizeDataset({
        vehicles: vs.docs.map(d => ({ ...d.data(), id: d.id })),
        terms: ts.docs.map(d => ({ ...d.data() })),
        meta: meta.exists ? meta.data() : null,
        source: "db",
      });
    },
  };
}
