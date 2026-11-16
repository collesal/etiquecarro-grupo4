#!/usr/bin/env python3
"""
EtiqueCarro — pipeline de dados da Tabela PBE Veicular 2026 (Inmetro)

Etapas (ver seção 5.1 do projeto):
  E1 Coleta ............ lê o CSV publicado no Portal de Dados Abertos
  E2 Decodificação ..... ISO-8859-1 -> UTF-8, separador ';', cabeçalhos limpos
  E3 Validação ......... confere 28 colunas e domínios esperados
  E4 Padronização ...... espaços, grafias de marca, transmissão, motor, nulos, decimais
  E5 Correção de leiaute linhas com valores de consumo deslocados
  E6 Indexação ......... códigos da tabela -> termos preferidos do tesauro
  E7 Identificação ..... id_veiculo, arquivo de autoridade de marca e modelo
  E8 Carga ............. tabelas relacionais (CSV), JSON do site, log de transformações

Uso:  python3 pipeline.py VEICULOS_2026_v2.csv saida/
Requer: pandas
"""
import sys, os, re, json, csv
import pandas as pd

ORIG = sys.argv[1] if len(sys.argv) > 1 else "VEICULOS_2026_v2.csv"
OUT = sys.argv[2] if len(sys.argv) > 2 else "saida"
os.makedirs(OUT, exist_ok=True)

# ---------------------------------------------------------------- nomes internos das 28 colunas
COLS = ["categoria", "marca", "modelo", "versao", "motor", "propulsao", "transmissao",
        "ar_cond", "direcao", "combustivel", "nmog_nox", "co", "cho", "reducao_limite",
        "co2_fossil", "co2e_vehp", "km_etanol_cid", "km_etanol_est", "km_gas_die_cid",
        "km_gas_est", "km_ele_cid", "km_ele_est", "km_vehp_flex_cid", "km_vehp_flex_est",
        "mj_km", "autonomia_km", "cls_categoria", "cls_geral"]
NUM = COLS[10:13] + COLS[14:26]

# ---------------------------------------------------------------- vocabulário controlado (tesauro, 3.2)
CATEGORIA = {
    "Sub Compacto": "Subcompacto", "Compacto": "Compacto", "Médio": "Médio", "Grande": "Grande",
    "Extra Grande": "Extragrande",
    "Utilitário Esportivo Compacto": "Utilitário esportivo compacto",
    "Utilitário Esportivo Grande": "Utilitário esportivo grande",
    "Utilitário Esportivo Compacto 4x4": "Utilitário esportivo compacto 4x4",
    "Utilitário Esportivo Grande 4x4": "Utilitário esportivo grande 4x4",
    "Fora de Estrada Compacto": "Fora de estrada compacto",
    "Fora de Estrada Grande": "Fora de estrada grande",
    "Picape": "Picape", "Picape Compacta": "Picape compacta", "Minivan": "Minivan",
    "Esportivo": "Esportivo", "Comercial": "Comercial leve",
}
PROPULSAO = {"Combustão": "Combustão", "Híbrido": "Híbrido", "Plug-in": "Plug-in",
             "Plug-In": "Plug-in", "Elétrico": "Elétrico"}
COMBUSTIVEL = {"E": "Elétrico puro", "E100": "Etanol puro", "D": "Diesel", "F": "Flex", "G": "Gasolina"}
DIRECAO = {"E": "Elétrica", "E-H": "Eletro-hidráulica", "H": "Hidráulica", "M": "Mecânica"}
AR = {"S": "Sim", "N": "Não"}
MARCA = {  # grafia original (maiúsculas) -> termo preferido
    "AUDI": "Audi", "BMW": "BMW", "BYD": "BYD", "CAOA CHANGAN": "Caoa Changan",
    "CAOA CHERY": "Caoa Chery", "CHEVROLET": "Chevrolet", "CITROEN": "Citroën", "DENZA": "Denza",
    "FARIZON": "Farizon", "FERRARI": "Ferrari", "FIAT": "Fiat", "FORD": "Ford", "FOTON": "Foton",
    "GAC": "GAC", "GEELY": "Geely", "GWM": "GWM", "HONDA": "Honda", "HYUNDAI": "Hyundai",
    "JAC": "JAC", "JAECOO": "Jaecoo", "JEEP": "Jeep", "JETOUR": "Jetour", "KIA": "Kia",
    "LAND ROVER": "Land Rover", "LEAPMOTOR": "Leapmotor", "LEXUS": "Lexus", "MCLAREN": "McLaren",
    "MERCEDES-BENZ": "Mercedes-Benz", "MG": "MG", "MINI": "MINI", "MITSUBISHI": "Mitsubishi",
    "NISSAN": "Nissan", "OMODA": "Omoda", "PEUGEOT": "Peugeot", "PORSCHE": "Porsche", "RAM": "Ram",
    "RENAULT": "Renault", "SUZUKI": "Suzuki", "TOYOTA": "Toyota", "VW": "Volkswagen",
    "VOLKSWAGEN": "Volkswagen", "VOLVO": "Volvo", "ZEEKR": "Zeekr",
}
TRANSM_TIPO = {"A": "Automática", "AT": "Automática", "M": "Manual", "MT": "Manual",
               "CVT": "Continuamente variável (CVT)", "ECVT": "Continuamente variável eletrônica (eCVT)",
               "DCT": "Automática de dupla embreagem (DCT)", "DTC": "Automática de dupla embreagem (DCT)",
               "DHT": "Híbrida dedicada (DHT)", "MTA": "Automatizada (MTA)"}
