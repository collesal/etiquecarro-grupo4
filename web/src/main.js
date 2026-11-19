// Raiz de composicao: carrega os dados, monta o vocabulario, o estado e os componentes de UI.
// Dependencias: app -> ui -> state -> domain, e data -> domain. domain nao toca DOM nem window.

import { loadDataset } from "./data/index.js";
import { DataError } from "./data/repository.js";
import { buildVocabulary } from "./domain/vocabulary.js";
import { withSearchText, datasetStats } from "./domain/vehicle.js";
import { runSearch } from "./domain/search.js";
import { emptyFilters } from "./domain/filters.js";
import { PAGE_SIZE } from "./domain/constants.js";
import { createStore } from "./state/store.js";
import { createActions } from "./state/actions.js";
import { startRouter, setRouteSilently, focusRouteHeading, routeFromHash, ROUTES } from "./state/router.js";
import { mountA11yBar } from "./ui/a11yBar.js";
import { mountHeader } from "./ui/header.js";
import { mountSearch } from "./ui/searchHero.js";
import { mountFilters } from "./ui/filtersDrawer.js";
import { mountResults } from "./ui/resultsGrid.js";
import { mountFicha } from "./ui/fichaDialog.js";
import { mountCompare } from "./ui/compareTable.js";
import { mountTray } from "./ui/compareTray.js";
import { mountGlossary } from "./ui/glossary.js";
import { showStatus } from "./ui/status.js";

const SLOW_LOAD_MS = 10000;

/** Contexto compartilhado pelos componentes. Campos preenchidos depois do carregamento. */
const ctx = {
  data: null,
  vocab: null,
  byId: new Map(),
  stats: null,
  store: null,
  actions: null,
  drawer: { open() {} },
  openFicha: () => {},
  showRoute: () => {},
};

function applyViews(route) {
  Object.keys(ROUTES).forEach(r => {
    const el = document.getElementById("view-" + r);
    if (el) el.hidden = r !== route;
  });
}

function start(loaded) {
  const vehicles = loaded.vehicles.map(withSearchText);
  const vocab = buildVocabulary(loaded.terms);
  const stats = datasetStats(vehicles, loaded.terms);

  const store = createStore({
    route: routeFromHash(location.hash),
    q: "",
    groups: [],
    filters: emptyFilters(),
    sort: "geral",
    shown: PAGE_SIZE,
    openAll: {},
    cmp: [],
    cmpNotice: "",
  });

  Object.assign(ctx, {
    data: { vehicles, terms: loaded.terms, meta: loaded.meta, source: loaded.source },
    vocab,
    byId: new Map(vehicles.map(v => [v.id, v])),
    stats,
    store,
    actions: createActions(store, vocab),
    showRoute(route) {
      setRouteSilently(route);
      store.set({ route });
    },
  });

  const ficha = mountFicha(ctx);
  ctx.openFicha = id => ficha.open(id);
  const search = mountSearch(ctx);
  search.setFacts(stats, loaded.source);
  ctx.drawer = mountFilters(ctx);
  const results = mountResults(ctx);
  const compare = mountCompare(ctx);
  const tray = mountTray(ctx);
  const glossary = mountGlossary(ctx);

  const components = [headerUI, search, ctx.drawer, results, compare, tray, glossary];

  function render(state) {
    applyViews(state.route);
    const view = runSearch(vehicles, state.groups, state.filters, state.sort);
    components.forEach(c => c.update(state, view));
  }

  store.subscribe(render);
  startRouter((route, { fromUser }) => {
    store.set({ route });
    if (fromUser) focusRouteHeading(route);
  });
  render(store.get());
  showStatus({});
}

async function main() {
  showStatus({ title: "Carregando os veículos", message: "Lendo a Tabela PBE Veicular 2026 e o tesauro.", busy: true });
  const slow = setTimeout(() => {
    showStatus({ title: "Carregando os veículos", message: "Os dados estão demorando para chegar. Os veículos aparecem assim que carregarem.", busy: true });
  }, SLOW_LOAD_MS);
  try {
    const loaded = await loadDataset();
    clearTimeout(slow);
    start(loaded);
  } catch (e) {
    clearTimeout(slow);
    const message = e instanceof DataError ? e.message : "Erro inesperado ao carregar os dados. Recarregue a página.";
    showStatus({ title: "Não foi possível carregar os veículos", message, error: true });
    // Mantem o cabecalho e a barra de acessibilidade utilizaveis mesmo sem dados.
    console.error(e);
  }
}

// Barra de acessibilidade e cabecalho funcionam mesmo se os dados falharem.
mountA11yBar(ctx);
const headerUI = mountHeader();
main();
