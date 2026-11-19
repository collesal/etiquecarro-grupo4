// Custo de uso com o preco atual do combustivel. Puro (sem DOM e sem window).
// Fonte dos precos: API Combustivel (combustivelapi.com.br), dados da Petrobras.
// A API traz so gasolina e diesel, por UF. Etanol e eletricidade nao tem preco aqui.

export const UF_NOMES = {
  br: "Brasil (média)", ac: "Acre", al: "Alagoas", am: "Amazonas", ap: "Amapá", ba: "Bahia",
  ce: "Ceará", df: "Distrito Federal", es: "Espírito Santo", go: "Goiás", ma: "Maranhão",
  mt: "Mato Grosso", ms: "Mato Grosso do Sul", mg: "Minas Gerais", pa: "Pará", pb: "Paraíba",
  pr: "Paraná", pe: "Pernambuco", pi: "Piauí", rj: "Rio de Janeiro", rn: "Rio Grande do Norte",
  rs: "Rio Grande do Sul", ro: "Rondônia", rr: "Roraima", sc: "Santa Catarina", sp: "São Paulo",
  se: "Sergipe", to: "Tocantins",
};

/** Converte o texto da API ("6,48") em numero (6.48). Invalido = null. */
export function parsePreco(texto) {
  const n = Number(String(texto ?? "").trim().replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Custo em reais para percorrer 100 km, dado o consumo em km por litro. */
export function custoPor100km(kmPorLitro, preco) {
  if (!kmPorLitro || !preco) return null;
  return Math.round((100 / kmPorLitro) * preco * 100) / 100;
}

/** Chave do preco que o veiculo usa ("gasolina" | "diesel"), ou null se nao ha combustivel liquido com preco. */
export function chaveCombustivel(v) {
  if (v.propulsao === "Elétrico" || v.combustivel === "Elétrico puro" || v.combustivel === "Etanol puro") return null;
  if (v.combustivel === "Diesel") return "diesel";
  if (v.combustivel === "Gasolina" || v.combustivel === "Flex") return "gasolina";
  return null;
}

/** UFs que tem preco numerico para a chave (ex.: "gasolina"). A API marca "N/A" quando nao ha dado. */
export function ufsComPreco(precos, chave) {
  if (!precos || !precos[chave]) return [];
  return Object.keys(precos[chave]).filter(uf => parsePreco(precos[chave][uf]) != null);
}

/** Estado inicial do card: a media do Brasil se tiver preco; senao SP; senao o primeiro com preco. */
export function ufPadrao(precos, v) {
  const chave = chaveCombustivel(v);
  if (!chave) return "br";
  const ufs = ufsComPreco(precos, chave);
  if (ufs.includes("br")) return "br";
  if (ufs.includes("sp")) return "sp";
  return ufs[0] || "br";
}

/**
 * Custo de uso de um veiculo com os precos da API.
 * precos: { gasolina: {uf: "6,48"}, diesel: {...} } ou null se indisponivel.
 * Retorna { status, combustivel, preco, cidade, estrada, nota }:
 *   "ok"             -> custos calculados
 *   "eletrico"       -> sem combustivel liquido
 *   "sem_preco"      -> combustivel sem preco na API (etanol)
 *   "sem_preco_uf"   -> a API nao tem o preco desse combustivel no estado escolhido
 *   "sem_dado"       -> sem consumo ou sem precos carregados
 */
export function custoVeiculo(v, precos, uf = "br") {
  if (chaveCombustivel(v) == null) {
    if (v.combustivel === "Etanol puro") {
      return { status: "sem_preco", nota: "A API não traz o preço do etanol, então o custo deste veículo não pode ser calculado." };
    }
    return { status: "eletrico", nota: "Veículo elétrico: não há combustível líquido para calcular o custo com esta API." };
  }
  const chave = chaveCombustivel(v);
  const combustivel = chave === "diesel" ? "Diesel" : "Gasolina";
  const preco = precos ? parsePreco(precos[chave]?.[uf]) : null;
  if (!precos) {
    return { status: "sem_dado", combustivel, preco: null, nota: "Preços indisponíveis no momento." };
  }
  if (preco == null) {
    const nome = UF_NOMES[uf] || uf;
    return {
      status: "sem_preco_uf", combustivel, preco: null,
      nota: `A API não tem o preço do ${combustivel.toLowerCase()} em ${nome} nesta coleta. Escolha outro estado.`,
    };
  }
  const cidade = custoPor100km(v.km_gas_die_cid, preco);
  const estrada = custoPor100km(v.km_gas_est, preco);
  if (cidade == null && estrada == null) {
    return { status: "sem_dado", combustivel, preco, nota: "Consumo indisponível para este veículo." };
  }
  const notas = [];
  if (v.combustivel === "Flex") notas.push("Flex: calculado com gasolina, porque o uso do etanol não tem preço nesta API.");
  if (v.propulsao === "Plug-in" || v.propulsao === "Híbrido") notas.push("Valor do modo a combustão; o modo elétrico não entra no cálculo.");
  return { status: "ok", combustivel, preco, cidade, estrada, nota: notas.join(" ") };
}