NAO_SE_APLICA = {"\\", "N.A.", "NA"}
NAO_INFORMADO = {"ND", "--", ""}

log = []  # (linha_origem, campo, valor_original, valor_novo, regra)
def registra(i, campo, de, para, regra):
    if str(de) != str(para):
        log.append((i + 2, campo, de, para, regra))  # +2: cabeçalho e base 1 => nº da linha no CSV

# ================================================================ E1–E2 coleta e decodificação
df = pd.read_csv(ORIG, sep=";", encoding="latin1", dtype=str, keep_default_na=False)
cabecalhos_originais = [re.sub(r"\s+", " ", c).strip() for c in df.columns]

# ================================================================ E3 validação estrutural
assert df.shape[1] == 28, f"esperadas 28 colunas, recebidas {df.shape[1]}"
df.columns = COLS
n_linhas = len(df)

# ================================================================ E4 padronização
for c in COLS:
    df[c] = df[c].map(lambda v: re.sub(r"\s+", " ", v).strip())

def num(v):
    """vírgula decimal -> float; marcadores de ausência -> None"""
    if v in NAO_SE_APLICA or v in NAO_INFORMADO:
        return None
    try:
        return float(v.replace(",", "."))
    except ValueError:
        return None

def motor_norm(v):
    return re.sub(r"\s*-\s*", "-", v).replace(" T", "T") if v != "Elétrico" else v

def transm(v):
    """'A - 6' -> ('Automática', 6); '--' -> ('Não informado', None); 'N.A.' -> ('Não se aplica', None)"""
    if v in NAO_SE_APLICA: return "Não se aplica", None
    if v in NAO_INFORMADO: return "Não informado", None
    if v == "Automática (A)": return "Automática", None
    s = v.replace(" ", "").upper()
    s = s.replace("DHT-1A-", "DHT-")                       # 'DHT-1A - 2' -> 'DHT-2'
    m = re.match(r"^([A-Z]+?)-?(\d+)?$", s)
    if not m: return "Não informado", None
    tipo = TRANSM_TIPO.get(m.group(1))
    if not tipo: return "Não informado", None
    return tipo, int(m.group(2)) if m.group(2) else None

def modelo_exibicao(v):
    """arquivo de autoridade: forma de exibição do modelo ('DOLPHIN MINI' -> 'Dolphin Mini')"""
    def tok(t):
        if any(ch.isdigit() for ch in t) or len(t) <= 3: return t.upper() if t.isupper() else t
        return "-".join(p.capitalize() if p.isupper() else p for p in t.split("-"))
    return " ".join(tok(t) for t in v.split(" "))

