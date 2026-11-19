// Rotas por hash: #buscar, #comparar, #glossario.
// Clique em link de navegacao (hashchange) move o foco para o h1 da rota.
// Navegacao programatica (chips, links de pular, sugestoes) usa replaceState: nao dispara hashchange,
// entao o foco que a acao colocou fica onde esta.

export const ROUTES = {
  buscar: { title: "Buscar veículos", heading: "h-buscar" },
  comparar: { title: "Comparar veículos", heading: "h-comparar" },
  glossario: { title: "Entenda a etiqueta", heading: "h-glossario" },
};

export function routeFromHash(hash) {
  const r = (hash || "#buscar").replace(/^#/, "");
  return Object.prototype.hasOwnProperty.call(ROUTES, r) ? r : "buscar";
}

export function setTitle(route) {
  document.title = `${ROUTES[route].title} · EtiqueCarro`;
}

/** Muda a rota sem disparar hashchange. */
export function setRouteSilently(route) {
  setTitle(route);
  if (location.hash !== "#" + route) history.replaceState(null, "", "#" + route);
}

/** Move o foco para o h1 de uma rota. */
export function focusRouteHeading(route) {
  const el = document.getElementById(ROUTES[route].heading);
  if (el) el.focus({ preventScroll: false });
}

/** Liga o roteador. onChange(route, {fromUser}) roda ao iniciar e a cada hashchange. */
export function startRouter(onChange) {
  let first = true;
  function apply() {
    const route = routeFromHash(location.hash);
    setTitle(route);
    onChange(route, { fromUser: !first });
    first = false;
  }
  window.addEventListener("hashchange", apply);
  apply();
}
