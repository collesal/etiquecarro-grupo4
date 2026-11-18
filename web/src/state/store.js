// Estado unico da aplicacao com assinatura. Estado e tratado como imutavel:
// cada atualizacao cria um objeto novo.

export function createStore(initial) {
  let state = initial;
  const subs = new Set();
  return {
    get() {
      return state;
    },
    /** Aceita um patch parcial ou uma funcao (estado) => patch. */
    set(patch) {
      const change = typeof patch === "function" ? patch(state) : patch;
      const next = { ...state, ...change };
      const changed = Object.keys(next).some(k => next[k] !== state[k]);
      if (!changed) return;
      state = next;
      subs.forEach(fn => fn(state));
    },
    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
}