reg = []
for i, r in df.iterrows():
    o = r.to_dict()
    v = {}
    v["linha_origem"] = i + 2
    # --- identificação
    marca = MARCA[o["marca"].upper()]
    registra(i, "Marca", o["marca"], marca, "grafia da marca -> termo preferido")
    v["marca"] = marca
    v["modelo_chave"] = re.sub(r"\s+", " ", o["modelo"].upper())
    v["modelo"] = modelo_exibicao(o["modelo"])
    v["versao"] = o["versao"]
    # --- categoria e características técnicas (E6 indexação pelo tesauro)
    v["categoria"] = CATEGORIA[o["categoria"]]
    v["categoria_codigo"] = o["categoria"]
    registra(i, "Categoria", o["categoria"], v["categoria"], "código -> termo preferido")
    v["propulsao"] = PROPULSAO[o["propulsao"]]
    registra(i, "Tipo de Propulsão", o["propulsao"], v["propulsao"], "uniformização de grafia")
    v["combustivel"] = COMBUSTIVEL[o["combustivel"]]
    registra(i, "Combustível", o["combustivel"], v["combustivel"], "código -> termo preferido")
    v["direcao"] = DIRECAO[o["direcao"]]
    registra(i, "Direção Assistida", o["direcao"], v["direcao"], "código -> termo preferido")
    v["ar_cond"] = AR.get(o["ar_cond"], "Não informado")
    v["motor"] = motor_norm(o["motor"])
    registra(i, "Motor", o["motor"], v["motor"], "remoção de espaços no código do motor")
    t, mar = transm(o["transmissao"])
    v["transmissao_tipo"], v["marchas"] = t, mar
    v["transmissao_codigo"] = o["transmissao"]
    registra(i, "Transmissão Velocidades", o["transmissao"], f"{t}" + (f", {mar}" if mar else ""), "código decomposto em tipo e marchas")
    # --- medições
    for c in NUM:
        v[c] = num(o[c])
    v["reducao_limite"] = o["reducao_limite"] or None
    v["cls_categoria"] = o["cls_categoria"]
    v["cls_geral"] = o["cls_geral"]
    v["_orig"] = o
    reg.append(v)

# ================================================================ E5 correção de leiaute
KM = ["km_etanol_cid", "km_etanol_est", "km_gas_die_cid", "km_gas_est",
      "km_ele_cid", "km_ele_est", "km_vehp_flex_cid", "km_vehp_flex_est"]
corr = {"flex_6_valores": 0, "gasolina_3_valores": 0, "eletrico_coluna_vehp": 0, "etanol_combinado": 0}
for v in reg:
    i = v["linha_origem"] - 2
    preenchidas = [c for c in KM if v[c] is not None]
    # (a) Flex a combustão publicado com 6 valores: etanol cid/est/comb + gasolina cid/est/comb
    if v["propulsao"] == "Combustão" and v["combustivel"] == "Flex" and preenchidas == KM[:6]:
        vals = [v[c] for c in KM[:6]]
        novo = dict(zip(KM[:6], [vals[0], vals[1], vals[3], vals[4], None, None]))
        for c in KM[:6]:
            registra(i, c, v[c], novo[c], "leiaute deslocado (flex com valor combinado)")
            v[c] = novo[c]
        corr["flex_6_valores"] += 1
    # (b) Gasolina a combustão com 3 valores a partir da coluna 'Gasolina Estrada'
    elif v["propulsao"] == "Combustão" and v["combustivel"] == "Gasolina" and preenchidas == KM[3:6]:
        vals = [v[c] for c in KM[3:6]]
        novo = {"km_gas_die_cid": vals[0], "km_gas_est": vals[1], "km_ele_cid": None, "km_ele_est": None}
        for c, nv in novo.items():
            registra(i, c, v[c], nv, "leiaute deslocado (gasolina com valor combinado)")
            v[c] = nv
        corr["gasolina_3_valores"] += 1
    # (c) Elétrico com eficiência gravada nas colunas 'VEHP FLEX Etanol'
    if v["propulsao"] == "Elétrico" and v["km_ele_cid"] is None and v["km_vehp_flex_cid"] is not None:
        registra(i, "km_ele_cid", None, v["km_vehp_flex_cid"], "elétrico na coluna de VEHP flex")
        registra(i, "km_ele_est", None, v["km_vehp_flex_est"], "elétrico na coluna de VEHP flex")
        v["km_ele_cid"], v["km_ele_est"] = v["km_vehp_flex_cid"], v["km_vehp_flex_est"]
        v["km_vehp_flex_cid"] = v["km_vehp_flex_est"] = None
        corr["eletrico_coluna_vehp"] += 1
    # (d) Etanol puro com terceiro valor (combinado) na coluna de gasolina
    if v["combustivel"] == "Etanol puro" and v["km_gas_die_cid"] is not None:
        registra(i, "km_gas_die_cid", v["km_gas_die_cid"], None, "etanol puro: valor combinado removido")
        v["km_gas_die_cid"] = None
        corr["etanol_combinado"] += 1

# ================================================================ E7 identificação e autoridade
marcas = sorted({v["marca"] for v in reg})
id_marca = {m: f"MAR{n+1:03d}" for n, m in enumerate(marcas)}
modelos = {}
for v in reg:
    k = (v["marca"], v["modelo_chave"])
    if k not in modelos:
        modelos[k] = {"id_modelo": f"MOD{len(modelos)+1:04d}", "id_marca": id_marca[v["marca"]],
                      "nome": v["modelo"], "forma_original": v["_orig"]["modelo"]}
