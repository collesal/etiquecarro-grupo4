// Constantes do dominio: classes da etiqueta, facetas, categorias e campos numericos.
// Valores vindos de etiquecarro.html (mesma ordem e rotulos).

export const LETTERS = ["A", "B", "C", "D", "E"];

export const RANK = { A: 1, B: 2, C: 3, D: 4, E: 5 };

export const LDESC = {
  A: "mais eficiente",
  B: "eficiente",
  C: "intermediária",
  D: "pouco eficiente",
  E: "menos eficiente",
};

export const CATS = [
  "Subcompacto", "Compacto", "Médio", "Grande", "Extragrande",
  "Utilitário esportivo compacto", "Utilitário esportivo grande",
  "Utilitário esportivo compacto 4x4", "Utilitário esportivo grande 4x4",
  "Fora de estrada compacto", "Fora de estrada grande",
  "Picape", "Picape compacta", "Minivan", "Esportivo", "Comercial leve",
];

/** Campos numericos usados em "autonomia>=400", "consumo<=0,6", "co2<200". */
export const NUMF = {
  autonomia: ["autonomia_km", "Autonomia no modo elétrico", "km"],
  consumo: ["mj_km", "Consumo energético", "MJ/km"],
  co2: ["co2_fossil", "CO2 fóssil", "g/km"],
};

export const REDUCAO_DESC = {
  A: "mais longe do limite",
  B: "intermediária",
  C: "mais perto do limite",
};

export const FACETS = [
  { k: "categoria", label: "Categoria", term: "Categoria do veículo", order: CATS },
  { k: "propulsao", label: "Tipo de propulsão", order: ["Combustão", "Híbrido", "Plug-in", "Elétrico"], ne: "Como o carro é movido: só a combustível, com ajuda de bateria, com bateria recarregável na tomada ou só a bateria.", valsHelp: true },
  { k: "combustivel", label: "Combustível", order: ["Flex", "Gasolina", "Etanol puro", "Diesel", "Elétrico puro"], ne: "A energia com que o carro foi ensaiado.", valsHelp: true },
  { k: "clsGeral", label: "Classificação geral", term: "Classificação PBE Comparação Absoluta geral", order: LETTERS, letters: true },
  { k: "clsCat", label: "Classificação na categoria", term: "Classificação PBE relativa na categoria", order: LETTERS, letters: true },
  { k: "marca", label: "Marca", term: "Marca", limit: 8 },
  { k: "transmissao", label: "Transmissão", term: "Transmissão" },
  { k: "direcao", label: "Direção assistida", order: ["Elétrica", "Eletro-hidráulica", "Hidráulica", "Mecânica"], ne: "O sistema que ajuda o motorista a girar o volante.", valsHelp: true },
  { k: "reducao", label: "Poluentes: redução relativa ao limite", term: "Redução Relativa ao Limite", order: ["A", "B", "C"] },
];

/** Rotulos legiveis dos campos, usados na interpretacao da busca. */
export const FL = {
  categoria: "Categoria",
  propulsao: "Tipo de propulsão",
  combustivel: "Combustível",
  direcao: "Direção assistida",
  marca: "Marca",
};

/** Facetas do glossario (ordem de exibicao). */
export const FACS = [
  "Identificação",
  "Categoria do veículo",
  "Características técnicas",
  "Emissões",
  "Consumo e autonomia",
  "Classificação PBE",
];

export const PAGE_SIZE = 24;
export const COMPARE_LIMIT = 4;
