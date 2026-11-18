// Cabecalho: transparente sobre o hero, solido com linha fina apos rolar.
// A navegacao foi removida do topo; as rotas continuam acessiveis pelo corpo da pagina.

import { $ } from "./dom.js";

export function mountHeader() {
  const header = $("#site-header");

  const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  return {
    update() {},
  };
}
