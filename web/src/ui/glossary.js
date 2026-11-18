// Glossario: coluna estreita, indice A–Z (links internos sem mudar a rota), termos grandes.

import { $, delegate, html, join, raw, setHtml } from "./dom.js";
import { glossaryModel } from "../domain/glossary.js";
import { plural } from "../domain/text.js";
import { observeReveal } from "./reveal.js";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function termHtml({ e, anchor }) {
  return html`<article class="term" id="${anchor}" tabindex="-1">
    <h3>${e.t}</h3>
    ${e.def ? html`<p><span class="k">Definição:</span> ${e.def}</p>` : ""}
    ${e.ne ? html`<p class="ne"><span class="k">Em palavras simples:</span> ${e.ne}</p>` : ""}
    ${e.up && e.up.length ? html`<p class="up"><span class="k">Também chamado de:</span> ${e.up.join("; ")}</p>` : ""}
    ${e.tr && e.tr.length ? html`<p class="up"><span class="k">Veja também:</span> ${e.tr.join("; ")}</p>` : ""}
    ${e.ex ? html`<p class="up"><span class="k">Exemplos:</span> ${e.ex}</p>` : ""}
    ${e.f ? html`<p><a href="#buscar" data-ex="${e.t}">Ver veículos: ${e.t}</a></p>` : ""}
  </article>`;
}

function sectionHtml(s, q) {
  const termsOf = list => list.map(e => s.terms.find(t => t.e === e)).filter(Boolean);
  const rest = termsOf(s.rest);
  const brands = termsOf(s.brands);
  return html`<section class="gl-section" aria-labelledby="${s.id}">
    <h2 id="${s.id}">${s.fc} <small>${s.count} ${plural(s.count, "termo", "termos")}</small></h2>
    ${rest.length ? html`<div class="terms">${rest.map(termHtml)}</div>` : ""}
    ${brands.length ? html`<details class="marcas"${q ? raw(" open") : ""}><summary>Marcas (${brands.length})</summary><div class="terms">${brands.map(termHtml)}</div></details>` : ""}
  </section>`;
}

function azHtml(index) {
  const byLetter = new Map(index.map(x => [x.letter, x.anchor]));
  return html`<ul class="az-list">${ALPHABET.map(L => {
    const anchor = byLetter.get(L);
    return anchor
      ? html`<li><a href="#${anchor}" data-az="${anchor}">${L}</a></li>`
      : html`<li><span class="az-off" aria-hidden="true">${L}</span></li>`;
  })}</ul>`;
}

export function mountGlossary(ctx) {
  const input = $("#glq");
  const gl = $("#gl");
  const az = $("#az");
  const trat = $("#gl-trat");
  let done = false;

  function render() {
    const model = glossaryModel(ctx.data.terms, input.value);
    setHtml(gl, join(model.sections.map(s => sectionHtml(s, model.query))));
    setHtml(az, azHtml(model.index));
    observeReveal(gl);
  }

  function renderNotes() {
    const s = ctx.stats;
    setHtml(trat, html`<h2 id="g-trat">Como os dados foram tratados</h2>
      <p>A tabela original do Inmetro passou pelo pipeline do projeto antes de chegar a este site:</p>
      <ul>
        <li>Leitura do arquivo em ISO-8859-1 e conversão para UTF-8; ${s.vehicles} linhas e 28 colunas validadas.</li>
        <li>47 grafias de marca unificadas em ${s.brands} marcas (por exemplo, VW passou a Volkswagen); ${s.models} modelos registrados em arquivo de autoridade.</li>
        <li>Códigos substituídos pelos termos do tesauro: E passou a Elétrico puro, E100 a Etanol puro, F a Flex; na direção, E-H passou a Eletro-hidráulica.</li>
        <li>45 veículos a combustão com valores de quilometragem deslocados de coluna e 22 elétricos com eficiência na coluna de plug-in flex foram realocados.</li>
        <li>Marcadores de ausência (“\\”, “ND”, “--”, “N.A.”) passaram a “Não se aplica” ou “Não informado”.</li>
        <li>A coluna “Nox (g/km)” é exibida como aldeídos (CHO) em mg/km, unidade compatível com os valores publicados.</li>
        <li>Os registros tratados e o tesauro ficam na base de dados do site: a coleção “veiculos” tem um documento por linha da tabela, identificado de V0001 a V${String(s.vehicles).padStart(4, "0")}, e a coleção “termos” guarda os ${s.terms} termos do tesauro com suas remissivas.</li>
        <li>Cada registro recebeu um identificador próprio, porque a combinação marca, modelo, versão, motor e transmissão se repete em 56 linhas.</li>
      </ul>`);
  }

  input.addEventListener("input", render);

  // Links do indice A–Z: rolam e focam o termo sem mudar a rota.
  delegate(document, "click", "[data-az]", (e, el) => {
    e.preventDefault();
    const dest = document.getElementById(el.dataset.az);
    if (dest) {
      dest.scrollIntoView();
      dest.focus({ preventScroll: true });
    }
  });

  return {
    update(state) {
      if (state.route !== "glossario" || done) return;
      done = true;
      renderNotes();
      render();
    },
  };
}
