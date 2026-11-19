// Escolhe a fonte de dados: banco do Claude quando existir (window.claude.use("db")),
// senao os arquivos locais. Erros de rede e de banco viram DataError com mensagem.

import { createDbRepository } from "./dbRepository.js";
import { createHttpRepository } from "./httpRepository.js";

export async function loadDataset() {
  const claude = typeof window !== "undefined" ? window.claude : undefined;
  if (claude && typeof claude.use === "function") {
    let db = null;
    try {
      db = await claude.use("db");
    } catch (_) {
      db = null;
    }
    if (db) return createDbRepository(db).loadAll();
  }
  return createHttpRepository().loadAll();
}
