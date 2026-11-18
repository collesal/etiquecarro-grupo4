// Regiao aria-live unica. Repetir a mesma mensagem forca o leitor de tela a anunciar de novo.

let region = null;

function getRegion() {
  if (!region) region = document.getElementById("live");
  return region;
}

export function announce(message) {
  const el = getRegion();
  if (!el) return;
  el.textContent = "";
  setTimeout(() => { el.textContent = message; }, 30);
}
