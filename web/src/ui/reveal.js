// Revelacao suave ao rolar. So ativa com prefers-reduced-motion: no-preference;
// sem essa preferencia, o conteudo aparece direto (nada fica escondido).

const canAnimate = () => window.matchMedia("(prefers-reduced-motion: no-preference)").matches;

export function observeReveal(root) {
  if (!canAnimate() || !("IntersectionObserver" in window)) return;
  const items = root.querySelectorAll(".gl-section, .notes");
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-in");
        io.unobserve(entry.target);
      }
    });
  }, { rootMargin: "0px 0px -8% 0px" });
  items.forEach(el => {
    el.classList.add("js-reveal");
    io.observe(el);
  });
}
