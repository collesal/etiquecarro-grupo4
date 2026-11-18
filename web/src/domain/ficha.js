// Ficha tecnica de um veiculo: modelo de dados para a caixa de dialogo. Puro (sem HTML).
// Logica movida de openFicha, row e ence em etiquecarro.html.

import { LDESC, LETTERS } from "./constants.js";
import { fmt, plural } from "./text.js";

/** Uma linha da ficha. value: string | number | {letter} | null (nao se aplica). */
function fieldRow(vocab, label, col, value, unit = "", help) {
  const term = col ? vocab.find(col) : null;
  const note = help || (term && term.ne) || "";
  return { label, col: col || "", value, unit, note };
}

/** Escala A–E com a classe do veiculo destacada. */
function enceModel(title, letter, note) {
  return {
    title,
    letter,
    description: LDESC[letter],
    note,
    scale: LETTERS.map((x, i) => ({ letter: x, width: 38 + i * 12, on: x === letter })),
  };
}

export function fichaModel(v, vocab) {
  const ele = v.propulsao === "Elétrico";
  const trans = v.transmissao + (v.marchas ? `, ${v.marchas} ${plural(v.marchas, "marcha", "marchas")}` : "");
  const C = "Quilometragem por Litro ";
  const gasLabel = v.combustivel === "Diesel" ? "Diesel" : "Gasolina";
  const consRows = [
    ["Etanol na cidade", C + "Etanol cidade (km/l)", v.km_etanol_cid, "km/l"],
    ["Etanol na estrada", C + "Etanol Estrada (km/l)", v.km_etanol_est, "km/l"],
    [gasLabel + " na cidade", C + "Gasolina ou Diesel Cidade (km/l)", v.km_gas_die_cid, "km/l"],
    [gasLabel + " na estrada", C + "Gasolina Estrada (km/l)", v.km_gas_est, "km/l"],
    ["Modo elétrico na cidade", C + "Elétrico (km/le) para VE ou VEHP Cidade (km/l e)", v.km_ele_cid, "km/l equivalente"],
    ["Modo elétrico na estrada", C + "Elétrico (km/le) para VE ou VEHP Estrada (km/l e)", v.km_ele_est, "km/l equivalente"],
    ["Modo elétrico na cidade (plug-in flex, etanol)", C + "Modo Elétrico (km/lequivalente)- Cidade (km/l e) VEHP FLEX Etanol", v.km_vehp_flex_cid, "km/l equivalente"],
    ["Modo elétrico na estrada (plug-in flex, etanol)", C + "Modo Elétrico (km/lequivalente) - Estrada (km/l e) VEHP FLEX Etanol", v.km_vehp_flex_est, "km/l equivalente"],
  ].filter(r => r[2] != null).map(r => fieldRow(vocab, r[0], r[1], fmt(r[2]), r[3]));

  const sections = [
    {
      title: "Consumo e autonomia",
      rows: [
        fieldRow(vocab, "Consumo energético", "Consumo Energético (MJ/km)", fmt(v.mj_km, 2), "MJ/km"),
        ...(v.autonomia_km != null ? [fieldRow(vocab, "Autonomia no modo elétrico", "Autonomia no Modo Elétrico (km)", v.autonomia_km, "km")] : []),
        ...consRows,
      ],
    },
    {
      title: "Emissões",
      rows: [
        fieldRow(vocab, "Gás carbônico de origem fóssil (CO2)", "Emissões de Escapamento GÁS DE EFEITO ESTUFA CO2 fóssil (g/km)", v.co2_fossil, "g/km"),
        ...(v.propulsao === "Plug-in" ? [fieldRow(vocab, "CO2 equivalente fóssil do plug-in", "Emissões de Escapamento GÁS DE EFEITO ESTUFA VEHP CO2e fóssil (g/km)", v.co2e_vehp, "g/km")] : []),
        fieldRow(vocab, "Gases orgânicos e óxidos de nitrogênio (NMOG+NOx)", "Emissões no Escapamento Poluentes NMOG+Nox (mg/km)", v.nmog_nox, ele ? "NA_ESC" : "mg/km"),
        fieldRow(vocab, "Monóxido de carbono (CO)", "Emissões de Escapamento Poluentes CO (mg/km)", v.co, ele ? "NA_ESC" : "mg/km"),
        fieldRow(vocab, "Aldeídos (CHO)", "Emissões de Escapamento Poluentes Nox (g/km)", v.cho == null ? null : fmt(v.cho), ele ? "NA_ESC" : "mg/km", "Poluentes irritantes ligados sobretudo à queima de etanol. A tabela rotula a coluna como NOx em g/km, mas os valores correspondem a aldeídos em mg/km."),
        fieldRow(vocab, "Redução relativa ao limite", "Redução Relativa ao Limite", v.reducao ? { letter: v.reducao } : null, ""),
      ],
    },
    {
      title: "Características técnicas",
      rows: [
        fieldRow(vocab, "Tipo de propulsão", null, v.propulsao, "", (vocab.byName.get(v.propulsao) || {}).ne),
        fieldRow(vocab, "Combustível", null, v.combustivel, "", (vocab.byName.get(v.combustivel) || {}).ne),
        fieldRow(vocab, "Motor", "Motor", v.motor, ""),
        fieldRow(vocab, "Transmissão", "Transmissão", trans, ""),
        fieldRow(vocab, "Direção assistida", null, v.direcao, "", (vocab.byName.get(v.direcao) || {}).ne),
        fieldRow(vocab, "Ar-condicionado", "Ar-condicionado", v.ar, ""),
      ],
    },
    {
      title: "Identificação e categoria",
      rows: [
        fieldRow(vocab, "Marca", null, v.marca, "", (vocab.byName.get(v.marca) || {}).def),
        fieldRow(vocab, "Modelo", null, v.modelo, ""),
        fieldRow(vocab, "Versão", null, v.versao, ""),
        fieldRow(vocab, "Categoria", null, v.categoria, "", (vocab.byName.get(v.categoria) || {}).ne),
        fieldRow(vocab, "Registro no EtiqueCarro", null, v.id, ""),
      ],
    },
  ];
  return {
    id: v.id,
    title: `${v.marca} ${v.modelo}`,
    subtitle: `${v.versao} · ${v.categoria} · ${v.propulsao}`,
    classes: [
      enceModel("Classificação geral", v.clsGeral, "Compara com todos os veículos da tabela."),
      enceModel("Classificação na categoria", v.clsCat, `Compara só com veículos da categoria ${v.categoria}.`),
    ],
    sections,
  };
}