for n, v in enumerate(reg):
    v["id"] = f"V{n+1:04d}"
    v["id_marca"] = id_marca[v["marca"]]
    v["id_modelo"] = modelos[(v["marca"], v["modelo_chave"])]["id_modelo"]

chave = lambda v: (v["marca"], v["modelo_chave"], v["versao"], v["motor"], v["transmissao_codigo"])
from collections import Counter
cont = Counter(chave(v) for v in reg)
for v in reg:
    v["chave_composta_repetida"] = cont[chave(v)] > 1

# ================================================================ E8 carga
def w(nome, campos, linhas):
    with open(os.path.join(OUT, nome), "w", newline="", encoding="utf-8") as f:
        wr = csv.writer(f, delimiter=";")
        wr.writerow(campos)
        wr.writerows(linhas)

w("marca.csv", ["id_marca", "termo_preferido"], [[id_marca[m], m] for m in marcas])
w("modelo.csv", ["id_modelo", "id_marca", "nome_autorizado", "forma_original"],
  [[m["id_modelo"], m["id_marca"], m["nome"], m["forma_original"]] for m in modelos.values()])
w("veiculo.csv", ["id_veiculo", "id_modelo", "versao", "motor", "categoria", "propulsao", "combustivel",
                  "direcao", "ar_cond", "transmissao_tipo", "marchas", "linha_origem"],
  [[v["id"], v["id_modelo"], v["versao"], v["motor"], v["categoria"], v["propulsao"], v["combustivel"],
    v["direcao"], v["ar_cond"], v["transmissao_tipo"], v["marchas"], v["linha_origem"]] for v in reg])
w("emissao.csv", ["id_veiculo", "nmog_nox_mg_km", "co_mg_km", "cho_mg_km", "reducao_limite",
                  "co2_fossil_g_km", "co2e_vehp_g_km"],
  [[v["id"], v["nmog_nox"], v["co"], v["cho"], v["reducao_limite"], v["co2_fossil"], v["co2e_vehp"]] for v in reg])
w("consumo.csv", ["id_veiculo"] + KM + ["mj_km", "autonomia_km"],
  [[v["id"]] + [v[c] for c in KM] + [v["mj_km"], v["autonomia_km"]] for v in reg])
w("classificacao.csv", ["id_veiculo", "cls_categoria", "cls_geral"],
  [[v["id"], v["cls_categoria"], v["cls_geral"]] for v in reg])
w("log_transformacao.csv", ["linha_origem", "campo", "valor_original", "valor_novo", "regra"], log)

# JSON compacto para o site (valores arredondados para exibição)
R = {"km": 1, "mj_km": 2, "autonomia_km": 0, "co2_fossil": 0, "co2e_vehp": 0, "nmog_nox": 0, "co": 0, "cho": 1}
def rd(c, x):
    if x is None: return None
    d = 1 if c.startswith("km_") else R.get(c, 1)
    return round(x, d) if d else int(round(x))
site = []
for v in reg:
    site.append({
        "id": v["id"], "marca": v["marca"], "modelo": v["modelo"], "versao": v["versao"],
        "categoria": v["categoria"], "propulsao": v["propulsao"], "combustivel": v["combustivel"],
        "motor": v["motor"], "transmissao": v["transmissao_tipo"], "marchas": v["marchas"],
        "direcao": v["direcao"], "ar": v["ar_cond"],
        **{c: rd(c, v[c]) for c in NUM},
        "reducao": v["reducao_limite"], "clsCat": v["cls_categoria"], "clsGeral": v["cls_geral"],
    })
with open(os.path.join(OUT, "veiculos.json"), "w", encoding="utf-8") as f:
    json.dump(site, f, ensure_ascii=False, separators=(",", ":"))

# relatório de qualidade
rel = {
    "linhas_lidas": n_linhas, "colunas": len(COLS), "marcas_grafias_originais": len({r["_orig"]["marca"] for r in reg}),
    "marcas_normalizadas": len(marcas), "modelos_autoridade": len(modelos),
    "correcoes_de_leiaute": corr, "linhas_com_chave_composta_repetida": sum(v["chave_composta_repetida"] for v in reg),
    "transformacoes_registradas": len(log),
    "propulsao": Counter(v["propulsao"] for v in reg), "combustivel": Counter(v["combustivel"] for v in reg),
    "transmissao": Counter(v["transmissao_tipo"] for v in reg),
}
with open(os.path.join(OUT, "relatorio_qualidade.json"), "w", encoding="utf-8") as f:
    json.dump(rel, f, ensure_ascii=False, indent=1)
print(json.dumps(rel, ensure_ascii=False, indent=1))
