#!/usr/bin/env python3
"""
Baixa uma foto leve por modelo de veiculo a partir da Wikimedia Commons.

Regras:
- so usa arquivos com licenca livre (CC0, dominio publico, CC BY, CC BY-SA);
- o titulo do arquivo precisa conter a marca e o modelo;
- imagem em paisagem, com pelo menos 800 px de largura na origem;
- salva em WebP de 480 px e guarda autor, licenca e link de origem em index.json.

Modelos sem foto livre continuam sem imagem (o site usa a silhueta da categoria).

Uso (na pasta etiquecarro-grupo4):
  python tools/baixar_imagens.py
Requer: Pillow (pip install pillow). Usa so a biblioteca padrao para HTTP.
"""
import json, os, re, sys, time, unicodedata, urllib.error, urllib.parse, urllib.request
from io import BytesIO
from PIL import Image

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DADOS = os.path.join(BASE, "saida", "veiculos.json")
OUT = os.path.join(BASE, "web", "assets", "cars")
INDEX = os.path.join(OUT, "index.json")
UA = "EtiqueCarro-prototipo/1.0 (projeto academico; contato pelo repositorio)"
API = "https://commons.wikimedia.org/w/api.php"
LARGURA = 480
QUALIDADE = 74
PAUSA = 2.0  # segundos entre chamadas, para ser gentil com a API
TENTATIVAS = 4  # em erro 429 (muitas requisicoes), espera e tenta de novo

LICENCAS_OK = re.compile(r"^(CC0|Public domain|CC BY(-SA)? \d(\.\d)?)", re.I)
MARCA_ALIAS = {"VW": "Volkswagen", "CAOA CHERY": "Chery", "CAOA CHANGAN": "Changan"}


def norm(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


def com_retry(fn):
    for n in range(TENTATIVAS):
        try:
            return fn()
        except urllib.error.HTTPError as e:
            if e.code != 429 or n == TENTATIVAS - 1:
                raise
            time.sleep(30 * (n + 1))


def get_json(params):
    url = API + "?" + urllib.parse.urlencode({**params, "format": "json"})
    def _go():
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.load(r)
    return com_retry(_go)


def get_bytes(url):
    def _go():
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.read()
    return com_retry(_go)


def strip_html(s):
    return re.sub(r"<[^>]+>", "", s or "").strip()


def buscar(marca, modelo):
    """Retorna o melhor candidato livre para o modelo, ou None."""
    marca_busca = MARCA_ALIAS.get(marca.upper(), marca)
    termo = f"{marca_busca} {modelo} car"
    data = get_json({
        "action": "query", "generator": "search", "gsrsearch": f"filetype:bitmap {termo}",
        "gsrnamespace": 6, "gsrlimit": 12, "prop": "imageinfo",
        "iiprop": "url|extmetadata|size|mime", "iiurlwidth": 800,
    })
    paginas = (data.get("query") or {}).get("pages") or {}
    marca_tok = [t for t in norm(marca_busca).split() if len(t) >= 3][-1:]  # ultima palavra da marca
    modelo_tok = [t for t in norm(modelo).split() if len(t) >= 3]
    if not modelo_tok:
        modelo_tok = norm(modelo).split()
    for p in sorted(paginas.values(), key=lambda x: x.get("index", 999)):
        info = (p.get("imageinfo") or [{}])[0]
        if info.get("mime") not in ("image/jpeg", "image/png"):
            continue
        if info.get("width", 0) < 800 or not (1.2 <= info["width"] / max(info["height"], 1) <= 2.4):
            continue
        meta = info.get("extmetadata") or {}
        licenca = (meta.get("LicenseShortName") or {}).get("value", "")
        if not LICENCAS_OK.match(licenca):
            continue
        titulo = norm(p.get("title", ""))
        if not all(t in titulo.split() or t in titulo for t in marca_tok + modelo_tok):
            continue
        return {
            "titulo": p["title"], "thumb": info["thumburl"], "url_origem": info.get("descriptionurl"),
            "licenca": licenca, "licenca_url": (meta.get("LicenseUrl") or {}).get("value", ""),
            "autor": strip_html((meta.get("Artist") or {}).get("value", "")) or "desconhecido",
        }
    return None


def main():
    veiculos = json.load(open(DADOS, encoding="utf-8"))
    pares = sorted({(v["marca"], v["modelo"]) for v in veiculos})
    os.makedirs(OUT, exist_ok=True)
    indice = json.load(open(INDEX, encoding="utf-8")) if os.path.exists(INDEX) else {}
    print(f"{len(pares)} modelos distintos; {len(indice)} ja processados", flush=True)

    for i, (marca, modelo) in enumerate(pares, 1):
        chave = f"{marca}|{modelo}"
        if chave in indice:
            continue
        try:
            cand = buscar(marca, modelo)
            time.sleep(PAUSA)
            if not cand:
                indice[chave] = None
                status = "sem foto livre"
            else:
                img = Image.open(BytesIO(get_bytes(cand["thumb"]))).convert("RGB")
                h = round(img.height * LARGURA / img.width)
                img = img.resize((LARGURA, h), Image.LANCZOS)
                arquivo = re.sub(r"[^a-z0-9]+", "-", norm(f"{marca} {modelo}")).strip("-") + ".webp"
                img.save(os.path.join(OUT, arquivo), "WEBP", quality=QUALIDADE, method=6)
                indice[chave] = {"arquivo": arquivo, **{k: cand[k] for k in
                                 ("titulo", "autor", "licenca", "licenca_url", "url_origem")}}
                status = f"ok: {arquivo} ({os.path.getsize(os.path.join(OUT, arquivo)) // 1024} KB)"
            time.sleep(PAUSA)
        except Exception as e:  # rede ou arquivo ruim: registra e segue
            status = f"erro: {e}"
        print(f"[{i}/{len(pares)}] {marca} {modelo}: {status}", flush=True)
        json.dump(indice, open(INDEX, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    com = sum(1 for v in indice.values() if v)
    tot = sum(os.path.getsize(os.path.join(OUT, v["arquivo"])) for v in indice.values() if v)
    print(f"\n{com} de {len(pares)} modelos com foto livre; {tot / 1024 / 1024:.2f} MB no total")


if __name__ == "__main__":
    sys.exit(main())
